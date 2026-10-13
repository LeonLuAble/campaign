import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { CreateTenantCommunityMembershipTables1792065305000 } from '../src/platform/database/migrations/1792065305000-CreateTenantCommunityMembershipTables.js';
import { CreateUserImportTables1792265507000 } from '../src/platform/database/migrations/1792265507000-CreateUserImportTables.js';
import { CreateCampaignTables1792365608000 } from '../src/platform/database/migrations/1792365608000-CreateCampaignTables.js';
import {
  ensureIdentitySchema,
  ensureTenantSchema,
} from './ensure-identity-schema.js';

interface ColumnInfo {
  column_name: string;
}

describe('Tenant community membership migration (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://campaign:campaign@localhost:5432/campaign';
    dataSource = new DataSource(createDatabaseOptions(databaseUrl));
    await dataSource.initialize();
    await ensureTenantSchema(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('creates tenant, community, membership, role and permission tables', async () => {
    const tables = (await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'tenants', 'community_nodes', 'memberships', 'roles',
          'permissions', 'role_permissions', 'membership_roles'
        )
      ORDER BY table_name
    `)) as Array<{ table_name: string }>;

    expect(tables.map((row) => row.table_name)).toEqual([
      'community_nodes',
      'membership_roles',
      'memberships',
      'permissions',
      'role_permissions',
      'roles',
      'tenants',
    ]);
  });

  it('seeds the permission catalog', async () => {
    const rows = (await dataSource.query(
      `SELECT key FROM permissions ORDER BY key`,
    )) as Array<{ key: string }>;
    expect(rows.map((row) => row.key)).toContain('customers.read');
    expect(rows.map((row) => row.key)).toContain('roles.assign');
  });

  it('keeps tenant slug unique', async () => {
    const columns = (await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tenants'
    `)) as ColumnInfo[];
    expect(columns.map((row) => row.column_name)).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'slug',
        'is_active',
        'created_at',
        'updated_at',
      ]),
    );

    await dataSource.query(`
      INSERT INTO tenants (name, slug) VALUES ('One', 'unique-slug-a')
    `);
    await expect(
      dataSource.query(`
        INSERT INTO tenants (name, slug) VALUES ('Two', 'unique-slug-a')
      `),
    ).rejects.toThrow();
    await dataSource.query(`DELETE FROM tenants WHERE slug = 'unique-slug-a'`);
  });

  it('can revert and re-apply without dropping identity tables', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await new CreateCampaignTables1792365608000().down(queryRunner);
    await new CreateUserImportTables1792265507000().down(queryRunner);
    await new CreateTenantCommunityMembershipTables1792065305000().down(
      queryRunner,
    );
    const missing = (await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tenants'
    `)) as Array<{ table_name: string }>;
    expect(missing).toHaveLength(0);

    const users = (await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `)) as Array<{ table_name: string }>;
    expect(users).toHaveLength(1);

    await ensureIdentitySchema(dataSource);
  });
});
