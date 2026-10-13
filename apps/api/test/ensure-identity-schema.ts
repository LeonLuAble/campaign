import { DataSource } from 'typeorm';
import { CreateIdentityTables1791865103000 } from '../src/platform/database/migrations/1791865103000-CreateIdentityTables.js';
import { AddIdentityIdToUserTokens1791965204000 } from '../src/platform/database/migrations/1791965204000-AddIdentityIdToUserTokens.js';
import { CreateTenantCommunityMembershipTables1792065305000 } from '../src/platform/database/migrations/1792065305000-CreateTenantCommunityMembershipTables.js';
import { AddUserPlatformAdmin1792165406000 } from '../src/platform/database/migrations/1792165406000-AddUserPlatformAdmin.js';

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
  await dataSource.query('DELETE FROM membership_roles');
  await dataSource.query('DELETE FROM role_permissions');
  await dataSource.query('DELETE FROM roles');
  await dataSource.query('DELETE FROM memberships');
  await dataSource.query('DELETE FROM community_nodes');
  await dataSource.query('DELETE FROM tenants');
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
  if (!(await tableExists(dataSource, 'tenants'))) {
    await new CreateTenantCommunityMembershipTables1792065305000().up(
      dataSource.createQueryRunner(),
    );
  }
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
