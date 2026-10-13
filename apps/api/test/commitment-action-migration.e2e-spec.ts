import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { ensureTenantSchema } from './ensure-identity-schema.js';

describe('Commitment and action migration (e2e)', () => {
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

  it('creates commitment and action tables and permissions', async () => {
    const tables = (await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'action_definitions', 'actions', 'commitments', 'submissions'
        )
      ORDER BY table_name
    `)) as Array<{ table_name: string }>;
    expect(tables.map((row) => row.table_name)).toEqual([
      'action_definitions',
      'actions',
      'commitments',
      'submissions',
    ]);

    const keys = (
      (await dataSource.query(
        `SELECT key FROM permissions
         WHERE key LIKE 'action%' OR key LIKE 'commitment%' OR key LIKE 'submission%'
         ORDER BY key`,
      )) as Array<{ key: string }>
    ).map((row) => row.key);
    expect(keys).toEqual([
      'action_definitions.create',
      'action_definitions.read',
      'action_definitions.update',
      'actions.create',
      'actions.read',
      'actions.update',
      'commitments.create',
      'commitments.read',
      'commitments.update',
      'submissions.read',
      'submissions.update',
    ]);
  });
});
