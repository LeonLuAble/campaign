import type { TenantContext } from '../modules/authorization/application/tenant-context.js';
import { ALL_PERMISSION_KEYS } from '../modules/authorization/domain/permission-keys.js';
import { ActionService } from '../modules/actions/application/action.service.js';
import { CampaignService } from '../modules/campaigns/application/campaign.service.js';
import { VisualizationService } from '../modules/visualizations/application/visualization.service.js';
import { VISUALIZATION_TYPE_TREE } from '../modules/visualizations/domain/visualization.entity.js';
import { VEGETARIAN_RULES_STRATEGY_KEY } from '../modules/vegetarian/application/vegetarian-rules.js';

export const FOUNDING_TEMPLATE_KEY = 'environmental_action';
export const FOUNDING_TEMPLATE_NAME = 'Environmental Action';
export const FOUNDING_SCOPE_KEY = 'vegetarian';
export const FOUNDING_SCOPE_NAME = 'Vegetarian';
export const FOUNDING_CAMPAIGN_NAME = '速素数数';
export const FOUNDING_TIMEZONE = 'Asia/Kuala_Lumpur';
export const FOUNDING_DAY_DEFINITION_KEY = 'vegetarian_day';
export const FOUNDING_MEAL_DEFINITION_KEY = 'vegetarian_meal';

export function seedTenantContext(
  tenantId: string,
  userId: string,
): TenantContext {
  return {
    tenantId,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'seed-membership',
        tenantId,
        userId,
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set(ALL_PERMISSION_KEYS),
  };
}

export async function ensureFoundingCampaign(
  campaigns: CampaignService,
  actions: ActionService,
  visualizations: VisualizationService,
  customerId: string,
  actorUserId: string,
): Promise<{ campaignId: string }> {
  const tenant = seedTenantContext(customerId, actorUserId);
  let template = await campaigns.findTemplateByKey(
    customerId,
    FOUNDING_TEMPLATE_KEY,
  );
  if (!template) {
    template = await campaigns.createTemplate(tenant, {
      key: FOUNDING_TEMPLATE_KEY,
      name: FOUNDING_TEMPLATE_NAME,
    });
    console.log(
      `Created campaign template '${template.name}' (${template.id})`,
    );
  }

  let scope = await campaigns.findScopeByKey(
    customerId,
    template.id,
    FOUNDING_SCOPE_KEY,
  );
  if (!scope) {
    scope = await campaigns.createScope(tenant, {
      templateId: template.id,
      key: FOUNDING_SCOPE_KEY,
      name: FOUNDING_SCOPE_NAME,
    });
    console.log(`Created campaign scope '${scope.name}' (${scope.id})`);
  }

  const existing = await campaigns.listCampaigns(tenant);
  let campaign = existing.find((row) => row.name === FOUNDING_CAMPAIGN_NAME);
  if (!campaign) {
    campaign = await campaigns.createCampaign(tenant, actorUserId, {
      templateId: template.id,
      scopeId: scope.id,
      name: FOUNDING_CAMPAIGN_NAME,
      timezone: FOUNDING_TIMEZONE,
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      configuration: { rulesStrategy: VEGETARIAN_RULES_STRATEGY_KEY },
    });
    console.log(`Created campaign '${campaign.name}' (${campaign.id})`);
  } else {
    console.log(`Campaign '${FOUNDING_CAMPAIGN_NAME}' already exists`);
    if (
      campaign.status === 'draft' &&
      campaign.configuration.rulesStrategy !== VEGETARIAN_RULES_STRATEGY_KEY
    ) {
      await campaigns.replaceConfiguration(tenant, campaign.id, {
        ...campaign.configuration,
        rulesStrategy: VEGETARIAN_RULES_STRATEGY_KEY,
      });
    }
  }

  const definitions = await actions.listDefinitions(tenant, campaign.id);
  if (
    !definitions.some(
      (definition) => definition.key === FOUNDING_DAY_DEFINITION_KEY,
    )
  ) {
    const definition = await actions.createDefinition(tenant, campaign.id, {
      key: FOUNDING_DAY_DEFINITION_KEY,
      name: 'Vegetarian day',
      unit: 'days',
    });
    console.log(
      `Created action definition '${definition.name}' (${definition.id})`,
    );
  }
  if (
    !definitions.some(
      (definition) => definition.key === FOUNDING_MEAL_DEFINITION_KEY,
    )
  ) {
    const definition = await actions.createDefinition(tenant, campaign.id, {
      key: FOUNDING_MEAL_DEFINITION_KEY,
      name: 'Vegetarian meal',
      unit: 'meals',
    });
    console.log(
      `Created action definition '${definition.name}' (${definition.id})`,
    );
  }

  const existingVisualization = await visualizations.findForCampaign(
    customerId,
    campaign.id,
  );
  if (!existingVisualization) {
    const visualization = await visualizations.replace(
      tenant,
      campaign.id,
      actorUserId,
      {
        type: VISUALIZATION_TYPE_TREE,
        settings: { displayName: '素心树' },
      },
    );
    console.log(
      `Created campaign visualization '${visualization.type}' (${visualization.id})`,
    );
  }

  return { campaignId: campaign.id };
}
