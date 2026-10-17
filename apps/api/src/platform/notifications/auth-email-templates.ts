import { resolveLocale, type SupportedLocale } from '../../modules/localization/application/locale-catalog.js';
import {
  buildActivationLink,
  buildPasswordResetLink,
} from './public-web-links.js';

export type AuthEmailTemplate = 'activation' | 'password_reset';

export interface RenderedAuthEmail {
  locale: SupportedLocale;
  subject: string;
  text: string;
  html: string;
  link: string;
}

const COPY: Record<
  SupportedLocale,
  Record<
    AuthEmailTemplate,
    {
      subject: string;
      greeting: string;
      instruction: string;
      cta: string;
      ignore: string;
    }
  >
> = {
  en: {
    activation: {
      subject: 'Activate your Community Campaign account',
      greeting: 'Welcome to Community Campaign.',
      instruction:
        'Use the link below to set your password and activate your account.',
      cta: 'Activate account',
      ignore: 'If you did not expect this email, you can ignore it.',
    },
    password_reset: {
      subject: 'Reset your Community Campaign password',
      greeting: 'Password reset requested.',
      instruction: 'Use the link below to choose a new password.',
      cta: 'Reset password',
      ignore:
        'If you did not request a password reset, you can ignore this email.',
    },
  },
  'zh-Hans': {
    activation: {
      subject: '激活你的社区活动账户',
      greeting: '欢迎使用社区活动平台。',
      instruction: '请点击下方链接设置密码并激活账户。',
      cta: '激活账户',
      ignore: '如果你未请求此邮件，可以忽略。',
    },
    password_reset: {
      subject: '重置你的社区活动密码',
      greeting: '已收到密码重置请求。',
      instruction: '请点击下方链接设置新密码。',
      cta: '重置密码',
      ignore: '如果你未请求重置密码，可以忽略此邮件。',
    },
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderAuthEmail(options: {
  template: AuthEmailTemplate;
  token: string;
  publicWebBaseUrl: string;
  locale?: string | null;
}): RenderedAuthEmail {
  const locale = resolveLocale(options.locale);
  const copy = COPY[locale][options.template];
  const link =
    options.template === 'activation'
      ? buildActivationLink(options.publicWebBaseUrl, options.token)
      : buildPasswordResetLink(options.publicWebBaseUrl, options.token);
  const safeLink = escapeHtml(link);

  const text = [
    copy.greeting,
    '',
    copy.instruction,
    '',
    link,
    '',
    copy.ignore,
  ].join('\n');

  const html = [
    `<p>${escapeHtml(copy.greeting)}</p>`,
    `<p>${escapeHtml(copy.instruction)}</p>`,
    `<p><a href="${safeLink}">${escapeHtml(copy.cta)}</a></p>`,
    `<p>${escapeHtml(copy.ignore)}</p>`,
  ].join('\n');

  return {
    locale,
    subject: copy.subject,
    text,
    html,
    link,
  };
}
