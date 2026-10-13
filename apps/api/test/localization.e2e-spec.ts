import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import { auth, registerActivatedUser } from './tenant-test-helpers.js';

describe('Localization (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let notifications: DevNotificationSender;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
  });

  it('lists MVP locales and notification templates', async () => {
    const user = await registerActivatedUser(
      app,
      notifications,
      'locale@example.com',
    );
    const locales = await request(app.getHttpServer())
      .get('/api/v1/locales')
      .set(auth(user.accessToken));
    expect(locales.status).toBe(200);
    expect(locales.body).toEqual([
      { code: 'en', name: 'English' },
      { code: 'zh-Hans', name: '简体中文' },
    ]);

    const translations = await request(app.getHttpServer())
      .get('/api/v1/translations')
      .query({ locale: 'zh-Hans', namespace: 'notifications' })
      .set(auth(user.accessToken));
    expect(translations.status).toBe(200);
    expect(
      translations.body.some(
        (row: { key: string }) => row.key === 'campaign_started.title',
      ),
    ).toBe(true);

    const rejected = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(auth(user.accessToken))
      .send({ locale: 'ms' });
    expect(rejected.status).toBe(400);
  });
});
