import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CAMPAIGN_RULE_STRATEGIES } from '../../campaigns/application/campaign-rule-strategy.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { LocalizationService } from '../../localization/application/localization.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import {
  Commitment,
  CommitmentDecision,
} from '../domain/commitment.entity.js';
import { CommitmentService } from './commitment.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userId = '55555555-5555-4555-8555-555555555555';
const participationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
      PERMISSIONS.COMMITMENTS_CREATE,
      PERMISSIONS.COMMITMENTS_READ,
      PERMISSIONS.COMMITMENTS_UPDATE,
    ]),
  };
}

function memberContext(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'member-membership',
        tenantId: tenantA,
        userId,
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set([
      PERMISSIONS.COMMITMENTS_CREATE,
      PERMISSIONS.COMMITMENTS_READ,
    ]),
  };
}

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'commitment-1',
    tenant_id: tenantA,
    campaign_id: campaignId,
    participation_id: participationId,
    decision: CommitmentDecision.COMMITTED,
    type_key: 'fa_yuan_su',
    target_value: 30,
    unit: 'days',
    payload: {},
    created_at: new Date('2026-10-13T00:00:00.000Z'),
    updated_at: new Date('2026-10-13T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CommitmentService', () => {
  let service: CommitmentService;
  const commitmentRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const participations = { getParticipationRecord: vi.fn() };
  const campaigns = { getCampaignRecord: vi.fn() };
  const customers = { requireActive: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId,
      communityId: null,
      status: ParticipationStatus.ENROLLED,
    });
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      configuration: { rulesStrategy: 'vegetarian' },
      communityIds: [],
    });
    commitmentRepository.save.mockImplementation(async (value: Commitment) => ({
      ...commitment(),
      ...value,
      id: value.id ?? 'commitment-1',
    }));
    const module = await Test.createTestingModule({
      providers: [
        CommitmentService,
        {
          provide: getRepositoryToken(Commitment),
          useValue: commitmentRepository,
        },
        { provide: ParticipationService, useValue: participations },
        { provide: CampaignService, useValue: campaigns },
        { provide: CustomerService, useValue: customers },
        {
          provide: LocalizationService,
          useValue: {
            resolveTranslation: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CAMPAIGN_RULE_STRATEGIES,
          useValue: [new VegetarianRuleStrategy()],
        },
      ],
    }).compile();
    service = module.get(CommitmentService);
  });

  it('returns vegetarian pledge choices from campaign configuration', async () => {
    const options = await service.listCommitmentOptions(
      memberContext(),
      campaignId,
      'en',
    );
    expect(options).toMatchObject({
      campaignId,
      customerId: tenantA,
      strategy: 'vegetarian',
    });
    expect(options.choices.map((choice) => choice.key)).toContain('fa_yuan_su');
    expect(options.units).toEqual(['days', 'meals']);
    const faYuan = options.choices.find((choice) => choice.key === 'fa_yuan_su');
    expect(faYuan?.label).toBe('Fa Yuan Su');
    expect(faYuan?.description).toContain('personal vow');
    expect(faYuan?.name).toBe('发愿素');
  });

  it('lets a member pledge a vegetarian commitment on their participation', async () => {
    commitmentRepository.findOne.mockResolvedValue(null);
    const created = await service.createOrReplace(
      memberContext(),
      participationId,
      userId,
      { typeKey: '发愿素', targetValue: 30, unit: 'days' },
    );
    expect(created.typeKey).toBe('fa_yuan_su');
    expect(created.targetValue).toBe(30);
  });

  it('replaces an existing commitment instead of inserting a second row', async () => {
    commitmentRepository.findOne.mockResolvedValue(commitment());
    const updated = await service.createOrReplace(
      memberContext(),
      participationId,
      userId,
      { typeKey: 'yi_zhou_su', targetValue: 7, unit: 'days' },
    );
    expect(updated.typeKey).toBe('yi_zhou_su');
    expect(updated.targetValue).toBe(7);
  });

  it('rejects an unknown vegetarian choice', async () => {
    commitmentRepository.findOne.mockResolvedValue(null);
    await expect(
      service.createOrReplace(memberContext(), participationId, userId, {
        typeKey: 'keto',
        targetValue: 10,
        unit: 'days',
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('forbids a member from pledging on another user participation', async () => {
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId: 'someone-else',
      communityId: null,
      status: ParticipationStatus.ENROLLED,
    });
    await expect(
      service.createOrReplace(memberContext(), participationId, userId, {
        typeKey: 'fa_yuan_su',
        targetValue: 10,
        unit: 'days',
      }),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });

  it('hides another user’s commitment from a member', async () => {
    commitmentRepository.findOne.mockResolvedValue(commitment());
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId: 'someone-else',
      communityId: null,
      status: ParticipationStatus.ENROLLED,
    });
    await expect(
      service.get(memberContext(), 'commitment-1'),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('lets an admin correct another participant commitment', async () => {
    commitmentRepository.findOne.mockResolvedValue(commitment());
    const updated = await service.update(
      adminContext(),
      'commitment-1',
      'admin-user',
      { targetValue: 40 },
    );
    expect(updated.targetValue).toBe(40);
  });

  it('records not taking part with a zero target and no option', async () => {
    commitmentRepository.findOne.mockResolvedValue(null);
    const declined = await service.createOrReplace(
      memberContext(),
      participationId,
      userId,
      { decision: CommitmentDecision.NOT_TAKING_PART },
    );
    expect(declined).toMatchObject({
      decision: 'not_taking_part',
      typeKey: null,
      targetValue: 0,
      unit: null,
    });
    expect(commitmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: CommitmentDecision.NOT_TAKING_PART,
        target_value: 0,
        unit: null,
        type_key: null,
      }),
    );
  });

  it('switches an existing commitment to not taking part and back on the same row', async () => {
    const row = commitment();
    commitmentRepository.findOne.mockResolvedValue(row);
    const declined = await service.createOrReplace(
      memberContext(),
      participationId,
      userId,
      { decision: CommitmentDecision.NOT_TAKING_PART },
    );
    expect(declined).toMatchObject({
      id: 'commitment-1',
      decision: 'not_taking_part',
      targetValue: 0,
    });

    const recommitted = await service.createOrReplace(
      memberContext(),
      participationId,
      userId,
      {
        decision: CommitmentDecision.COMMITTED,
        typeKey: 'yi_zhou_su',
        targetValue: 7,
        unit: 'days',
      },
    );
    expect(recommitted).toMatchObject({
      id: 'commitment-1',
      decision: 'committed',
      typeKey: 'yi_zhou_su',
      targetValue: 7,
      unit: 'days',
    });
  });

  it('requires a target and unit when committing', async () => {
    commitmentRepository.findOne.mockResolvedValue(null);
    await expect(
      service.createOrReplace(memberContext(), participationId, userId, {
        decision: CommitmentDecision.COMMITTED,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('rejects a decision once the campaign no longer allows edits', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.COMPLETED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      configuration: { rulesStrategy: 'vegetarian' },
      communityIds: [],
    });
    await expect(
      service.createOrReplace(memberContext(), participationId, userId, {
        decision: CommitmentDecision.NOT_TAKING_PART,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('refuses an admin target correction on a not-taking-part decision', async () => {
    commitmentRepository.findOne.mockResolvedValue(
      commitment({
        decision: CommitmentDecision.NOT_TAKING_PART,
        type_key: null,
        target_value: 0,
        unit: null,
      }),
    );
    await expect(
      service.update(adminContext(), 'commitment-1', 'admin-user', {
        targetValue: 5,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });
});
