process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://campaign:campaign@localhost:5432/campaign';
process.env.REDIS_URL ??= 'redis://localhost:6379';
