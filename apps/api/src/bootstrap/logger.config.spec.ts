import { describe, expect, it } from 'vitest';
import { LOGGER_REDACT_PATHS } from './logger.config.js';

describe('LOGGER_REDACT_PATHS', () => {
  it('redacts authorization, cookies, passwords, and tokens', () => {
    expect(LOGGER_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.idToken',
        'req.body.accessToken',
        'req.body.smtpPassword',
      ]),
    );
  });
});
