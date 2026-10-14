import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison for equal-length UTF-8 strings.
 * Returns false when lengths differ (timingSafeEqual requires equal length).
 */
export function timingSafeEqualString(
  expected: string,
  provided: string,
): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function isSetupKeyConfigured(setupKey: string | undefined): boolean {
  return typeof setupKey === 'string' && setupKey.length >= 32;
}
