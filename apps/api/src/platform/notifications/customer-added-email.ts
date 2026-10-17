import {
  resolveLocale,
  type SupportedLocale,
} from '../../modules/localization/application/locale-catalog.js';

export interface RenderedCustomerAddedEmail {
  locale: SupportedLocale;
  subject: string;
  text: string;
  html: string;
}

const COPY: Record<
  SupportedLocale,
  {
    subject: (customerName: string) => string;
    greeting: string;
    body: (customerName: string) => string;
  }
> = {
  en: {
    subject: (customerName) => `You were added to ${customerName}`,
    greeting: 'Hello,',
    body: (customerName) =>
      `You have been added as an administrator for ${customerName} on Community Campaign. Sign in with your existing account to get started.`,
  },
  'zh-Hans': {
    subject: (customerName) => `你已被加入 ${customerName}`,
    greeting: '你好，',
    body: (customerName) =>
      `你已被添加为 Community Campaign 上 ${customerName} 的管理员。请使用现有账户登录开始使用。`,
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

export function renderCustomerAddedEmail(options: {
  customerName: string;
  locale?: string | null;
}): RenderedCustomerAddedEmail {
  const locale = resolveLocale(options.locale);
  const copy = COPY[locale];
  const text = [
    copy.greeting,
    '',
    copy.body(options.customerName),
  ].join('\n');
  const html = [
    `<p>${escapeHtml(copy.greeting)}</p>`,
    `<p>${escapeHtml(copy.body(options.customerName))}</p>`,
  ].join('\n');

  return {
    locale,
    subject: copy.subject(options.customerName),
    text,
    html,
  };
}
