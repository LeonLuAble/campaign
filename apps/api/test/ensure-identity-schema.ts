import { DataSource, type MigrationInterface, type QueryRunner } from 'typeorm';
import { CreateIdentityTables1791865103000 } from '../src/platform/database/migrations/1791865103000-CreateIdentityTables.js';
import { AddIdentityIdToUserTokens1791965204000 } from '../src/platform/database/migrations/1791965204000-AddIdentityIdToUserTokens.js';
import { CreateTenantCommunityMembershipTables1792065305000 } from '../src/platform/database/migrations/1792065305000-CreateTenantCommunityMembershipTables.js';
import { AddUserPlatformAdmin1792165406000 } from '../src/platform/database/migrations/1792165406000-AddUserPlatformAdmin.js';
import { CreateUserImportTables1792265507000 } from '../src/platform/database/migrations/1792265507000-CreateUserImportTables.js';
import { CreateCampaignTables1792365608000 } from '../src/platform/database/migrations/1792365608000-CreateCampaignTables.js';
import { CreateCommitmentActionTables1792465709000 } from '../src/platform/database/migrations/1792465709000-CreateCommitmentActionTables.js';
import { CreateProgressMilestoneTables1792565810000 } from '../src/platform/database/migrations/1792565810000-CreateProgressMilestoneTables.js';
import { CreateMeasurementOutcomeVisualizationTables1792665911000 } from '../src/platform/database/migrations/1792665911000-CreateMeasurementOutcomeVisualizationTables.js';
import { CreateNotificationLocalizationReportTables1792766012000 } from '../src/platform/database/migrations/1792766012000-CreateNotificationLocalizationReportTables.js';
import { TightenMemberRolePermissions1792866113000 } from '../src/platform/database/migrations/1792866113000-TightenMemberRolePermissions.js';

type MigrationCtor = new () => MigrationInterface;

/** Oldest-first. Revert helpers walk this list newest-first so later FKs drop first. */
const SCHEMA_MIGRATIONS: MigrationCtor[] = [
  CreateIdentityTables1791865103000,
  AddIdentityIdToUserTokens1791965204000,
  CreateTenantCommunityMembershipTables1792065305000,
  AddUserPlatformAdmin1792165406000,
  CreateUserImportTables1792265507000,
  CreateCampaignTables1792365608000,
  CreateCommitmentActionTables1792465709000,
  CreateProgressMilestoneTables1792565810000,
  CreateMeasurementOutcomeVisualizationTables1792665911000,
  CreateNotificationLocalizationReportTables1792766012000,
  TightenMemberRolePermissions1792866113000,
];

export async function revertSchemaMigrationsNewestFirst(
  queryRunner: QueryRunner,
): Promise<void> {
  for (const Migration of [...SCHEMA_MIGRATIONS].reverse()) {
    await new Migration().down(queryRunner);
  }
}

export async function revertFromNewestThrough(
  queryRunner: QueryRunner,
  target: MigrationCtor,
): Promise<void> {
  const newestFirst = [...SCHEMA_MIGRATIONS].reverse();
  const targetIndex = newestFirst.findIndex(
    (Migration) => Migration.name === target.name,
  );
  if (targetIndex < 0) {
    throw new Error(`Unknown schema migration: ${target.name}`);
  }
  for (const Migration of newestFirst.slice(0, targetIndex + 1)) {
    await new Migration().down(queryRunner);
  }
}

async function tableExists(
  dataSource: DataSource,
  tableName: string,
): Promise<boolean> {
  const rows = (await dataSource.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName],
  )) as Array<{ exists: boolean | string }>;
  const exists = rows[0]?.exists;
  return exists === true || exists === 't';
}

async function columnExists(
  dataSource: DataSource,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows = (await dataSource.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName],
  )) as Array<{ exists: boolean | string }>;
  const exists = rows[0]?.exists;
  return exists === true || exists === 't';
}

export async function clearTenantData(dataSource: DataSource): Promise<void> {
  if (!(await tableExists(dataSource, 'tenants'))) {
    return;
  }
  const tables = [
    'notification_deliveries',
    'notifications',
    'user_notification_preferences',
    'visualizations',
    'impact_factors',
    'measurement_definitions',
    'milestone_evaluations',
    'milestone_progress',
    'milestones',
    'submissions',
    'actions',
    'commitments',
    'action_definitions',
    'participations',
    'campaign_communities',
    'campaign_configurations',
    'campaigns',
    'campaign_scopes',
    'campaign_templates',
    'user_import_rows',
    'user_imports',
    'membership_roles',
    'role_permissions',
    'roles',
    'memberships',
    'community_nodes',
    'tenants',
  ];
  for (const table of tables) {
    if (await tableExists(dataSource, table)) {
      await dataSource.query(`DELETE FROM ${table}`);
    }
  }
}

export async function clearIdentityData(dataSource: DataSource): Promise<void> {
  await clearTenantData(dataSource);
  await dataSource.query('DELETE FROM refresh_tokens');
  await dataSource.query('DELETE FROM user_tokens');
  await dataSource.query('DELETE FROM user_social_identities');
  await dataSource.query('DELETE FROM user_credentials');
  await dataSource.query('DELETE FROM user_identities');
  await dataSource.query('DELETE FROM users');
}

export async function ensureIdentitySchema(
  dataSource: DataSource,
): Promise<void> {
  await ensureTenantSchema(dataSource);
}

export async function ensureTenantSchema(
  dataSource: DataSource,
): Promise<void> {
  await ensureIdentitySchemaWithoutTenant(dataSource);
  const queryRunner = dataSource.createQueryRunner();
  const hasTenants = await tableExists(dataSource, 'tenants');
  const hasMembershipRoles = await tableExists(dataSource, 'membership_roles');
  if (hasTenants && !hasMembershipRoles) {
    if (await tableExists(dataSource, 'notifications')) {
      await new CreateNotificationLocalizationReportTables1792766012000().down(
        queryRunner,
      );
    }
    if (await tableExists(dataSource, 'measurement_definitions')) {
      await new CreateMeasurementOutcomeVisualizationTables1792665911000().down(
        queryRunner,
      );
    }
    if (await tableExists(dataSource, 'milestones')) {
      await new CreateProgressMilestoneTables1792565810000().down(queryRunner);
    }
    if (await tableExists(dataSource, 'commitments')) {
      await new CreateCommitmentActionTables1792465709000().down(queryRunner);
    }
    if (await tableExists(dataSource, 'campaigns')) {
      await new CreateCampaignTables1792365608000().down(queryRunner);
    }
    if (await tableExists(dataSource, 'user_imports')) {
      await new CreateUserImportTables1792265507000().down(queryRunner);
    }
    await new CreateTenantCommunityMembershipTables1792065305000().down(
      queryRunner,
    );
  }
  if (!(await tableExists(dataSource, 'tenants'))) {
    await new CreateTenantCommunityMembershipTables1792065305000().up(
      queryRunner,
    );
  }
  if (!(await tableExists(dataSource, 'user_imports'))) {
    await new CreateUserImportTables1792265507000().up(queryRunner);
  }
  if (!(await tableExists(dataSource, 'campaigns'))) {
    await new CreateCampaignTables1792365608000().up(queryRunner);
  }
  if (!(await tableExists(dataSource, 'commitments'))) {
    await new CreateCommitmentActionTables1792465709000().up(queryRunner);
  }
  if (!(await tableExists(dataSource, 'milestones'))) {
    await new CreateProgressMilestoneTables1792565810000().up(queryRunner);
  }
  if (!(await tableExists(dataSource, 'measurement_definitions'))) {
    await new CreateMeasurementOutcomeVisualizationTables1792665911000().up(
      queryRunner,
    );
  }
  if (!(await tableExists(dataSource, 'notifications'))) {
    await new CreateNotificationLocalizationReportTables1792766012000().up(
      queryRunner,
    );
  }
  // Data-only: always apply so member roles lose import/membership/role reads
  // even when older migrations re-granted them during schema bootstrap.
  await new TightenMemberRolePermissions1792866113000().up(queryRunner);
}

async function ensureIdentitySchemaWithoutTenant(
  dataSource: DataSource,
): Promise<void> {
  if (!(await tableExists(dataSource, 'users'))) {
    await new CreateIdentityTables1791865103000().up(
      dataSource.createQueryRunner(),
    );
  }
  if (!(await columnExists(dataSource, 'user_tokens', 'identity_id'))) {
    await new AddIdentityIdToUserTokens1791965204000().up(
      dataSource.createQueryRunner(),
    );
  }
  if (!(await columnExists(dataSource, 'users', 'is_platform_admin'))) {
    await new AddUserPlatformAdmin1792165406000().up(
      dataSource.createQueryRunner(),
    );
  }
}
