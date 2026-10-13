import Joi from 'joi';

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
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
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
  OBJECT_STORAGE_ENDPOINT: Joi.string().uri().allow('').optional(),
  OBJECT_STORAGE_BUCKET: Joi.string().allow('').optional(),
  OBJECT_STORAGE_ACCESS_KEY: Joi.string().allow('').optional(),
  OBJECT_STORAGE_SECRET_KEY: Joi.string().allow('').optional(),
});
