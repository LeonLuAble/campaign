import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationMessage,
  NotificationSender,
} from '../application/notification-sender.js';

@Injectable()
export class DevNotificationSender implements NotificationSender {
  private readonly logger = new Logger(DevNotificationSender.name);
  private readonly messages: NotificationMessage[] = [];

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
}
