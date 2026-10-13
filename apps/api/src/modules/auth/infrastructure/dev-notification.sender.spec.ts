import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevNotificationSender } from './dev-notification.sender.js';

describe('DevNotificationSender', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
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
    expect(Logger.prototype.log).toHaveBeenCalledWith(
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
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('password_reset'),
    );
    expect(Logger.prototype.log).not.toHaveBeenCalledWith(
      expect.stringContaining('secret-token'),
    );
  });
});
