export function assertDemoSeedAllowed(nodeEnv: string | undefined): void {
  const env = nodeEnv ?? 'development';
  if (env === 'production') {
    throw new Error(
      'Demo seed is disabled when NODE_ENV=production. Use a development or test environment.',
    );
  }
}
