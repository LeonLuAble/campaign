import { createHash, randomBytes } from 'node:crypto';

export function generateOneTimeToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashOneTimeToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
