import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../src/platform/database/database-options.js';
import { CreateIdentityTables1791865103000 } from '../src/platform/database/migrations/1791865103000-CreateIdentityTables.js';
import { AddIdentityIdToUserTokens1791965204000 } from '../src/platform/database/migrations/1791965204000-AddIdentityIdToUserTokens.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable?: string;
}

interface ConstraintInfo {
  constraint_name: string;
  constraint_type?: string;
}

interface IndexInfo {
  indexname: string;
  indexdef?: string;
}

describe('Identity Migration (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://campaign:campaign@localhost:5432/campaign';

    dataSource = new DataSource(createDatabaseOptions(databaseUrl));
    await dataSource.initialize();
    await ensureIdentitySchema(dataSource);
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

    it('should create user_credentials table with foreign key and unique user_id', async () => {
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
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'user_credentials'
          AND constraint_type IN ('FOREIGN KEY', 'UNIQUE');
      `);

      expect(constraints.length).toBeGreaterThanOrEqual(2);
      expect(
        constraints.some((c: ConstraintInfo) =>
          c.constraint_name.includes('uq_user_credentials_user_id'),
        ),
      ).toBe(true);
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

    it('should create refresh_tokens table with unique token_hash and self-FK', async () => {
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

      const constraints = await dataSource.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'refresh_tokens'
          AND constraint_type = 'UNIQUE';
      `);

      expect(
        constraints.some((c: ConstraintInfo) =>
          c.constraint_name.includes('uq_refresh_tokens_token_hash'),
        ),
      ).toBe(true);

      const foreignKeys = await dataSource.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'refresh_tokens'
          AND kcu.column_name = 'parent_token_id';
      `);

      expect(foreignKeys.length).toBe(1);
      expect(foreignKeys[0].foreign_table_name).toBe('refresh_tokens');
    });

    it('should create user_tokens table with unique token_hash and partial index', async () => {
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
      expect(columnNames).toContain('identity_id');

      const constraints = await dataSource.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'user_tokens'
          AND constraint_type = 'UNIQUE';
      `);

      expect(
        constraints.some((c: ConstraintInfo) =>
          c.constraint_name.includes('uq_user_tokens_token_hash'),
        ),
      ).toBe(true);

      const indexes: IndexInfo[] = await dataSource.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'user_tokens'
          AND indexname = 'idx_user_tokens_active_unused';
      `);

      expect(indexes.length).toBe(1);
      expect(indexes[0].indexdef).toContain('WHERE');
      expect(indexes[0].indexdef).toContain('used_at IS NULL');
      expect(indexes[0].indexdef).toContain('UNIQUE');
    });

    it('should enforce unique constraint on user_identities', async () => {
      await clearIdentityData(dataSource);
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
      await clearIdentityData(dataSource);
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

    it('should prevent multiple active unused tokens of same type for a user', async () => {
      await clearIdentityData(dataSource);
      await dataSource.query(`
        INSERT INTO users (id, is_active, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000020', true, now(), now());
      `);

      await dataSource.query(`
        INSERT INTO user_tokens (id, user_id, type, token_hash, expires_at, created_at)
        VALUES (
          '00000000-0000-0000-0000-000000000021',
          '00000000-0000-0000-0000-000000000020',
          'activation',
          'hash1',
          now() + interval '1 day',
          now()
        );
      `);

      await expect(
        dataSource.query(`
          INSERT INTO user_tokens (id, user_id, type, token_hash, expires_at, created_at)
          VALUES (
            '00000000-0000-0000-0000-000000000022',
            '00000000-0000-0000-0000-000000000020',
            'activation',
            'hash2',
            now() + interval '1 day',
            now()
          );
        `),
      ).rejects.toThrow();

      await dataSource.query(`DELETE FROM user_tokens;`);
      await dataSource.query(`DELETE FROM users;`);
    });

    it('should allow multiple tokens of same type if previous is used', async () => {
      await clearIdentityData(dataSource);
      await dataSource.query(`
        INSERT INTO users (id, is_active, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000030', true, now(), now());
      `);

      await dataSource.query(`
        INSERT INTO user_tokens (id, user_id, type, token_hash, expires_at, used_at, created_at)
        VALUES (
          '00000000-0000-0000-0000-000000000031',
          '00000000-0000-0000-0000-000000000030',
          'activation',
          'hash3',
          now() + interval '1 day',
          now(),
          now()
        );
      `);

      await expect(
        dataSource.query(`
          INSERT INTO user_tokens (id, user_id, type, token_hash, expires_at, created_at)
          VALUES (
            '00000000-0000-0000-0000-000000000032',
            '00000000-0000-0000-0000-000000000030',
            'activation',
            'hash4',
            now() + interval '1 day',
            now()
          );
        `),
      ).resolves.toBeDefined();

      await dataSource.query(`DELETE FROM user_tokens;`);
      await dataSource.query(`DELETE FROM users;`);
    });

    it('should keep user_tokens.identity_id nullable with a foreign key', async () => {
      const columns = (await dataSource.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_tokens' AND column_name = 'identity_id'
      `)) as Array<{ column_name: string; is_nullable: string }>;

      expect(columns).toHaveLength(1);
      expect(columns[0].is_nullable).toBe('YES');

      const foreignKeys = await dataSource.query(`
        SELECT ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'user_tokens'
          AND kcu.column_name = 'identity_id'
      `);

      expect(foreignKeys).toHaveLength(1);
      expect(foreignKeys[0].foreign_table_name).toBe('user_identities');
    });
  });

  describe('migration down', () => {
    it('should revert all tables', async () => {
      await new AddIdentityIdToUserTokens1791965204000().down(
        dataSource.createQueryRunner(),
      );
      const migration = new CreateIdentityTables1791865103000();
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
