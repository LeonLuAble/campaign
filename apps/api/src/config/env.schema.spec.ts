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

  it('requires SMTP host and from when the email provider is smtp', () => {
    const missing = envValidationSchema.validate({
      ...productionBase,
      NOTIFICATION_EMAIL_PROVIDER: 'smtp',
    });
    expect(missing.error).toBeDefined();

    const complete = envValidationSchema.validate({
      ...productionBase,
      NOTIFICATION_EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.org',
      SMTP_FROM: 'campaigns@example.org',
    });
    expect(complete.error).toBeUndefined();
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
