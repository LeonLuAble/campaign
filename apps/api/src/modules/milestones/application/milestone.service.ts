import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { IsNull, Not, Repository } from 'typeorm';
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
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import {
  parseIsoDate,
  toIsoDate,
} from '../../campaigns/application/timezone.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import {
  LocalizationService,
  type MilestoneContentTranslations,
} from '../../localization/application/localization.service.js';
import { milestoneCrossed } from '../../progress/application/completion.js';
import {
  CAMPAIGN_NOTIFICATIONS,
  type CampaignNotifications,
} from '../../notifications/application/campaign-notifications.js';
import { ProgressService } from '../../progress/application/progress.service.js';
import {
  computeCampaignPeriods,
  type CampaignPeriod,
} from '../domain/campaign-periods.js';
import { Milestone, MilestoneMetric } from '../domain/milestone.entity.js';
import { MilestoneEvaluation } from '../domain/milestone-evaluation.entity.js';
import { MilestoneProgress } from '../domain/milestone-progress.entity.js';
import type { CreateMilestoneDto } from '../dto/create-milestone.dto.js';
import type { UpdateMilestoneDto } from '../dto/update-milestone.dto.js';

const DUE_ON_INDEX = 'uq_milestones_campaign_due_on';

export interface MilestoneResponse {
  id: string;
  customerId: string;
  campaignId: string;
  key: string;
  name: string;
  description: string | null;
  dueOn: string | null;
  metric: MilestoneMetric | null;
  thresholdValue: number | null;
  unit: string | null;
  hasGoal: boolean;
  isActive: boolean;
  translations: { en: { name: string | null; description: string | null } };
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneProgressResponse {
  milestoneId: string;
  campaignId: string;
  customerId: string;
  hasGoal: boolean;
  metric: MilestoneMetric | null;
  unit: string | null;
  thresholdValue: number | null;
  currentAchievedValue: number;
  currentTargetValue: number;
  currentCompletionPercent: number | null;
  crossed: boolean;
  status: MilestoneProgress['status'];
  computedAt: string;
}

export interface MilestoneEvaluationResponse {
  id: string;
  milestoneId: string;
  customerId: string;
  evaluatedByUserId: string;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  crossed: boolean;
  status: MilestoneEvaluation['status'];
  evaluatedAt: string;
  createdAt: string;
}

export type CampaignPeriodResponse = CampaignPeriod;

interface MilestoneGoal {
  metric: MilestoneMetric;
  thresholdValue: number;
  unit: string;
}

type GoalInput = {
  metric: MilestoneMetric | null | undefined;
  thresholdValue: number | null | undefined;
  unit: string | null | undefined;
};

@Injectable()
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneProgress)
    private readonly progressRepository: Repository<MilestoneProgress>,
    @InjectRepository(MilestoneEvaluation)
    private readonly evaluationRepository: Repository<MilestoneEvaluation>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => ProgressService))
    private readonly progress: ProgressService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    private readonly localization: LocalizationService,
    @Optional()
    @Inject(forwardRef(() => CAMPAIGN_NOTIFICATIONS))
    private readonly campaignNotifications: CampaignNotifications | null,
  ) {}

  async findById(id: string): Promise<CampaignAccessRecord | null> {
    const milestone = await this.milestoneRepository.findOne({ where: { id } });
    return milestone
      ? { id: milestone.id, tenantId: milestone.tenant_id }
      : null;
  }

  async listForCampaign(
    tenant: TenantContext,
    campaignId: string,
    locale: SupportedLocale = 'en',
  ): Promise<MilestoneResponse[]> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rows = await this.milestoneRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
      order: { created_at: 'ASC' },
    });
    return Promise.all(rows.map((row) => this.toMilestoneResponse(row, locale)));
  }

  async get(
    tenant: TenantContext,
    milestoneId: string,
    locale: SupportedLocale = 'en',
  ): Promise<MilestoneResponse> {
    const milestone = await this.requireVisible(tenant, milestoneId);
    return this.toMilestoneResponse(milestone, locale);
  }

  async listPeriods(
    tenant: TenantContext,
    campaignId: string,
    locale: SupportedLocale = 'en',
  ): Promise<CampaignPeriodResponse[]> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    return this.periodsForCampaign(campaign, locale);
  }

  /**
   * Periods for a campaign the caller has already been authorised to see.
   * Callers outside this module must pass a record from getCampaignRecord.
   */
  async periodsForCampaign(
    campaign: {
      id: string;
      tenantId: string;
      startsOn: string | null;
      endsOn: string | null;
    },
    locale: SupportedLocale = 'en',
  ): Promise<CampaignPeriodResponse[]> {
    const rows = await this.milestoneRepository.find({
      where: {
        tenant_id: campaign.tenantId,
        campaign_id: campaign.id,
        is_active: true,
        due_on: Not(IsNull()),
      },
    });
    const dated = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        dueOn: toIsoDate(row.due_on) as string,
        name:
          (await this.localization.resolveMilestoneContent(
            locale,
            row.tenant_id,
            row.id,
            'name',
            row.name,
          )) ?? row.name,
      })),
    );
    return computeCampaignPeriods(
      { startsOn: campaign.startsOn, endsOn: campaign.endsOn },
      dated,
    );
  }

  async create(
    tenant: TenantContext,
    campaignId: string,
    actorUserId: string,
    dto: CreateMilestoneDto,
    locale: SupportedLocale = 'en',
  ): Promise<MilestoneResponse> {
    await this.assertCanManage(tenant);
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const goal = this.resolveGoal({
      metric: dto.metric,
      thresholdValue: dto.thresholdValue,
      unit: dto.unit,
    });
    const dueOn = dto.dueOn ? parseIsoDate(dto.dueOn, 'dueOn') : null;
    this.assertHasPurpose(goal, dueOn);
    if (dueOn) {
      if (campaign.status !== CampaignStatus.DRAFT) {
        throw new ResourceConflictException(
          'Dated milestones can only be added while the campaign is a draft',
          'MILESTONE_LOCKED',
        );
      }
      this.assertDueOnInWindow(campaign, dueOn);
      await this.assertDueOnFree(tenant.tenantId, campaign.id, dueOn, null);
    }
    const key = this.normalizeKey(dto.key ?? dto.name, 'milestone');
    let saved: Milestone;
    try {
      saved = await this.milestoneRepository.save(
        this.milestoneRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaign.id,
          key,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          due_on: dueOn,
          metric: goal?.metric ?? null,
          threshold_value: goal?.thresholdValue ?? null,
          unit: goal?.unit ?? null,
          is_active: true,
          created_by_user_id: actorUserId,
        }),
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
    await this.localization.upsertMilestoneContentTranslations(
      tenant.tenantId,
      saved.id,
      dto.translations as MilestoneContentTranslations | undefined,
    );
    this.logger.log({
      msg: 'milestone_created',
      tenantId: tenant.tenantId,
      campaignId: campaign.id,
      milestoneId: saved.id,
      dated: dueOn !== null,
      hasGoal: goal !== null,
    });
    return this.toMilestoneResponse(saved, locale);
  }

  async update(
    tenant: TenantContext,
    milestoneId: string,
    dto: UpdateMilestoneDto,
    locale: SupportedLocale = 'en',
  ): Promise<MilestoneResponse> {
    await this.assertCanManage(tenant);
    const milestone = await this.requireVisible(tenant, milestoneId);
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      milestone.campaign_id,
    );
    const currentDueOn = toIsoDate(milestone.due_on);
    const nextDueOn =
      dto.dueOn === undefined
        ? currentDueOn
        : dto.dueOn === null
          ? null
          : parseIsoDate(dto.dueOn, 'dueOn');
    const nextActive = dto.isActive ?? milestone.is_active;
    const dueOnChanged = nextDueOn !== currentDueOn;
    const activeChanged = nextActive !== milestone.is_active;

    if (campaign.status !== CampaignStatus.DRAFT) {
      if (dueOnChanged) {
        throw new ResourceConflictException(
          'A milestone date cannot change after the campaign is published',
          'MILESTONE_LOCKED',
        );
      }
      if (activeChanged && currentDueOn !== null) {
        throw new ResourceConflictException(
          'A dated milestone cannot be removed or restored after the campaign is published',
          'MILESTONE_LOCKED',
        );
      }
    }

    const goal = this.resolveGoal({
      metric: dto.metric === undefined ? milestone.metric : dto.metric,
      thresholdValue:
        dto.thresholdValue === undefined
          ? milestone.threshold_value
          : dto.thresholdValue,
      unit: dto.unit === undefined ? milestone.unit : dto.unit,
    });
    this.assertHasPurpose(goal, nextDueOn);
    if (nextDueOn && dueOnChanged) {
      this.assertDueOnInWindow(campaign, nextDueOn);
    }
    if (nextDueOn && nextActive && (dueOnChanged || activeChanged)) {
      await this.assertDueOnFree(
        tenant.tenantId,
        milestone.campaign_id,
        nextDueOn,
        milestone.id,
      );
    }

    if (dto.name !== undefined) {
      milestone.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      milestone.description = dto.description?.trim() || null;
    }
    milestone.due_on = nextDueOn;
    milestone.metric = goal?.metric ?? null;
    milestone.threshold_value = goal?.thresholdValue ?? null;
    milestone.unit = goal?.unit ?? null;
    milestone.is_active = nextActive;
    let saved: Milestone;
    try {
      saved = await this.milestoneRepository.save(milestone);
    } catch (error) {
      this.rethrowWriteError(error);
    }
    await this.localization.upsertMilestoneContentTranslations(
      tenant.tenantId,
      saved.id,
      dto.translations as MilestoneContentTranslations | undefined,
    );
    this.logger.log({
      msg: 'milestone_updated',
      tenantId: tenant.tenantId,
      milestoneId: saved.id,
    });
    return this.toMilestoneResponse(saved, locale);
  }

  async getProgress(
    tenant: TenantContext,
    milestoneId: string,
  ): Promise<MilestoneProgressResponse> {
    const milestone = await this.requireVisible(tenant, milestoneId);
    return this.computeProgress(tenant, milestone);
  }

  async evaluate(
    tenant: TenantContext,
    milestoneId: string,
    actorUserId: string,
    now = new Date(),
  ): Promise<MilestoneEvaluationResponse> {
    await this.assertCanManage(tenant);
    const milestone = await this.requireVisible(tenant, milestoneId);
    if (!this.goalOf(milestone)) {
      throw new InvalidRequestException(
        'This milestone has no collective goal to evaluate',
      );
    }
    const previouslyCrossed = Boolean(
      await this.evaluationRepository.findOne({
        where: { milestone_id: milestone.id, crossed: true },
      }),
    );
    const current = await this.computeProgress(tenant, milestone, now);
    await this.upsertProgressSnapshot(tenant.tenantId, milestone.id, current);

    const saved = await this.evaluationRepository.save(
      this.evaluationRepository.create({
        tenant_id: tenant.tenantId,
        milestone_id: milestone.id,
        evaluated_by_user_id: actorUserId,
        achieved_value: current.currentAchievedValue,
        target_value: current.currentTargetValue,
        completion_percent:
          current.currentCompletionPercent == null
            ? null
            : current.currentCompletionPercent.toFixed(2),
        status: current.status,
        crossed: current.crossed,
        evaluated_at: now,
      }),
    );
    this.logger.log({
      msg: 'milestone_evaluated',
      tenantId: tenant.tenantId,
      milestoneId: milestone.id,
      evaluationId: saved.id,
      crossed: saved.crossed,
    });
    if (
      saved.crossed &&
      !previouslyCrossed &&
      this.campaignNotifications
    ) {
      try {
        const campaign = await this.campaigns.getCampaignRecord(
          tenant,
          milestone.campaign_id,
        );
        await this.campaignNotifications.notifyMilestoneAchieved({
          tenantId: tenant.tenantId,
          campaignId: campaign.id,
          campaignName: campaign.name,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
        });
      } catch (error) {
        this.logger.error({
          msg: 'milestone_achieved_notification_failed',
          tenantId: tenant.tenantId,
          milestoneId: milestone.id,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
    return this.toEvaluationResponse(saved);
  }

  async listEvaluations(
    tenant: TenantContext,
    milestoneId: string,
  ): Promise<MilestoneEvaluationResponse[]> {
    const milestone = await this.requireVisible(tenant, milestoneId);
    const rows = await this.evaluationRepository.find({
      where: { tenant_id: tenant.tenantId, milestone_id: milestone.id },
      order: { evaluated_at: 'ASC' },
    });
    return rows.map((row) => this.toEvaluationResponse(row));
  }

  private async computeProgress(
    tenant: TenantContext,
    milestone: Milestone,
    now = new Date(),
  ): Promise<MilestoneProgressResponse> {
    const goal = this.goalOf(milestone);
    if (!goal) {
      return {
        milestoneId: milestone.id,
        campaignId: milestone.campaign_id,
        customerId: tenant.tenantId,
        hasGoal: false,
        metric: null,
        unit: null,
        thresholdValue: null,
        currentAchievedValue: 0,
        currentTargetValue: 0,
        currentCompletionPercent: null,
        crossed: false,
        status: 'none',
        computedAt: now.toISOString(),
      };
    }
    const aggregate = await this.progress.getCampaignProgress(
      tenant,
      milestone.campaign_id,
    );
    const unitRow = aggregate.units.find((row) => row.unit === goal.unit);
    const achievedValue = unitRow?.achievedValue ?? 0;
    const targetValue = unitRow?.targetValue ?? 0;
    const percent = unitRow?.completionPercent ?? null;
    const crossed = milestoneCrossed(
      goal.metric,
      goal.thresholdValue,
      achievedValue,
      percent,
    );
    return {
      milestoneId: milestone.id,
      campaignId: milestone.campaign_id,
      customerId: tenant.tenantId,
      hasGoal: true,
      metric: goal.metric,
      unit: goal.unit,
      thresholdValue: goal.thresholdValue,
      currentAchievedValue: achievedValue,
      currentTargetValue: targetValue,
      currentCompletionPercent: percent,
      crossed,
      status: unitRow?.completionStatus ?? 'none',
      computedAt: now.toISOString(),
    };
  }

  private async upsertProgressSnapshot(
    tenantId: string,
    milestoneId: string,
    current: MilestoneProgressResponse,
  ): Promise<void> {
    const existing = await this.progressRepository.findOne({
      where: { milestone_id: milestoneId },
    });
    const values = {
      tenant_id: tenantId,
      milestone_id: milestoneId,
      achieved_value: current.currentAchievedValue,
      target_value: current.currentTargetValue,
      completion_percent:
        current.currentCompletionPercent == null
          ? null
          : current.currentCompletionPercent.toFixed(2),
      status: current.status,
      crossed: current.crossed,
      computed_at: new Date(current.computedAt),
    };
    if (existing) {
      Object.assign(existing, values);
      await this.progressRepository.save(existing);
      return;
    }
    await this.progressRepository.save(this.progressRepository.create(values));
  }

  private goalOf(milestone: Milestone): MilestoneGoal | null {
    if (
      milestone.metric == null ||
      milestone.threshold_value == null ||
      milestone.unit == null
    ) {
      return null;
    }
    return {
      metric: milestone.metric,
      thresholdValue: milestone.threshold_value,
      unit: milestone.unit,
    };
  }

  private resolveGoal(input: GoalInput): MilestoneGoal | null {
    const unit = input.unit == null ? null : input.unit.trim() || null;
    const present = [input.metric, input.thresholdValue, unit].filter(
      (value) => value != null,
    ).length;
    if (present === 0) {
      return null;
    }
    if (present !== 3) {
      throw new InvalidRequestException(
        'metric, thresholdValue and unit must be set together or all omitted',
      );
    }
    return {
      metric: input.metric as MilestoneMetric,
      thresholdValue: input.thresholdValue as number,
      unit: unit as string,
    };
  }

  private assertHasPurpose(
    goal: MilestoneGoal | null,
    dueOn: string | null,
  ): void {
    if (!goal && !dueOn) {
      throw new InvalidRequestException(
        'A milestone needs a due date, a collective goal, or both',
      );
    }
  }

  private assertDueOnInWindow(
    campaign: { startsOn: string | null; endsOn: string | null },
    dueOn: string,
  ): void {
    if (!campaign.startsOn || !campaign.endsOn) {
      throw new InvalidRequestException(
        'Set the campaign start and end dates before dating a milestone',
        'MILESTONE_DATE_OUT_OF_WINDOW',
      );
    }
    if (dueOn < campaign.startsOn || dueOn > campaign.endsOn) {
      throw new InvalidRequestException(
        'dueOn must be within the campaign start and end dates',
        'MILESTONE_DATE_OUT_OF_WINDOW',
      );
    }
  }

  private async assertDueOnFree(
    tenantId: string,
    campaignId: string,
    dueOn: string,
    excludeMilestoneId: string | null,
  ): Promise<void> {
    const clash = await this.milestoneRepository.findOne({
      where: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        due_on: dueOn,
        is_active: true,
        ...(excludeMilestoneId ? { id: Not(excludeMilestoneId) } : {}),
      },
    });
    if (clash) {
      throw this.duplicateDateError();
    }
  }

  private duplicateDateError(): ResourceConflictException {
    return new ResourceConflictException(
      'Another milestone is already due on this date',
      'MILESTONE_DATE_DUPLICATE',
    );
  }

  private rethrowWriteError(error: unknown): never {
    if (isUniqueViolation(error, DUE_ON_INDEX)) {
      throw this.duplicateDateError();
    }
    if (isUniqueViolation(error)) {
      throw new ResourceConflictException(
        'A milestone with this key already exists on the campaign',
      );
    }
    if (isRaiseException(error)) {
      throw new ResourceNotFoundException('Campaign not found');
    }
    throw error;
  }

  private async requireVisible(
    tenant: TenantContext,
    milestoneId: string,
  ): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, tenant_id: tenant.tenantId },
    });
    if (!milestone) {
      throw new ResourceNotFoundException('Milestone not found');
    }
    await this.campaigns.getCampaignRecord(tenant, milestone.campaign_id);
    return milestone;
  }

  private async assertCanManage(tenant: TenantContext): Promise<void> {
    await this.customers.requireActive(tenant.tenantId);
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage milestones',
      );
    }
  }

  private normalizeKey(value: string, fallbackPrefix: string): string {
    return slugify(
      value,
      `${fallbackPrefix}-${randomBytes(4).toString('hex')}`,
    ).replace(/-/g, '_');
  }

  private async toMilestoneResponse(
    milestone: Milestone,
    locale: SupportedLocale,
  ): Promise<MilestoneResponse> {
    const [name, description, enName, enDescription] = await Promise.all([
      this.localization.resolveMilestoneContent(
        locale,
        milestone.tenant_id,
        milestone.id,
        'name',
        milestone.name,
      ),
      this.localization.resolveMilestoneContent(
        locale,
        milestone.tenant_id,
        milestone.id,
        'description',
        milestone.description,
      ),
      this.localization.readMilestoneEnglish(
        milestone.tenant_id,
        milestone.id,
        'name',
      ),
      this.localization.readMilestoneEnglish(
        milestone.tenant_id,
        milestone.id,
        'description',
      ),
    ]);
    const goal = this.goalOf(milestone);
    return {
      id: milestone.id,
      customerId: milestone.tenant_id,
      campaignId: milestone.campaign_id,
      key: milestone.key,
      name: name ?? milestone.name,
      description,
      dueOn: toIsoDate(milestone.due_on),
      metric: goal?.metric ?? null,
      thresholdValue: goal?.thresholdValue ?? null,
      unit: goal?.unit ?? null,
      hasGoal: goal !== null,
      isActive: milestone.is_active,
      translations: { en: { name: enName, description: enDescription } },
      createdByUserId: milestone.created_by_user_id,
      createdAt: milestone.created_at.toISOString(),
      updatedAt: milestone.updated_at.toISOString(),
    };
  }

  private toEvaluationResponse(
    evaluation: MilestoneEvaluation,
  ): MilestoneEvaluationResponse {
    return {
      id: evaluation.id,
      milestoneId: evaluation.milestone_id,
      customerId: evaluation.tenant_id,
      evaluatedByUserId: evaluation.evaluated_by_user_id,
      achievedValue: evaluation.achieved_value,
      targetValue: evaluation.target_value,
      completionPercent:
        evaluation.completion_percent == null
          ? null
          : Number(evaluation.completion_percent),
      crossed: evaluation.crossed,
      status: evaluation.status,
      evaluatedAt: evaluation.evaluated_at.toISOString(),
      createdAt: evaluation.created_at.toISOString(),
    };
  }
}
