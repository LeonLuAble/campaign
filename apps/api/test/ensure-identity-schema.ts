import { DataSource } from 'typeorm';
import { CreateIdentityTables1791865103000 } from '../src/platform/database/migrations/1791865103000-CreateIdentityTables.js';

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
  if (exists === true || exists === 't') {
    return;
  }

  await new CreateIdentityTables1791865103000().up(
    dataSource.createQueryRunner(),
  );
}
