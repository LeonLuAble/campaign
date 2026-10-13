import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ActionService } from '../modules/actions/application/action.service.js';
import { CampaignService } from '../modules/campaigns/application/campaign.service.js';
import { VisualizationService } from '../modules/visualizations/application/visualization.service.js';
import { CustomerService } from '../modules/customers/application/customer.service.js';
import { CredentialService } from '../modules/identity/application/credential.service.js';
import { IdentityAccountService } from '../modules/identity/application/identity-account.service.js';
import { IdentityType } from '../modules/identity/domain/user-identity.entity.js';
import { ensureFoundingCampaign } from './seed-founding-campaign.js';
import {
  readSeedAdminEmail,
  TZU_CHI_CUSTOMER_NAME,
  TZU_CHI_CUSTOMER_SLUG,
} from './seed-tzu-chi.args.js';

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
    const actions = app.get(ActionService);
    const visualizations = app.get(VisualizationService);

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

    await ensureFoundingCampaign(
      campaigns,
      actions,
      visualizations,
      customer.id,
      identity.userId,
    );
  } finally {
    await app.close();
  }
}

await main();
