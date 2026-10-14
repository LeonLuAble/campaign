import Joi from 'joi';
import { EXAMPLE_JWT_SECRETS } from './security-config.js';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  DEFAULT_PHONE_REGION: Joi.string()
    .length(2)
    .uppercase()
    .default('MY')
    .description('ISO 3166-1 alpha-2 country code for phone number parsing'),
  JWT_ACCESS_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .invalid(...EXAMPLE_JWT_SECRETS)
      .required(),
    otherwise: Joi.string().min(32).required(),
  }),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .invalid(...EXAMPLE_JWT_SECRETS)
      .required(),
    otherwise: Joi.string().min(32).required(),
  }),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(3600).default(604800),
  JWT_ISSUER: Joi.string().min(1).default('campaign-api'),
  JWT_AUDIENCE: Joi.string().min(1).default('campaign-clients'),
  ACTIVATION_TOKEN_TTL_SECONDS: Joi.number().integer().min(60).default(86400),
  PASSWORD_RESET_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .default(3600),
  PASSWORD_MIN_LENGTH: Joi.number().integer().min(8).max(256).default(8),
  GOOGLE_CLIENT_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  APPLE_CLIENT_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  OBJECT_STORAGE_ENDPOINT: Joi.string().uri().allow('').optional(),
  OBJECT_STORAGE_BUCKET: Joi.string().allow('').optional(),
  OBJECT_STORAGE_ACCESS_KEY: Joi.string().allow('').optional(),
  OBJECT_STORAGE_SECRET_KEY: Joi.string().allow('').optional(),
  NOTIFICATION_EMAIL_PROVIDER: Joi.string().valid('dev', 'smtp').default('dev'),
  NOTIFICATION_SMS_PROVIDER: Joi.string().valid('dev', 'noop').default('dev'),
  NOTIFICATION_PUSH_PROVIDER: Joi.string().valid('dev', 'noop').default('dev'),
  SMTP_HOST: Joi.when('NOTIFICATION_EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.when('NOTIFICATION_EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SMS_FROM: Joi.string().allow('').default(''),
  REMINDER_SCHEDULER_ENABLED: Joi.boolean().default(true),
  REMINDER_SCHEDULER_INTERVAL_MS: Joi.number()
    .integer()
    .min(1000)
    .default(60_000),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  HELMET_ENABLED: Joi.boolean().default(true),
  AUTH_RATE_LIMIT_ENABLED: Joi.boolean().optional(),
  AUTH_RATE_LIMIT_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(20),
  // Empty disables first-admin setup. When set, must be at least 32 characters.
  SETUP_KEY: Joi.string().min(32).allow('').optional(),
});
