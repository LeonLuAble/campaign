import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { ensureTenantSchema } from './ensure-identity-schema.js';

describe('Campaign migration (e2e)', () => {
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

  it('creates campaign tables and permissions', async () => {
    const tables = (await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'campaign_templates', 'campaign_scopes', 'campaigns',
          'campaign_configurations', 'campaign_communities', 'participations'
        )
      ORDER BY table_name
    `)) as Array<{ table_name: string }>;
    expect(tables.map((row) => row.table_name)).toEqual([
      'campaign_communities',
      'campaign_configurations',
      'campaign_scopes',
      'campaign_templates',
      'campaigns',
      'participations',
    ]);

    const keys = (
      (await dataSource.query(
        `SELECT key FROM permissions
         WHERE key LIKE 'campaign%' OR key LIKE 'participation%'
         ORDER BY key`,
      )) as Array<{ key: string }>
    ).map((row) => row.key);
    expect(keys).toEqual([
      'campaign_scopes.create',
      'campaign_scopes.read',
      'campaign_scopes.update',
      'campaign_templates.create',
      'campaign_templates.read',
      'campaign_templates.update',
      'campaigns.create',
      'campaigns.read',
      'campaigns.update',
      'participations.create',
      'participations.read',
      'participations.update',
    ]);
  });
});
