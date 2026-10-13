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
  JWT_ACCESS_SECRET: Joi.string().allow('').optional(),
  JWT_REFRESH_SECRET: Joi.string().allow('').optional(),
  OBJECT_STORAGE_ENDPOINT: Joi.string().uri().allow('').optional(),
  OBJECT_STORAGE_BUCKET: Joi.string().allow('').optional(),
  OBJECT_STORAGE_ACCESS_KEY: Joi.string().allow('').optional(),
  OBJECT_STORAGE_SECRET_KEY: Joi.string().allow('').optional(),
});
