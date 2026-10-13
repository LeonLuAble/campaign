import type { DataSourceOptions } from 'typeorm';

export function createDatabaseOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    migrationsRun: false,
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/platform/database/migrations/*.js'],
  };
}
