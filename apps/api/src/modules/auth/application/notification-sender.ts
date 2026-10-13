export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');

export type NotificationChannel = 'email' | 'sms';

export type NotificationTemplate = 'activation' | 'password_reset';

export interface NotificationMessage {
  channel: NotificationChannel;
  to: string;
  template: NotificationTemplate;
  token: string;
}

export interface NotificationSender {
  send(message: NotificationMessage): Promise<void>;
}

export function channelForIdentityType(type: string): NotificationChannel {
  return type === 'mobile' ? 'sms' : 'email';
}
