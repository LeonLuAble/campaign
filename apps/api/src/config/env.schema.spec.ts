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
