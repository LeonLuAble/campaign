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
import { MeasurementDefinition } from '../domain/measurement-definition.entity.js';
import type { CreateMeasurementDefinitionDto } from '../dto/create-measurement-definition.dto.js';
import type { UpdateMeasurementDefinitionDto } from '../dto/update-measurement-definition.dto.js';

export interface MeasurementDefinitionResponse {
  id: string;
  customerId: string;
  campaignId: string;
  key: string;
  name: string;
  sourceUnit: string;
  description: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MeasurementDefinitionService {
  private readonly logger = new Logger(MeasurementDefinitionService.name);

  constructor(
    @InjectRepository(MeasurementDefinition)
    private readonly definitionRepository: Repository<MeasurementDefinition>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
  ) {}

  async findById(id: string): Promise<CampaignAccessRecord | null> {
    const definition = await this.definitionRepository.findOne({
      where: { id },
    });
    return definition
      ? { id: definition.id, tenantId: definition.tenant_id }
      : null;
  }

  async listForCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<MeasurementDefinitionResponse[]> {
    await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rows = await this.definitionRepository.find({
      where: { tenant_id: tenant.tenantId, campaign_id: campaignId },
      order: { created_at: 'ASC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async listActiveRows(
    tenantId: string,
    campaignId: string,
  ): Promise<MeasurementDefinition[]> {
    return this.definitionRepository.find({
      where: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        is_active: true,
      },
      order: { created_at: 'ASC' },
    });
  }

  async get(
    tenant: TenantContext,
    definitionId: string,
  ): Promise<MeasurementDefinitionResponse> {
    const definition = await this.requireVisible(tenant, definitionId);
    return this.toResponse(definition);
  }

  async create(
    tenant: TenantContext,
    campaignId: string,
    actorUserId: string,
    dto: CreateMeasurementDefinitionDto,
  ): Promise<MeasurementDefinitionResponse> {
    await this.assertCanManage(tenant);
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const key = this.normalizeKey(dto.key ?? dto.name, 'measurement');
    try {
      const saved = await this.definitionRepository.save(
        this.definitionRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: campaign.id,
          key,
          name: dto.name.trim(),
          source_unit: dto.sourceUnit.trim(),
          description: dto.description?.trim() || null,
          is_active: true,
          created_by_user_id: actorUserId,
        }),
      );
      this.logger.log({
        msg: 'measurement_definition_created',
        tenantId: tenant.tenantId,
        campaignId: campaign.id,
        measurementDefinitionId: saved.id,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A measurement definition with this key or source unit already exists on the campaign',
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
    definitionId: string,
    dto: UpdateMeasurementDefinitionDto,
  ): Promise<MeasurementDefinitionResponse> {
    await this.assertCanManage(tenant);
    const definition = await this.requireVisible(tenant, definitionId);
    if (dto.name !== undefined) {
      definition.name = dto.name.trim();
    }
    if (dto.sourceUnit !== undefined) {
      definition.source_unit = dto.sourceUnit.trim();
    }
    if (dto.description !== undefined) {
      definition.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      definition.is_active = dto.isActive;
    }
    try {
      const saved = await this.definitionRepository.save(definition);
      this.logger.log({
        msg: 'measurement_definition_updated',
        tenantId: tenant.tenantId,
        measurementDefinitionId: saved.id,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A measurement definition with this source unit already exists on the campaign',
        );
      }
      throw error;
    }
  }

  private async requireVisible(
    tenant: TenantContext,
    definitionId: string,
  ): Promise<MeasurementDefinition> {
    const definition = await this.definitionRepository.findOne({
      where: { id: definitionId, tenant_id: tenant.tenantId },
    });
    if (!definition) {
      throw new ResourceNotFoundException('Measurement definition not found');
    }
    await this.campaigns.getCampaignRecord(tenant, definition.campaign_id);
    return definition;
  }

  private async assertCanManage(tenant: TenantContext): Promise<void> {
    await this.customers.requireActive(tenant.tenantId);
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage measurement definitions',
      );
    }
  }

  private normalizeKey(value: string, fallbackPrefix: string): string {
    return slugify(
      value,
      `${fallbackPrefix}-${randomBytes(4).toString('hex')}`,
    ).replace(/-/g, '_');
  }

  private toResponse(
    definition: MeasurementDefinition,
  ): MeasurementDefinitionResponse {
    return {
      id: definition.id,
      customerId: definition.tenant_id,
      campaignId: definition.campaign_id,
      key: definition.key,
      name: definition.name,
      sourceUnit: definition.source_unit,
      description: definition.description,
      isActive: definition.is_active,
      createdByUserId: definition.created_by_user_id,
      createdAt: definition.created_at.toISOString(),
      updatedAt: definition.updated_at.toISOString(),
    };
  }
}
