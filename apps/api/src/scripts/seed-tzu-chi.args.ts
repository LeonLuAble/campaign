export const TZU_CHI_CUSTOMER_NAME = 'Tzu Chi Malaysia';
export const TZU_CHI_CUSTOMER_SLUG = 'tzu-chi-malaysia';

export function readSeedAdminEmail(
  argv: string[],
  env: NodeJS.ProcessEnv,
): string | null {
  const flagIndex = argv.indexOf('--email');
  const flagValue = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;
  const inline = argv
    .find((argument) => argument.startsWith('--email='))
    ?.slice('--email='.length);
  const email = (inline || flagValue || env.SEED_ADMIN_EMAIL || '').trim();
  if (!email || email.startsWith('--')) {
    return null;
  }
  return email;
}
