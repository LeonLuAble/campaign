import { describe, expect, it } from 'vitest';
import { envValidationSchema } from './env.schema.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://campaign:campaign@localhost:5432/campaign',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'test-access-secret-min-32-characters-xx',
  JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-x',
};

describe('envValidationSchema social client IDs', () => {
  it('allows empty Google and Apple client IDs in development and test', () => {
    for (const nodeEnv of ['development', 'test']) {
      const { error, value } = envValidationSchema.validate({
        ...baseEnv,
        NODE_ENV: nodeEnv,
        GOOGLE_CLIENT_ID: '',
        APPLE_CLIENT_ID: '',
      });
      expect(error).toBeUndefined();
      expect(value.GOOGLE_CLIENT_ID).toBe('');
      expect(value.APPLE_CLIENT_ID).toBe('');
    }
  });

  it('requires Google and Apple client IDs in production', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      GOOGLE_CLIENT_ID: '',
      APPLE_CLIENT_ID: '',
    });
    expect(error).toBeDefined();
  });
});

describe('envValidationSchema production secrets and SMTP', () => {
  const productionBase = {
    ...baseEnv,
    NODE_ENV: 'production',
    GOOGLE_CLIENT_ID: 'google-client.apps.googleusercontent.com',
    APPLE_CLIENT_ID: 'com.example.campaign',
    JWT_ACCESS_SECRET: 'production-access-secret-min-32-characters',
    JWT_REFRESH_SECRET: 'production-refresh-secret-min-32-character',
  };

  it('rejects documented example JWT secrets in production', () => {
    const { error } = envValidationSchema.validate({
      ...productionBase,
      JWT_ACCESS_SECRET: 'dev_access_secret_replace_in_production_min_32_chars',
    });
    expect(error).toBeDefined();
  });

  it('requires SMTP host, mail from, and public web base URL in production', () => {
    const missing = envValidationSchema.validate({
      ...productionBase,
    });
    expect(missing.error).toBeDefined();

    const complete = envValidationSchema.validate({
      ...productionBase,
      SMTP_HOST: 'smtp.example.org',
      MAIL_FROM: 'campaigns@example.org',
      PUBLIC_WEB_BASE_URL: 'https://admin.example.org',
      SMTP_SECURE: 'false',
    });
    expect(complete.error).toBeUndefined();
    expect(complete.value.NOTIFICATION_EMAIL_PROVIDER).toBe('smtp');
  });

  it('requires SMTP host and mail from when the email provider is smtp in development', () => {
    const missing = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'development',
      NOTIFICATION_EMAIL_PROVIDER: 'smtp',
    });
    expect(missing.error).toBeDefined();

    const complete = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'development',
      NOTIFICATION_EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'localhost',
      MAIL_FROM: 'noreply@localhost',
      PUBLIC_WEB_BASE_URL: 'http://localhost:8080',
    });
    expect(complete.error).toBeUndefined();
  });

  it('allows empty SMTP settings with the log-only provider outside production', () => {
    const { error, value } = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'development',
      NOTIFICATION_EMAIL_PROVIDER: 'dev',
      SMTP_HOST: '',
      MAIL_FROM: '',
      PUBLIC_WEB_BASE_URL: '',
    });
    expect(error).toBeUndefined();
    expect(value.NOTIFICATION_EMAIL_PROVIDER).toBe('dev');
  });

  it('accepts empty CORS_ORIGINS', () => {
    const { error, value } = envValidationSchema.validate({
      ...baseEnv,
      CORS_ORIGINS: '',
    });
    expect(error).toBeUndefined();
    expect(value.CORS_ORIGINS).toBe('');
  });
});
