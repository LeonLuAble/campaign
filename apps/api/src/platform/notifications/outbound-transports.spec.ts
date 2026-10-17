import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport,
  },
}));

describe('SmtpEmailTransport', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    sendMail.mockResolvedValue({ messageId: '1' });
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
    vi.resetModules();
  });

  it('sends mail through nodemailer without logging tokens', async () => {
    const { SmtpEmailTransport } = await import('./outbound-transports.js');
    const config = {
      get: (key: string) => {
        const values: Record<string, unknown> = {
          'notifications.smtpHost': 'localhost',
          'notifications.smtpPort': 1025,
          'notifications.smtpSecure': false,
          'notifications.smtpUser': '',
          'notifications.smtpPassword': '',
          'notifications.mailFrom': 'noreply@localhost',
        };
        return values[key];
      },
    } as ConfigService;

    const transport = new SmtpEmailTransport(config);
    await transport.send({
      channel: 'email',
      to: 'member@example.com',
      template: 'activation',
      subject: 'Activate',
      body: 'https://admin.example.org/activate?token=secret-token',
      html: '<p><a href="https://admin.example.org/activate?token=secret-token">Activate</a></p>',
      locale: 'en',
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 1025,
        secure: false,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@localhost',
        to: 'member@example.com',
        subject: 'Activate',
      }),
    );

    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain('secret-token');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'email_transport_sent',
        provider: 'smtp',
        template: 'activation',
      }),
    );
  });
});
