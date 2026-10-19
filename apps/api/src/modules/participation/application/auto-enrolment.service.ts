import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../shared/database/postgres-errors.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import { SYSTEM_ROLE_MEMBER } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import {
  ENROLMENT_MODE_AUTO,
  readEnrolmentMode,
} from '../../campaigns/application/campaign-settings.js';
import { canEnrollInCampaign } from '../../campaigns/application/campaign-lifecycle.js';
import {
  campaignAppliesToMembership,
  enrollmentCommunityId,
} from '../../campaigns/application/campaign-visibility.js';
import { CommunityService } from '../../communities/application/community.service.js';
import type { MembershipLifecycleListener } from '../../memberships/application/membership-lifecycle.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  EnrolmentSource,
  Participation,
  ParticipationStatus,
} from '../domain/participation.entity.js';
import type { AutoEnrolSyncResult } from './auto-enrolment.tokens.js';

@Injectable()
export class AutoEnrolmentService implements MembershipLifecycleListener {
  private readonly logger = new Logger(AutoEnrolmentService.name);

  constructor(
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => MembershipService))
    private readonly memberships: MembershipService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
  ) {}

  async onMembershipActivated(event: {
    tenantId: string;
    userId: string;
    membershipId: string;
  }): Promise<void> {
    try {
      await this.reconcileUserAcrossAutoCampaigns(event.tenantId, event.userId);
    } catch (error) {
      this.logger.error({
        msg: 'auto_enrol_membership_hook_failed',
        tenantId: event.tenantId,
        membershipId: event.membershipId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  /**
   * Idempotent: creates only missing participations with enrolment_source=auto.
   * Never reactivates withdrawn rows. Skips users without the system member role.
   */
  async reconcileAutoEnrolment(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<AutoEnrolSyncResult> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const mode = readEnrolmentMode(campaign.configuration);
    if (mode !== ENROLMENT_MODE_AUTO || !canEnrollInCampaign(campaign.status)) {
      return { created: 0, alreadyEnrolled: 0, skipped: 0 };
    }

    const memberships = await this.memberships.listActiveInTenant(
      tenant.tenantId,
    );
    let created = 0;
    let alreadyEnrolled = 0;
    let skipped = 0;

    const ancestorsByCommunityId = await this.buildAncestorMap(memberships);

    for (const membership of memberships) {
      const hasMemberRole = await this.authorization.membershipHasRole(
        membership.id,
        SYSTEM_ROLE_MEMBER,
      );
      if (!hasMemberRole) {
        skipped += 1;
        continue;
      }
      if (
        !campaignAppliesToMembership(
          campaign.communityIds,
          membership,
          membership.communityId
            ? (ancestorsByCommunityId.get(membership.communityId) ?? [])
            : [],
        )
      ) {
        skipped += 1;
        continue;
      }

      const outcome = await this.createMissingAutoParticipation({
        tenantId: tenant.tenantId,
        campaignId: campaign.id,
        userId: membership.userId,
        memberships: [membership],
        communityIds: campaign.communityIds,
        ancestorsByCommunityId,
      });
      if (outcome === 'created') {
        created += 1;
      } else if (outcome === 'already_enrolled') {
        alreadyEnrolled += 1;
      } else {
        skipped += 1;
      }
    }

    this.logger.log({
      msg: 'auto_enrol_reconciled',
      tenantId: tenant.tenantId,
      campaignId,
      created,
      alreadyEnrolled,
      skipped,
    });
    return { created, alreadyEnrolled, skipped };
  }

  async reconcileUserAcrossAutoCampaigns(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const memberships = await this.memberships.listActiveForUserInTenant(
      userId,
      tenantId,
    );
    if (memberships.length === 0) {
      return;
    }
    const hasMemberRole = (
      await Promise.all(
        memberships.map((row) =>
          this.authorization.membershipHasRole(row.id, SYSTEM_ROLE_MEMBER),
        ),
      )
    ).some(Boolean);
    if (!hasMemberRole) {
      return;
    }

    const campaigns = await this.campaigns.listAutoEnrolCampaigns(tenantId);
    const ancestorsByCommunityId = await this.buildAncestorMap(memberships);

    for (const campaign of campaigns) {
      await this.createMissingAutoParticipation({
        tenantId,
        campaignId: campaign.id,
        userId,
        memberships,
        communityIds: campaign.communityIds,
        ancestorsByCommunityId,
      });
    }
  }

  async ensureCallerEnrolledIfAuto(
    tenant: TenantContext,
    campaignId: string,
    userId: string,
  ): Promise<void> {
    try {
      const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
      if (
        readEnrolmentMode(campaign.configuration) !== ENROLMENT_MODE_AUTO ||
        !canEnrollInCampaign(campaign.status)
      ) {
        return;
      }
      const memberships = await this.memberships.listActiveForUserInTenant(
        userId,
        tenant.tenantId,
      );
      const ancestorsByCommunityId = await this.buildAncestorMap(memberships);
      await this.createMissingAutoParticipation({
        tenantId: tenant.tenantId,
        campaignId,
        userId,
        memberships,
        communityIds: campaign.communityIds,
        ancestorsByCommunityId,
      });
    } catch (error) {
      this.logger.error({
        msg: 'auto_enrol_self_heal_failed',
        tenantId: tenant.tenantId,
        campaignId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  private async createMissingAutoParticipation(input: {
    tenantId: string;
    campaignId: string;
    userId: string;
    memberships: Array<{
      id: string;
      userId: string;
      communityId: string | null;
      isActive: boolean;
    }>;
    communityIds: string[];
    ancestorsByCommunityId: Map<string, string[]>;
  }): Promise<'created' | 'already_enrolled' | 'skipped'> {
    const eligibleMemberships = [];
    for (const membership of input.memberships) {
      if (membership.userId !== input.userId || !membership.isActive) {
        continue;
      }
      const hasMemberRole = await this.authorization.membershipHasRole(
        membership.id,
        SYSTEM_ROLE_MEMBER,
      );
      if (!hasMemberRole) {
        continue;
      }
      if (
        campaignAppliesToMembership(
          input.communityIds,
          membership,
          membership.communityId
            ? (input.ancestorsByCommunityId.get(membership.communityId) ?? [])
            : [],
        )
      ) {
        eligibleMemberships.push(membership);
      }
    }
    if (eligibleMemberships.length === 0) {
      return 'skipped';
    }

    const communityId = enrollmentCommunityId(
      input.communityIds,
      eligibleMemberships,
      input.ancestorsByCommunityId,
    );
    if (communityId === undefined) {
      return 'skipped';
    }

    const existing = await this.participationRepository.findOne({
      where: { campaign_id: input.campaignId, user_id: input.userId },
    });
    if (existing) {
      return existing.status === ParticipationStatus.ENROLLED
        ? 'already_enrolled'
        : 'skipped';
    }

    try {
      await this.participationRepository.save(
        this.participationRepository.create({
          tenant_id: input.tenantId,
          campaign_id: input.campaignId,
          user_id: input.userId,
          community_id: communityId,
          status: ParticipationStatus.ENROLLED,
          enrolment_source: EnrolmentSource.AUTO,
          enrolled_at: new Date(),
          withdrawn_at: null,
        }),
      );
      this.logger.log({
        msg: 'participation_auto_created',
        tenantId: input.tenantId,
        campaignId: input.campaignId,
        userId: input.userId,
      });
      return 'created';
    } catch (error) {
      if (isUniqueViolation(error)) {
        return 'already_enrolled';
      }
      throw error;
    }
  }

  private async buildAncestorMap(
    memberships: Array<{ communityId: string | null }>,
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    const communityIds = [
      ...new Set(
        memberships
          .map((row) => row.communityId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    for (const communityId of communityIds) {
      map.set(communityId, await this.communities.listAncestorIds(communityId));
    }
    return map;
  }
}
