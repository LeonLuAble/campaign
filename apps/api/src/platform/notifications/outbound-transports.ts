import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    });
  }
}

@Injectable()
export class SmtpEmailTransport implements EmailTransport {
  private readonly logger = new Logger(SmtpEmailTransport.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: NotificationMessage): Promise<void> {
    const host = this.config.get<string>('notifications.smtpHost');
    const from = this.config.get<string>('notifications.smtpFrom');
    this.logger.log({
      msg: 'email_transport_sent',
      provider: 'smtp',
      smtpHost: host ?? null,
      smtpFrom: from ?? null,
      template: message.template,
      to: message.to,
      locale: message.locale ?? null,
    });
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
