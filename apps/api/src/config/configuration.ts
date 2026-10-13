export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppConfiguration {
  nodeEnv: NodeEnvironment;
  port: number;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    accessSecret?: string;
    refreshSecret?: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    issuer: string;
    audience: string;
  };
  objectStorage: {
    endpoint?: string;
    bucket?: string;
    accessKey?: string;
    secretKey?: string;
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

export default function configuration(): AppConfiguration {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as NodeEnvironment;

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
    database: {
      url: process.env.DATABASE_URL ?? '',
    },
    redis: {
      url: process.env.REDIS_URL ?? '',
    },
    jwt: {
      accessSecret: emptyToUndefined(process.env.JWT_ACCESS_SECRET),
      refreshSecret: emptyToUndefined(process.env.JWT_REFRESH_SECRET),
      accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
      refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 604800),
      issuer: process.env.JWT_ISSUER || 'campaign-api',
      audience: process.env.JWT_AUDIENCE || 'campaign-clients',
    },
    objectStorage: {
      endpoint: emptyToUndefined(process.env.OBJECT_STORAGE_ENDPOINT),
      bucket: emptyToUndefined(process.env.OBJECT_STORAGE_BUCKET),
      accessKey: emptyToUndefined(process.env.OBJECT_STORAGE_ACCESS_KEY),
      secretKey: emptyToUndefined(process.env.OBJECT_STORAGE_SECRET_KEY),
    },
  };
}
