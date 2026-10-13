process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://campaign:campaign@localhost:5432/campaign';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-min-32-characters-xx';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-min-32-characters-x';
process.env.JWT_ACCESS_TTL_SECONDS ??= '900';
process.env.JWT_REFRESH_TTL_SECONDS ??= '604800';
process.env.JWT_ISSUER ??= 'campaign-api';
process.env.JWT_AUDIENCE ??= 'campaign-clients';
process.env.ACTIVATION_TOKEN_TTL_SECONDS ??= '86400';
process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS ??= '3600';
process.env.PASSWORD_MIN_LENGTH ??= '8';
process.env.GOOGLE_CLIENT_ID ??= '';
process.env.APPLE_CLIENT_ID ??= '';
