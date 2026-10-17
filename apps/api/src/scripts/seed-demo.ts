import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { ResourceConflictException } from '../shared/errors/domain-http.exceptions.js';
import { ActionService } from '../modules/actions/application/action.service.js';
import { RegistrationService } from '../modules/auth/application/registration.service.js';
import { DevNotificationSender } from '../modules/auth/infrastructure/dev-notification.sender.js';
import { CampaignService } from '../modules/campaigns/application/campaign.service.js';
import { CampaignStatus } from '../modules/campaigns/domain/campaign.entity.js';
import { CommunityService } from '../modules/communities/application/community.service.js';
import { CommitmentService } from '../modules/commitments/application/commitment.service.js';
import { CustomerService } from '../modules/customers/application/customer.service.js';
import { CredentialService } from '../modules/identity/application/credential.service.js';
import { IdentityAccountService } from '../modules/identity/application/identity-account.service.js';
import { IdentityType } from '../modules/identity/domain/user-identity.entity.js';
import { User } from '../modules/identity/domain/user.entity.js';
import { MeasurementDefinitionService } from '../modules/measurements/application/measurement-definition.service.js';
import { MembershipService } from '../modules/memberships/application/membership.service.js';
import { MilestoneService } from '../modules/milestones/application/milestone.service.js';
import { MilestoneMetric } from '../modules/milestones/domain/milestone.entity.js';
import { ImpactFactorService } from '../modules/outcomes/application/impact-factor.service.js';
import { ParticipationService } from '../modules/participation/application/participation.service.js';
import { VisualizationService } from '../modules/visualizations/application/visualization.service.js';
import { SYSTEM_ROLE_MEMBER } from '../modules/authorization/domain/permission-keys.js';
import { assertDemoSeedAllowed } from './seed-demo.guard.js';
import {
  ensureFoundingCampaign,
  FOUNDING_CAMPAIGN_NAME,
  FOUNDING_MEAL_DEFINITION_KEY,
  seedTenantContext,
} from './seed-founding-campaign.js';
import {
  TZU_CHI_CUSTOMER_NAME,
  TZU_CHI_CUSTOMER_SLUG,
} from './seed-tzu-chi.args.js';

const DEMO_PASSWORD = 'DemoPassw0rd!';
const DEMO_ADMIN_EMAIL = 'demo.admin@example.test';
const DEMO_FACTOR_SOURCE =
  'Demo placeholder — replace with a cited scientific source before production.';

const DEMO_COMMUNITIES = [
  { name: 'Malaysia', parent: null },
  { name: 'Kuala Lumpur', parent: 'Malaysia' },
  { name: 'Penang', parent: 'Malaysia' },
] as const;

const DEMO_MEMBERS = [
  {
    email: 'alex.tan@example.test',
    firstName: 'Alex',
    lastName: 'Tan',
    displayName: 'Alex Tan',
    communityName: 'Kuala Lumpur',
  },
  {
    email: 'mei.wong@example.test',
    firstName: 'Mei',
    lastName: 'Wong',
    displayName: 'Mei Wong',
    communityName: 'Kuala Lumpur',
  },
  {
    email: 'rahul.nair@example.test',
    firstName: 'Rahul',
    lastName: 'Nair',
    displayName: 'Rahul Nair',
    communityName: 'Penang',
  },
] as const;

async function ensureActivatedUser(
  registration: RegistrationService,
  notifications: DevNotificationSender,
  identities: IdentityAccountService,
  credentials: CredentialService,
  dataSource: DataSource,
  email: string,
  names: { firstName: string; lastName: string; displayName: string },
): Promise<string> {
  const existing = await identities.findIdentity(
    IdentityType.EMAIL,
    credentials.normalizeEmail(email),
  );
  if (existing) {
    return existing.userId;
  }

  const registered = await registration.register(email, DEMO_PASSWORD);
  const token = notifications
    .drain()
    .filter((message) => message.template === 'activation')
    .at(-1)?.token;
  if (!token) {
    throw new Error(`Activation token missing for ${email}`);
  }
  await registration.activate(token);
  await dataSource.getRepository(User).update(
    { id: registered.id },
    {
      first_name: names.firstName,
      last_name: names.lastName,
      display_name: names.displayName,
      locale: 'en',
      timezone: 'Asia/Kuala_Lumpur',
    },
  );
  console.log(`Created demo user ${email} (${registered.id})`);
  return registered.id;
}

async function ensureCommunity(
  communities: CommunityService,
  tenant: ReturnType<typeof seedTenantContext>,
  name: string,
  parentId: string | null,
): Promise<string> {
  const listed = await communities.list(tenant);
  const existing = listed.find(
    (row) => row.name === name && row.parentId === parentId,
  );
  if (existing) {
    return existing.id;
  }
  const created = await communities.create(tenant, { name, parentId });
  console.log(`Created community '${name}' (${created.id})`);
  return created.id;
}

async function ensureMemberMembership(
  memberships: MembershipService,
  tenant: ReturnType<typeof seedTenantContext>,
  userId: string,
  communityId: string,
): Promise<void> {
  const listed = await memberships.list(tenant);
  const existing = listed.items.find(
    (row) => row.userId === userId && row.communityId === communityId,
  );
  if (existing) {
    if (!existing.roles.some((role) => role.key === SYSTEM_ROLE_MEMBER)) {
      await memberships.assignSystemRole(
        tenant,
        existing.id,
        SYSTEM_ROLE_MEMBER,
      );
    }
    return;
  }
  const membership = await memberships.create(tenant, { userId, communityId });
  await memberships.assignSystemRole(tenant, membership.id, SYSTEM_ROLE_MEMBER);
  console.log(`Created membership for ${userId} in ${communityId}`);
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const config = app.get(ConfigService);
    assertDemoSeedAllowed(config.get<string>('nodeEnv'));

    const credentials = app.get(CredentialService);
    const identities = app.get(IdentityAccountService);
    const customers = app.get(CustomerService);
    const communities = app.get(CommunityService);
    const memberships = app.get(MembershipService);
    const campaigns = app.get(CampaignService);
    const actions = app.get(ActionService);
    const visualizations = app.get(VisualizationService);
    const participations = app.get(ParticipationService);
    const commitments = app.get(CommitmentService);
    const measurements = app.get(MeasurementDefinitionService);
    const impactFactors = app.get(ImpactFactorService);
    const milestones = app.get(MilestoneService);
    const registration = app.get(RegistrationService);
    const notifications = app.get(DevNotificationSender);
    const dataSource = app.get(DataSource);

    const adminUserId = await ensureActivatedUser(
      registration,
      notifications,
      identities,
      credentials,
      dataSource,
      DEMO_ADMIN_EMAIL,
      {
        firstName: 'Demo',
        lastName: 'Admin',
        displayName: 'Demo Admin',
      },
    );
    await identities.setPlatformAdmin(adminUserId, true);
    console.log(`Demo platform admin ${DEMO_ADMIN_EMAIL} (${adminUserId})`);

    const existingCustomer = await customers.findBySlug(TZU_CHI_CUSTOMER_SLUG);
    const customer =
      existingCustomer ??
      (await customers.create(adminUserId, TZU_CHI_CUSTOMER_NAME));
    if (existingCustomer) {
      console.log(
        `Customer '${TZU_CHI_CUSTOMER_NAME}' already exists (${existingCustomer.id})`,
      );
    } else {
      console.log(
        `Created customer '${customer.name}' (${customer.id}) with tenant_admin ${adminUserId}`,
      );
    }

    const tenant = seedTenantContext(customer.id, adminUserId);
    const communityIds = new Map<string, string>();
    for (const node of DEMO_COMMUNITIES) {
      const parentId = node.parent
        ? (communityIds.get(node.parent) ?? null)
        : null;
      if (node.parent && !parentId) {
        throw new Error(`Parent community '${node.parent}' was not created`);
      }
      const id = await ensureCommunity(
        communities,
        tenant,
        node.name,
        parentId,
      );
      communityIds.set(node.name, id);
    }

    for (const member of DEMO_MEMBERS) {
      const userId = await ensureActivatedUser(
        registration,
        notifications,
        identities,
        credentials,
        dataSource,
        member.email,
        member,
      );
      const communityId = communityIds.get(member.communityName);
      if (!communityId) {
        throw new Error(`Community '${member.communityName}' is missing`);
      }
      await ensureMemberMembership(memberships, tenant, userId, communityId);
    }

    const { campaignId } = await ensureFoundingCampaign(
      campaigns,
      actions,
      visualizations,
      customer.id,
      adminUserId,
    );
    const campaign = await campaigns.getCampaign(tenant, campaignId);
    if (campaign.status === CampaignStatus.DRAFT) {
      await campaigns.publishCampaign(tenant, campaignId);
      console.log(`Published campaign '${FOUNDING_CAMPAIGN_NAME}'`);
    }
    const afterPublish = await campaigns.getCampaign(tenant, campaignId);
    if (afterPublish.status === CampaignStatus.PUBLISHED) {
      await campaigns.startCampaign(tenant, campaignId);
      console.log(`Started campaign '${FOUNDING_CAMPAIGN_NAME}'`);
    }

    const measurementList = await measurements.listForCampaign(
      tenant,
      campaignId,
    );
    if (!measurementList.some((row) => row.sourceUnit === 'meals')) {
      await measurements.create(tenant, campaignId, adminUserId, {
        name: 'Vegetarian meals',
        sourceUnit: 'meals',
      });
      console.log('Created measurement definition for meals');
    }

    const factorList = await impactFactors.list(tenant, campaignId);
    if (
      !factorList.some(
        (row) => row.sourceUnit === 'meals' && row.outcomeMetric === 'co2_kg',
      )
    ) {
      await impactFactors.create(
        tenant,
        adminUserId,
        {
          sourceUnit: 'meals',
          outcomeMetric: 'co2_kg',
          outcomeUnit: 'kg',
          factorValue: 0.5,
          source: DEMO_FACTOR_SOURCE,
          effectiveFrom: '2026-01-01',
        },
        campaignId,
      );
      console.log(
        'Created demo impact factor (placeholder, not a cited source)',
      );
    }

    const milestoneList = await milestones.listForCampaign(tenant, campaignId);
    if (!milestoneList.some((row) => row.name === 'First dozen meals')) {
      await milestones.create(tenant, campaignId, adminUserId, {
        name: 'First dozen meals',
        metric: MilestoneMetric.ACHIEVED_VALUE,
        thresholdValue: 12,
        unit: 'meals',
      });
      console.log("Created milestone 'First dozen meals'");
    }

    const definitions = await actions.listDefinitions(tenant, campaignId);
    const mealDefinition = definitions.find(
      (row) => row.key === FOUNDING_MEAL_DEFINITION_KEY,
    );
    if (!mealDefinition) {
      throw new Error('Vegetarian meal action definition is missing');
    }

    const alex = await identities.findIdentity(
      IdentityType.EMAIL,
      credentials.normalizeEmail(DEMO_MEMBERS[0].email),
    );
    if (!alex) {
      throw new Error('Demo member Alex is missing');
    }
    const enrolled = await participations.enroll(
      tenant,
      campaignId,
      adminUserId,
      alex.userId,
    );
    await commitments.createOrReplace(tenant, enrolled.id, adminUserId, {
      typeKey: '随缘素',
      targetValue: 21,
      unit: 'meals',
    });
    for (const day of [
      { occurredOn: '2026-10-11', quantity: 3 },
      { occurredOn: '2026-10-12', quantity: 2 },
    ]) {
      try {
        await actions.record(tenant, adminUserId, {
          participationId: enrolled.id,
          actionDefinitionId: mealDefinition.id,
          occurredOn: day.occurredOn,
          quantity: day.quantity,
        });
        console.log(`Recorded ${day.quantity} demo meals on ${day.occurredOn}`);
      } catch (error) {
        if (!(error instanceof ResourceConflictException)) {
          throw error;
        }
      }
    }

    console.log('Demo seed complete.');
    console.log(`Admin login: ${DEMO_ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`Sample member: ${DEMO_MEMBERS[0].email} / ${DEMO_PASSWORD}`);
    console.log(
      'All demo identities use @example.test and invented names. Do not treat them as real people.',
    );
  } finally {
    await app.close();
  }
}

await main();
