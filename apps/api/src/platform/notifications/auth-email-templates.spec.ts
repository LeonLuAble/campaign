import { describe, expect, it } from 'vitest';
import { renderAuthEmail } from './auth-email-templates.js';

describe('auth email templates', () => {
  const baseUrl = 'https://admin.example.org';

  it('renders English activation mail with a working link', () => {
    const rendered = renderAuthEmail({
      template: 'activation',
      token: 'act-token',
      publicWebBaseUrl: baseUrl,
      locale: 'en',
    });

    expect(rendered.locale).toBe('en');
    expect(rendered.subject).toContain('Activate');
    expect(rendered.link).toBe(
      'https://admin.example.org/activate?token=act-token',
    );
    expect(rendered.text).toContain(rendered.link);
    expect(rendered.html).toContain(
      'href="https://admin.example.org/activate?token=act-token"',
    );
    expect(rendered.html).toContain('Activate account');
  });

  it('renders Simplified Chinese password-reset mail', () => {
    const rendered = renderAuthEmail({
      template: 'password_reset',
      token: 'reset-token',
      publicWebBaseUrl: baseUrl,
      locale: 'zh-Hans',
    });

    expect(rendered.locale).toBe('zh-Hans');
    expect(rendered.subject).toContain('重置');
    expect(rendered.link).toBe(
      'https://admin.example.org/reset-password?token=reset-token',
    );
    expect(rendered.text).toContain(rendered.link);
    expect(rendered.html).toContain('重置密码');
  });

  it('falls back to English for unknown locales', () => {
    const rendered = renderAuthEmail({
      template: 'activation',
      token: 'x',
      publicWebBaseUrl: baseUrl,
      locale: 'fr',
    });
    expect(rendered.locale).toBe('en');
  });
});
