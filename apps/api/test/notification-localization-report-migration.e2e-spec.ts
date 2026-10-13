import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { ensureTenantSchema } from './ensure-identity-schema.js';

describe('Notification, localization and report migration (e2e)', () => {
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

  it('creates notification tables, translations and permissions', async () => {
    const tables = (
      (await dataSource.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'notifications',
            'notification_deliveries',
            'user_notification_preferences',
            'translations'
          )
        ORDER BY table_name
      `)) as Array<{ table_name: string }>
    ).map((row) => row.table_name);
    expect(tables).toEqual([
      'notification_deliveries',
      'notifications',
      'translations',
      'user_notification_preferences',
    ]);

    const keys = (
      (await dataSource.query(
        `SELECT key FROM permissions
         WHERE key LIKE 'notification%' OR key LIKE 'report%'
         ORDER BY key`,
      )) as Array<{ key: string }>
    ).map((row) => row.key);
    expect(keys).toEqual([
      'notifications.read',
      'notifications.update',
      'reports.export',
      'reports.read',
    ]);

    const translations = (
      (await dataSource.query(
        `SELECT locale FROM translations GROUP BY locale ORDER BY locale`,
      )) as Array<{ locale: string }>
    ).map((row) => row.locale);
    expect(translations).toEqual(['en', 'zh-Hans']);
  });
});
