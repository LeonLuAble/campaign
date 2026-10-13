import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { ReminderScheduler } from '../src/modules/notifications/application/reminder-scheduler.js';
import { csvContainsContactPii } from '../src/modules/reports/application/report-csv.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('MVP 速素数数 journey (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let notifications: DevNotificationSender;
  let reminders: ReminderScheduler;

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
    reminders = app.get(ReminderScheduler);
  });

  afterAll(async () => {
    await clearIdentityData(dataSource);
    await app.close();
  });

  beforeEach(async () => {
    await clearIdentityData(dataSource);
    notifications.clear();
  });

  it('covers tenant seed, import, campaign, meals, progress, reminder, report, and isolation', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform.admin@example.test',
    );
    await promotePlatformAdmin(dataSource, platform.userId);

    const tenant = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({ name: 'Tzu Chi Malaysia' });
    expect(tenant.status).toBe(201);
    const customerId = tenant.body.id as string;

    const malaysia = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(platform.accessToken))
      .send({ customerId, name: 'Malaysia' });
    expect(malaysia.status).toBe(201);
    const kl = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(platform.accessToken))
      .send({
        customerId,
        parentId: malaysia.body.id,
        name: 'Kuala Lumpur',
      });
    expect(kl.status).toBe(201);

    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId, communityId: kl.body.id })
      .set(auth(platform.accessToken))
      .attach(
        'file',
          Buffer.from(
            'Email Address,Phone,Staff ID,Given Name\n' +
              'alex.member@example.test,0123456701,DEMO-001,Alex\n' +
              'mei.member@example.test,0123456702,DEMO-002,Mei\n',
          ),
          'members.csv',
        );
      expect(uploaded.status).toBe(201);
      expect(uploaded.body.status).toBe('uploaded');

      const mapped = await request(app.getHttpServer())
        .patch(`/api/v1/user-imports/${uploaded.body.id}/mapping`)
        .query({ customerId })
        .set(auth(platform.accessToken))
        .send({
          mapping: {
            email: 'Email Address',
            mobile: 'Phone',
            externalId: 'Staff ID',
            firstName: 'Given Name',
          },
        });
    expect(mapped.status).toBe(200);

    const validated = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${uploaded.body.id}/validate`)
      .query({ customerId })
      .set(auth(platform.accessToken));
    expect(validated.status).toBe(200);

    const preview = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${uploaded.body.id}/preview`)
      .query({ customerId })
      .set(auth(platform.accessToken));
    expect(preview.status).toBe(200);
    expect(preview.body.rows).toHaveLength(2);

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${uploaded.body.id}/confirm`)
      .query({ customerId })
      .set(auth(platform.accessToken));
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.counts.created).toBe(2);

    const invitation = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .find((message) => message.to === 'alex.member@example.test');
    expect(invitation?.token).toBeTruthy();

    const activated = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: invitation?.token, password: 'ImportedPass1' });
    expect(activated.status).toBe(204);

    const memberLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'alex.member@example.test',
        password: 'ImportedPass1',
      });
    expect(memberLogin.status).toBe(200);
    const memberToken = memberLogin.body.accessToken as string;
    const memberProfile = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(auth(memberToken));
    const memberUserId = memberProfile.body.id as string;

    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(platform.accessToken))
      .send({
        customerId,
        name: 'Environmental Action',
        key: 'environmental_action',
      });
    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(platform.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        name: 'Vegetarian',
        key: 'vegetarian',
      });
    const campaign = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(platform.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: '速素数数',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: [kl.body.id],
        configuration: {
          rulesStrategy: 'vegetarian',
          submissionReview: 'auto',
        },
      });
    expect(campaign.status).toBe(201);
    const campaignId = campaign.body.id as string;

    const mealDefinition = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/action-definitions`)
      .set(auth(platform.accessToken))
      .send({
        key: 'vegetarian_meal',
        name: 'Vegetarian meal',
        unit: 'meals',
      });
    expect(mealDefinition.status).toBe(201);

    await request(app.getHttpServer())
      .put(`/api/v1/campaigns/${campaignId}/visualization`)
      .set(auth(platform.accessToken))
      .send({ type: 'tree', settings: { displayName: '素心树' } });

    const published = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/publish`)
      .set(auth(platform.accessToken));
    expect(published.status).toBe(200);
    const started = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/start`)
      .set(auth(platform.accessToken));
    expect(started.status).toBe(200);

    const joined = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/participations`)
      .set(auth(memberToken))
      .send({});
    expect(joined.status).toBe(201);
    const participationId = joined.body.id as string;

    const pledged = await request(app.getHttpServer())
      .post(`/api/v1/participations/${participationId}/commitments`)
      .set(auth(memberToken))
      .send({ typeKey: '随缘素', targetValue: 9, unit: 'meals' });
    expect(pledged.status).toBe(201);
    expect(pledged.body.typeKey).toBe('sui_yuan_su');

    const firstMeals = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(memberToken))
      .send({
        participationId,
        actionDefinitionId: mealDefinition.body.id,
        occurredOn: '2026-10-11',
        quantity: 3,
      });
    expect(firstMeals.status).toBe(201);
    expect(firstMeals.body.submission.status).toBe('approved');
    expect(firstMeals.body.submission.reviewedByUserId).toBeNull();

    const secondMeals = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(memberToken))
      .send({
        participationId,
        actionDefinitionId: mealDefinition.body.id,
        occurredOn: '2026-10-12',
        quantity: 2,
      });
    expect(secondMeals.status).toBe(201);
    expect(secondMeals.body.submission.status).toBe('approved');

    const beforeReject = await request(app.getHttpServer())
      .get(`/api/v1/participations/${participationId}/progress`)
      .set(auth(memberToken));
    expect(beforeReject.body).toMatchObject({
      achievedValue: 5,
      targetValue: 9,
      completionPercent: 55.56,
      completionStatus: 'in_progress',
    });

    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/submissions/${secondMeals.body.submission.id}/reject`)
      .set(auth(platform.accessToken))
      .send({ note: 'not credible' });
    expect(rejected.status).toBe(200);

    const afterReject = await request(app.getHttpServer())
      .get(`/api/v1/participations/${participationId}/progress`)
      .set(auth(memberToken));
    expect(afterReject.body.achievedValue).toBe(3);
    expect(afterReject.body.completionPercent).toBe(33.33);

    const measurement = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/measurement-definitions`)
      .set(auth(platform.accessToken))
      .send({ name: 'Vegetarian meals', sourceUnit: 'meals' });
    expect(measurement.status).toBe(201);

    const factor = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/impact-factors`)
      .set(auth(platform.accessToken))
      .send({
        sourceUnit: 'meals',
        outcomeMetric: 'co2_kg',
        outcomeUnit: 'kg',
        factorValue: 2,
        source: 'Journey-test citation, not a platform default',
        effectiveFrom: '2026-01-01',
      });
    expect(factor.status).toBe(201);

    const outcomes = await request(app.getHttpServer())
      .get(`/api/v1/participations/${participationId}/outcomes`)
      .set(auth(memberToken));
    expect(outcomes.body.outcomes[0]).toMatchObject({
      outcomeMetric: 'co2_kg',
      value: 6,
      sourceQuantity: 3,
    });

    const milestone = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/milestones`)
      .set(auth(platform.accessToken))
      .send({
        name: 'First three meals',
        metric: 'achieved_value',
        thresholdValue: 3,
        unit: 'meals',
      });
    expect(milestone.status).toBe(201);
    const evaluated = await request(app.getHttpServer())
      .post(`/api/v1/milestones/${milestone.body.id}/evaluate`)
      .set(auth(platform.accessToken));
    expect(evaluated.status).toBe(200);
    expect(evaluated.body.crossed).toBe(true);

    const dashboard = await request(app.getHttpServer())
      .get(`/api/v1/participations/${participationId}/dashboard`)
      .set(auth(memberToken));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.progress.achievedValue).toBe(3);
    expect(dashboard.body.outcomes[0].value).toBe(6);
    expect(dashboard.body.visualization.displayName).toBe('素心树');

    const campaignDashboard = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/dashboard`)
      .set(auth(memberToken));
    expect(campaignDashboard.status).toBe(200);
    expect(JSON.stringify(campaignDashboard.body)).not.toContain(memberUserId);
    expect(JSON.stringify(campaignDashboard.body)).not.toContain(
      participationId,
    );

    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(auth(memberToken))
      .send({ timezone: 'Asia/Kuala_Lumpur' });
    await request(app.getHttpServer())
      .put('/api/v1/me/notification-preferences')
      .set(auth(memberToken))
      .send({ reminderLocalTime: '00:00' });
    const reminderNow = new Date('2026-10-13T12:00:00+08:00');
    const sent = await reminders.processDueReminders(reminderNow);
    expect(sent).toBeGreaterThanOrEqual(1);
    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .query({ customerId })
      .set(auth(memberToken));
    expect(
      inbox.body.some(
        (row: { type: string }) => row.type === 'action_reminder',
      ),
    ).toBe(true);

    const report = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/report`)
      .set(auth(platform.accessToken));
    expect(report.status).toBe(200);
    expect(JSON.stringify(report.body)).not.toContain(
      'alex.member@example.test',
    );
    expect(JSON.stringify(report.body)).not.toContain(memberUserId);

    const exported = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/report/export`)
      .set(auth(platform.accessToken));
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toMatch(/text\/csv/);
    expect(exported.text).not.toContain('alex.member@example.test');
    expect(exported.text).not.toContain(memberUserId);
    expect(csvContainsContactPii(exported.text)).toBe(false);

    const otherAdmin = await registerActivatedUser(
      app,
      notifications,
      'other.admin@example.test',
    );
    const otherTenant = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Other Org',
        initialAdminUserId: otherAdmin.userId,
      });
    expect(otherTenant.status).toBe(201);

    const isolatedCampaign = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}`)
      .set(auth(otherAdmin.accessToken));
    expect(isolatedCampaign.status).toBe(404);

    const isolatedProgress = await request(app.getHttpServer())
      .get(`/api/v1/participations/${participationId}/progress`)
      .set(auth(otherAdmin.accessToken));
    expect(isolatedProgress.status).toBe(404);

    const isolatedReport = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/report/export`)
      .set(auth(otherAdmin.accessToken));
    expect(isolatedReport.status).toBe(404);

    const isolatedImport = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${uploaded.body.id}`)
      .query({ customerId: otherTenant.body.id })
      .set(auth(otherAdmin.accessToken));
    expect(isolatedImport.status).toBe(404);

    const listedCustomers = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(otherAdmin.accessToken));
    expect(listedCustomers.body.map((row: { id: string }) => row.id)).toEqual([
      otherTenant.body.id,
    ]);
  }, 90_000);
});
