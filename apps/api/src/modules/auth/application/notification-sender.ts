export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');

export type NotificationChannel = 'email' | 'sms' | 'push';

export type NotificationTemplate =
  | 'activation'
  | 'password_reset'
  | 'campaign_started'
  | 'action_reminder'
  | 'milestone_achieved';

export interface NotificationMessage {
  channel: NotificationChannel;
  to: string;
  template: NotificationTemplate;
  token?: string;
  locale?: string;
  subject?: string;
  body?: string;
  payload?: Record<string, string>;
}

export interface NotificationSender {
  send(message: NotificationMessage): Promise<void>;
}

export function channelForIdentityType(type: string): NotificationChannel {
  return type === 'mobile' ? 'sms' : 'email';
}
