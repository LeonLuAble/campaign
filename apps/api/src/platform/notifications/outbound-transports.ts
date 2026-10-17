import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { NotificationMessage } from '../../modules/auth/application/notification-sender.js';

export const EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT');
export const SMS_TRANSPORT = Symbol('SMS_TRANSPORT');
export const PUSH_TRANSPORT = Symbol('PUSH_TRANSPORT');

export interface EmailTransport {
  send(message: NotificationMessage): Promise<void>;
}

export interface SmsTransport {
  send(message: NotificationMessage): Promise<void>;
}

export interface PushTransport {
  send(message: NotificationMessage): Promise<void>;
}

@Injectable()
export class DevEmailTransport implements EmailTransport {
  private readonly logger = new Logger(DevEmailTransport.name);

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log({
      msg: 'email_transport_sent',
      provider: 'dev',
      template: message.template,
      to: message.to,
      locale: message.locale ?? null,
      hasSubject: Boolean(message.subject),
    });
  }
}

@Injectable()
export class SmtpEmailTransport implements EmailTransport {
  private readonly logger = new Logger(SmtpEmailTransport.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async send(message: NotificationMessage): Promise<void> {
    const host = this.config.get<string>('notifications.smtpHost');
    const from = this.config.get<string>('notifications.mailFrom');
    if (!host || !from) {
      this.logger.error({
        msg: 'email_transport_misconfigured',
        provider: 'smtp',
        template: message.template,
        hasHost: Boolean(host),
        hasFrom: Boolean(from),
      });
      throw new Error('SMTP is not configured');
    }

    const subject = message.subject?.trim();
    const text = message.body?.trim();
    if (!subject || !text) {
      this.logger.error({
        msg: 'email_transport_missing_content',
        provider: 'smtp',
        template: message.template,
      });
      throw new Error('Email subject and body are required');
    }

    await this.getTransporter().sendMail({
      from,
      to: message.to,
      subject,
      text,
      html: message.html,
    });

    this.logger.log({
      msg: 'email_transport_sent',
      provider: 'smtp',
      smtpHost: host,
      template: message.template,
      to: message.to,
      locale: message.locale ?? null,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('notifications.smtpHost');
    const port = this.config.get<number>('notifications.smtpPort') ?? 587;
    const secure =
      this.config.get<boolean>('notifications.smtpSecure') === true;
    const user = this.config.get<string>('notifications.smtpUser');
    const pass = this.config.get<string>('notifications.smtpPassword');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: pass ?? '' } : undefined,
    });
    return this.transporter;
  }
}

@Injectable()
export class DevSmsTransport implements SmsTransport {
  private readonly logger = new Logger(DevSmsTransport.name);

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log({
      msg: 'sms_transport_sent',
      provider: 'dev',
      template: message.template,
      to: message.to,
      locale: message.locale ?? null,
    });
  }
}

@Injectable()
export class NoopSmsTransport implements SmsTransport {
  private readonly logger = new Logger(NoopSmsTransport.name);

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log({
      msg: 'sms_transport_skipped',
      provider: 'noop',
      template: message.template,
      locale: message.locale ?? null,
    });
  }
}

@Injectable()
export class DevPushTransport implements PushTransport {
  private readonly logger = new Logger(DevPushTransport.name);

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log({
      msg: 'push_transport_sent',
      provider: 'dev',
      template: message.template,
      to: message.to,
      locale: message.locale ?? null,
    });
  }
}

@Injectable()
export class NoopPushTransport implements PushTransport {
  private readonly logger = new Logger(NoopPushTransport.name);

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log({
      msg: 'push_transport_skipped',
      provider: 'noop',
      template: message.template,
      locale: message.locale ?? null,
    });
  }
}
