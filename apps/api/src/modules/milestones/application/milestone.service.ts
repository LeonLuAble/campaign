import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  AccessForbiddenException,
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
import { CustomerService } from '../../customers/application/customer.service.js';
import { milestoneCrossed } from '../../progress/application/completion.js';
import { ProgressService } from '../../progress/application/progress.service.js';
import { Milestone, MilestoneMetric } from '../domain/milestone.entity.js';
import { MilestoneEvaluation } from '../domain/milestone-evaluation.entity.js';
import { MilestoneProgress } from '../domain/milestone-progress.entity.js';
import type { CreateMilestoneDto } from '../dto/create-milestone.dto.js';
import type { UpdateMilestoneDto } from '../dto/update-milestone.dto.js';

export interface MilestoneResponse {
  id: string;
  customerId: string;
  campaignId: string;
  key: string;
  name: string;
  description: string | null;
  metric: MilestoneMetric;
  thresholdValue: number;
  unit: string;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneProgressResponse {
  milestoneId: string;
  campaignId: string;
  customerId: string;
  metric: MilestoneMetric;
  unit: string;
  thresholdValue: number;
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
  ): Promise<MilestoneResponse[]> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rows = await this.milestoneRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
      order: { created_at: 'ASC' },
    });
    return rows.map((row) => this.toMilestoneResponse(row));
  }

  async get(
    tenant: TenantContext,
    milestoneId: string,
  ): Promise<MilestoneResponse> {
    const milestone = await this.requireVisible(tenant, milestoneId);
    return this.toMilestoneResponse(milestone);
  }

  async create(
    tenant: TenantContext,
    campaignId: string,
    actorUserId: string,
    dto: CreateMilestoneDto,
  ): Promise<MilestoneResponse> {
    await this.assertCanManage(tenant);
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const key = this.normalizeKey(dto.key ?? dto.name, 'milestone');
    try {
      const saved = await this.milestoneRepository.save(
        this.milestoneRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaign.id,
          key,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          metric: dto.metric,
          threshold_value: dto.thresholdValue,
          unit: dto.unit.trim(),
          is_active: true,
          created_by_user_id: actorUserId,
        }),
      );
      this.logger.log({
        msg: 'milestone_created',
        tenantId: tenant.tenantId,
        campaignId: campaign.id,
        milestoneId: saved.id,
      });
      return this.toMilestoneResponse(saved);
    } catch (error) {
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
  }

  async update(
    tenant: TenantContext,
    milestoneId: string,
    dto: UpdateMilestoneDto,
  ): Promise<MilestoneResponse> {
    await this.assertCanManage(tenant);
    const milestone = await this.requireVisible(tenant, milestoneId);
    if (dto.name !== undefined) {
      milestone.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      milestone.description = dto.description?.trim() || null;
    }
    if (dto.metric !== undefined) {
      milestone.metric = dto.metric;
    }
    if (dto.thresholdValue !== undefined) {
      milestone.threshold_value = dto.thresholdValue;
    }
    if (dto.unit !== undefined) {
      milestone.unit = dto.unit.trim();
    }
    if (dto.isActive !== undefined) {
      milestone.is_active = dto.isActive;
    }
    const saved = await this.milestoneRepository.save(milestone);
    this.logger.log({
      msg: 'milestone_updated',
      tenantId: tenant.tenantId,
      milestoneId: saved.id,
    });
    return this.toMilestoneResponse(saved);
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
    const aggregate = await this.progress.getCampaignProgress(
      tenant,
      milestone.campaign_id,
    );
    const unitRow = aggregate.units.find((row) => row.unit === milestone.unit);
    const achievedValue = unitRow?.achievedValue ?? 0;
    const targetValue = unitRow?.targetValue ?? 0;
    const percent = unitRow?.completionPercent ?? null;
    const crossed = milestoneCrossed(
      milestone.metric,
      milestone.threshold_value,
      achievedValue,
      percent,
    );
    return {
      milestoneId: milestone.id,
      campaignId: milestone.campaign_id,
      customerId: tenant.tenantId,
      metric: milestone.metric,
      unit: milestone.unit,
      thresholdValue: milestone.threshold_value,
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

  private toMilestoneResponse(milestone: Milestone): MilestoneResponse {
    return {
      id: milestone.id,
      customerId: milestone.tenant_id,
      campaignId: milestone.campaign_id,
      key: milestone.key,
      name: milestone.name,
      description: milestone.description,
      metric: milestone.metric,
      thresholdValue: milestone.threshold_value,
      unit: milestone.unit,
      isActive: milestone.is_active,
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
