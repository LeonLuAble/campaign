function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function buildActivationLink(baseUrl: string, token: string): string {
  const base = normalizeBaseUrl(baseUrl);
  return `${base}/activate?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetLink(baseUrl: string, token: string): string {
  const base = normalizeBaseUrl(baseUrl);
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
