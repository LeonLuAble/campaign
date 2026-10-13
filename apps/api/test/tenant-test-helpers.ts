import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';

export async function registerActivatedUser(
  app: INestApplication,
  notifications: DevNotificationSender,
  identifier: string,
  password = 'password123',
): Promise<{ userId: string; accessToken: string }> {
  const registerResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ identifier, password });

  const token = notifications
    .drain()
    .filter((message) => message.template === 'activation')
    .at(-1)?.token;

  await request(app.getHttpServer())
    .post('/api/v1/auth/activate')
    .send({ token });

  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ identifier, password });

  return {
    userId: registerResponse.body.id as string,
    accessToken: loginResponse.body.accessToken as string,
  };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
