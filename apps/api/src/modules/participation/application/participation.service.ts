import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { canEnrollInCampaign } from '../../campaigns/application/campaign-lifecycle.js';
import { enrollmentCommunityId } from '../../campaigns/application/campaign-visibility.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  Participation,
  ParticipationStatus,
} from '../domain/participation.entity.js';

export interface ParticipationResponse {
  id: string;
  customerId: string;
  campaignId: string;
  userId: string;
  communityId: string | null;
  status: ParticipationStatus;
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
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => MembershipService))
    private readonly memberships: MembershipService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    private readonly identities: IdentityAccountService,
  ) {}

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
    return visible.map((row) => this.toResponse(row));
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
    if (
      targetUserId !== actorUserId &&
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
    if (existing) {
      if (existing.status === ParticipationStatus.ENROLLED) {
        throw new ResourceConflictException(
          'User is already enrolled in this campaign',
        );
      }
      existing.status = ParticipationStatus.ENROLLED;
      existing.community_id = communityId;
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

    try {
      const saved = await this.participationRepository.save(
        this.participationRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaignId,
          user_id: targetUserId,
          community_id: communityId,
          status: ParticipationStatus.ENROLLED,
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
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
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
    if (
      participation.user_id !== actorUserId &&
      !tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_UPDATE)
    ) {
      throw new AccessForbiddenException(
        'Withdrawing another user requires participations.update',
      );
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

  private toResponse(participation: Participation): ParticipationResponse {
    return {
      id: participation.id,
      customerId: participation.tenant_id,
      campaignId: participation.campaign_id,
      userId: participation.user_id,
      communityId: participation.community_id,
      status: participation.status,
      enrolledAt: participation.enrolled_at.toISOString(),
      withdrawnAt: participation.withdrawn_at?.toISOString() ?? null,
      createdAt: participation.created_at.toISOString(),
      updatedAt: participation.updated_at.toISOString(),
    };
  }
}
