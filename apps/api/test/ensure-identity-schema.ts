import { DataSource } from 'typeorm';
import { CreateIdentityTables1791865103000 } from '../src/platform/database/migrations/1791865103000-CreateIdentityTables.js';
import { AddIdentityIdToUserTokens1791965204000 } from '../src/platform/database/migrations/1791965204000-AddIdentityIdToUserTokens.js';

export async function clearIdentityData(dataSource: DataSource): Promise<void> {
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
  const rows = (await dataSource.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'users'
     ) AS exists`,
  )) as Array<{ exists: boolean | string }>;

  const exists = rows[0]?.exists;
  if (!(exists === true || exists === 't')) {
    await new CreateIdentityTables1791865103000().up(
      dataSource.createQueryRunner(),
    );
  }

  const identityIdColumn = (await dataSource.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'user_tokens'
         AND column_name = 'identity_id'
     ) AS exists`,
  )) as Array<{ exists: boolean | string }>;

  const hasIdentityId = identityIdColumn[0]?.exists;
  if (!(hasIdentityId === true || hasIdentityId === 't')) {
    await new AddIdentityIdToUserTokens1791965204000().up(
      dataSource.createQueryRunner(),
    );
  }
}
