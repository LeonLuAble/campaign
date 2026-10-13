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
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  Participation,
  ParticipationStatus,
} from '../domain/participation.entity.js';
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
  const campaigns = { getCampaignRecord: vi.fn() };
  const memberships = { listActiveForUserInTenant: vi.fn() };
  const communities = { listAncestorIds: vi.fn() };
  const customers = { requireActive: vi.fn() };
  const identities = { isUserActive: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    identities.isUserActive.mockResolvedValue(true);
    communities.listAncestorIds.mockResolvedValue([]);
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
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
        { provide: CampaignService, useValue: campaigns },
        { provide: MembershipService, useValue: memberships },
        { provide: CommunityService, useValue: communities },
        { provide: CustomerService, useValue: customers },
        { provide: IdentityAccountService, useValue: identities },
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
  });

  it('rejects enrollment while the campaign is still draft', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.DRAFT,
      communityIds: [],
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

  it('rejects a second active enrollment', async () => {
    participationRepository.findOne.mockResolvedValue(participation());
    await expect(
      service.enroll(adminContext(), campaignId, 'admin-user', userId),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it('lists only the caller participation for a member', async () => {
    participationRepository.find.mockResolvedValue([
      participation(),
      participation({ id: 'other', user_id: 'someone-else' }),
    ]);
    const rows = await service.listForCampaign(memberContext(), campaignId);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
  });

  it('hides another user’s participation from a member', async () => {
    participationRepository.findOne.mockResolvedValue(
      participation({ user_id: 'someone-else' }),
    );
    await expect(
      service.get(memberContext(), 'participation-1'),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('lets a member enroll themselves without participations.create', async () => {
    participationRepository.findOne.mockResolvedValue(null);
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: 'member-membership',
        tenantId: tenantA,
        userId,
        communityId,
        isActive: true,
      },
    ]);
    const created = await service.enroll(memberContext(), campaignId, userId);
    expect(created.status).toBe(ParticipationStatus.ENROLLED);
    expect(created.userId).toBe(userId);
  });

  it('lets a member enroll themselves when they pass their own userId', async () => {
    participationRepository.findOne.mockResolvedValue(null);
    const created = await service.enroll(
      memberContext(),
      campaignId,
      userId,
      userId,
    );
    expect(created.userId).toBe(userId);
  });

  it('forbids a member from enrolling another user', async () => {
    await expect(
      service.enroll(
        memberContext(),
        campaignId,
        userId,
        '66666666-6666-4666-8666-666666666666',
      ),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
    expect(identities.isUserActive).not.toHaveBeenCalled();
  });

  it('lets a member withdraw themselves without participations.update', async () => {
    participationRepository.findOne.mockResolvedValue(participation());
    const withdrawn = await service.withdraw(
      memberContext(),
      'participation-1',
      userId,
    );
    expect(withdrawn.status).toBe(ParticipationStatus.WITHDRAWN);
    expect(withdrawn.withdrawnAt).toEqual(expect.any(String));
  });

  it('hides another user’s participation when a member tries to withdraw it', async () => {
    participationRepository.findOne.mockResolvedValue(
      participation({ user_id: 'someone-else' }),
    );
    await expect(
      service.withdraw(memberContext(), 'participation-1', userId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
