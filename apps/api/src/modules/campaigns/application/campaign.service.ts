import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
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
  isCheckViolation,
  isRaiseException,
  isUniqueViolation,
} from '../../../shared/database/postgres-errors.js';
import { slugify } from '../../../shared/text/slugify.js';
import type { CampaignAccessRecord } from '../../authorization/application/access-readers.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import {
  LocalizationService,
  type CampaignContentTranslations,
} from '../../localization/application/localization.service.js';
import {
  CAMPAIGN_NOTIFICATIONS,
  type CampaignNotifications,
} from '../../notifications/application/campaign-notifications.js';
import { CampaignCommunity } from '../domain/campaign-community.entity.js';
import { CampaignConfiguration } from '../domain/campaign-configuration.entity.js';
import { CampaignScope } from '../domain/campaign-scope.entity.js';
import { CampaignTemplate } from '../domain/campaign-template.entity.js';
import { Campaign, CampaignStatus } from '../domain/campaign.entity.js';
import {
  canMutateCampaignDefinition,
  canTransitionCampaign,
} from './campaign-lifecycle.js';
import { campaignVisibleToMemberships } from './campaign-visibility.js';
import { readSubmissionReview } from './campaign-settings.js';
import {
  assertDateOrder,
  assertIanaTimeZone,
  normalizeSettings,
  parseIsoDate,
  toIsoDate,
} from './timezone.js';

export interface CampaignTemplateResponse {
  id: string;
  customerId: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignScopeResponse {
  id: string;
  customerId: string;
  templateId: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignResponse {
  id: string;
  customerId: string;
  templateId: string;
  scopeId: string;
  name: string;
  slug: string;
  description: string | null;
  status: CampaignStatus;
  timezone: string;
  startsOn: string | null;
  endsOn: string | null;
  communityIds: string[];
  configuration: Record<string, unknown>;
  createdByUserId: string;
  publishedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignConfigurationResponse {
  campaignId: string;
  customerId: string;
  settings: Record<string, unknown>;
  updatedAt: string;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(CampaignTemplate)
    private readonly templateRepository: Repository<CampaignTemplate>,
    @InjectRepository(CampaignScope)
    private readonly scopeRepository: Repository<CampaignScope>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignConfiguration)
    private readonly configurationRepository: Repository<CampaignConfiguration>,
    @InjectRepository(CampaignCommunity)
    private readonly campaignCommunityRepository: Repository<CampaignCommunity>,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    private readonly localization: LocalizationService,
    @Optional()
    @Inject(forwardRef(() => CAMPAIGN_NOTIFICATIONS))
    private readonly campaignNotifications: CampaignNotifications | null,
  ) {}

  async listStartedCampaigns(): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      timezone: string;
      startsOn: string | null;
      endsOn: string | null;
    }>
  > {
    const rows = await this.campaignRepository.find({
      where: { status: CampaignStatus.STARTED },
      order: { created_at: 'ASC' },
    });
    return rows.map((campaign) => ({
      id: campaign.id,
      tenantId: campaign.tenant_id,
      name: campaign.name,
      timezone: campaign.timezone,
      startsOn: toIsoDate(campaign.starts_on),
      endsOn: toIsoDate(campaign.ends_on),
    }));
  }

  async findTemplateById(id: string): Promise<CampaignAccessRecord | null> {
    const template = await this.templateRepository.findOne({ where: { id } });
    return template ? { id: template.id, tenantId: template.tenant_id } : null;
  }

  async findScopeById(id: string): Promise<CampaignAccessRecord | null> {
    const scope = await this.scopeRepository.findOne({ where: { id } });
    return scope ? { id: scope.id, tenantId: scope.tenant_id } : null;
  }

  async findCampaignById(id: string): Promise<CampaignAccessRecord | null> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    return campaign ? { id: campaign.id, tenantId: campaign.tenant_id } : null;
  }

  async findTemplateByKey(
    tenantId: string,
    key: string,
  ): Promise<CampaignTemplateResponse | null> {
    const template = await this.templateRepository.findOne({
      where: { tenant_id: tenantId, key },
    });
    return template ? this.toTemplateResponse(template) : null;
  }

  async findScopeByKey(
    tenantId: string,
    templateId: string,
    key: string,
  ): Promise<CampaignScopeResponse | null> {
    const scope = await this.scopeRepository.findOne({
      where: { tenant_id: tenantId, template_id: templateId, key },
    });
    return scope ? this.toScopeResponse(scope) : null;
  }

  async findCampaignBySlug(
    tenantId: string,
    slug: string,
  ): Promise<CampaignResponse | null> {
    const campaign = await this.campaignRepository.findOne({
      where: { tenant_id: tenantId, slug },
    });
    if (!campaign) {
      return null;
    }
    const [mapped] = await this.toCampaignResponses([campaign]);
    return mapped;
  }

  async listTemplates(
    tenant: TenantContext,
  ): Promise<CampaignTemplateResponse[]> {
    const templates = await this.templateRepository.find({
      where: { tenant_id: tenant.tenantId },
      order: { created_at: 'ASC' },
    });
    return templates.map((template) => this.toTemplateResponse(template));
  }

  async getTemplate(
    tenant: TenantContext,
    templateId: string,
  ): Promise<CampaignTemplateResponse> {
    return this.toTemplateResponse(
      await this.requireTemplate(tenant.tenantId, templateId),
    );
  }

  async createTemplate(
    tenant: TenantContext,
    input: { key?: string; name: string; description?: string | null },
  ): Promise<CampaignTemplateResponse> {
    await this.assertCanMutateCatalog(tenant);
    const name = input.name.trim();
    if (!name) {
      throw new InvalidRequestException('name is required');
    }
    const key = this.normalizeKey(input.key ?? name, 'template');
    try {
      const saved = await this.templateRepository.save(
        this.templateRepository.create({
          tenant_id: tenant.tenantId,
          key,
          name,
          description: input.description?.trim() || null,
          is_active: true,
        }),
      );
      this.logger.log({
        msg: 'campaign_template_created',
        tenantId: tenant.tenantId,
        templateId: saved.id,
        key,
      });
      return this.toTemplateResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A campaign template with this key already exists',
        );
      }
      throw error;
    }
  }

  async updateTemplate(
    tenant: TenantContext,
    templateId: string,
    input: { name?: string; description?: string | null; isActive?: boolean },
  ): Promise<CampaignTemplateResponse> {
    await this.assertCanMutateCatalog(tenant);
    const template = await this.requireTemplate(tenant.tenantId, templateId);
    if (input.name !== undefined) {
      template.name = input.name.trim();
    }
    if (input.description !== undefined) {
      template.description = input.description?.trim() || null;
    }
    if (input.isActive !== undefined) {
      template.is_active = input.isActive;
    }
    const saved = await this.templateRepository.save(template);
    this.logger.log({
      msg: 'campaign_template_updated',
      tenantId: tenant.tenantId,
      templateId: saved.id,
    });
    return this.toTemplateResponse(saved);
  }

  async listScopes(
    tenant: TenantContext,
    templateId?: string | null,
  ): Promise<CampaignScopeResponse[]> {
    const UUID_PATTERN =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (templateId && !UUID_PATTERN.test(templateId)) {
      throw new InvalidRequestException('templateId must be a UUID');
    }
    const where = templateId
      ? { tenant_id: tenant.tenantId, template_id: templateId }
      : { tenant_id: tenant.tenantId };
    if (templateId) {
      await this.requireTemplate(tenant.tenantId, templateId);
    }
    const scopes = await this.scopeRepository.find({
      where,
      order: { created_at: 'ASC' },
    });
    return scopes.map((scope) => this.toScopeResponse(scope));
  }

  async getScope(
    tenant: TenantContext,
    scopeId: string,
  ): Promise<CampaignScopeResponse> {
    return this.toScopeResponse(
      await this.requireScope(tenant.tenantId, scopeId),
    );
  }

  async createScope(
    tenant: TenantContext,
    input: {
      templateId: string;
      key?: string;
      name: string;
      description?: string | null;
    },
  ): Promise<CampaignScopeResponse> {
    await this.assertCanMutateCatalog(tenant);
    const template = await this.requireTemplate(
      tenant.tenantId,
      input.templateId,
    );
    const name = input.name.trim();
    if (!name) {
      throw new InvalidRequestException('name is required');
    }
    const key = this.normalizeKey(input.key ?? name, 'scope');
    try {
      const saved = await this.scopeRepository.save(
        this.scopeRepository.create({
          tenant_id: tenant.tenantId,
          template_id: template.id,
          key,
          name,
          description: input.description?.trim() || null,
          is_active: true,
        }),
      );
      this.logger.log({
        msg: 'campaign_scope_created',
        tenantId: tenant.tenantId,
        scopeId: saved.id,
        templateId: template.id,
        key,
      });
      return this.toScopeResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A campaign scope with this key already exists on the template',
        );
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Campaign template not found');
      }
      throw error;
    }
  }

  async updateScope(
    tenant: TenantContext,
    scopeId: string,
    input: { name?: string; description?: string | null; isActive?: boolean },
  ): Promise<CampaignScopeResponse> {
    await this.assertCanMutateCatalog(tenant);
    const scope = await this.requireScope(tenant.tenantId, scopeId);
    if (input.name !== undefined) {
      scope.name = input.name.trim();
    }
    if (input.description !== undefined) {
      scope.description = input.description?.trim() || null;
    }
    if (input.isActive !== undefined) {
      scope.is_active = input.isActive;
    }
    const saved = await this.scopeRepository.save(scope);
    this.logger.log({
      msg: 'campaign_scope_updated',
      tenantId: tenant.tenantId,
      scopeId: saved.id,
    });
    return this.toScopeResponse(saved);
  }

  async listCampaigns(
    tenant: TenantContext,
    locale: SupportedLocale = 'en',
  ): Promise<CampaignResponse[]> {
    const campaigns = await this.campaignRepository.find({
      where: { tenant_id: tenant.tenantId },
      order: { created_at: 'ASC' },
    });
    const responses = await this.toCampaignResponses(campaigns, locale);
    const ancestorsByCommunityId = await this.ancestorsForMemberships(tenant);
    return responses.filter((campaign) =>
      campaignVisibleToMemberships(
        campaign.communityIds,
        tenant.memberships,
        ancestorsByCommunityId,
      ),
    );
  }

  async getCampaign(
    tenant: TenantContext,
    campaignId: string,
    locale: SupportedLocale = 'en',
  ): Promise<CampaignResponse> {
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    const [mapped] = await this.toCampaignResponses([campaign], locale);
    return mapped;
  }

  async createCampaign(
    tenant: TenantContext,
    actorUserId: string,
    input: {
      templateId: string;
      scopeId: string;
      name: string;
      description?: string | null;
      timezone: string;
      startsOn?: string | null;
      endsOn?: string | null;
      communityIds?: string[];
      configuration?: Record<string, unknown>;
      translations?: CampaignContentTranslations;
    },
    locale: SupportedLocale = 'en',
  ): Promise<CampaignResponse> {
    await this.assertCanMutateCatalog(tenant);
    const template = await this.requireTemplate(
      tenant.tenantId,
      input.templateId,
    );
    if (!template.is_active) {
      throw new InvalidRequestException('Campaign template is inactive');
    }
    const scope = await this.requireScope(tenant.tenantId, input.scopeId);
    if (scope.template_id !== template.id) {
      throw new InvalidRequestException(
        'Campaign scope does not belong to the template',
      );
    }
    if (!scope.is_active) {
      throw new InvalidRequestException('Campaign scope is inactive');
    }

    const name = input.name.trim();
    if (!name) {
      throw new InvalidRequestException('name is required');
    }
    const timezone = assertIanaTimeZone(input.timezone);
    const startsOn = input.startsOn
      ? parseIsoDate(input.startsOn, 'startsOn')
      : null;
    const endsOn = input.endsOn ? parseIsoDate(input.endsOn, 'endsOn') : null;
    assertDateOrder(startsOn, endsOn);
    const communityIds = await this.resolveCommunityIds(
      tenant,
      input.communityIds ?? [],
    );
    const settings = normalizeSettings(input.configuration);

    const saved = await this.saveCampaignWithUniqueSlug({
      tenant_id: tenant.tenantId,
      template_id: template.id,
      scope_id: scope.id,
      name,
      description: input.description?.trim() || null,
      status: CampaignStatus.DRAFT,
      timezone,
      starts_on: startsOn,
      ends_on: endsOn,
      created_by_user_id: actorUserId,
      published_at: null,
      started_at: null,
      completed_at: null,
    });

    await this.configurationRepository.save(
      this.configurationRepository.create({
        tenant_id: tenant.tenantId,
        campaign_id: saved.id,
        settings,
      }),
    );
    await this.replaceCampaignCommunities(
      tenant.tenantId,
      saved.id,
      communityIds,
    );

    await this.localization.upsertCampaignContentTranslations(
      tenant.tenantId,
      saved.id,
      input.translations,
    );

    this.logger.log({
      msg: 'campaign_created',
      tenantId: tenant.tenantId,
      campaignId: saved.id,
      templateId: template.id,
      scopeId: scope.id,
    });
    const [mapped] = await this.toCampaignResponses([saved], locale);
    return mapped;
  }

  async updateCampaign(
    tenant: TenantContext,
    campaignId: string,
    input: {
      name?: string;
      description?: string | null;
      timezone?: string;
      startsOn?: string | null;
      endsOn?: string | null;
      communityIds?: string[];
      configuration?: Record<string, unknown>;
      translations?: CampaignContentTranslations;
    },
    locale: SupportedLocale = 'en',
  ): Promise<CampaignResponse> {
    await this.assertCanMutateCatalog(tenant);
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);

    if (
      campaign.status === CampaignStatus.PUBLISHED ||
      campaign.status === CampaignStatus.STARTED
    ) {
      return this.updatePublishedCampaign(tenant, campaign, input, locale);
    }

    this.assertDraft(campaign);

    if (input.name !== undefined) {
      campaign.name = input.name.trim();
    }
    if (input.description !== undefined) {
      campaign.description = input.description?.trim() || null;
    }
    if (input.timezone !== undefined) {
      campaign.timezone = assertIanaTimeZone(input.timezone);
    }
    if (input.startsOn !== undefined) {
      campaign.starts_on = input.startsOn
        ? parseIsoDate(input.startsOn, 'startsOn')
        : null;
    }
    if (input.endsOn !== undefined) {
      campaign.ends_on = input.endsOn
        ? parseIsoDate(input.endsOn, 'endsOn')
        : null;
    }
    assertDateOrder(toIsoDate(campaign.starts_on), toIsoDate(campaign.ends_on));

    try {
      await this.campaignRepository.save(campaign);
    } catch (error) {
      if (isCheckViolation(error)) {
        throw new InvalidRequestException(
          'endsOn must be on or after startsOn',
        );
      }
      throw error;
    }

    if (input.communityIds) {
      const communityIds = await this.resolveCommunityIds(
        tenant,
        input.communityIds,
      );
      await this.replaceCampaignCommunities(
        tenant.tenantId,
        campaign.id,
        communityIds,
      );
    }
    if (input.configuration) {
      await this.saveConfiguration(
        tenant.tenantId,
        campaign.id,
        input.configuration,
      );
    }
    await this.localization.upsertCampaignContentTranslations(
      tenant.tenantId,
      campaign.id,
      input.translations,
    );

    this.logger.log({
      msg: 'campaign_updated',
      tenantId: tenant.tenantId,
      campaignId: campaign.id,
    });
    return this.getCampaign(tenant, campaign.id, locale);
  }

  private async updatePublishedCampaign(
    tenant: TenantContext,
    campaign: Campaign,
    input: {
      name?: string;
      description?: string | null;
      timezone?: string;
      startsOn?: string | null;
      endsOn?: string | null;
      communityIds?: string[];
      configuration?: Record<string, unknown>;
      translations?: CampaignContentTranslations;
    },
    locale: SupportedLocale,
  ): Promise<CampaignResponse> {
    const lockedKeys: string[] = [];
    if (input.name !== undefined) lockedKeys.push('name');
    if (input.timezone !== undefined) lockedKeys.push('timezone');
    if (input.startsOn !== undefined) lockedKeys.push('startsOn');
    if (input.communityIds !== undefined) lockedKeys.push('communityIds');
    if (input.configuration !== undefined) lockedKeys.push('configuration');
    const en = input.translations?.en;
    if (en && ('name' in en || 'treeDisplayName' in en)) {
      lockedKeys.push('translations');
    }
    if (lockedKeys.length > 0) {
      throw new ResourceConflictException(
        'Only description and extending endsOn may be changed after publish',
        'CAMPAIGN_FIELD_LOCKED',
      );
    }

    if (input.endsOn !== undefined) {
      if (input.endsOn == null) {
        throw new ResourceConflictException(
          'endsOn may only be extended after publish',
          'CAMPAIGN_END_DATE_LOCKED',
        );
      }
      const next = parseIsoDate(input.endsOn, 'endsOn');
      const current = toIsoDate(campaign.ends_on);
      if (current && next < current) {
        throw new ResourceConflictException(
          'endsOn may only be extended after publish',
          'CAMPAIGN_END_DATE_LOCKED',
        );
      }
      campaign.ends_on = next;
    }
    if (input.description !== undefined) {
      campaign.description = input.description?.trim() || null;
    }
    assertDateOrder(toIsoDate(campaign.starts_on), toIsoDate(campaign.ends_on));

    try {
      await this.campaignRepository.save(campaign);
    } catch (error) {
      if (isCheckViolation(error)) {
        throw new InvalidRequestException(
          'endsOn must be on or after startsOn',
        );
      }
      throw error;
    }

    if (input.translations?.en && 'description' in input.translations.en) {
      await this.localization.upsertCampaignContentTranslations(
        tenant.tenantId,
        campaign.id,
        { en: { description: input.translations.en.description } },
      );
    }

    this.logger.log({
      msg: 'campaign_updated_post_publish',
      tenantId: tenant.tenantId,
      campaignId: campaign.id,
    });
    return this.getCampaign(tenant, campaign.id, locale);
  }

  async publishCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<CampaignResponse> {
    return this.transition(tenant, campaignId, CampaignStatus.PUBLISHED, {
      published_at: new Date(),
    });
  }

  async startCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<CampaignResponse> {
    return this.transition(tenant, campaignId, CampaignStatus.STARTED, {
      started_at: new Date(),
    });
  }

  async completeCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<CampaignResponse> {
    return this.transition(tenant, campaignId, CampaignStatus.COMPLETED, {
      completed_at: new Date(),
    });
  }

  async getConfiguration(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<CampaignConfigurationResponse> {
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    const configuration = await this.requireConfiguration(campaign.id);
    return {
      campaignId: campaign.id,
      customerId: campaign.tenant_id,
      settings: configuration.settings,
      updatedAt: configuration.updated_at.toISOString(),
    };
  }

  async replaceConfiguration(
    tenant: TenantContext,
    campaignId: string,
    settings: Record<string, unknown>,
  ): Promise<CampaignConfigurationResponse> {
    await this.assertCanMutateCatalog(tenant);
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    this.assertDraft(campaign);
    const saved = await this.saveConfiguration(
      tenant.tenantId,
      campaign.id,
      settings,
    );
    this.logger.log({
      msg: 'campaign_configuration_updated',
      tenantId: tenant.tenantId,
      campaignId: campaign.id,
    });
    return {
      campaignId: campaign.id,
      customerId: campaign.tenant_id,
      settings: saved.settings,
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async listTargetCommunities(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<string[]> {
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    return this.communityIdsFor(campaign.id);
  }

  async replaceTargetCommunities(
    tenant: TenantContext,
    campaignId: string,
    communityIds: string[],
  ): Promise<string[]> {
    await this.assertCanMutateCatalog(tenant);
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    this.assertDraft(campaign);
    const resolved = await this.resolveCommunityIds(tenant, communityIds);
    await this.replaceCampaignCommunities(
      tenant.tenantId,
      campaign.id,
      resolved,
    );
    this.logger.log({
      msg: 'campaign_communities_updated',
      tenantId: tenant.tenantId,
      campaignId: campaign.id,
    });
    return resolved;
  }

  async getCampaignRecord(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    status: CampaignStatus;
    timezone: string;
    startsOn: string | null;
    endsOn: string | null;
    configuration: Record<string, unknown>;
    communityIds: string[];
  }> {
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    const configuration = await this.configurationRepository.findOne({
      where: { campaign_id: campaign.id },
    });
    return {
      id: campaign.id,
      tenantId: campaign.tenant_id,
      name: campaign.name,
      status: campaign.status,
      timezone: campaign.timezone,
      startsOn: toIsoDate(campaign.starts_on),
      endsOn: toIsoDate(campaign.ends_on),
      configuration: configuration?.settings ?? {},
      communityIds: await this.communityIdsFor(campaign.id),
    };
  }

  private async transition(
    tenant: TenantContext,
    campaignId: string,
    next: CampaignStatus,
    timestamps: Partial<
      Pick<Campaign, 'published_at' | 'started_at' | 'completed_at'>
    >,
  ): Promise<CampaignResponse> {
    await this.assertCanMutateCatalog(tenant);
    const campaign = await this.requireVisibleCampaign(tenant, campaignId);
    if (!canTransitionCampaign(campaign.status, next)) {
      throw new InvalidRequestException(
        `Campaign cannot transition from ${campaign.status} to ${next}`,
      );
    }
    if (next === CampaignStatus.PUBLISHED) {
      const template = await this.requireTemplate(
        tenant.tenantId,
        campaign.template_id,
      );
      const scope = await this.requireScope(tenant.tenantId, campaign.scope_id);
      if (!template.is_active || !scope.is_active) {
        throw new InvalidRequestException(
          'Campaign template and scope must be active to publish',
        );
      }
    }
    campaign.status = next;
    Object.assign(campaign, timestamps);
    await this.campaignRepository.save(campaign);
    this.logger.log({
      msg: `campaign_${next}`,
      tenantId: tenant.tenantId,
      campaignId: campaign.id,
    });
    if (next === CampaignStatus.STARTED && this.campaignNotifications) {
      try {
        await this.campaignNotifications.notifyCampaignStarted({
          tenantId: tenant.tenantId,
          campaignId: campaign.id,
          campaignName: campaign.name,
        });
      } catch (error) {
        this.logger.error({
          msg: 'campaign_started_notification_failed',
          tenantId: tenant.tenantId,
          campaignId: campaign.id,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
    const [mapped] = await this.toCampaignResponses([campaign]);
    return mapped;
  }

  private async requireVisibleCampaign(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenant_id: tenant.tenantId },
    });
    if (!campaign) {
      throw new ResourceNotFoundException('Campaign not found');
    }
    const communityIds = await this.communityIdsFor(campaign.id);
    const ancestorsByCommunityId = await this.ancestorsForMemberships(tenant);
    if (
      !campaignVisibleToMemberships(
        communityIds,
        tenant.memberships,
        ancestorsByCommunityId,
      )
    ) {
      throw new ResourceNotFoundException('Campaign not found');
    }
    return campaign;
  }

  private async requireTemplate(
    tenantId: string,
    templateId: string,
  ): Promise<CampaignTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenant_id: tenantId },
    });
    if (!template) {
      throw new ResourceNotFoundException('Campaign template not found');
    }
    return template;
  }

  private async requireScope(
    tenantId: string,
    scopeId: string,
  ): Promise<CampaignScope> {
    const scope = await this.scopeRepository.findOne({
      where: { id: scopeId, tenant_id: tenantId },
    });
    if (!scope) {
      throw new ResourceNotFoundException('Campaign scope not found');
    }
    return scope;
  }

  private async requireConfiguration(
    campaignId: string,
  ): Promise<CampaignConfiguration> {
    const configuration = await this.configurationRepository.findOne({
      where: { campaign_id: campaignId },
    });
    if (!configuration) {
      throw new ResourceNotFoundException('Campaign configuration not found');
    }
    return configuration;
  }

  private async assertCanMutateCatalog(tenant: TenantContext): Promise<void> {
    await this.customers.requireActive(tenant.tenantId);
    if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage campaigns',
      );
    }
  }

  private assertDraft(campaign: Campaign): void {
    if (!canMutateCampaignDefinition(campaign.status)) {
      throw new InvalidRequestException(
        'Campaign can only be edited while in draft',
      );
    }
  }

  private async resolveCommunityIds(
    tenant: TenantContext,
    communityIds: string[],
  ): Promise<string[]> {
    const unique = [...new Set(communityIds)];
    for (const communityId of unique) {
      await this.communities.get(tenant, communityId);
    }
    return unique;
  }

  private async replaceCampaignCommunities(
    tenantId: string,
    campaignId: string,
    communityIds: string[],
  ): Promise<void> {
    await this.campaignCommunityRepository.delete({ campaign_id: campaignId });
    if (communityIds.length === 0) {
      return;
    }
    try {
      await this.campaignCommunityRepository.save(
        communityIds.map((communityId) =>
          this.campaignCommunityRepository.create({
            tenant_id: tenantId,
            campaign_id: campaignId,
            community_id: communityId,
          }),
        ),
      );
    } catch (error) {
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Community not found');
      }
      throw error;
    }
  }

  private async saveConfiguration(
    tenantId: string,
    campaignId: string,
    settings: Record<string, unknown>,
  ): Promise<CampaignConfiguration> {
    const normalized = normalizeSettings(settings);
    readSubmissionReview(normalized);
    const existing = await this.configurationRepository.findOne({
      where: { campaign_id: campaignId },
    });
    if (existing) {
      existing.settings = normalized;
      return this.configurationRepository.save(existing);
    }
    return this.configurationRepository.save(
      this.configurationRepository.create({
        tenant_id: tenantId,
        campaign_id: campaignId,
        settings: normalized,
      }),
    );
  }

  private async saveCampaignWithUniqueSlug(
    input: Omit<Campaign, 'id' | 'slug' | 'created_at' | 'updated_at'>,
  ): Promise<Campaign> {
    const baseSlug = slugify(
      input.name,
      `campaign-${randomBytes(4).toString('hex')}`,
    );
    const slugs = [
      baseSlug,
      `${baseSlug.slice(0, 71)}-${randomBytes(4).toString('hex')}`,
      `campaign-${randomBytes(6).toString('hex')}`,
    ];
    for (const slug of slugs) {
      try {
        return await this.campaignRepository.save(
          this.campaignRepository.create({ ...input, slug }),
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }
        if (isRaiseException(error)) {
          throw new InvalidRequestException(
            'Template and scope must belong to the same customer',
          );
        }
        if (isCheckViolation(error)) {
          throw new InvalidRequestException(
            'endsOn must be on or after startsOn',
          );
        }
        throw error;
      }
    }
    throw new ResourceConflictException(
      'Unable to allocate a unique campaign slug',
    );
  }

  private async communityIdsFor(campaignId: string): Promise<string[]> {
    const rows = await this.campaignCommunityRepository.find({
      where: { campaign_id: campaignId },
      order: { created_at: 'ASC' },
    });
    return rows.map((row) => row.community_id);
  }

  private async ancestorsForMemberships(
    tenant: TenantContext,
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    const communityIds = [
      ...new Set(
        tenant.memberships
          .map((membership) => membership.communityId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    for (const communityId of communityIds) {
      result.set(
        communityId,
        await this.communities.listAncestorIds(communityId),
      );
    }
    return result;
  }

  private async toCampaignResponses(
    campaigns: Campaign[],
    locale: SupportedLocale = 'en',
  ): Promise<CampaignResponse[]> {
    if (campaigns.length === 0) {
      return [];
    }
    const ids = campaigns.map((campaign) => campaign.id);
    const communities = await this.campaignCommunityRepository.find({
      where: { campaign_id: In(ids) },
    });
    const communitiesByCampaign = new Map<string, string[]>();
    for (const row of communities) {
      const list = communitiesByCampaign.get(row.campaign_id) ?? [];
      list.push(row.community_id);
      communitiesByCampaign.set(row.campaign_id, list);
    }
    const configurations = await this.configurationRepository.find({
      where: { campaign_id: In(ids) },
    });
    const configurationByCampaign = new Map(
      configurations.map((row) => [row.campaign_id, row.settings]),
    );

    const mapped: CampaignResponse[] = [];
    for (const campaign of campaigns) {
      const name =
        (await this.localization.resolveCampaignContent(
          locale,
          campaign.tenant_id,
          campaign.id,
          'name',
          campaign.name,
        )) ?? campaign.name;
      const description = await this.localization.resolveCampaignContent(
        locale,
        campaign.tenant_id,
        campaign.id,
        'description',
        campaign.description,
      );
      mapped.push({
        id: campaign.id,
        customerId: campaign.tenant_id,
        templateId: campaign.template_id,
        scopeId: campaign.scope_id,
        name,
        slug: campaign.slug,
        description,
        status: campaign.status,
        timezone: campaign.timezone,
        startsOn: toIsoDate(campaign.starts_on),
        endsOn: toIsoDate(campaign.ends_on),
        communityIds: communitiesByCampaign.get(campaign.id) ?? [],
        configuration: configurationByCampaign.get(campaign.id) ?? {},
        createdByUserId: campaign.created_by_user_id,
        publishedAt: campaign.published_at?.toISOString() ?? null,
        startedAt: campaign.started_at?.toISOString() ?? null,
        completedAt: campaign.completed_at?.toISOString() ?? null,
        createdAt: campaign.created_at.toISOString(),
        updatedAt: campaign.updated_at.toISOString(),
      });
    }
    return mapped;
  }

  private toTemplateResponse(
    template: CampaignTemplate,
  ): CampaignTemplateResponse {
    return {
      id: template.id,
      customerId: template.tenant_id,
      key: template.key,
      name: template.name,
      description: template.description,
      isActive: template.is_active,
      createdAt: template.created_at.toISOString(),
      updatedAt: template.updated_at.toISOString(),
    };
  }

  private toScopeResponse(scope: CampaignScope): CampaignScopeResponse {
    return {
      id: scope.id,
      customerId: scope.tenant_id,
      templateId: scope.template_id,
      key: scope.key,
      name: scope.name,
      description: scope.description,
      isActive: scope.is_active,
      createdAt: scope.created_at.toISOString(),
      updatedAt: scope.updated_at.toISOString(),
    };
  }

  private normalizeKey(value: string, fallbackPrefix: string): string {
    return slugify(
      value,
      `${fallbackPrefix}-${randomBytes(4).toString('hex')}`,
    ).replace(/-/g, '_');
  }
}
