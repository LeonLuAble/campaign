import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { normalizeSettings } from '../../campaigns/application/timezone.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import type { AggregateProgressResponse } from '../../progress/application/progress.service.js';
import { ProgressService } from '../../progress/application/progress.service.js';
import {
  VISUALIZATION_TYPE_TREE,
  Visualization,
  type VisualizationType,
} from '../domain/visualization.entity.js';
import type { ReplaceVisualizationDto } from '../dto/replace-visualization.dto.js';

export interface VisualizationResponse {
  id: string;
  customerId: string;
  campaignId: string;
  type: VisualizationType;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisualizationDataResponse {
  campaignId: string;
  customerId: string;
  timezone: string;
  type: VisualizationType;
  displayName: string;
  isActive: boolean;
  completionPercent: number | null;
  completionStatus: string;
  achievedValue: number;
  targetValue: number;
  unit: string | null;
}

@Injectable()
export class VisualizationService {
  private readonly logger = new Logger(VisualizationService.name);

  constructor(
    @InjectRepository(Visualization)
    private readonly visualizationRepository: Repository<Visualization>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    @Inject(forwardRef(() => ProgressService))
    private readonly progress: ProgressService,
  ) {}

  async get(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<VisualizationResponse> {
    const visualization = await this.requireForCampaign(tenant, campaignId);
    return this.toResponse(visualization);
  }

  async replace(
    tenant: TenantContext,
    campaignId: string,
    actorUserId: string,
    dto: ReplaceVisualizationDto,
  ): Promise<VisualizationResponse> {
    await this.assertCanManage(tenant);
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const settings = normalizeSettings(dto.settings);
    const existing = await this.visualizationRepository.findOne({
      where: { tenant_id: tenant.tenantId, campaign_id: campaign.id },
    });
    try {
      const saved = existing
        ? await this.visualizationRepository.save(
            Object.assign(existing, {
              type: dto.type,
              settings,
              is_active: true,
            }),
          )
        : await this.visualizationRepository.save(
            this.visualizationRepository.create({
              tenant_id: tenant.tenantId,
              campaign_id: campaign.id,
              type: dto.type,
              settings,
              is_active: true,
              created_by_user_id: actorUserId,
            }),
          );
      this.logger.log({
        msg: existing ? 'visualization_updated' : 'visualization_created',
        tenantId: tenant.tenantId,
        campaignId: campaign.id,
        visualizationId: saved.id,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A visualization already exists for this campaign',
        );
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Campaign not found');
      }
      throw error;
    }
  }

  async getData(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<VisualizationDataResponse> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const visualization = await this.visualizationRepository.findOne({
      where: { tenant_id: tenant.tenantId, campaign_id: campaign.id },
    });
    const aggregate = await this.progress.getCampaignProgress(
      tenant,
      campaign.id,
    );
    return this.toData(campaign, visualization, aggregate);
  }

  toData(
    campaign: { id: string; timezone: string },
    visualization: Visualization | null,
    aggregate: AggregateProgressResponse,
    tenantId?: string,
  ): VisualizationDataResponse {
    const primary = aggregate.units[0] ?? null;
    const displayName = readDisplayName(visualization?.settings);
    return {
      campaignId: campaign.id,
      customerId: tenantId ?? aggregate.customerId,
      timezone: campaign.timezone,
      type: visualization?.type ?? VISUALIZATION_TYPE_TREE,
      displayName,
      isActive: visualization?.is_active ?? false,
      completionPercent: primary?.completionPercent ?? null,
      completionStatus: primary?.completionStatus ?? 'none',
      achievedValue: primary?.achievedValue ?? 0,
      targetValue: primary?.targetValue ?? 0,
      unit: primary?.unit ?? null,
    };
  }

  async findForCampaign(
    tenantId: string,
    campaignId: string,
  ): Promise<Visualization | null> {
    return this.visualizationRepository.findOne({
      where: { tenant_id: tenantId, campaign_id: campaignId },
    });
  }

  private async requireForCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<Visualization> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const visualization = await this.visualizationRepository.findOne({
      where: { tenant_id: tenant.tenantId, campaign_id: campaign.id },
    });
    if (!visualization) {
      throw new ResourceNotFoundException('Visualization not found');
    }
    return visualization;
  }

  private async assertCanManage(tenant: TenantContext): Promise<void> {
    await this.customers.requireActive(tenant.tenantId);
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage visualizations',
      );
    }
  }

  private toResponse(visualization: Visualization): VisualizationResponse {
    return {
      id: visualization.id,
      customerId: visualization.tenant_id,
      campaignId: visualization.campaign_id,
      type: visualization.type,
      settings: visualization.settings,
      isActive: visualization.is_active,
      createdByUserId: visualization.created_by_user_id,
      createdAt: visualization.created_at.toISOString(),
      updatedAt: visualization.updated_at.toISOString(),
    };
  }
}

export function readDisplayName(
  settings: Record<string, unknown> | undefined,
): string {
  const value = settings?.displayName;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return VISUALIZATION_TYPE_TREE;
}
