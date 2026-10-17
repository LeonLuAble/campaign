import { describe, expect, it } from 'vitest';
import {
  buildActivationLink,
  buildPasswordResetLink,
} from './public-web-links.js';

describe('public web links', () => {
  it('builds activation and reset links with encoded tokens', () => {
    expect(
      buildActivationLink('https://admin.example.org/', 'tok/en+1'),
    ).toBe('https://admin.example.org/activate?token=tok%2Fen%2B1');
    expect(
      buildPasswordResetLink('https://admin.example.org', 'reset token'),
    ).toBe('https://admin.example.org/reset-password?token=reset%20token');
  });
});
