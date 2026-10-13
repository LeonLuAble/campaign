import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  DevEmailTransport,
  DevPushTransport,
  DevSmsTransport,
  EMAIL_TRANSPORT,
  NoopPushTransport,
  NoopSmsTransport,
  PUSH_TRANSPORT,
  SMS_TRANSPORT,
  SmtpEmailTransport,
  type EmailTransport,
  type PushTransport,
  type SmsTransport,
} from './outbound-transports.js';

@Module({
  imports: [ConfigModule],
  providers: [
    DevEmailTransport,
    SmtpEmailTransport,
    DevSmsTransport,
    NoopSmsTransport,
    DevPushTransport,
    NoopPushTransport,
    {
      provide: EMAIL_TRANSPORT,
      inject: [ConfigService, DevEmailTransport, SmtpEmailTransport],
      useFactory: (
        config: ConfigService,
        dev: DevEmailTransport,
        smtp: SmtpEmailTransport,
      ): EmailTransport => {
        return config.get('notifications.emailProvider') === 'smtp'
          ? smtp
          : dev;
      },
    },
    {
      provide: SMS_TRANSPORT,
      inject: [ConfigService, DevSmsTransport, NoopSmsTransport],
      useFactory: (
        config: ConfigService,
        dev: DevSmsTransport,
        noop: NoopSmsTransport,
      ): SmsTransport => {
        return config.get('notifications.smsProvider') === 'noop' ? noop : dev;
      },
    },
    {
      provide: PUSH_TRANSPORT,
      inject: [ConfigService, DevPushTransport, NoopPushTransport],
      useFactory: (
        config: ConfigService,
        dev: DevPushTransport,
        noop: NoopPushTransport,
      ): PushTransport => {
        return config.get('notifications.pushProvider') === 'noop' ? noop : dev;
      },
    },
  ],
  exports: [EMAIL_TRANSPORT, SMS_TRANSPORT, PUSH_TRANSPORT],
})
export class OutboundNotificationsModule {}
