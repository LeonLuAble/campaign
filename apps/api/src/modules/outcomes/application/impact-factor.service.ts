import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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
import type { CampaignAccessRecord } from '../../authorization/application/access-readers.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import {
  parseIsoDate,
  toIsoDate,
} from '../../campaigns/application/timezone.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { ImpactFactor } from '../domain/impact-factor.entity.js';
import type { CreateImpactFactorDto } from '../dto/create-impact-factor.dto.js';
import type { UpdateImpactFactorDto } from '../dto/update-impact-factor.dto.js';
import { rangesOverlap } from './outcome-math.js';

export interface ImpactFactorResponse {
  id: string;
  customerId: string;
  campaignId: string | null;
  sourceUnit: string;
  outcomeMetric: string;
  outcomeUnit: string;
  factorValue: number;
  version: number;
  source: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ImpactFactorService {
  private readonly logger = new Logger(ImpactFactorService.name);

  constructor(
    @InjectRepository(ImpactFactor)
    private readonly factorRepository: Repository<ImpactFactor>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
  ) {}

  async findById(id: string): Promise<CampaignAccessRecord | null> {
    const factor = await this.factorRepository.findOne({ where: { id } });
    return factor ? { id: factor.id, tenantId: factor.tenant_id } : null;
  }

  async list(
    tenant: TenantContext,
    campaignId?: string | null,
  ): Promise<ImpactFactorResponse[]> {
    if (campaignId) {
      await this.campaigns.getCampaignRecord(tenant, campaignId);
    } else {
      await this.customers.requireActive(tenant.tenantId);
    }
    const rows = await this.listApplicableRows(
      tenant.tenantId,
      campaignId ?? null,
    );
    return rows.map((row) => this.toResponse(row));
  }

  async listApplicableRows(
    tenantId: string,
    campaignId: string | null,
  ): Promise<ImpactFactor[]> {
    const tenantWide = await this.factorRepository.find({
      where: { tenant_id: tenantId, campaign_id: IsNull() },
      order: { source_unit: 'ASC', outcome_metric: 'ASC', version: 'ASC' },
    });
    if (!campaignId) {
      return tenantWide;
    }
    const campaignRows = await this.factorRepository.find({
      where: { tenant_id: tenantId, campaign_id: campaignId },
      order: { source_unit: 'ASC', outcome_metric: 'ASC', version: 'ASC' },
    });
    return [...tenantWide, ...campaignRows];
  }

  async get(
    tenant: TenantContext,
    impactFactorId: string,
  ): Promise<ImpactFactorResponse> {
    const factor = await this.requireVisible(tenant, impactFactorId);
    return this.toResponse(factor);
  }

  async create(
    tenant: TenantContext,
    actorUserId: string,
    dto: CreateImpactFactorDto,
    campaignIdFromPath?: string,
  ): Promise<ImpactFactorResponse> {
    await this.assertCanManage(tenant);
    const campaignId = campaignIdFromPath ?? dto.campaignId ?? null;
    if (campaignId) {
      await this.campaigns.getCampaignRecord(tenant, campaignId);
    }
    const sourceUnit = dto.sourceUnit.trim();
    const outcomeMetric = dto.outcomeMetric.trim();
    const outcomeUnit = dto.outcomeUnit.trim();
    const source = dto.source.trim();
    const effectiveFrom = parseIsoDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo =
      dto.effectiveTo == null || dto.effectiveTo === ''
        ? null
        : parseIsoDate(dto.effectiveTo, 'effectiveTo');
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new InvalidRequestException(
        'effectiveTo must be after effectiveFrom',
      );
    }

    const siblings = await this.listScopeRows(
      tenant.tenantId,
      campaignId,
      sourceUnit,
      outcomeMetric,
    );
    const version =
      siblings.reduce((max, row) => Math.max(max, row.version), 0) + 1;

    const overlapping = siblings.filter(
      (row) =>
        row.is_active &&
        rangesOverlap(
          effectiveFrom,
          effectiveTo,
          toIsoDate(row.effective_from) ?? row.effective_from,
          row.effective_to == null
            ? null
            : (toIsoDate(row.effective_to) ?? row.effective_to),
        ),
    );
    for (const previous of overlapping) {
      const previousTo =
        previous.effective_to == null
          ? null
          : (toIsoDate(previous.effective_to) ?? previous.effective_to);
      const previousFrom =
        toIsoDate(previous.effective_from) ?? previous.effective_from;
      const canClose =
        previousTo == null &&
        effectiveFrom > previousFrom &&
        (effectiveTo == null || effectiveTo > effectiveFrom);
      if (!canClose) {
        throw new ResourceConflictException(
          'An active impact factor already covers this effective date range',
        );
      }
      previous.effective_to = effectiveFrom;
      await this.factorRepository.save(previous);
    }

    try {
      const saved = await this.factorRepository.save(
        this.factorRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaignId,
          source_unit: sourceUnit,
          outcome_metric: outcomeMetric,
          outcome_unit: outcomeUnit,
          factor_value: dto.factorValue,
          version,
          source,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          is_active: true,
          created_by_user_id: actorUserId,
        }),
      );
      this.logger.log({
        msg: 'impact_factor_created',
        tenantId: tenant.tenantId,
        campaignId,
        impactFactorId: saved.id,
        version: saved.version,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'An impact factor version already exists for this metric',
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
    impactFactorId: string,
    dto: UpdateImpactFactorDto,
  ): Promise<ImpactFactorResponse> {
    await this.assertCanManage(tenant);
    const factor = await this.requireVisible(tenant, impactFactorId);
    if (dto.source !== undefined) {
      const source = dto.source.trim();
      if (!source) {
        throw new InvalidRequestException('source is required');
      }
      factor.source = source;
    }
    if (dto.effectiveTo !== undefined) {
      const effectiveTo =
        dto.effectiveTo == null || dto.effectiveTo === ''
          ? null
          : parseIsoDate(dto.effectiveTo, 'effectiveTo');
      const effectiveFrom =
        toIsoDate(factor.effective_from) ?? factor.effective_from;
      if (effectiveTo && effectiveTo <= effectiveFrom) {
        throw new InvalidRequestException(
          'effectiveTo must be after effectiveFrom',
        );
      }
      const siblings = (
        await this.listScopeRows(
          tenant.tenantId,
          factor.campaign_id,
          factor.source_unit,
          factor.outcome_metric,
        )
      ).filter((row) => row.id !== factor.id && row.is_active);
      for (const sibling of siblings) {
        if (
          rangesOverlap(
            effectiveFrom,
            effectiveTo,
            toIsoDate(sibling.effective_from) ?? sibling.effective_from,
            sibling.effective_to == null
              ? null
              : (toIsoDate(sibling.effective_to) ?? sibling.effective_to),
          )
        ) {
          throw new ResourceConflictException(
            'An active impact factor already covers this effective date range',
          );
        }
      }
      factor.effective_to = effectiveTo;
    }
    if (dto.isActive !== undefined) {
      factor.is_active = dto.isActive;
    }
    const saved = await this.factorRepository.save(factor);
    this.logger.log({
      msg: 'impact_factor_updated',
      tenantId: tenant.tenantId,
      impactFactorId: saved.id,
    });
    return this.toResponse(saved);
  }

  private async listScopeRows(
    tenantId: string,
    campaignId: string | null,
    sourceUnit: string,
    outcomeMetric: string,
  ): Promise<ImpactFactor[]> {
    return this.factorRepository.find({
      where: {
        tenant_id: tenantId,
        campaign_id: campaignId ?? IsNull(),
        source_unit: sourceUnit,
        outcome_metric: outcomeMetric,
      },
      order: { version: 'ASC' },
    });
  }

  private async requireVisible(
    tenant: TenantContext,
    impactFactorId: string,
  ): Promise<ImpactFactor> {
    const factor = await this.factorRepository.findOne({
      where: { id: impactFactorId, tenant_id: tenant.tenantId },
    });
    if (!factor) {
      throw new ResourceNotFoundException('Impact factor not found');
    }
    if (factor.campaign_id) {
      await this.campaigns.getCampaignRecord(tenant, factor.campaign_id);
    } else {
      await this.customers.requireActive(tenant.tenantId);
    }
    return factor;
  }

  private async assertCanManage(tenant: TenantContext): Promise<void> {
    await this.customers.requireActive(tenant.tenantId);
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage impact factors',
      );
    }
  }

  private toResponse(factor: ImpactFactor): ImpactFactorResponse {
    return {
      id: factor.id,
      customerId: factor.tenant_id,
      campaignId: factor.campaign_id,
      sourceUnit: factor.source_unit,
      outcomeMetric: factor.outcome_metric,
      outcomeUnit: factor.outcome_unit,
      factorValue: factor.factor_value,
      version: factor.version,
      source: factor.source,
      effectiveFrom: toIsoDate(factor.effective_from) ?? factor.effective_from,
      effectiveTo:
        factor.effective_to == null
          ? null
          : (toIsoDate(factor.effective_to) ?? factor.effective_to),
      isActive: factor.is_active,
      createdByUserId: factor.created_by_user_id,
      createdAt: factor.created_at.toISOString(),
      updatedAt: factor.updated_at.toISOString(),
    };
  }
}
