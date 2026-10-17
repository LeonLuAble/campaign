import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailTransport } from '../../../platform/notifications/outbound-transports.js';
import { DevNotificationSender } from './dev-notification.sender.js';

describe('DevNotificationSender', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('captures the message for tests and never logs the raw token', async () => {
    const emailTransport: EmailTransport = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: (key: string) =>
        key === 'notifications.publicWebBaseUrl'
          ? 'https://admin.example.org'
          : undefined,
    } as ConfigService;
    const sender = new DevNotificationSender(config, emailTransport);

    await sender.send({
      channel: 'email',
      to: 'test@example.com',
      template: 'activation',
      token: 'secret-token',
      locale: 'en',
    });

    expect(sender.last()?.token).toBe('secret-token');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'notification_sent',
        template: 'activation',
        channel: 'email',
        hasToken: true,
      }),
    );
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain('secret-token');
    expect(emailTransport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'activation',
        subject: expect.stringContaining('Activate'),
        body: expect.stringContaining(
          'https://admin.example.org/activate?token=secret-token',
        ),
      }),
    );
    expect(emailTransport.send).toHaveBeenCalledWith(
      expect.not.objectContaining({ token: expect.anything() }),
    );
  });

  it('logs delivery failures without the token and does not throw', async () => {
    const emailTransport: EmailTransport = {
      send: vi.fn().mockRejectedValue(new Error('smtp down')),
    };
    const config = {
      get: () => 'https://admin.example.org',
    } as unknown as ConfigService;
    const sender = new DevNotificationSender(config, emailTransport);

    await expect(
      sender.send({
        channel: 'email',
        to: 'test@example.com',
        template: 'password_reset',
        token: 'reset-secret',
      }),
    ).resolves.toBeUndefined();

    expect(sender.last()?.token).toBe('reset-secret');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'auth_email_delivery_failed',
        template: 'password_reset',
      }),
    );
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain('reset-secret');
  });
});
