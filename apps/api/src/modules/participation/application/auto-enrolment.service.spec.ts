import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import { SYSTEM_ROLE_MEMBER } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  EnrolmentSource,
  Participation,
  ParticipationStatus,
} from '../domain/participation.entity.js';
import { AutoEnrolmentService } from './auto-enrolment.service.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userId = '55555555-5555-4555-8555-555555555555';
const membershipId = 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm';

const tenant: TenantContext = {
  tenantId,
  resourceCommunityId: null,
  memberships: [],
  permissions: new Set(),
};

describe('AutoEnrolmentService', () => {
  let service: AutoEnrolmentService;
  const participationRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const campaigns = {
    getCampaignRecord: vi.fn(),
    listAutoEnrolCampaigns: vi.fn(),
  };
  const memberships = {
    listActiveInTenant: vi.fn(),
    listActiveForUserInTenant: vi.fn(),
  };
  const communities = { listAncestorIds: vi.fn() };
  const authorization = { membershipHasRole: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    communities.listAncestorIds.mockResolvedValue([]);
    participationRepository.save.mockImplementation(async (value) => value);
    const module = await Test.createTestingModule({
      providers: [
        AutoEnrolmentService,
        {
          provide: getRepositoryToken(Participation),
          useValue: participationRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: MembershipService, useValue: memberships },
        { provide: CommunityService, useValue: communities },
        { provide: AuthorizationService, useValue: authorization },
      ],
    }).compile();
    service = module.get(AutoEnrolmentService);
  });

  it('creates missing auto participations for eligible members', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: { enrolmentMode: 'auto' },
    });
    memberships.listActiveInTenant.mockResolvedValue([
      {
        id: membershipId,
        tenantId,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    authorization.membershipHasRole.mockResolvedValue(true);
    participationRepository.findOne.mockResolvedValue(null);

    const result = await service.reconcileAutoEnrolment(tenant, campaignId);

    expect(result).toEqual({ created: 1, alreadyEnrolled: 0, skipped: 0 });
    expect(participationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        enrolment_source: EnrolmentSource.AUTO,
        status: ParticipationStatus.ENROLLED,
        user_id: userId,
      }),
    );
  });

  it('skips users without the member role', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: { enrolmentMode: 'auto' },
    });
    memberships.listActiveInTenant.mockResolvedValue([
      {
        id: membershipId,
        tenantId,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    authorization.membershipHasRole.mockImplementation(
      async (_id: string, roleKey: string) => roleKey !== SYSTEM_ROLE_MEMBER,
    );

    const result = await service.reconcileAutoEnrolment(tenant, campaignId);
    expect(result.skipped).toBe(1);
    expect(participationRepository.save).not.toHaveBeenCalled();
  });

  it('never resurrects a withdrawn participation', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId,
      status: CampaignStatus.STARTED,
      communityIds: [],
      configuration: { enrolmentMode: 'auto' },
    });
    memberships.listActiveInTenant.mockResolvedValue([
      {
        id: membershipId,
        tenantId,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    authorization.membershipHasRole.mockResolvedValue(true);
    participationRepository.findOne.mockResolvedValue({
      id: 'p1',
      status: ParticipationStatus.WITHDRAWN,
    });

    const result = await service.reconcileAutoEnrolment(tenant, campaignId);
    expect(result.skipped).toBe(1);
    expect(participationRepository.save).not.toHaveBeenCalled();
  });

  it('no-ops for opt_in campaigns', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId,
      status: CampaignStatus.PUBLISHED,
      communityIds: [],
      configuration: { enrolmentMode: 'opt_in' },
    });
    const result = await service.reconcileAutoEnrolment(tenant, campaignId);
    expect(result).toEqual({ created: 0, alreadyEnrolled: 0, skipped: 0 });
  });
});
