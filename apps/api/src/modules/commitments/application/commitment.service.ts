import {
  Inject,
  Injectable,
  Logger,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
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
import {
  calendarDateInTimeZone,
  inclusiveIsoDateCount,
  normalizeSettings,
  toIsoDate,
} from '../../campaigns/application/timezone.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { LocalizationService } from '../../localization/application/localization.service.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { MilestoneService } from '../../milestones/application/milestone.service.js';
import {
  Commitment,
  CommitmentDecision,
} from '../domain/commitment.entity.js';
import {
  commitmentWindow,
  defaultPeriod,
  isPeriodised,
  periodStatus,
  targetExceedsWindow,
  type CommitmentWindow,
  type PeriodBounds,
  type PeriodStatus,
} from '../domain/commitment-periods.js';
import type { CreateCommitmentDto } from '../dto/create-commitment.dto.js';
import type { UpdateCommitmentDto } from '../dto/update-commitment.dto.js';

export interface CommitmentResponse {
  id: string;
  customerId: string;
  campaignId: string;
  participationId: string;
  decision: CommitmentDecision;
  typeKey: string | null;
  targetValue: number;
  unit: string | null;
  payload: Record<string, unknown>;
  /** NULL for whole-campaign commitments (no dated milestones). */
  validFrom: string | null;
  validTo: string | null;
  /** The period end date; NULL for whole-campaign commitments. */
  periodKey: string | null;
  periodMilestoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommitmentOptionsResponse {
  campaignId: string;
  customerId: string;
  strategy: string;
  units: string[];
  /** The period the window belongs to; NULL while campaign dates are unset. */
  periodKey: string | null;
  periodStatus: PeriodStatus | null;
  validFrom: string | null;
  validTo: string | null;
  dayCount: number | null;
  choices: Array<{
    key: string;
    name: string;
    label: string;
    description: string;
    canonicalUnit: string;
    /** For usesCampaignDuration choices: the target for this window. */
    suggestedTarget: number | null;
    usesCampaignDuration: boolean;
  }>;
}

type CommitmentValues = Pick<
  Commitment,
  'decision' | 'type_key' | 'target_value' | 'unit' | 'payload'
>;

interface ResolvedCampaign {
  id: string;
  tenantId: string;
  status: Parameters<typeof canPledgeCommitment>[0];
  timezone: string;
  startsOn: string | null;
  endsOn: string | null;
  configuration: Record<string, unknown>;
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
    @Inject(forwardRef(() => MilestoneService))
    private readonly milestones: MilestoneService,
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
    periodKey?: string,
    now: Date = new Date(),
  ): Promise<CommitmentOptionsResponse> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const today = calendarDateInTimeZone(now, campaign.timezone);
    const periods = await this.milestones.periodsForCampaign(campaign, locale);
    const period = this.resolvePeriod(periods, periodKey, today);
    const window = period ? this.windowFor(periods, period, today) : null;

    const descriptor = rules.describeCommitmentOptions();
    const namespace = rules.describeCatalog().translationNamespace;
    const choices: CommitmentOptionsResponse['choices'] = [];
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
      const suggestedTarget =
        choice.usesCampaignDuration && window
          ? rules.resolveProgressTarget(
              {
                typeKey: choice.key,
                targetValue: 1,
                unit: choice.canonicalUnit,
                payload: {},
              },
              {
                startsOn: window.validFrom,
                endsOn: window.validTo,
                timezone: campaign.timezone,
              },
            ).targetValue
          : choice.suggestedTarget;
      choices.push({
        key: choice.key,
        name: choice.name,
        label,
        description,
        canonicalUnit: choice.canonicalUnit,
        suggestedTarget,
        usesCampaignDuration: choice.usesCampaignDuration,
      });
    }
    return {
      campaignId: campaign.id,
      customerId: campaign.tenantId,
      strategy: descriptor.strategy,
      units: descriptor.units,
      periodKey: period?.key ?? null,
      periodStatus: period ? periodStatus(period, today) : null,
      validFrom: window?.validFrom ?? null,
      validTo: window?.validTo ?? null,
      dayCount: window?.dayCount ?? null,
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
    now: Date = new Date(),
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
    if (
      dto.restOfCampaign === true &&
      dto.decision === CommitmentDecision.COMMITTED
    ) {
      throw new InvalidRequestException(
        'restOfCampaign records not taking part; omit decision or send not_taking_part',
      );
    }
    const decision =
      dto.decision ??
      (dto.restOfCampaign === true
        ? CommitmentDecision.NOT_TAKING_PART
        : CommitmentDecision.COMMITTED);

    const today = calendarDateInTimeZone(now, campaign.timezone);
    const periods = await this.milestones.periodsForCampaign(campaign);
    if (!isPeriodised(periods)) {
      if (dto.periodKey && dto.periodKey !== periods[0]?.key) {
        throw new InvalidRequestException('Unknown periodKey for this campaign');
      }
      return this.saveWholeCampaign(
        tenant,
        participation,
        this.commitmentValues(campaign.configuration, decision, dto),
      );
    }

    const target = this.resolvePeriod(periods, dto.periodKey, today);
    if (!target) {
      throw new InvalidRequestException('Unknown periodKey for this campaign');
    }
    if (periodStatus(target, today) === 'closed') {
      throw new ResourceConflictException(
        'This period has closed; commitments can no longer change',
        'PERIOD_CLOSED',
      );
    }
    const writes = dto.restOfCampaign
      ? periods.filter(
          (period) =>
            period.endsOn >= target.endsOn &&
            periodStatus(period, today) !== 'closed',
        )
      : [target];
    const planned = writes.map((period) => {
      const window = this.windowFor(periods, period, today);
      return {
        period,
        window,
        values: this.periodValues(campaign, decision, dto, window),
      };
    });

    const saved = await this.savePeriods(tenant, participation, planned);
    return this.toResponse(saved[0]);
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
    if (commitment.decision === CommitmentDecision.NOT_TAKING_PART) {
      throw new InvalidRequestException(
        'A not-taking-part decision has no target to correct; record a commitment instead',
      );
    }
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      participation.campaignId,
    );

    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const nextTarget = dto.targetValue ?? commitment.target_value;
    const nextUnit = dto.unit?.trim() ?? commitment.unit;
    if (nextTarget == null || nextUnit == null || nextUnit.length === 0) {
      throw new InvalidRequestException(
        'targetValue and unit are required for a commitment',
      );
    }
    const prepared = this.prepareCommitment(rules, {
      typeKey:
        dto.typeKey === undefined
          ? commitment.type_key
          : dto.typeKey?.trim() || null,
      targetValue: nextTarget,
      unit: nextUnit,
      payload:
        dto.payload === undefined
          ? commitment.payload
          : normalizeSettings(dto.payload),
    });
    const { typeKey, targetValue, unit, payload } = prepared;
    const validFrom = toIsoDate(commitment.valid_from);
    const validTo = toIsoDate(commitment.valid_to);
    if (
      validFrom &&
      validTo &&
      targetExceedsWindow(
        unit,
        targetValue,
        inclusiveIsoDateCount(validFrom, validTo),
      )
    ) {
      throw new InvalidRequestException(
        'The target is larger than this commitment window allows',
        'COMMITMENT_TARGET_EXCEEDS_PERIOD',
      );
    }

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

  private resolvePeriod<T extends PeriodBounds>(
    periods: T[],
    periodKey: string | undefined,
    today: string,
  ): T | null {
    if (periodKey === undefined) {
      return defaultPeriod(periods, today);
    }
    const match = periods.find((period) => period.key === periodKey);
    if (!match) {
      throw new InvalidRequestException('Unknown periodKey for this campaign');
    }
    return match;
  }

  /**
   * Whole-campaign campaigns keep the full campaign span; periodised ones
   * start today (clamped to the period start).
   */
  private windowFor(
    periods: PeriodBounds[],
    period: PeriodBounds,
    today: string,
  ): CommitmentWindow {
    if (!isPeriodised(periods)) {
      return {
        validFrom: period.startsOn,
        validTo: period.endsOn,
        dayCount: inclusiveIsoDateCount(period.startsOn, period.endsOn),
      };
    }
    return commitmentWindow(period, today);
  }

  private periodValues(
    campaign: ResolvedCampaign,
    decision: CommitmentDecision,
    dto: CreateCommitmentDto,
    window: CommitmentWindow,
  ): CommitmentValues {
    const values = this.commitmentValues(campaign.configuration, decision, dto);
    if (decision === CommitmentDecision.NOT_TAKING_PART) {
      return values;
    }
    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const unit = values.unit as string;
    const resolved = rules.resolveProgressTarget(
      {
        typeKey: values.type_key,
        targetValue: values.target_value as number,
        unit,
        payload: values.payload,
      },
      {
        startsOn: window.validFrom,
        endsOn: window.validTo,
        timezone: campaign.timezone,
      },
    );
    const targetValue =
      resolved.unit === unit ? resolved.targetValue : values.target_value;
    if (targetExceedsWindow(unit, targetValue as number, window.dayCount)) {
      throw new InvalidRequestException(
        `The target is larger than this period allows (${window.dayCount} days)`,
        'COMMITMENT_TARGET_EXCEEDS_PERIOD',
      );
    }
    return { ...values, target_value: targetValue };
  }

  private async saveWholeCampaign(
    tenant: TenantContext,
    participation: { id: string; campaignId: string },
    values: CommitmentValues,
  ): Promise<CommitmentResponse> {
    const existing = await this.commitmentRepository.findOne({
      where: { participation_id: participation.id, valid_to: IsNull() },
    });
    try {
      if (existing) {
        Object.assign(existing, values);
        const saved = await this.commitmentRepository.save(existing);
        this.logSaved('commitment_updated', tenant, saved);
        return this.toResponse(saved);
      }
      const saved = await this.commitmentRepository.save(
        this.commitmentRepository.create({
          tenant_id: tenant.tenantId,
          campaign_id: participation.campaignId,
          participation_id: participation.id,
          ...values,
        }),
      );
      this.logSaved('commitment_created', tenant, saved);
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.commitmentRepository.findOne({
          where: { participation_id: participation.id, valid_to: IsNull() },
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

  /** Create-or-replace one row per (participation, period) in one transaction. */
  private async savePeriods(
    tenant: TenantContext,
    participation: { id: string; campaignId: string },
    planned: Array<{
      period: PeriodBounds;
      window: CommitmentWindow;
      values: CommitmentValues;
    }>,
  ): Promise<Commitment[]> {
    try {
      return await this.commitmentRepository.manager.transaction(
        async (manager) => {
          const repository = manager.getRepository(Commitment);
          const saved: Commitment[] = [];
          for (const { period, window, values } of planned) {
            const existing = await repository.findOne({
              where: {
                participation_id: participation.id,
                valid_to: Between(period.startsOn, period.endsOn),
              },
            });
            const row =
              existing ??
              repository.create({
                tenant_id: tenant.tenantId,
                campaign_id: participation.campaignId,
                participation_id: participation.id,
                valid_from: window.validFrom,
              });
            Object.assign(row, values, {
              valid_to: period.endsOn,
              period_milestone_id: period.milestoneId,
            });
            const result = await repository.save(row);
            this.logSaved(
              existing ? 'commitment_updated' : 'commitment_created',
              tenant,
              result,
            );
            saved.push(result);
          }
          return saved;
        },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'This period was updated at the same time; try again',
        );
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Participation not found');
      }
      throw error;
    }
  }

  private logSaved(msg: string, tenant: TenantContext, saved: Commitment) {
    this.logger.log({
      msg,
      tenantId: tenant.tenantId,
      campaignId: saved.campaign_id,
      participationId: saved.participation_id,
      commitmentId: saved.id,
      decision: saved.decision,
      periodKey: saved.valid_to ? toIsoDate(saved.valid_to) : null,
    });
  }

  private strategyList(): CampaignRuleStrategy[] {
    const value = this.strategies;
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private commitmentValues(
    configuration: Record<string, unknown>,
    decision: CommitmentDecision,
    dto: CreateCommitmentDto,
  ): CommitmentValues {
    if (decision === CommitmentDecision.NOT_TAKING_PART) {
      return {
        decision,
        type_key: null,
        target_value: 0,
        unit: null,
        payload: {},
      };
    }
    const unitInput = dto.unit?.trim();
    if (dto.targetValue == null || !unitInput) {
      throw new InvalidRequestException(
        'targetValue and unit are required for a commitment',
      );
    }
    const rules = resolveCampaignRules(
      configuration,
      this.strategyList(),
      this.genericRules,
    );
    const prepared = this.prepareCommitment(rules, {
      typeKey: dto.typeKey?.trim() || null,
      targetValue: dto.targetValue,
      unit: unitInput,
      payload: normalizeSettings(dto.payload),
    });
    return {
      decision,
      type_key: prepared.typeKey,
      target_value: dto.targetValue,
      unit: prepared.unit,
      payload: prepared.payload,
    };
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
      decision: commitment.decision,
      typeKey: commitment.type_key,
      targetValue: commitment.target_value ?? 0,
      unit: commitment.unit,
      payload: commitment.payload,
      validFrom: toIsoDate(commitment.valid_from),
      validTo: toIsoDate(commitment.valid_to),
      periodKey: toIsoDate(commitment.valid_to),
      periodMilestoneId: commitment.period_milestone_id,
      createdAt: commitment.created_at.toISOString(),
      updatedAt: commitment.updated_at.toISOString(),
    };
  }
}
