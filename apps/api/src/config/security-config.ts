export const EXAMPLE_JWT_SECRETS = [
  'dev_access_secret_replace_in_production_min_32_chars',
  'dev_refresh_secret_replace_in_production_min_32_chars',
  'test-access-secret-min-32-characters-xx',
  'test-refresh-secret-min-32-characters-x',
] as const;

export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isAuthRateLimitEnabled(
  nodeEnv: string,
  flag: string | undefined,
): boolean {
  if (nodeEnv === 'test') {
    return flag === 'true';
  }
  return flag !== 'false';
}
