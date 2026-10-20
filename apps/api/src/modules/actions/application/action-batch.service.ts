import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  isRaiseException,
  isUniqueViolation,
} from '../../../shared/database/postgres-errors.js';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { readSubmissionReview } from '../../campaigns/application/campaign-settings.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import {
  assertOccurredOnInCampaignWindow,
  calendarDateInTimeZone,
  normalizeSettings,
  resolveOccurredOn,
  toIsoDate,
} from '../../campaigns/application/timezone.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { ActionBatch } from '../domain/action-batch.entity.js';
import { Action, ActionStatus, PrivacyLevel } from '../domain/action.entity.js';
import { batchState, type BatchState } from '../domain/batch-status.js';
import { addIsoDays, expandRange } from '../domain/day-coverage.js';
import { Submission, SubmissionStatus } from '../domain/submission.entity.js';
import type { CreateActionRangeDto } from '../dto/create-action-range.dto.js';
import {
  ActionService,
  overlapException,
  type ActionResponse,
} from './action.service.js';

export interface ActionBatchResponse extends BatchState {
  id: string;
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  actionDefinitionId: string;
  startOn: string;
  endOn: string;
  dayCount: number;
  quantityPerDay: number;
  totalQuantity: number;
  privacyLevel: PrivacyLevel;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface ActionBatchDetailResponse {
  batch: ActionBatchResponse;
  actions: ActionResponse[];
}

interface RangeInput {
  actionDefinitionId: string;
  startOn: string;
  dayCount: number;
  quantityPerDay: number;
  privacyLevel: PrivacyLevel;
  payload: Record<string, unknown>;
}

@Injectable()
export class ActionBatchService {
  private readonly logger = new Logger(ActionBatchService.name);

  constructor(
    @InjectRepository(ActionBatch)
    private readonly batchRepository: Repository<ActionBatch>,
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    private readonly actions: ActionService,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
  ) {}

  async recordRange(
    tenant: TenantContext,
    actorUserId: string,
    participationId: string,
    dto: CreateActionRangeDto,
    now = new Date(),
  ): Promise<ActionBatchDetailResponse> {
    const { participation, campaign, definition } =
      await this.actions.prepareRecording(
        tenant,
        actorUserId,
        participationId,
        dto.actionDefinitionId,
      );
    const startOn = resolveOccurredOn(dto.startOn, campaign.timezone, now);
    const endOn = addIsoDays(startOn, dto.days - 1);
    if (endOn > calendarDateInTimeZone(now, campaign.timezone)) {
      throw new InvalidRequestException(
        'The range cannot end in the future in the campaign timezone',
      );
    }
    assertOccurredOnInCampaignWindow(
      startOn,
      campaign.startsOn,
      campaign.endsOn,
    );
    assertOccurredOnInCampaignWindow(endOn, campaign.startsOn, campaign.endsOn);
    const payload = normalizeSettings(dto.payload);
    // validateAction does not take a date, so one call covers every day.
    this.actions.rulesFor(campaign.configuration).validateAction({
      definitionKey: definition.key,
      definitionUnit: definition.unit,
      quantity: dto.quantityPerDay,
      payload,
    });
    const input: RangeInput = {
      actionDefinitionId: definition.id,
      startOn,
      dayCount: dto.days,
      quantityPerDay: dto.quantityPerDay,
      privacyLevel: dto.privacyLevel ?? PrivacyLevel.PRIVATE,
      payload,
    };
    const idempotencyKey = dto.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const replay = await this.batchRepository.findOne({
        where: {
          participation_id: participation.id,
          idempotency_key: idempotencyKey,
        },
      });
      if (replay) {
        return this.replay(tenant, replay, input);
      }
    }
    await this.actions.assertCoverage(
      tenant,
      participation.id,
      campaign,
      startOn,
      endOn,
    );
    const autoApprove = readSubmissionReview(campaign.configuration) === 'auto';

    let outcome: { batch: ActionBatch; replayed: boolean };
    try {
      outcome = await this.batchRepository.manager.transaction(
        async (manager) => {
          await manager.query(
            'SELECT id FROM participations WHERE id = $1 FOR UPDATE',
            [participation.id],
          );
          if (idempotencyKey) {
            const existing = await manager.findOne(ActionBatch, {
              where: {
                participation_id: participation.id,
                idempotency_key: idempotencyKey,
              },
            });
            if (existing) {
              return { batch: existing, replayed: true };
            }
          }
          const conflicts = await manager.find(Action, {
            where: {
              participation_id: participation.id,
              action_definition_id: definition.id,
              status: ActionStatus.RECORDED,
              occurred_on: Between(startOn, endOn),
            },
            order: { occurred_on: 'ASC' },
          });
          if (conflicts.length > 0) {
            throw overlapException(
              conflicts.map((row) => toIsoDate(row.occurred_on) ?? row.occurred_on),
            );
          }
          const batch = await manager.save(
            ActionBatch,
            manager.create(ActionBatch, {
              tenant_id: tenant.tenantId,
              campaign_id: participation.campaignId,
              participation_id: participation.id,
              action_definition_id: definition.id,
              start_on: startOn,
              end_on: endOn,
              day_count: input.dayCount,
              quantity_per_day: input.quantityPerDay,
              payload,
              idempotency_key: idempotencyKey,
              created_by_user_id: actorUserId,
            }),
          );
          const children = await manager.save(
            Action,
            expandRange(startOn, input.dayCount).map((day) =>
              manager.create(Action, {
                tenant_id: tenant.tenantId,
                campaign_id: participation.campaignId,
                participation_id: participation.id,
                user_id: participation.userId,
                action_definition_id: definition.id,
                occurred_on: day,
                quantity: input.quantityPerDay,
                privacy_level: input.privacyLevel,
                status: ActionStatus.RECORDED,
                payload,
                idempotency_key: null,
                batch_id: batch.id,
                recorded_by_user_id: actorUserId,
                cancelled_at: null,
                cancelled_by_user_id: null,
                corrected_at: null,
                corrected_by_user_id: null,
              }),
            ),
          );
          await manager.save(
            Submission,
            children.map((child) =>
              manager.create(Submission, {
                tenant_id: tenant.tenantId,
                action_id: child.id,
                status: autoApprove
                  ? SubmissionStatus.APPROVED
                  : SubmissionStatus.SUBMITTED,
                submitted_by_user_id: actorUserId,
                reviewed_by_user_id: null,
                reviewed_at: autoApprove ? now : null,
                review_note: null,
              }),
            ),
          );
          return { batch, replayed: false };
        },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (idempotencyKey) {
          const existing = await this.batchRepository.findOne({
            where: {
              participation_id: participation.id,
              idempotency_key: idempotencyKey,
            },
          });
          if (existing) {
            return this.replay(tenant, existing, input);
          }
        }
        const recorded = await this.actionRepository.find({
          where: {
            participation_id: participation.id,
            action_definition_id: definition.id,
            status: ActionStatus.RECORDED,
            occurred_on: Between(startOn, endOn),
          },
          order: { occurred_on: 'ASC' },
        });
        throw overlapException(
          recorded.map((row) => toIsoDate(row.occurred_on) ?? row.occurred_on),
        );
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Range could not be recorded');
      }
      throw error;
    }
    if (outcome.replayed) {
      return this.replay(tenant, outcome.batch, input);
    }
    this.logger.log({
      msg: 'action_range_recorded',
      tenantId: tenant.tenantId,
      campaignId: outcome.batch.campaign_id,
      participationId: outcome.batch.participation_id,
      actionBatchId: outcome.batch.id,
      dayCount: outcome.batch.day_count,
    });
    return this.detail(tenant, outcome.batch);
  }

  async listForParticipation(
    tenant: TenantContext,
    participationId: string,
  ): Promise<ActionBatchResponse[]> {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    if (!this.actions.canViewOwnedBy(tenant, participation.userId)) {
      return [];
    }
    const batches = await this.batchRepository.find({
      where: { tenant_id: tenant.tenantId, participation_id: participation.id },
      order: { start_on: 'ASC', created_at: 'ASC' },
    });
    if (batches.length === 0) {
      return [];
    }
    const children = await this.actionRepository.find({
      where: {
        tenant_id: tenant.tenantId,
        batch_id: In(batches.map((batch) => batch.id)),
      },
      order: { occurred_on: 'ASC' },
    });
    const submissions = await this.submissionsFor(tenant, children);
    return batches.map((batch) =>
      this.toBatchResponse(
        batch,
        children.filter((child) => child.batch_id === batch.id),
        submissions,
      ),
    );
  }

  async get(
    tenant: TenantContext,
    batchId: string,
  ): Promise<ActionBatchDetailResponse> {
    const { batch } = await this.requireVisibleBatch(tenant, batchId);
    return this.detail(tenant, batch);
  }

  async cancel(
    tenant: TenantContext,
    batchId: string,
    actorUserId: string,
  ): Promise<ActionBatchDetailResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const { batch, children } = await this.requireVisibleBatch(tenant, batchId);
    const isOwner = children[0]?.user_id === actorUserId;
    const canCorrect = this.actions.canCorrectActions(tenant);
    if (!isOwner && !canCorrect) {
      throw new AccessForbiddenException(
        'Cancelling another user range requires actions.update',
      );
    }
    const live = children.filter(
      (child) => child.status === ActionStatus.RECORDED,
    );
    if (live.length === 0) {
      return this.detail(tenant, batch);
    }
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      batch.campaign_id,
    );
    if (!canCorrect && campaign.status === CampaignStatus.COMPLETED) {
      throw new InvalidRequestException(
        'Participants cannot cancel actions after the campaign is completed',
      );
    }
    const cancelledAt = new Date();
    await this.actionRepository.manager.transaction(async (manager) => {
      for (const child of live) {
        child.status = ActionStatus.CANCELLED;
        child.cancelled_at = cancelledAt;
        child.cancelled_by_user_id = actorUserId;
      }
      await manager.save(Action, live);
    });
    this.logger.log({
      msg: 'action_range_cancelled',
      tenantId: tenant.tenantId,
      actionBatchId: batch.id,
      cancelledDays: live.length,
    });
    return this.detail(tenant, batch);
  }

  async approve(
    tenant: TenantContext,
    batchId: string,
    actorUserId: string,
    note?: string,
  ): Promise<ActionBatchDetailResponse> {
    return this.review(
      tenant,
      batchId,
      actorUserId,
      SubmissionStatus.APPROVED,
      note,
    );
  }

  async reject(
    tenant: TenantContext,
    batchId: string,
    actorUserId: string,
    note?: string,
  ): Promise<ActionBatchDetailResponse> {
    return this.review(
      tenant,
      batchId,
      actorUserId,
      SubmissionStatus.REJECTED,
      note,
    );
  }

  private async review(
    tenant: TenantContext,
    batchId: string,
    actorUserId: string,
    status: SubmissionStatus.APPROVED | SubmissionStatus.REJECTED,
    note?: string,
  ): Promise<ActionBatchDetailResponse> {
    await this.customers.requireActive(tenant.tenantId);
    if (!tenant.permissions.has(PERMISSIONS.SUBMISSIONS_UPDATE)) {
      throw new AccessForbiddenException(
        'Reviewing a submission requires submissions.update',
      );
    }
    const { batch, children } = await this.requireVisibleBatch(tenant, batchId);
    const live = children.filter(
      (child) => child.status === ActionStatus.RECORDED,
    );
    if (live.length === 0) {
      throw new InvalidRequestException('Cancelled ranges cannot be reviewed');
    }
    const reviewedAt = new Date();
    const reviewNote = note?.trim() || null;
    const reviewed = await this.submissionRepository.manager.transaction(
      async (manager) => {
        const submissions = await manager.find(Submission, {
          where: {
            tenant_id: tenant.tenantId,
            action_id: In(live.map((child) => child.id)),
          },
        });
        for (const submission of submissions) {
          submission.status = status;
          submission.reviewed_by_user_id = actorUserId;
          submission.reviewed_at = reviewedAt;
          submission.review_note = reviewNote;
        }
        await manager.save(Submission, submissions);
        return submissions.length;
      },
    );
    this.logger.log({
      msg: `action_range_${status}`,
      tenantId: tenant.tenantId,
      actionBatchId: batch.id,
      submissionCount: reviewed,
    });
    return this.detail(tenant, batch);
  }

  private async replay(
    tenant: TenantContext,
    existing: ActionBatch,
    input: RangeInput,
  ): Promise<ActionBatchDetailResponse> {
    const detail = await this.detail(tenant, existing);
    const same =
      existing.action_definition_id === input.actionDefinitionId &&
      toIsoDate(existing.start_on) === input.startOn &&
      existing.day_count === input.dayCount &&
      existing.quantity_per_day === input.quantityPerDay &&
      detail.batch.privacyLevel === input.privacyLevel &&
      JSON.stringify(existing.payload) === JSON.stringify(input.payload);
    if (!same) {
      throw new ResourceConflictException(
        'Idempotency key was reused with a different range',
      );
    }
    return detail;
  }

  private async requireVisibleBatch(
    tenant: TenantContext,
    batchId: string,
  ): Promise<{ batch: ActionBatch; children: Action[] }> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId, tenant_id: tenant.tenantId },
    });
    if (!batch) {
      throw new ResourceNotFoundException('Action batch not found');
    }
    await this.campaigns.getCampaignRecord(tenant, batch.campaign_id);
    const children = await this.childrenOf(tenant, batch);
    const ownerUserId = children[0]?.user_id;
    if (!ownerUserId || !this.actions.canViewOwnedBy(tenant, ownerUserId)) {
      throw new ResourceNotFoundException('Action batch not found');
    }
    return { batch, children };
  }

  private childrenOf(tenant: TenantContext, batch: ActionBatch) {
    return this.actionRepository.find({
      where: { tenant_id: tenant.tenantId, batch_id: batch.id },
      order: { occurred_on: 'ASC' },
    });
  }

  private async detail(
    tenant: TenantContext,
    batch: ActionBatch,
  ): Promise<ActionBatchDetailResponse> {
    const children = await this.childrenOf(tenant, batch);
    const submissions = await this.submissionsFor(tenant, children);
    return {
      batch: this.toBatchResponse(batch, children, submissions),
      actions: await this.actions.toActionResponses(tenant, children),
    };
  }

  private async submissionsFor(
    tenant: TenantContext,
    children: Action[],
  ): Promise<Map<string, Submission>> {
    if (children.length === 0) {
      return new Map();
    }
    const rows = await this.submissionRepository.find({
      where: {
        tenant_id: tenant.tenantId,
        action_id: In(children.map((child) => child.id)),
      },
    });
    return new Map(rows.map((row) => [row.action_id, row]));
  }

  private toBatchResponse(
    batch: ActionBatch,
    children: Action[],
    submissions: Map<string, Submission>,
  ): ActionBatchResponse {
    const state = batchState(
      children.map((child) => ({
        cancelled: child.status === ActionStatus.CANCELLED,
        submissionStatus: submissions.get(child.id)?.status ?? null,
      })),
    );
    return {
      id: batch.id,
      customerId: batch.tenant_id,
      campaignId: batch.campaign_id,
      participationId: batch.participation_id,
      userId: children[0]?.user_id ?? '',
      actionDefinitionId: batch.action_definition_id,
      startOn: toIsoDate(batch.start_on) ?? batch.start_on,
      endOn: toIsoDate(batch.end_on) ?? batch.end_on,
      dayCount: batch.day_count,
      quantityPerDay: batch.quantity_per_day,
      totalQuantity: batch.day_count * batch.quantity_per_day,
      privacyLevel: children[0]?.privacy_level ?? PrivacyLevel.PRIVATE,
      payload: batch.payload,
      idempotencyKey: batch.idempotency_key,
      createdByUserId: batch.created_by_user_id,
      createdAt: batch.created_at.toISOString(),
      ...state,
    };
  }
}
