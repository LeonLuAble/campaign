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

  it('captures the message for tests and never logs the raw token', async () => {
    const sender = new DevNotificationSender();

    await sender.send({
      channel: 'email',
      to: 'test@example.com',
      template: 'activation',
      token: 'secret-token',
    });

    expect(sender.last()?.token).toBe('secret-token');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'notification_sent',
        template: 'activation',
        channel: 'email',
        hasToken: true,
      }),
    );
    const logged = JSON.stringify(logSpy.mock.calls[0]?.[0] ?? {});
    expect(logged).not.toContain('secret-token');
  });
});
