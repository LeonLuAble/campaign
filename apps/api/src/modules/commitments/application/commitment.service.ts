import {
  Inject,
  Injectable,
  Logger,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import {
  isRaiseException,
  isUniqueViolation,
} from '../../../shared/database/postgres-errors.js';
import type { CampaignAccessRecord } from '../../authorization/application/access-readers.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import {
  CAMPAIGN_RULE_STRATEGIES,
  GenericCampaignRules,
  resolveCampaignRules,
  type CampaignRuleStrategy,
} from '../../campaigns/application/campaign-rule-strategy.js';
import { canPledgeCommitment } from '../../campaigns/application/campaign-lifecycle.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { normalizeSettings } from '../../campaigns/application/timezone.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { LocalizationService } from '../../localization/application/localization.service.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { Commitment } from '../domain/commitment.entity.js';
import type { CreateCommitmentDto } from '../dto/create-commitment.dto.js';
import type { UpdateCommitmentDto } from '../dto/update-commitment.dto.js';

export interface CommitmentResponse {
  id: string;
  customerId: string;
  campaignId: string;
  participationId: string;
  typeKey: string | null;
  targetValue: number;
  unit: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CommitmentService {
  private readonly logger = new Logger(CommitmentService.name);
  private readonly genericRules = new GenericCampaignRules();

  constructor(
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    private readonly localization: LocalizationService,
    @Optional()
    @Inject(CAMPAIGN_RULE_STRATEGIES)
    private readonly strategies: CampaignRuleStrategy[] | null,
  ) {}

  async findById(id: string): Promise<CampaignAccessRecord | null> {
    const commitment = await this.commitmentRepository.findOne({
      where: { id },
    });
    return commitment
      ? { id: commitment.id, tenantId: commitment.tenant_id }
      : null;
  }

  async listCommitmentOptions(
    tenant: TenantContext,
    campaignId: string,
    locale: SupportedLocale = 'en',
  ): Promise<{
    campaignId: string;
    customerId: string;
    strategy: string;
    units: string[];
    choices: Array<{
      key: string;
      name: string;
      label: string;
      description: string;
      canonicalUnit: string;
      suggestedTarget: number | null;
      usesCampaignDuration: boolean;
    }>;
  }> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const descriptor = rules.describeCommitmentOptions();
    const namespace = rules.describeCatalog().translationNamespace;
    const choices = [];
    for (const choice of descriptor.choices) {
      const labelKey = `choices.${choice.key}.label`;
      const descriptionKey = `choices.${choice.key}.description`;
      const label =
        (await this.localization.resolveTranslation(
          locale,
          namespace,
          labelKey,
        )) ??
        rules.resolveLocalizedCopy?.(locale, labelKey) ??
        choice.name;
      const description =
        (await this.localization.resolveTranslation(
          locale,
          namespace,
          descriptionKey,
        )) ??
        rules.resolveLocalizedCopy?.(locale, descriptionKey) ??
        '';
      choices.push({
        ...choice,
        label,
        description,
      });
    }
    return {
      campaignId: campaign.id,
      customerId: campaign.tenantId,
      strategy: descriptor.strategy,
      units: descriptor.units,
      choices,
    };
  }

  async listForParticipation(
    tenant: TenantContext,
    participationId: string,
  ): Promise<CommitmentResponse[]> {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    const rows = await this.commitmentRepository.find({
      where: {
        tenant_id: tenant.tenantId,
        participation_id: participation.id,
      },
      order: { created_at: 'ASC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async get(
    tenant: TenantContext,
    commitmentId: string,
  ): Promise<CommitmentResponse> {
    const commitment = await this.requireVisible(tenant, commitmentId);
    return this.toResponse(commitment);
  }

  async createOrReplace(
    tenant: TenantContext,
    participationId: string,
    actorUserId: string,
    dto: CreateCommitmentDto,
  ): Promise<CommitmentResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    this.assertCanActOnParticipant(tenant, actorUserId, participation.userId);
    if (participation.status !== ParticipationStatus.ENROLLED) {
      throw new InvalidRequestException(
        'Commitments can only be recorded on an enrolled participation',
      );
    }
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      participation.campaignId,
    );
    if (!canPledgeCommitment(campaign.status)) {
      throw new InvalidRequestException(
        'Commitments can only be recorded on published or started campaigns',
      );
    }

    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const prepared = this.prepareCommitment(rules, {
      typeKey: dto.typeKey?.trim() || null,
      targetValue: dto.targetValue,
      unit: dto.unit.trim(),
      payload: normalizeSettings(dto.payload),
    });
    const { typeKey, unit, payload } = prepared;

    const existing = await this.commitmentRepository.findOne({
      where: { participation_id: participation.id },
    });
    try {
      if (existing) {
        existing.type_key = typeKey;
        existing.target_value = dto.targetValue;
        existing.unit = unit;
        existing.payload = payload;
        const saved = await this.commitmentRepository.save(existing);
        this.logger.log({
          msg: 'commitment_updated',
          tenantId: tenant.tenantId,
          campaignId: saved.campaign_id,
          participationId: saved.participation_id,
          commitmentId: saved.id,
        });
        return this.toResponse(saved);
      }
      const saved = await this.commitmentRepository.save(
        this.commitmentRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: participation.campaignId,
          participation_id: participation.id,
          type_key: typeKey,
          target_value: dto.targetValue,
          unit,
          payload,
        }),
      );
      this.logger.log({
        msg: 'commitment_created',
        tenantId: tenant.tenantId,
        campaignId: saved.campaign_id,
        participationId: saved.participation_id,
        commitmentId: saved.id,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.commitmentRepository.findOne({
          where: { participation_id: participation.id },
        });
        if (raced) {
          return this.toResponse(raced);
        }
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Participation not found');
      }
      throw error;
    }
  }

  async update(
    tenant: TenantContext,
    commitmentId: string,
    actorUserId: string,
    dto: UpdateCommitmentDto,
  ): Promise<CommitmentResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const commitment = await this.requireVisible(tenant, commitmentId);
    const participation = await this.participations.getParticipationRecord(
      tenant,
      commitment.participation_id,
    );
    this.assertCanCorrect(tenant, actorUserId, participation.userId);
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      participation.campaignId,
    );

    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const prepared = this.prepareCommitment(rules, {
      typeKey:
        dto.typeKey === undefined
          ? commitment.type_key
          : dto.typeKey?.trim() || null,
      targetValue: dto.targetValue ?? commitment.target_value,
      unit: dto.unit?.trim() ?? commitment.unit,
      payload:
        dto.payload === undefined
          ? commitment.payload
          : normalizeSettings(dto.payload),
    });
    const { typeKey, targetValue, unit, payload } = prepared;

    commitment.type_key = typeKey;
    commitment.target_value = targetValue;
    commitment.unit = unit;
    commitment.payload = payload;
    const saved = await this.commitmentRepository.save(commitment);
    this.logger.log({
      msg: 'commitment_corrected',
      tenantId: tenant.tenantId,
      commitmentId: saved.id,
    });
    return this.toResponse(saved);
  }

  private async requireVisible(
    tenant: TenantContext,
    commitmentId: string,
  ): Promise<Commitment> {
    const commitment = await this.commitmentRepository.findOne({
      where: { id: commitmentId, tenant_id: tenant.tenantId },
    });
    if (!commitment) {
      throw new ResourceNotFoundException('Commitment not found');
    }
    const participation = await this.participations.getParticipationRecord(
      tenant,
      commitment.participation_id,
    );
    if (!this.canView(tenant, participation.userId)) {
      throw new ResourceNotFoundException('Commitment not found');
    }
    return commitment;
  }

  private canView(tenant: TenantContext, ownerUserId: string): boolean {
    return this.isOwn(tenant, ownerUserId) || this.canCorrect(tenant);
  }

  private canCorrect(tenant: TenantContext): boolean {
    return tenant.permissions.has(PERMISSIONS.COMMITMENTS_UPDATE);
  }

  private isOwn(tenant: TenantContext, ownerUserId: string): boolean {
    return tenant.memberships.some(
      (membership) => membership.isActive && membership.userId === ownerUserId,
    );
  }

  private assertCanActOnParticipant(
    tenant: TenantContext,
    actorUserId: string,
    ownerUserId: string,
  ): void {
    if (actorUserId === ownerUserId) {
      return;
    }
    if (!this.canCorrect(tenant)) {
      throw new AccessForbiddenException(
        'Creating a commitment for another user requires commitments.update',
      );
    }
  }

  private assertCanCorrect(
    tenant: TenantContext,
    actorUserId: string,
    ownerUserId: string,
  ): void {
    if (actorUserId === ownerUserId) {
      throw new AccessForbiddenException(
        'Participants cannot edit a commitment; record a replacement instead',
      );
    }
    if (!this.canCorrect(tenant)) {
      throw new AccessForbiddenException(
        'Correcting a commitment requires commitments.update',
      );
    }
  }

  private strategyList(): CampaignRuleStrategy[] {
    const value = this.strategies;
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private prepareCommitment(
    rules: CampaignRuleStrategy,
    input: {
      typeKey: string | null;
      targetValue: number;
      unit: string;
      payload: Record<string, unknown>;
    },
  ) {
    const normalized = rules.normalizeCommitment
      ? rules.normalizeCommitment(input)
      : input;
    rules.validateCommitment(normalized);
    return normalized;
  }

  private toResponse(commitment: Commitment): CommitmentResponse {
    return {
      id: commitment.id,
      customerId: commitment.tenant_id,
      campaignId: commitment.campaign_id,
      participationId: commitment.participation_id,
      typeKey: commitment.type_key,
      targetValue: commitment.target_value,
      unit: commitment.unit,
      payload: commitment.payload,
      createdAt: commitment.created_at.toISOString(),
      updatedAt: commitment.updated_at.toISOString(),
    };
  }
}
