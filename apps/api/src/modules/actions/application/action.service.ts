import {
  Inject,
  Injectable,
  Logger,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import {
  isRaiseException,
  isUniqueViolation,
} from '../../../shared/database/postgres-errors.js';
import { slugify } from '../../../shared/text/slugify.js';
import type { CampaignAccessRecord } from '../../authorization/application/access-readers.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import {
  CAMPAIGN_RULE_STRATEGIES,
  GenericCampaignRules,
  resolveCampaignRules,
  type CampaignRuleStrategy,
} from '../../campaigns/application/campaign-rule-strategy.js';
import { readSubmissionReview } from '../../campaigns/application/campaign-settings.js';
import { canRecordActions } from '../../campaigns/application/campaign-lifecycle.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import {
  assertOccurredOnInCampaignWindow,
  normalizeSettings,
  resolveOccurredOn,
  toIsoDate,
} from '../../campaigns/application/timezone.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { Commitment } from '../../commitments/domain/commitment.entity.js';
import { MilestoneService } from '../../milestones/application/milestone.service.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { ActionBatch } from '../domain/action-batch.entity.js';
import { ActionDefinition } from '../domain/action-definition.entity.js';
import { Action, ActionStatus, PrivacyLevel } from '../domain/action.entity.js';
import { Submission, SubmissionStatus } from '../domain/submission.entity.js';
import { rangeCoverage } from '../domain/day-coverage.js';
import type { CreateActionDefinitionDto } from '../dto/create-action-definition.dto.js';
import type { UpdateActionDefinitionDto } from '../dto/update-action-definition.dto.js';
import type { CreateActionDto } from '../dto/create-action.dto.js';
import type { UpdateActionDto } from '../dto/update-action.dto.js';

export interface ActionDefinitionResponse {
  id: string;
  customerId: string;
  campaignId: string;
  key: string;
  name: string;
  unit: string;
  description: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionResponse {
  id: string;
  customerId: string;
  actionId: string;
  status: SubmissionStatus;
  submittedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResponse {
  id: string;
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  actionDefinitionId: string;
  occurredOn: string;
  quantity: number;
  privacyLevel: PrivacyLevel;
  status: ActionStatus;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  /** Set when the day belongs to a range entry. */
  batchId: string | null;
  recordedByUserId: string;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  correctedAt: string | null;
  correctedByUserId: string | null;
  submission: SubmissionResponse | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);
  private readonly genericRules = new GenericCampaignRules();

  constructor(
    @InjectRepository(ActionDefinition)
    private readonly definitionRepository: Repository<ActionDefinition>,
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ActionBatch)
    private readonly batchRepository: Repository<ActionBatch>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @Inject(forwardRef(() => MilestoneService))
    private readonly milestones: MilestoneService,
    @Optional()
    @Inject(CAMPAIGN_RULE_STRATEGIES)
    private readonly strategies: CampaignRuleStrategy[] | null,
  ) {}

  async hasApprovedActionOn(
    tenantId: string,
    participationId: string,
    occurredOn: string,
  ): Promise<boolean> {
    const actions = await this.actionRepository.find({
      where: {
        tenant_id: tenantId,
        participation_id: participationId,
        occurred_on: occurredOn,
        status: ActionStatus.RECORDED,
      },
    });
    if (actions.length === 0) {
      return false;
    }
    const submissions = await this.submissionRepository.find({
      where: { action_id: In(actions.map((action) => action.id)) },
    });
    return submissions.some(
      (submission) => submission.status === SubmissionStatus.APPROVED,
    );
  }

  async findActionById(id: string): Promise<CampaignAccessRecord | null> {
    const action = await this.actionRepository.findOne({ where: { id } });
    return action ? { id: action.id, tenantId: action.tenant_id } : null;
  }

  async findBatchById(id: string): Promise<CampaignAccessRecord | null> {
    const batch = await this.batchRepository.findOne({ where: { id } });
    return batch ? { id: batch.id, tenantId: batch.tenant_id } : null;
  }

  async findDefinitionById(id: string): Promise<CampaignAccessRecord | null> {
    const definition = await this.definitionRepository.findOne({
      where: { id },
    });
    return definition
      ? { id: definition.id, tenantId: definition.tenant_id }
      : null;
  }

  async findSubmissionById(id: string): Promise<CampaignAccessRecord | null> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
    });
    return submission
      ? { id: submission.id, tenantId: submission.tenant_id }
      : null;
  }

  async listDefinitions(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<ActionDefinitionResponse[]> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rows = await this.definitionRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
      order: { created_at: 'ASC' },
    });
    return rows.map((row) => this.toDefinitionResponse(row));
  }

  async getDefinition(
    tenant: TenantContext,
    definitionId: string,
  ): Promise<ActionDefinitionResponse> {
    const definition = await this.requireDefinition(tenant, definitionId);
    await this.campaigns.getCampaignRecord(tenant, definition.campaign_id);
    return this.toDefinitionResponse(definition);
  }

  async createDefinition(
    tenant: TenantContext,
    campaignId: string,
    dto: CreateActionDefinitionDto,
  ): Promise<ActionDefinitionResponse> {
    await this.assertCanManageDefinitions(tenant);
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new InvalidRequestException(
        'Action definitions cannot be changed after the campaign is completed',
      );
    }
    const settings = normalizeSettings(dto.settings);
    const key = this.normalizeKey(dto.key ?? dto.name, 'action');
    try {
      const saved = await this.definitionRepository.save(
        this.definitionRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaign.id,
          key,
          name: dto.name.trim(),
          unit: dto.unit.trim(),
          description: dto.description?.trim() || null,
          is_active: true,
          settings,
        }),
      );
      this.logger.log({
        msg: 'action_definition_created',
        tenantId: tenant.tenantId,
        campaignId: campaign.id,
        actionDefinitionId: saved.id,
      });
      return this.toDefinitionResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'An action definition with this key already exists',
        );
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Campaign not found');
      }
      throw error;
    }
  }

  async updateDefinition(
    tenant: TenantContext,
    definitionId: string,
    dto: UpdateActionDefinitionDto,
  ): Promise<ActionDefinitionResponse> {
    await this.assertCanManageDefinitions(tenant);
    const definition = await this.requireDefinition(tenant, definitionId);
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      definition.campaign_id,
    );
    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new InvalidRequestException(
        'Action definitions cannot be changed after the campaign is completed',
      );
    }
    if (dto.name !== undefined) {
      definition.name = dto.name.trim();
    }
    if (dto.unit !== undefined) {
      definition.unit = dto.unit.trim();
    }
    if (dto.description !== undefined) {
      definition.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      definition.is_active = dto.isActive;
    }
    if (dto.settings !== undefined) {
      definition.settings = normalizeSettings(dto.settings);
    }
    const saved = await this.definitionRepository.save(definition);
    this.logger.log({
      msg: 'action_definition_updated',
      tenantId: tenant.tenantId,
      actionDefinitionId: saved.id,
    });
    return this.toDefinitionResponse(saved);
  }

  async listForCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<ActionResponse[]> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rows = await this.actionRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
      order: { occurred_on: 'ASC', created_at: 'ASC' },
    });
    return this.toActionResponses(
      tenant,
      rows.filter((row) => this.canViewAction(tenant, row)),
    );
  }

  async listForParticipation(
    tenant: TenantContext,
    participationId: string,
  ): Promise<ActionResponse[]> {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    const rows = await this.actionRepository.find({
      where: {
        tenant_id: tenant.tenantId,
        participation_id: participation.id,
      },
      order: { occurred_on: 'ASC', created_at: 'ASC' },
    });
    return this.toActionResponses(
      tenant,
      rows.filter((row) => this.canViewAction(tenant, row)),
    );
  }

  async get(tenant: TenantContext, actionId: string): Promise<ActionResponse> {
    const action = await this.requireVisibleAction(tenant, actionId);
    const [mapped] = await this.toActionResponses(tenant, [action]);
    return mapped;
  }

  async record(
    tenant: TenantContext,
    actorUserId: string,
    dto: CreateActionDto,
    now = new Date(),
  ): Promise<ActionResponse> {
    const { participation, campaign, definition } =
      await this.prepareRecording(
        tenant,
        actorUserId,
        dto.participationId,
        dto.actionDefinitionId,
      );

    const occurredOn = resolveOccurredOn(
      dto.occurredOn,
      campaign.timezone,
      now,
    );
    assertOccurredOnInCampaignWindow(
      occurredOn,
      campaign.startsOn,
      campaign.endsOn,
    );
    const quantity = dto.quantity ?? 1;
    const payload = normalizeSettings(dto.payload);
    this.rulesFor(campaign.configuration).validateAction({
      definitionKey: definition.key,
      definitionUnit: definition.unit,
      quantity,
      payload,
    });
    const privacyLevel = dto.privacyLevel ?? PrivacyLevel.PRIVATE;
    const idempotencyKey = dto.idempotencyKey?.trim() || null;
    const autoApprove = readSubmissionReview(campaign.configuration) === 'auto';

    if (idempotencyKey) {
      const existing = await this.actionRepository.findOne({
        where: {
          participation_id: participation.id,
          idempotency_key: idempotencyKey,
        },
      });
      if (existing) {
        this.assertIdempotentReplay(existing, {
          actionDefinitionId: definition.id,
          occurredOn,
          quantity,
          privacyLevel,
          payload,
        });
        const [mapped] = await this.toActionResponses(tenant, [existing]);
        return mapped;
      }
    }
    await this.assertCoverage(tenant, participation.id, campaign, occurredOn, occurredOn);

    try {
      const saved = await this.actionRepository.manager.transaction(
        async (manager) => {
          const action = await manager.save(
            Action,
            manager.create(Action, {
              tenant_id: tenant.tenantId,
              campaign_id: participation.campaignId,
              participation_id: participation.id,
              user_id: participation.userId,
              action_definition_id: definition.id,
              occurred_on: occurredOn,
              quantity,
              privacy_level: privacyLevel,
              status: ActionStatus.RECORDED,
              payload,
              idempotency_key: idempotencyKey,
              recorded_by_user_id: actorUserId,
              cancelled_at: null,
              cancelled_by_user_id: null,
              corrected_at: null,
              corrected_by_user_id: null,
            }),
          );
          await manager.save(
            Submission,
            manager.create(Submission, {
              tenant_id: tenant.tenantId,
              action_id: action.id,
              status: autoApprove
                ? SubmissionStatus.APPROVED
                : SubmissionStatus.SUBMITTED,
              submitted_by_user_id: actorUserId,
              reviewed_by_user_id: null,
              reviewed_at: autoApprove ? now : null,
              review_note: null,
            }),
          );
          return action;
        },
      );
      this.logger.log({
        msg: 'action_recorded',
        tenantId: tenant.tenantId,
        campaignId: saved.campaign_id,
        participationId: saved.participation_id,
        actionId: saved.id,
      });
      const [mapped] = await this.toActionResponses(tenant, [saved]);
      return mapped;
    } catch (error) {
      if (isUniqueViolation(error) && idempotencyKey) {
        const existing = await this.actionRepository.findOne({
          where: {
            participation_id: participation.id,
            idempotency_key: idempotencyKey,
          },
        });
        if (existing) {
          this.assertIdempotentReplay(existing, {
            actionDefinitionId: definition.id,
            occurredOn,
            quantity,
            privacyLevel,
            payload,
          });
          const [mapped] = await this.toActionResponses(tenant, [existing]);
          return mapped;
        }
      }
      if (isUniqueViolation(error)) {
        throw overlapException([occurredOn]);
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Action could not be recorded');
      }
      throw error;
    }
  }

  async update(
    tenant: TenantContext,
    actionId: string,
    actorUserId: string,
    dto: UpdateActionDto,
    now = new Date(),
  ): Promise<ActionResponse> {
    await this.customers.requireActive(tenant.tenantId);
    if (!this.canCorrect(tenant)) {
      throw new AccessForbiddenException(
        'Correcting an action requires actions.update',
      );
    }
    const action = await this.requireVisibleAction(tenant, actionId);
    if (action.status === ActionStatus.CANCELLED) {
      throw new InvalidRequestException('Cancelled actions cannot be edited');
    }
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      action.campaign_id,
    );
    const definition = await this.requireDefinition(
      tenant,
      action.action_definition_id,
    );
    const occurredOn = dto.occurredOn
      ? resolveOccurredOn(dto.occurredOn, campaign.timezone, now)
      : (toIsoDate(action.occurred_on) ??
        resolveOccurredOn(undefined, campaign.timezone, now));
    assertOccurredOnInCampaignWindow(
      occurredOn,
      campaign.startsOn,
      campaign.endsOn,
    );
    const quantity = dto.quantity ?? action.quantity;
    const payload =
      dto.payload === undefined
        ? action.payload
        : normalizeSettings(dto.payload);
    this.rulesFor(campaign.configuration).validateAction({
      definitionKey: definition.key,
      definitionUnit: definition.unit,
      quantity,
      payload,
    });
    action.occurred_on = occurredOn;
    action.quantity = quantity;
    action.privacy_level = dto.privacyLevel ?? action.privacy_level;
    action.payload = payload;
    action.corrected_at = now;
    action.corrected_by_user_id = actorUserId;
    try {
      const saved = await this.actionRepository.save(action);
      this.logger.log({
        msg: 'action_corrected',
        tenantId: tenant.tenantId,
        actionId: saved.id,
      });
      const [mapped] = await this.toActionResponses(tenant, [saved]);
      return mapped;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw overlapException([occurredOn]);
      }
      throw error;
    }
  }

  async cancel(
    tenant: TenantContext,
    actionId: string,
    actorUserId: string,
  ): Promise<ActionResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const action = await this.requireVisibleAction(tenant, actionId);
    const isOwner = action.user_id === actorUserId;
    if (!isOwner && !this.canCorrect(tenant)) {
      throw new AccessForbiddenException(
        'Cancelling another user action requires actions.update',
      );
    }
    if (action.status === ActionStatus.CANCELLED) {
      const [mapped] = await this.toActionResponses(tenant, [action]);
      return mapped;
    }
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      action.campaign_id,
    );
    if (
      isOwner &&
      !this.canCorrect(tenant) &&
      campaign.status === CampaignStatus.COMPLETED
    ) {
      throw new InvalidRequestException(
        'Participants cannot cancel actions after the campaign is completed',
      );
    }
    action.status = ActionStatus.CANCELLED;
    action.cancelled_at = new Date();
    action.cancelled_by_user_id = actorUserId;
    const saved = await this.actionRepository.save(action);
    this.logger.log({
      msg: 'action_cancelled',
      tenantId: tenant.tenantId,
      actionId: saved.id,
    });
    const [mapped] = await this.toActionResponses(tenant, [saved]);
    return mapped;
  }

  async listSubmissions(
    tenant: TenantContext,
    actionId: string,
  ): Promise<SubmissionResponse[]> {
    const action = await this.requireVisibleAction(tenant, actionId);
    const rows = await this.submissionRepository.find({
      where: { tenant_id: tenant.tenantId, action_id: action.id },
      order: { created_at: 'ASC' },
    });
    return rows.map((row) => this.toSubmissionResponse(row));
  }

  async approveSubmission(
    tenant: TenantContext,
    submissionId: string,
    actorUserId: string,
    note?: string,
  ): Promise<SubmissionResponse> {
    return this.reviewSubmission(
      tenant,
      submissionId,
      actorUserId,
      SubmissionStatus.APPROVED,
      note,
    );
  }

  async rejectSubmission(
    tenant: TenantContext,
    submissionId: string,
    actorUserId: string,
    note?: string,
  ): Promise<SubmissionResponse> {
    return this.reviewSubmission(
      tenant,
      submissionId,
      actorUserId,
      SubmissionStatus.REJECTED,
      note,
    );
  }

  private async reviewSubmission(
    tenant: TenantContext,
    submissionId: string,
    actorUserId: string,
    status: SubmissionStatus.APPROVED | SubmissionStatus.REJECTED,
    note?: string,
  ): Promise<SubmissionResponse> {
    await this.customers.requireActive(tenant.tenantId);
    if (!tenant.permissions.has(PERMISSIONS.SUBMISSIONS_UPDATE)) {
      throw new AccessForbiddenException(
        'Reviewing a submission requires submissions.update',
      );
    }
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId, tenant_id: tenant.tenantId },
    });
    if (!submission) {
      throw new ResourceNotFoundException('Submission not found');
    }
    await this.requireVisibleAction(tenant, submission.action_id);
    submission.status = status;
    submission.reviewed_by_user_id = actorUserId;
    submission.reviewed_at = new Date();
    submission.review_note = note?.trim() || null;
    const saved = await this.submissionRepository.save(submission);
    this.logger.log({
      msg: `submission_${status}`,
      tenantId: tenant.tenantId,
      submissionId: saved.id,
      actionId: saved.action_id,
    });
    return this.toSubmissionResponse(saved);
  }

  /**
   * Shared checks for recording on a participation: active tenant, own
   * participation (or `actions.update`), enrolled, campaign started, and an
   * active definition of the same campaign.
   */
  async prepareRecording(
    tenant: TenantContext,
    actorUserId: string,
    participationId: string,
    actionDefinitionId: string,
  ) {
    await this.customers.requireActive(tenant.tenantId);
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    this.assertCanRecordFor(tenant, actorUserId, participation.userId);
    if (participation.status !== ParticipationStatus.ENROLLED) {
      throw new InvalidRequestException(
        'Actions can only be recorded on an enrolled participation',
      );
    }
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      participation.campaignId,
    );
    if (!canRecordActions(campaign.status)) {
      throw new InvalidRequestException(
        'Actions can only be recorded while the campaign is started',
      );
    }
    const definition = await this.requireDefinition(
      tenant,
      actionDefinitionId,
    );
    if (definition.campaign_id !== participation.campaignId) {
      throw new InvalidRequestException(
        'Action definition does not belong to this campaign',
      );
    }
    if (!definition.is_active) {
      throw new InvalidRequestException('Action definition is not active');
    }
    return { participation, campaign, definition };
  }

  rulesFor(configuration: Record<string, unknown>): CampaignRuleStrategy {
    return resolveCampaignRules(
      configuration,
      this.strategyList(),
      this.genericRules,
    );
  }

  /**
   * In campaigns with dated milestones the days must lie in one committed
   * commitment window; elsewhere only a `not_taking_part` decision blocks.
   */
  async assertCoverage(
    tenant: TenantContext,
    participationId: string,
    campaign: {
      id: string;
      tenantId: string;
      startsOn: string | null;
      endsOn: string | null;
    },
    startOn: string,
    endOn: string,
  ): Promise<void> {
    const [periods, commitments] = await Promise.all([
      this.milestones.periodsForCampaign(campaign),
      this.commitmentRepository.find({
        where: { tenant_id: tenant.tenantId, participation_id: participationId },
      }),
    ]);
    const result = rangeCoverage(
      periods,
      commitments.map((row) => ({
        decision: row.decision,
        validFrom: toIsoDate(row.valid_from),
        validTo: toIsoDate(row.valid_to),
      })),
      startOn,
      endOn,
    );
    if (result.ok) {
      return;
    }
    if (result.code === 'RANGE_SPANS_PERIODS') {
      throw new InvalidRequestException(
        'The range must lie inside one period and one commitment window',
        'RANGE_SPANS_PERIODS',
      );
    }
    throw new ResourceConflictException(
      startOn === endOn
        ? 'There is no commitment covering this day'
        : 'There is no commitment covering these days',
      'NO_COMMITMENT_FOR_DATE',
    );
  }

  canCorrectActions(tenant: TenantContext): boolean {
    return this.canCorrect(tenant);
  }

  canViewOwnedBy(tenant: TenantContext, userId: string): boolean {
    return (
      this.canCorrect(tenant) ||
      tenant.memberships.some(
        (membership) => membership.isActive && membership.userId === userId,
      )
    );
  }

  private async requireDefinition(
    tenant: TenantContext,
    definitionId: string,
  ): Promise<ActionDefinition> {
    const definition = await this.definitionRepository.findOne({
      where: { id: definitionId, tenant_id: tenant.tenantId },
    });
    if (!definition) {
      throw new ResourceNotFoundException('Action definition not found');
    }
    return definition;
  }

  private async requireVisibleAction(
    tenant: TenantContext,
    actionId: string,
  ): Promise<Action> {
    const action = await this.actionRepository.findOne({
      where: { id: actionId, tenant_id: tenant.tenantId },
    });
    if (!action) {
      throw new ResourceNotFoundException('Action not found');
    }
    await this.campaigns.getCampaignRecord(tenant, action.campaign_id);
    if (!this.canViewAction(tenant, action)) {
      throw new ResourceNotFoundException('Action not found');
    }
    return action;
  }

  private canViewAction(tenant: TenantContext, action: Action): boolean {
    return this.canViewOwnedBy(tenant, action.user_id);
  }

  private strategyList(): CampaignRuleStrategy[] {
    const value = this.strategies;
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private canCorrect(tenant: TenantContext): boolean {
    return tenant.permissions.has(PERMISSIONS.ACTIONS_UPDATE);
  }

  private assertCanRecordFor(
    tenant: TenantContext,
    actorUserId: string,
    ownerUserId: string,
  ): void {
    if (actorUserId === ownerUserId) {
      return;
    }
    if (!this.canCorrect(tenant)) {
      throw new AccessForbiddenException(
        'Recording an action for another user requires actions.update',
      );
    }
  }

  private assertIdempotentReplay(
    existing: Action,
    input: {
      actionDefinitionId: string;
      occurredOn: string;
      quantity: number;
      privacyLevel: PrivacyLevel;
      payload: Record<string, unknown>;
    },
  ): void {
    const same =
      existing.action_definition_id === input.actionDefinitionId &&
      toIsoDate(existing.occurred_on) === input.occurredOn &&
      existing.quantity === input.quantity &&
      existing.privacy_level === input.privacyLevel &&
      JSON.stringify(existing.payload) === JSON.stringify(input.payload);
    if (!same) {
      throw new ResourceConflictException(
        'Idempotency key was reused with a different action payload',
      );
    }
  }

  private async assertCanManageDefinitions(
    tenant: TenantContext,
  ): Promise<void> {
    await this.customers.requireActive(tenant.tenantId);
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage action definitions',
      );
    }
  }

  async toActionResponses(
    tenant: TenantContext,
    actions: Action[],
  ): Promise<ActionResponse[]> {
    if (actions.length === 0) {
      return [];
    }
    const submissions = await this.submissionRepository.find({
      where: {
        tenant_id: tenant.tenantId,
        action_id: In(actions.map((action) => action.id)),
      },
    });
    const byActionId = new Map(submissions.map((row) => [row.action_id, row]));
    return actions.map((action) =>
      this.toActionResponse(action, byActionId.get(action.id) ?? null),
    );
  }

  private toActionResponse(
    action: Action,
    submission: Submission | null,
  ): ActionResponse {
    return {
      id: action.id,
      customerId: action.tenant_id,
      campaignId: action.campaign_id,
      participationId: action.participation_id,
      userId: action.user_id,
      actionDefinitionId: action.action_definition_id,
      occurredOn: toIsoDate(action.occurred_on) ?? action.occurred_on,
      quantity: action.quantity,
      privacyLevel: action.privacy_level,
      status: action.status,
      payload: action.payload,
      idempotencyKey: action.idempotency_key,
      batchId: action.batch_id ?? null,
      recordedByUserId: action.recorded_by_user_id,
      cancelledAt: action.cancelled_at?.toISOString() ?? null,
      cancelledByUserId: action.cancelled_by_user_id,
      correctedAt: action.corrected_at?.toISOString() ?? null,
      correctedByUserId: action.corrected_by_user_id,
      submission: submission ? this.toSubmissionResponse(submission) : null,
      createdAt: action.created_at.toISOString(),
      updatedAt: action.updated_at.toISOString(),
    };
  }

  private toDefinitionResponse(
    definition: ActionDefinition,
  ): ActionDefinitionResponse {
    return {
      id: definition.id,
      customerId: definition.tenant_id,
      campaignId: definition.campaign_id,
      key: definition.key,
      name: definition.name,
      unit: definition.unit,
      description: definition.description,
      isActive: definition.is_active,
      settings: definition.settings,
      createdAt: definition.created_at.toISOString(),
      updatedAt: definition.updated_at.toISOString(),
    };
  }

  toSubmissionResponse(submission: Submission): SubmissionResponse {
    return {
      id: submission.id,
      customerId: submission.tenant_id,
      actionId: submission.action_id,
      status: submission.status,
      submittedByUserId: submission.submitted_by_user_id,
      reviewedByUserId: submission.reviewed_by_user_id,
      reviewedAt: submission.reviewed_at?.toISOString() ?? null,
      reviewNote: submission.review_note,
      createdAt: submission.created_at.toISOString(),
      updatedAt: submission.updated_at.toISOString(),
    };
  }

  private normalizeKey(value: string, fallbackPrefix: string): string {
    return slugify(
      value,
      `${fallbackPrefix}-${randomBytes(4).toString('hex')}`,
    ).replace(/-/g, '_');
  }
}

export function overlapException(
  conflictingDates: string[],
): ResourceConflictException {
  return new ResourceConflictException(
    conflictingDates.length === 1
      ? 'An action is already recorded for this definition and day'
      : 'Actions are already recorded for this definition on some of these days',
    'SUBMISSION_OVERLAP',
    { conflictingDates },
  );
}
