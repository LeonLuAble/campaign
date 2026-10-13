import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import type { TenantContext } from '../modules/authorization/application/tenant-context.js';
import { ALL_PERMISSION_KEYS } from '../modules/authorization/domain/permission-keys.js';
import { CampaignService } from '../modules/campaigns/application/campaign.service.js';
import { CustomerService } from '../modules/customers/application/customer.service.js';
import { CredentialService } from '../modules/identity/application/credential.service.js';
import { IdentityAccountService } from '../modules/identity/application/identity-account.service.js';
import { IdentityType } from '../modules/identity/domain/user-identity.entity.js';
import {
  readSeedAdminEmail,
  TZU_CHI_CUSTOMER_NAME,
  TZU_CHI_CUSTOMER_SLUG,
} from './seed-tzu-chi.args.js';

const FOUNDING_TEMPLATE_KEY = 'environmental_action';
const FOUNDING_TEMPLATE_NAME = 'Environmental Action';
const FOUNDING_SCOPE_KEY = 'vegetarian';
const FOUNDING_SCOPE_NAME = 'Vegetarian';
const FOUNDING_CAMPAIGN_NAME = '速素数数';
const FOUNDING_TIMEZONE = 'Asia/Kuala_Lumpur';

function seedTenantContext(tenantId: string, userId: string): TenantContext {
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

async function ensureFoundingCampaign(
  campaigns: CampaignService,
  customerId: string,
  actorUserId: string,
): Promise<void> {
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
  if (existing.some((campaign) => campaign.name === FOUNDING_CAMPAIGN_NAME)) {
    console.log(`Campaign '${FOUNDING_CAMPAIGN_NAME}' already exists`);
    return;
  }

  const created = await campaigns.createCampaign(tenant, actorUserId, {
    templateId: template.id,
    scopeId: scope.id,
    name: FOUNDING_CAMPAIGN_NAME,
    timezone: FOUNDING_TIMEZONE,
  });
  console.log(`Created campaign '${created.name}' (${created.id})`);
}

async function main(): Promise<void> {
  const email = readSeedAdminEmail(process.argv, process.env);
  if (!email) {
    console.error(
      'Usage: npm run seed:tzu-chi -- --email existing-user@example.com',
    );
    console.error(
      'Or set SEED_ADMIN_EMAIL. The user must already exist; no credentials are created.',
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const credentials = app.get(CredentialService);
    const identities = app.get(IdentityAccountService);
    const customers = app.get(CustomerService);
    const campaigns = app.get(CampaignService);

    const normalized = credentials.normalizeEmail(email);
    const identity = await identities.findIdentity(
      IdentityType.EMAIL,
      normalized,
    );
    if (!identity) {
      console.error(`No user found for email ${email}`);
      process.exitCode = 1;
      return;
    }

    await identities.setPlatformAdmin(identity.userId, true);
    console.log(`Promoted ${email} (${identity.userId}) to platform admin`);

    const existing = await customers.findBySlug(TZU_CHI_CUSTOMER_SLUG);
    const customer =
      existing ??
      (await customers.create(identity.userId, TZU_CHI_CUSTOMER_NAME));
    if (existing) {
      console.log(
        `Customer '${TZU_CHI_CUSTOMER_NAME}' already exists (${existing.id})`,
      );
    } else {
      console.log(
        `Created customer '${customer.name}' (${customer.id}) with tenant_admin ${identity.userId}`,
      );
    }

    await ensureFoundingCampaign(campaigns, customer.id, identity.userId);
  } finally {
    await app.close();
  }
}

await main();
