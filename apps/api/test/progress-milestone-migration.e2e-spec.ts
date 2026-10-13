import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { ensureTenantSchema } from './ensure-identity-schema.js';

describe('Progress and milestone migration (e2e)', () => {
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

  it('creates milestone tables and progress permissions', async () => {
    const tables = (await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'milestones', 'milestone_progress', 'milestone_evaluations'
        )
      ORDER BY table_name
    `)) as Array<{ table_name: string }>;
    expect(tables.map((row) => row.table_name)).toEqual([
      'milestone_evaluations',
      'milestone_progress',
      'milestones',
    ]);

    const keys = (
      (await dataSource.query(
        `SELECT key FROM permissions
         WHERE key LIKE 'achievement%' OR key LIKE 'progress%' OR key LIKE 'milestone%'
         ORDER BY key`,
      )) as Array<{ key: string }>
    ).map((row) => row.key);
    expect(keys).toEqual([
      'achievements.read',
      'milestones.create',
      'milestones.evaluate',
      'milestones.read',
      'milestones.update',
      'progress.read',
    ]);
  });
});
