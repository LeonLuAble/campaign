import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { ensureTenantSchema } from './ensure-identity-schema.js';

describe('Measurement, outcome and visualization migration (e2e)', () => {
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

  it('creates measurement, factor and visualization tables and permissions', async () => {
    const tables = (await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'measurement_definitions', 'impact_factors', 'visualizations'
        )
      ORDER BY table_name
    `)) as Array<{ table_name: string }>;
    expect(tables.map((row) => row.table_name)).toEqual([
      'impact_factors',
      'measurement_definitions',
      'visualizations',
    ]);

    const keys = (
      (await dataSource.query(
        `SELECT key FROM permissions
         WHERE key LIKE 'measurement%'
            OR key LIKE 'impact_factor%'
            OR key LIKE 'outcome%'
            OR key LIKE 'visualization%'
            OR key LIKE 'dashboard%'
         ORDER BY key`,
      )) as Array<{ key: string }>
    ).map((row) => row.key);
    expect(keys).toEqual([
      'dashboards.read',
      'impact_factors.create',
      'impact_factors.read',
      'impact_factors.update',
      'measurement_definitions.create',
      'measurement_definitions.read',
      'measurement_definitions.update',
      'measurements.read',
      'outcomes.read',
      'visualizations.create',
      'visualizations.read',
      'visualizations.update',
    ]);
  });
});
