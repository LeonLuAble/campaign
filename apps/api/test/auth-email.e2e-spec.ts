import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import {
  EMAIL_TRANSPORT,
  type EmailTransport,
} from '../src/platform/notifications/outbound-transports.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';

describe('Auth email delivery (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let notifications: DevNotificationSender;
  let emailTransport: { send: ReturnType<typeof vi.fn> };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    emailTransport = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_TRANSPORT)
      .useValue(emailTransport as EmailTransport)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await ensureIdentitySchema(dataSource);
    notifications = app.get(DevNotificationSender);
  });

  afterAll(async () => {
    await clearIdentityData(dataSource);
    await app.close();
  });

  beforeEach(async () => {
    await clearIdentityData(dataSource);
    notifications.clear();
    emailTransport.send.mockClear();
    emailTransport.send.mockResolvedValue(undefined);
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

  it('sends an activation email with the public activate link and never logs the token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        identifier: 'mail.user@example.com',
        password: 'password123',
      });
    expect(response.status).toBe(201);

    const token = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1)?.token;
    expect(token).toEqual(expect.any(String));

    expect(emailTransport.send).toHaveBeenCalledTimes(1);
    const outbound = emailTransport.send.mock.calls[0]?.[0] as {
      subject?: string;
      body?: string;
      html?: string;
      token?: string;
      template?: string;
    };
    expect(outbound.template).toBe('activation');
    expect(outbound.token).toBeUndefined();
    expect(outbound.subject).toContain('Activate');
    expect(outbound.body).toContain(
      `http://localhost:8080/activate?token=${encodeURIComponent(token!)}`,
    );
    expect(outbound.html).toContain(
      `http://localhost:8080/activate?token=${encodeURIComponent(token!)}`,
    );

    const logged = `${JSON.stringify(logSpy.mock.calls)}${JSON.stringify(errorSpy.mock.calls)}${JSON.stringify(response.body)}`;
    expect(logged).not.toContain(token);
  });

  it('keeps the activation token resendable when SMTP delivery fails', async () => {
    emailTransport.send.mockRejectedValueOnce(new Error('smtp unavailable'));

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        identifier: 'retry.user@example.com',
        password: 'password123',
      });
    expect(response.status).toBe(201);

    const firstToken = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1)?.token;
    expect(firstToken).toEqual(expect.any(String));

    notifications.clear();
    emailTransport.send.mockResolvedValue(undefined);

    const resend = await request(app.getHttpServer())
      .post('/api/v1/auth/activate/resend')
      .send({ identifier: 'retry.user@example.com' });
    expect(resend.status).toBe(202);

    const resent = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1)?.token;
    expect(resent).toEqual(expect.any(String));
    expect(emailTransport.send).toHaveBeenCalled();
  });
});
