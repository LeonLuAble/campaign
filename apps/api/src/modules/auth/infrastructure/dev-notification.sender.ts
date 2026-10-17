import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMAIL_TRANSPORT,
  type EmailTransport,
} from '../../../platform/notifications/outbound-transports.js';
import { renderAuthEmail } from '../../../platform/notifications/auth-email-templates.js';
import type {
  NotificationMessage,
  NotificationSender,
} from '../application/notification-sender.js';

@Injectable()
export class DevNotificationSender implements NotificationSender {
  private readonly logger = new Logger(DevNotificationSender.name);
  private readonly messages: NotificationMessage[] = [];

  constructor(
    private readonly config: ConfigService,
    @Optional()
    @Inject(EMAIL_TRANSPORT)
    private readonly emailTransport?: EmailTransport,
  ) {}

  async send(message: NotificationMessage): Promise<void> {
    this.messages.push({ ...message });

    this.logger.log({
      msg: 'notification_sent',
      provider: 'dev',
      template: message.template,
      channel: message.channel,
      to: message.to,
      locale: message.locale ?? null,
      hasToken: Boolean(message.token),
    });

    if (
      message.channel === 'email' &&
      (message.template === 'activation' ||
        message.template === 'password_reset')
    ) {
      await this.deliverAuthEmail({
        ...message,
        template: message.template,
      });
    }
  }

  last(): NotificationMessage | undefined {
    return this.messages.at(-1);
  }

  drain(): NotificationMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages.length = 0;
  }

  private async deliverAuthEmail(
    message: NotificationMessage & {
      template: 'activation' | 'password_reset';
    },
  ): Promise<void> {
    if (!this.emailTransport) {
      return;
    }
    if (!message.token) {
      this.logger.error({
        msg: 'auth_email_missing_token',
        template: message.template,
      });
      return;
    }

    const publicWebBaseUrl = this.config.get<string>(
      'notifications.publicWebBaseUrl',
    );
    if (!publicWebBaseUrl) {
      this.logger.error({
        msg: 'public_web_base_url_missing',
        template: message.template,
      });
      return;
    }

    try {
      const rendered = renderAuthEmail({
        template: message.template,
        token: message.token,
        publicWebBaseUrl,
        locale: message.locale,
      });
      await this.emailTransport.send({
        channel: 'email',
        to: message.to,
        template: message.template,
        locale: rendered.locale,
        subject: rendered.subject,
        body: rendered.text,
        html: rendered.html,
      });
    } catch (error) {
      this.logger.error({
        msg: 'auth_email_delivery_failed',
        template: message.template,
        channel: message.channel,
        to: message.to,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
