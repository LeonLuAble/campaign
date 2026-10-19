import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { isUniqueViolation } from '../../../shared/database/postgres-errors.js';
import type { CampaignAccessRecord } from '../../authorization/application/access-readers.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import {
  ENROLMENT_MODE_AUTO,
  readEnrolmentMode,
} from '../../campaigns/application/campaign-settings.js';
import { canEnrollInCampaign } from '../../campaigns/application/campaign-lifecycle.js';
import { enrollmentCommunityId } from '../../campaigns/application/campaign-visibility.js';
import { Commitment } from '../../commitments/domain/commitment.entity.js';
import { representativeCommitments } from '../../commitments/domain/commitment-periods.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  EnrolmentSource,
  Participation,
  ParticipationStatus,
} from '../domain/participation.entity.js';
import {
  countEngagements,
  deriveEngagement,
  type ParticipationEngagement,
  type ParticipationEngagementCounts,
} from '../domain/participation-engagement.js';
import {
  AUTO_ENROLMENT_SERVICE,
  type AutoEnrolmentPort,
} from './auto-enrolment.tokens.js';

export type { ParticipationEngagement };

export interface ParticipationSummaryResponse
  extends ParticipationEngagementCounts {
  customerId: string;
  campaignId: string;
  communityId: string | null;
}

export interface ParticipationResponse {
  id: string;
  customerId: string;
  campaignId: string;
  userId: string;
  communityId: string | null;
  status: ParticipationStatus;
  enrolmentSource: EnrolmentSource;
  engagement: ParticipationEngagement;
  enrolledAt: string;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ParticipationService {
  private readonly logger = new Logger(ParticipationService.name);

  constructor(
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => MembershipService))
    private readonly memberships: MembershipService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    private readonly identities: IdentityAccountService,
    @Optional()
    @Inject(forwardRef(() => AUTO_ENROLMENT_SERVICE))
    private readonly autoEnrolment: AutoEnrolmentPort | null,
  ) {}

  async listEnrolledByCampaign(
    tenantId: string,
    campaignId: string,
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      campaignId: string;
      userId: string;
      engagement: ParticipationEngagement;
    }>
  > {
    const rows = await this.participationRepository.find({
      where: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        status: ParticipationStatus.ENROLLED,
      },
      order: { created_at: 'ASC' },
    });
    const engagements = await this.engagementsFor(tenantId, rows);
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      campaignId: row.campaign_id,
      userId: row.user_id,
      engagement: engagements.get(row.id) ?? 'awaiting_commitment',
    }));
  }

  async getParticipationSummary(
    tenant: TenantContext,
    campaignId: string,
    communityId?: string,
  ): Promise<ParticipationSummaryResponse> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    let scopeIds: Set<string> | null = null;
    if (communityId) {
      await this.communities.get(tenant, communityId);
      scopeIds = new Set([
        communityId,
        ...(await this.communities.listDescendantIds(communityId)),
      ]);
    }
    const rows = await this.participationRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
    });
    const scoped = scopeIds
      ? rows.filter(
          (row) => row.community_id !== null && scopeIds.has(row.community_id),
        )
      : rows;
    const engagements = await this.engagementsFor(tenant.tenantId, scoped);
    return {
      customerId: tenant.tenantId,
      campaignId,
      communityId: communityId ?? null,
      ...countEngagements(
        scoped.map((row) => engagements.get(row.id) ?? 'awaiting_commitment'),
      ),
    };
  }

  async findById(id: string): Promise<CampaignAccessRecord | null> {
    const participation = await this.participationRepository.findOne({
      where: { id },
    });
    return participation
      ? { id: participation.id, tenantId: participation.tenant_id }
      : null;
  }

  async listForCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<ParticipationResponse[]> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rows = await this.participationRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
      order: { created_at: 'ASC' },
    });
    const visible = this.canManageParticipations(tenant)
      ? rows
      : rows.filter((row) => this.isOwn(tenant, row));
    return Promise.all(visible.map((row) => this.toResponse(row)));
  }

  async get(
    tenant: TenantContext,
    participationId: string,
  ): Promise<ParticipationResponse> {
    const participation = await this.requireVisible(tenant, participationId);
    return this.toResponse(participation);
  }

  async getParticipationRecord(
    tenant: TenantContext,
    participationId: string,
  ): Promise<{
    id: string;
    tenantId: string;
    campaignId: string;
    userId: string;
    communityId: string | null;
    status: ParticipationStatus;
  }> {
    const participation = await this.requireVisible(tenant, participationId);
    return {
      id: participation.id,
      tenantId: participation.tenant_id,
      campaignId: participation.campaign_id,
      userId: participation.user_id,
      communityId: participation.community_id,
      status: participation.status,
    };
  }

  async enroll(
    tenant: TenantContext,
    campaignId: string,
    actorUserId: string,
    userId?: string,
  ): Promise<ParticipationResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    if (!canEnrollInCampaign(campaign.status)) {
      throw new InvalidRequestException(
        'Users can only enroll in published or started campaigns',
      );
    }

    const targetUserId = userId ?? actorUserId;
    const isSelf = targetUserId === actorUserId;
    const autoMode =
      readEnrolmentMode(campaign.configuration) === ENROLMENT_MODE_AUTO;

    if (
      !isSelf &&
      !tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_CREATE)
    ) {
      throw new AccessForbiddenException(
        'Enrolling another user requires participations.create',
      );
    }
    if (!(await this.identities.isUserActive(targetUserId))) {
      throw new ResourceNotFoundException('User not found');
    }

    const targetMemberships = await this.memberships.listActiveForUserInTenant(
      targetUserId,
      tenant.tenantId,
    );
    if (targetMemberships.length === 0) {
      throw new ResourceNotFoundException('User not found');
    }

    const ancestorsByCommunityId = new Map<string, string[]>();
    const communityIds = [
      ...new Set(
        targetMemberships
          .map((membership) => membership.communityId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    for (const communityId of communityIds) {
      ancestorsByCommunityId.set(
        communityId,
        await this.communities.listAncestorIds(communityId),
      );
    }

    const communityId = enrollmentCommunityId(
      campaign.communityIds,
      targetMemberships,
      ancestorsByCommunityId,
    );
    if (communityId === undefined) {
      throw new InvalidRequestException(
        'User is not in a community targeted by this campaign',
      );
    }

    const existing = await this.participationRepository.findOne({
      where: { campaign_id: campaignId, user_id: targetUserId },
    });

    if (autoMode && isSelf) {
      if (existing) {
        return this.toResponse(existing);
      }
      if (this.autoEnrolment) {
        await this.autoEnrolment.ensureCallerEnrolledIfAuto(
          tenant,
          campaignId,
          targetUserId,
        );
        const healed = await this.participationRepository.findOne({
          where: { campaign_id: campaignId, user_id: targetUserId },
        });
        if (healed) {
          return this.toResponse(healed);
        }
      }
    }

    if (existing) {
      if (existing.status === ParticipationStatus.ENROLLED) {
        throw new ResourceConflictException(
          'User is already enrolled in this campaign',
        );
      }
      existing.status = ParticipationStatus.ENROLLED;
      existing.community_id = communityId;
      existing.enrolment_source = isSelf
        ? EnrolmentSource.SELF
        : EnrolmentSource.ADMIN;
      existing.enrolled_at = new Date();
      existing.withdrawn_at = null;
      const saved = await this.participationRepository.save(existing);
      this.logger.log({
        msg: 'participation_reenrolled',
        tenantId: tenant.tenantId,
        campaignId,
        participationId: saved.id,
        userId: targetUserId,
      });
      return this.toResponse(saved);
    }

    const enrolmentSource = isSelf
      ? autoMode
        ? EnrolmentSource.AUTO
        : EnrolmentSource.SELF
      : EnrolmentSource.ADMIN;

    try {
      const saved = await this.participationRepository.save(
        this.participationRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaignId,
          user_id: targetUserId,
          community_id: communityId,
          status: ParticipationStatus.ENROLLED,
          enrolment_source: enrolmentSource,
          enrolled_at: new Date(),
          withdrawn_at: null,
        }),
      );
      this.logger.log({
        msg: 'participation_created',
        tenantId: tenant.tenantId,
        campaignId,
        participationId: saved.id,
        userId: targetUserId,
        enrolmentSource,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (autoMode && isSelf) {
          const race = await this.participationRepository.findOne({
            where: { campaign_id: campaignId, user_id: targetUserId },
          });
          if (race) {
            return this.toResponse(race);
          }
        }
        throw new ResourceConflictException(
          'User is already enrolled in this campaign',
        );
      }
      throw error;
    }
  }

  async withdraw(
    tenant: TenantContext,
    participationId: string,
    actorUserId: string,
  ): Promise<ParticipationResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const participation = await this.requireVisible(tenant, participationId);
    const isSelf = participation.user_id === actorUserId;
    if (
      !isSelf &&
      !tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_UPDATE)
    ) {
      throw new AccessForbiddenException(
        'Withdrawing another user requires participations.update',
      );
    }

    if (isSelf && !tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_UPDATE)) {
      const campaign = await this.campaigns.getCampaignRecord(
        tenant,
        participation.campaign_id,
      );
      if (readEnrolmentMode(campaign.configuration) === ENROLMENT_MODE_AUTO) {
        throw new ResourceConflictException(
          'This campaign manages enrolment automatically; choose not taking part instead of withdrawing',
          'ENROLMENT_AUTO_MANAGED',
        );
      }
    }

    if (participation.status === ParticipationStatus.WITHDRAWN) {
      return this.toResponse(participation);
    }
    participation.status = ParticipationStatus.WITHDRAWN;
    participation.withdrawn_at = new Date();
    const saved = await this.participationRepository.save(participation);
    this.logger.log({
      msg: 'participation_withdrawn',
      tenantId: tenant.tenantId,
      campaignId: saved.campaign_id,
      participationId: saved.id,
      userId: saved.user_id,
    });
    return this.toResponse(saved);
  }

  async syncAutoEnrolment(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<{ created: number; alreadyEnrolled: number; skipped: number }> {
    if (!this.autoEnrolment) {
      return { created: 0, alreadyEnrolled: 0, skipped: 0 };
    }
    return this.autoEnrolment.reconcileAutoEnrolment(tenant, campaignId);
  }

  private async requireVisible(
    tenant: TenantContext,
    participationId: string,
  ): Promise<Participation> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId, tenant_id: tenant.tenantId },
    });
    if (!participation) {
      throw new ResourceNotFoundException('Participation not found');
    }
    await this.campaigns.getCampaignRecord(tenant, participation.campaign_id);
    if (
      !this.canManageParticipations(tenant) &&
      !this.isOwn(tenant, participation)
    ) {
      throw new ResourceNotFoundException('Participation not found');
    }
    return participation;
  }

  private canManageParticipations(tenant: TenantContext): boolean {
    return (
      tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_CREATE) ||
      tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_UPDATE)
    );
  }

  private isOwn(tenant: TenantContext, participation: Participation): boolean {
    return tenant.memberships.some(
      (membership) =>
        membership.isActive && membership.userId === participation.user_id,
    );
  }

  private async engagementFor(
    participation: Participation,
  ): Promise<ParticipationEngagement> {
    if (participation.status === ParticipationStatus.WITHDRAWN) {
      return 'withdrawn';
    }
    const commitments = await this.commitmentRepository.find({
      where: {
        tenant_id: participation.tenant_id,
        participation_id: participation.id,
      },
    });
    const commitment = representativeCommitments(commitments).get(
      participation.id,
    );
    return deriveEngagement(participation.status, commitment?.decision ?? null);
  }

  private async engagementsFor(
    tenantId: string,
    participations: Participation[],
  ): Promise<Map<string, ParticipationEngagement>> {
    const result = new Map<string, ParticipationEngagement>();
    if (participations.length === 0) {
      return result;
    }
    const commitments = await this.commitmentRepository.find({
      where: {
        tenant_id: tenantId,
        participation_id: In(participations.map((row) => row.id)),
      },
    });
    const representative = representativeCommitments(commitments);
    for (const participation of participations) {
      result.set(
        participation.id,
        deriveEngagement(
          participation.status,
          representative.get(participation.id)?.decision ?? null,
        ),
      );
    }
    return result;
  }

  private async toResponse(
    participation: Participation,
  ): Promise<ParticipationResponse> {
    return {
      id: participation.id,
      customerId: participation.tenant_id,
      campaignId: participation.campaign_id,
      userId: participation.user_id,
      communityId: participation.community_id,
      status: participation.status,
      enrolmentSource:
        participation.enrolment_source ?? EnrolmentSource.SELF,
      engagement: await this.engagementFor(participation),
      enrolledAt: participation.enrolled_at.toISOString(),
      withdrawnAt: participation.withdrawn_at?.toISOString() ?? null,
      createdAt: participation.created_at.toISOString(),
      updatedAt: participation.updated_at.toISOString(),
    };
  }
}
