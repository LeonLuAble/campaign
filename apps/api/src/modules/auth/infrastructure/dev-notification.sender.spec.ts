import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevNotificationSender } from './dev-notification.sender.js';

describe('DevNotificationSender', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('captures the message for tests and logs the token outside production', async () => {
    const sender = new DevNotificationSender({
      get: () => 'test',
    } as unknown as ConfigService);

    await sender.send({
      channel: 'email',
      to: 'test@example.com',
      template: 'activation',
      token: 'secret-token',
    });

    expect(sender.last()?.token).toBe('secret-token');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('secret-token'),
    );
  });

  it('does not write the raw token when NODE_ENV is production', async () => {
    const sender = new DevNotificationSender({
      get: () => 'production',
    } as unknown as ConfigService);

    await sender.send({
      channel: 'sms',
      to: '+60123456789',
      template: 'password_reset',
      token: 'secret-token',
    });

    expect(sender.last()?.token).toBe('secret-token');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'notification_sent',
        template: 'password_reset',
        channel: 'sms',
      }),
    );
    const logged = JSON.stringify(logSpy.mock.calls[0]?.[0] ?? {});
    expect(logged).not.toContain('secret-token');
  });
});
