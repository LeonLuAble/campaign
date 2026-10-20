import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import {
  ACTION_READER,
  CAMPAIGN_READER,
  COMMITMENT_READER,
  COMMUNITY_READER,
  IMPACT_FACTOR_READER,
  MEASUREMENT_DEFINITION_READER,
  MILESTONE_READER,
  MEMBERSHIP_READER,
  PARTICIPATION_READER,
  TENANT_READER,
  type ActionReader,
  type CampaignReader,
  type CommitmentReader,
  type CommunityReader,
  type ImpactFactorReader,
  type MeasurementDefinitionReader,
  type MilestoneReader,
  type MembershipReader,
  type ParticipationReader,
  type TenantReader,
} from './access-readers.js';
import { AuthorizationService } from './authorization.service.js';
import type { TenantContext, TenantScopeInput } from './tenant-context.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(
  value: string | null | undefined,
  field: string,
): string | null {
  if (!value) {
    return null;
  }
  if (!UUID_PATTERN.test(value)) {
    throw new InvalidRequestException(`${field} must be a UUID`);
  }
  return value;
}

@Injectable()
export class TenantContextService {
  constructor(
    @Inject(forwardRef(() => TENANT_READER))
    private readonly tenants: TenantReader,
    @Inject(forwardRef(() => COMMUNITY_READER))
    private readonly communities: CommunityReader,
    @Inject(forwardRef(() => MEMBERSHIP_READER))
    private readonly memberships: MembershipReader,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
    @Inject(forwardRef(() => CAMPAIGN_READER))
    private readonly campaigns: CampaignReader,
    @Inject(forwardRef(() => PARTICIPATION_READER))
    private readonly participations: ParticipationReader,
    @Inject(forwardRef(() => ACTION_READER))
    private readonly actions: ActionReader,
    @Inject(forwardRef(() => COMMITMENT_READER))
    private readonly commitments: CommitmentReader,
    @Inject(forwardRef(() => MILESTONE_READER))
    private readonly milestones: MilestoneReader,
    @Inject(forwardRef(() => MEASUREMENT_DEFINITION_READER))
    private readonly measurementDefinitions: MeasurementDefinitionReader,
    @Inject(forwardRef(() => IMPACT_FACTOR_READER))
    private readonly impactFactors: ImpactFactorReader,
  ) {}

  async build(userId: string, input: TenantScopeInput): Promise<TenantContext> {
    const normalized: TenantScopeInput = {
      customerId: requireUuid(input.customerId, 'customerId'),
      communityId: requireUuid(input.communityId, 'communityId'),
      membershipId: requireUuid(input.membershipId, 'membershipId'),
      roleId: requireUuid(input.roleId, 'roleId'),
      parentId: requireUuid(input.parentId, 'parentId'),
      campaignId: requireUuid(input.campaignId, 'campaignId'),
      templateId: requireUuid(input.templateId, 'templateId'),
      scopeId: requireUuid(input.scopeId, 'scopeId'),
      participationId: requireUuid(input.participationId, 'participationId'),
      actionId: requireUuid(input.actionId, 'actionId'),
      actionDefinitionId: requireUuid(
        input.actionDefinitionId,
        'actionDefinitionId',
      ),
      submissionId: requireUuid(input.submissionId, 'submissionId'),
      actionBatchId: requireUuid(input.actionBatchId, 'actionBatchId'),
      commitmentId: requireUuid(input.commitmentId, 'commitmentId'),
      milestoneId: requireUuid(input.milestoneId, 'milestoneId'),
      measurementDefinitionId: requireUuid(
        input.measurementDefinitionId,
        'measurementDefinitionId',
      ),
      impactFactorId: requireUuid(input.impactFactorId, 'impactFactorId'),
    };
    const tenantId = await this.resolveTenantId(normalized);
    const memberships = await this.memberships.listActiveForUserInTenant(
      userId,
      tenantId,
    );
    if (memberships.length === 0) {
      throw new ResourceNotFoundException('Resource not found');
    }

    const resourceCommunityId = this.resourceCommunityId(normalized);
    if (resourceCommunityId) {
      const community = await this.communities.findById(resourceCommunityId);
      if (!community || community.tenantId !== tenantId) {
        throw new ResourceNotFoundException('Resource not found');
      }
    }

    const permissions =
      await this.authorization.resolvePermissionKeys(memberships);

    return {
      tenantId,
      resourceCommunityId,
      memberships,
      permissions,
    };
  }

  private async resolveTenantId(input: TenantScopeInput): Promise<string> {
    const candidates = new Set<string>();

    if (input.customerId) {
      const tenant = await this.tenants.findById(input.customerId);
      if (!tenant) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(tenant.id);
    }

    if (input.communityId) {
      const community = await this.communities.findById(input.communityId);
      if (!community) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(community.tenantId);
    }

    if (input.parentId) {
      const parent = await this.communities.findById(input.parentId);
      if (!parent) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(parent.tenantId);
    }

    if (input.membershipId) {
      const membership = await this.memberships.findById(input.membershipId);
      if (!membership) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(membership.tenantId);
    }

    if (input.roleId) {
      const role = await this.authorization.findRoleById(input.roleId);
      if (!role) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(role.tenant_id);
    }

    if (input.campaignId) {
      const campaign = await this.campaigns.findCampaignById(input.campaignId);
      if (!campaign) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(campaign.tenantId);
    }

    if (input.templateId) {
      const template = await this.campaigns.findTemplateById(input.templateId);
      if (!template) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(template.tenantId);
    }

    if (input.scopeId) {
      const scope = await this.campaigns.findScopeById(input.scopeId);
      if (!scope) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(scope.tenantId);
    }

    if (input.participationId) {
      const participation = await this.participations.findById(
        input.participationId,
      );
      if (!participation) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(participation.tenantId);
    }

    if (input.actionId) {
      const action = await this.actions.findActionById(input.actionId);
      if (!action) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(action.tenantId);
    }

    if (input.actionDefinitionId) {
      const definition = await this.actions.findDefinitionById(
        input.actionDefinitionId,
      );
      if (!definition) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(definition.tenantId);
    }

    if (input.submissionId) {
      const submission = await this.actions.findSubmissionById(
        input.submissionId,
      );
      if (!submission) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(submission.tenantId);
    }

    if (input.actionBatchId) {
      const batch = await this.actions.findBatchById(input.actionBatchId);
      if (!batch) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(batch.tenantId);
    }

    if (input.commitmentId) {
      const commitment = await this.commitments.findById(input.commitmentId);
      if (!commitment) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(commitment.tenantId);
    }

    if (input.milestoneId) {
      const milestone = await this.milestones.findById(input.milestoneId);
      if (!milestone) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(milestone.tenantId);
    }

    if (input.measurementDefinitionId) {
      const definition = await this.measurementDefinitions.findById(
        input.measurementDefinitionId,
      );
      if (!definition) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(definition.tenantId);
    }

    if (input.impactFactorId) {
      const factor = await this.impactFactors.findById(input.impactFactorId);
      if (!factor) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(factor.tenantId);
    }

    if (candidates.size === 0) {
      throw new InvalidRequestException('customerId is required');
    }
    if (candidates.size > 1) {
      throw new ResourceNotFoundException('Resource not found');
    }
    return [...candidates][0];
  }

  private resourceCommunityId(input: TenantScopeInput): string | null {
    return input.communityId ?? input.parentId ?? null;
  }
}
