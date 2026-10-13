import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationMessage,
  NotificationSender,
} from '../application/notification-sender.js';

@Injectable()
export class DevNotificationSender implements NotificationSender {
  private readonly logger = new Logger(DevNotificationSender.name);
  private readonly messages: NotificationMessage[] = [];

  constructor(private readonly configService: ConfigService) {}

  async send(message: NotificationMessage): Promise<void> {
    this.messages.push({ ...message });

    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ??
      this.configService.get<string>('nodeEnv');

    if (nodeEnv === 'production' || !message.token) {
      this.logger.log({
        msg: 'notification_sent',
        provider: 'dev',
        template: message.template,
        channel: message.channel,
        to: message.to,
        locale: message.locale ?? null,
      });
      return;
    }

    this.logger.log(
      `Sent ${message.template} ${message.channel} notification to ${message.to} token=${message.token}`,
    );
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
