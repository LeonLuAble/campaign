import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { Commitment } from '../../commitments/domain/commitment.entity.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  EnrolmentSource,
  Participation,
  ParticipationStatus,
} from '../domain/participation.entity.js';
import { AUTO_ENROLMENT_SERVICE } from './auto-enrolment.tokens.js';
import { ParticipationService } from './participation.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userId = '55555555-5555-4555-8555-555555555555';
const communityId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function adminContext(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'admin-membership',
        tenantId: tenantA,
        userId: 'admin-user',
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set([
      PERMISSIONS.PARTICIPATIONS_CREATE,
      PERMISSIONS.PARTICIPATIONS_READ,
      PERMISSIONS.PARTICIPATIONS_UPDATE,
    ]),
  };
}

function memberContext(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: communityId,
    memberships: [
      {
        id: 'member-membership',
        tenantId: tenantA,
        userId,
        communityId,
        isActive: true,
      },
    ],
    permissions: new Set([PERMISSIONS.PARTICIPATIONS_READ]),
  };
}

function participation(overrides: Partial<Participation> = {}): Participation {
  return {
    id: 'participation-1',
    tenant_id: tenantA,
    campaign_id: campaignId,
    user_id: userId,
    community_id: communityId,
    status: ParticipationStatus.ENROLLED,
    enrolment_source: EnrolmentSource.SELF,
    enrolled_at: new Date('2026-01-02T00:00:00.000Z'),
    withdrawn_at: null,
    created_at: new Date('2026-01-02T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ParticipationService', () => {
  let service: ParticipationService;
  const participationRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const commitmentRepository = {
    findOne: vi.fn(),
  };
  const campaigns = { getCampaignRecord: vi.fn() };
  const memberships = { listActiveForUserInTenant: vi.fn() };
  const communities = { listAncestorIds: vi.fn() };
  const customers = { requireActive: vi.fn() };
  const identities = { isUserActive: vi.fn() };
  const autoEnrolment = {
    ensureCallerEnrolledIfAuto: vi.fn(),
    reconcileAutoEnrolment: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    identities.isUserActive.mockResolvedValue(true);
    communities.listAncestorIds.mockResolvedValue([]);
    commitmentRepository.findOne.mockResolvedValue(null);
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: {},
    });
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: 'm1',
        tenantId: tenantA,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    participationRepository.save.mockImplementation(
      async (value: Participation) => ({
        ...value,
        id: value.id ?? 'participation-1',
        enrolment_source: value.enrolment_source ?? EnrolmentSource.SELF,
        created_at: value.created_at ?? new Date('2026-01-02T00:00:00.000Z'),
        updated_at: value.updated_at ?? new Date('2026-01-02T00:00:00.000Z'),
      }),
    );
    const module = await Test.createTestingModule({
      providers: [
        ParticipationService,
        {
          provide: getRepositoryToken(Participation),
          useValue: participationRepository,
        },
        {
          provide: getRepositoryToken(Commitment),
          useValue: commitmentRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: MembershipService, useValue: memberships },
        { provide: CommunityService, useValue: communities },
        { provide: CustomerService, useValue: customers },
        { provide: IdentityAccountService, useValue: identities },
        { provide: AUTO_ENROLMENT_SERVICE, useValue: autoEnrolment },
      ],
    }).compile();
    service = module.get(ParticipationService);
  });

  it('enrolls an eligible tenant member in a published campaign', async () => {
    participationRepository.findOne.mockResolvedValue(null);
    const created = await service.enroll(
      adminContext(),
      campaignId,
      'admin-user',
      userId,
    );
    expect(created.status).toBe(ParticipationStatus.ENROLLED);
    expect(created.userId).toBe(userId);
    expect(created.communityId).toBeNull();
    expect(created.enrolmentSource).toBe(EnrolmentSource.ADMIN);
    expect(created.engagement).toBe('awaiting_commitment');
  });

  it('rejects enrollment while the campaign is still draft', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.DRAFT,
      communityIds: [],
      configuration: {},
    });
    await expect(
      service.enroll(adminContext(), campaignId, 'admin-user', userId),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('rejects enrollment when the user is outside targeted communities', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
      communityIds: [communityId],
      configuration: {},
    });
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: 'hq',
        tenantId: tenantA,
        userId,
        communityId: 'hq',
        isActive: true,
      },
    ]);
    await expect(
      service.enroll(adminContext(), campaignId, 'admin-user', userId),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('restores a withdrawn participation instead of inserting a second row', async () => {
    participationRepository.findOne.mockResolvedValue(
      participation({ status: ParticipationStatus.WITHDRAWN }),
    );
    const restored = await service.enroll(
      adminContext(),
      campaignId,
      'admin-user',
      userId,
    );
    expect(restored.status).toBe(ParticipationStatus.ENROLLED);
    expect(restored.withdrawnAt).toBeNull();
  });

  it('returns the existing row without error for self-enroll in auto mode', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: { enrolmentMode: 'auto' },
    });
    participationRepository.findOne.mockResolvedValue(
      participation({ enrolment_source: EnrolmentSource.AUTO }),
    );
    const result = await service.enroll(memberContext(), campaignId, userId);
    expect(result.enrolmentSource).toBe(EnrolmentSource.AUTO);
    expect(participationRepository.save).not.toHaveBeenCalled();
  });

  it('blocks member self-withdraw in auto mode with ENROLMENT_AUTO_MANAGED', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: { enrolmentMode: 'auto' },
    });
    participationRepository.findOne.mockResolvedValue(participation());
    try {
      await service.withdraw(memberContext(), 'participation-1', userId);
      expect.unreachable('expected ENROLMENT_AUTO_MANAGED');
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceConflictException);
      expect(
        (error as ResourceConflictException).getResponse(),
      ).toMatchObject({ code: 'ENROLMENT_AUTO_MANAGED' });
    }
  });

  it('allows admin withdraw in auto mode', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: { enrolmentMode: 'auto' },
    });
    participationRepository.findOne.mockResolvedValue(participation());
    const withdrawn = await service.withdraw(
      adminContext(),
      'participation-1',
      'admin-user',
    );
    expect(withdrawn.status).toBe(ParticipationStatus.WITHDRAWN);
    expect(withdrawn.engagement).toBe('withdrawn');
  });

  it('rejects enrolling another user without participations.create', async () => {
    await expect(
      service.enroll(memberContext(), campaignId, userId, 'other-user'),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });

  it('returns not found for unknown participation', async () => {
    participationRepository.findOne.mockResolvedValue(null);
    await expect(
      service.get(adminContext(), 'missing'),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('rejects duplicate enroll for already enrolled user in opt_in mode', async () => {
    participationRepository.findOne.mockResolvedValue(participation());
    await expect(
      service.enroll(adminContext(), campaignId, 'admin-user', userId),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });
});
