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
  tokens: {
    activationTtlSeconds: number;
    passwordResetTtlSeconds: number;
    passwordMinLength: number;
  };
  social: {
    googleClientId?: string;
    appleClientId?: string;
  };
  objectStorage: {
    endpoint?: string;
    bucket?: string;
    accessKey?: string;
    secretKey?: string;
  };
  notifications: {
    emailProvider: 'dev' | 'smtp';
    smsProvider: 'dev' | 'noop';
    pushProvider: 'dev' | 'noop';
    smtpHost?: string;
    smtpPort: number;
    smtpUser?: string;
    smtpPassword?: string;
    smtpFrom?: string;
    smsFrom?: string;
    reminderSchedulerEnabled: boolean;
    reminderSchedulerIntervalMs: number;
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
    tokens: {
      activationTtlSeconds: Number(
        process.env.ACTIVATION_TOKEN_TTL_SECONDS ?? 86400,
      ),
      passwordResetTtlSeconds: Number(
        process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS ?? 3600,
      ),
      passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH ?? 8),
    },
    social: {
      googleClientId: emptyToUndefined(process.env.GOOGLE_CLIENT_ID),
      appleClientId: emptyToUndefined(process.env.APPLE_CLIENT_ID),
    },
    objectStorage: {
      endpoint: emptyToUndefined(process.env.OBJECT_STORAGE_ENDPOINT),
      bucket: emptyToUndefined(process.env.OBJECT_STORAGE_BUCKET),
      accessKey: emptyToUndefined(process.env.OBJECT_STORAGE_ACCESS_KEY),
      secretKey: emptyToUndefined(process.env.OBJECT_STORAGE_SECRET_KEY),
    },
    notifications: {
      emailProvider:
        process.env.NOTIFICATION_EMAIL_PROVIDER === 'smtp' ? 'smtp' : 'dev',
      smsProvider:
        process.env.NOTIFICATION_SMS_PROVIDER === 'noop' ? 'noop' : 'dev',
      pushProvider:
        process.env.NOTIFICATION_PUSH_PROVIDER === 'noop' ? 'noop' : 'dev',
      smtpHost: emptyToUndefined(process.env.SMTP_HOST),
      smtpPort: Number(process.env.SMTP_PORT ?? 587),
      smtpUser: emptyToUndefined(process.env.SMTP_USER),
      smtpPassword: emptyToUndefined(process.env.SMTP_PASSWORD),
      smtpFrom: emptyToUndefined(process.env.SMTP_FROM),
      smsFrom: emptyToUndefined(process.env.SMS_FROM),
      reminderSchedulerEnabled:
        process.env.NODE_ENV === 'test'
          ? process.env.REMINDER_SCHEDULER_ENABLED === 'true'
          : process.env.REMINDER_SCHEDULER_ENABLED !== 'false',
      reminderSchedulerIntervalMs: Number(
        process.env.REMINDER_SCHEDULER_INTERVAL_MS ?? 60_000,
      ),
    },
  };
}
