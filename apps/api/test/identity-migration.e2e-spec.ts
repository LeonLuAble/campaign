import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { CreateIdentityTables1700000000000 } from '../src/platform/database/migrations/1700000000000-CreateIdentityTables.js';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable?: string;
}

interface ConstraintInfo {
  constraint_name: string;
}

interface IndexInfo {
  indexname: string;
}

describe('Identity Migration (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://campaign:campaign@localhost:5432/campaign';

    dataSource = new DataSource(createDatabaseOptions(databaseUrl));
    await dataSource.initialize();

    const migration = new CreateIdentityTables1700000000000();
    await migration.up(dataSource.createQueryRunner());
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('after migration up', () => {
    it('should create users table with correct columns', async () => {
      const result = await dataSource.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY column_name;
      `);

      const columnNames = result.map((r: ColumnInfo) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('first_name');
      expect(columnNames).toContain('last_name');
      expect(columnNames).toContain('display_name');
      expect(columnNames).toContain('locale');
      expect(columnNames).toContain('timezone');
      expect(columnNames).toContain('is_active');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should create user_identities table with unique constraint', async () => {
      const result = await dataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user_identities'
        ORDER BY column_name;
      `);

      const columnNames = result.map((r: ColumnInfo) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('identifier');
      expect(columnNames).toContain('normalized_identifier');
      expect(columnNames).toContain('is_verified');
      expect(columnNames).toContain('verified_at');

      const constraints = await dataSource.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'user_identities'
          AND constraint_type = 'UNIQUE';
      `);

      expect(constraints.length).toBeGreaterThan(0);
      expect(
        constraints.some((c: ConstraintInfo) =>
          c.constraint_name.includes('uq_user_identities_type_normalized'),
        ),
      ).toBe(true);
    });

    it('should create user_credentials table with foreign key', async () => {
      const result = await dataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user_credentials'
        ORDER BY column_name;
      `);

      const columnNames = result.map((r: ColumnInfo) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('password_hash');

      const constraints = await dataSource.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'user_credentials'
          AND constraint_type = 'FOREIGN KEY';
      `);

      expect(constraints.length).toBeGreaterThan(0);
    });

    it('should create user_social_identities table with unique constraint on provider and subject', async () => {
      const result = await dataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user_social_identities'
        ORDER BY column_name;
      `);

      const columnNames = result.map((r: ColumnInfo) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('provider');
      expect(columnNames).toContain('provider_subject');
      expect(columnNames).toContain('provider_email');

      const constraints = await dataSource.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'user_social_identities'
          AND constraint_type = 'UNIQUE';
      `);

      expect(constraints.length).toBeGreaterThan(0);
      expect(
        constraints.some((c: ConstraintInfo) =>
          c.constraint_name.includes(
            'uq_user_social_identities_provider_subject',
          ),
        ),
      ).toBe(true);
    });

    it('should create refresh_tokens table with indexes', async () => {
      const result = await dataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'refresh_tokens'
        ORDER BY column_name;
      `);

      const columnNames = result.map((r: ColumnInfo) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('token_hash');
      expect(columnNames).toContain('family_id');
      expect(columnNames).toContain('parent_token_id');
      expect(columnNames).toContain('expires_at');
      expect(columnNames).toContain('revoked_at');
      expect(columnNames).toContain('revocation_reason');

      const indexes = await dataSource.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'refresh_tokens';
      `);

      const indexNames = indexes.map((i: IndexInfo) => i.indexname);
      expect(
        indexNames.some((name: string) =>
          name.includes('idx_refresh_tokens_token_hash'),
        ),
      ).toBe(true);
      expect(
        indexNames.some((name: string) =>
          name.includes('idx_refresh_tokens_family_id'),
        ),
      ).toBe(true);
    });

    it('should create user_tokens table', async () => {
      const result = await dataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user_tokens'
        ORDER BY column_name;
      `);

      const columnNames = result.map((r: ColumnInfo) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('token_hash');
      expect(columnNames).toContain('expires_at');
      expect(columnNames).toContain('used_at');
    });

    it('should enforce unique constraint on user_identities', async () => {
      await dataSource.query(`
        INSERT INTO users (id, is_active, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000001', true, now(), now());
      `);

      await dataSource.query(`
        INSERT INTO user_identities (id, user_id, type, identifier, normalized_identifier, is_verified, created_at, updated_at)
        VALUES (
          '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          'email',
          'test@example.com',
          'test@example.com',
          false,
          now(),
          now()
        );
      `);

      await expect(
        dataSource.query(`
          INSERT INTO user_identities (id, user_id, type, identifier, normalized_identifier, is_verified, created_at, updated_at)
          VALUES (
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000001',
            'email',
            'TEST@EXAMPLE.COM',
            'test@example.com',
            false,
            now(),
            now()
          );
        `),
      ).rejects.toThrow();

      await dataSource.query(`DELETE FROM user_identities;`);
      await dataSource.query(`DELETE FROM users;`);
    });

    it('should enforce unique constraint on user_social_identities', async () => {
      await dataSource.query(`
        INSERT INTO users (id, is_active, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000010', true, now(), now());
      `);

      await dataSource.query(`
        INSERT INTO user_social_identities (id, user_id, provider, provider_subject, created_at, updated_at)
        VALUES (
          '00000000-0000-0000-0000-000000000011',
          '00000000-0000-0000-0000-000000000010',
          'google',
          'google-subject-123',
          now(),
          now()
        );
      `);

      await expect(
        dataSource.query(`
          INSERT INTO user_social_identities (id, user_id, provider, provider_subject, created_at, updated_at)
          VALUES (
            '00000000-0000-0000-0000-000000000012',
            '00000000-0000-0000-0000-000000000010',
            'google',
            'google-subject-123',
            now(),
            now()
          );
        `),
      ).rejects.toThrow();

      await dataSource.query(`DELETE FROM user_social_identities;`);
      await dataSource.query(`DELETE FROM users;`);
    });
  });

  describe('migration down', () => {
    it('should revert all tables', async () => {
      const migration = new CreateIdentityTables1700000000000();
      await migration.down(dataSource.createQueryRunner());

      const tables = await dataSource.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'user_identities', 'user_credentials', 'user_social_identities', 'refresh_tokens', 'user_tokens');
      `);

      expect(tables.length).toBe(0);
    });
  });
});
