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
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('Dated milestones and campaign periods (e2e)', () => {
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

  const http = () => request(app.getHttpServer());

  async function tenantWithDraftCampaign(suffix: string) {
    const admin = await registerActivatedUser(
      app,
      notifications,
      `admin-dated-${suffix}@example.com`,
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: `Dated Org ${suffix}` });
    const customerId = customer.body.id as string;
    const roles = await http()
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const memberRoleId = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    ).id as string;
    const member = await registerActivatedUser(
      app,
      notifications,
      `member-dated-${suffix}@example.com`,
    );
    const membership = await http()
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({ customerId, userId: member.userId });
    expect(membership.status).toBe(201);
    await http()
      .post(`/api/v1/memberships/${membership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: memberRoleId });

    const template = await http()
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({ customerId, name: 'Environmental Action' });
    const scope = await http()
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({ customerId, templateId: template.body.id, name: 'Vegetarian' });
    const campaign = await http()
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: 'Dated Campaign',
        timezone: 'UTC',
        startsOn: '2030-03-01',
        endsOn: '2030-03-31',
        configuration: { rulesStrategy: 'vegetarian' },
      });
    expect(campaign.status).toBe(201);
    const campaignId = campaign.body.id as string;
    await http()
      .post(`/api/v1/campaigns/${campaignId}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_day', name: 'Vegetarian day', unit: 'days' });
    return { admin, member, customerId, campaignId };
  }

  type Ctx = Awaited<ReturnType<typeof tenantWithDraftCampaign>>;

  function createMilestone(ctx: Ctx, body: Record<string, unknown>) {
    return http()
      .post(`/api/v1/campaigns/${ctx.campaignId}/milestones`)
      .set(auth(ctx.admin.accessToken))
      .send(body);
  }

  function patchMilestone(ctx: Ctx, id: string, body: Record<string, unknown>) {
    return http()
      .patch(`/api/v1/milestones/${id}`)
      .set(auth(ctx.admin.accessToken))
      .send(body);
  }

  async function publish(ctx: Ctx) {
    const published = await http()
      .post(`/api/v1/campaigns/${ctx.campaignId}/publish`)
      .set(auth(ctx.admin.accessToken));
    expect(published.status).toBe(200);
  }

  it('creates dated milestones in draft and splits the campaign into periods', async () => {
    const ctx = await tenantWithDraftCampaign('periods');

    const week = await createMilestone(ctx, {
      name: '第一周',
      dueOn: '2030-03-07',
      translations: { en: { name: 'Week one' } },
    });
    expect(week.status).toBe(201);
    expect(week.body).toMatchObject({
      dueOn: '2030-03-07',
      hasGoal: false,
      metric: null,
      thresholdValue: null,
      unit: null,
      translations: { en: { name: 'Week one', description: null } },
    });

    const halfway = await createMilestone(ctx, {
      name: '半程',
      dueOn: '2030-03-15',
      metric: 'completion_percent',
      thresholdValue: 50,
      unit: 'days',
    });
    expect(halfway.status).toBe(201);
    expect(halfway.body).toMatchObject({ hasGoal: true, dueOn: '2030-03-15' });

    const undated = await createMilestone(ctx, {
      name: 'Goal only',
      metric: 'achieved_value',
      thresholdValue: 10,
      unit: 'days',
    });
    expect(undated.status).toBe(201);
    expect(undated.body.dueOn).toBeNull();

    await publish(ctx);

    const periods = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/periods`)
      .set(auth(ctx.member.accessToken))
      .set('Accept-Language', 'en');
    expect(periods.status).toBe(200);
    expect(periods.body).toEqual([
      {
        key: '2030-03-07',
        index: 0,
        startsOn: '2030-03-01',
        endsOn: '2030-03-07',
        milestoneId: week.body.id,
        name: 'Week one',
        isFinal: false,
        dayCount: 7,
      },
      {
        key: '2030-03-15',
        index: 1,
        startsOn: '2030-03-08',
        endsOn: '2030-03-15',
        milestoneId: halfway.body.id,
        name: '半程',
        isFinal: false,
        dayCount: 8,
      },
      {
        key: '2030-03-31',
        index: 2,
        startsOn: '2030-03-16',
        endsOn: '2030-03-31',
        milestoneId: null,
        name: null,
        isFinal: true,
        dayCount: 16,
      },
    ]);

    const chinese = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/periods`)
      .set(auth(ctx.member.accessToken))
      .set('Accept-Language', 'zh-Hans');
    expect(chinese.body[0].name).toBe('第一周');

    const listed = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/milestones`)
      .set(auth(ctx.member.accessToken))
      .set('Accept-Language', 'en');
    expect(listed.status).toBe(200);
    expect(
      listed.body.find((m: { id: string }) => m.id === week.body.id).name,
    ).toBe('Week one');
  });

  it('returns one whole-campaign period when there are no dated milestones', async () => {
    const ctx = await tenantWithDraftCampaign('whole');
    const periods = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/periods`)
      .set(auth(ctx.admin.accessToken));
    expect(periods.status).toBe(200);
    expect(periods.body).toEqual([
      {
        key: '2030-03-31',
        index: 0,
        startsOn: '2030-03-01',
        endsOn: '2030-03-31',
        milestoneId: null,
        name: null,
        isFinal: true,
        dayCount: 31,
      },
    ]);
  });

  it('validates the due date window, uniqueness and goal completeness', async () => {
    const ctx = await tenantWithDraftCampaign('validation');

    for (const dueOn of ['2030-02-28', '2030-04-01']) {
      const outside = await createMilestone(ctx, { name: 'Outside', dueOn });
      expect(outside.status).toBe(400);
      expect(outside.body.code).toBe('MILESTONE_DATE_OUT_OF_WINDOW');
    }

    const badFormat = await createMilestone(ctx, {
      name: 'Bad',
      dueOn: '30/03/2030',
    });
    expect(badFormat.status).toBe(400);

    const onEnd = await createMilestone(ctx, {
      name: 'Finale',
      dueOn: '2030-03-31',
    });
    expect(onEnd.status).toBe(201);

    const duplicate = await createMilestone(ctx, {
      name: 'Again',
      dueOn: '2030-03-31',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('MILESTONE_DATE_DUPLICATE');

    const partial = await createMilestone(ctx, {
      name: 'Partial',
      dueOn: '2030-03-10',
      metric: 'achieved_value',
    });
    expect(partial.status).toBe(400);

    const empty = await createMilestone(ctx, { name: 'Nothing' });
    expect(empty.status).toBe(400);

    const other = await createMilestone(ctx, {
      name: 'Other',
      dueOn: '2030-03-10',
    });
    const moveOnto = await patchMilestone(ctx, other.body.id, {
      dueOn: '2030-03-31',
    });
    expect(moveOnto.status).toBe(409);
    expect(moveOnto.body.code).toBe('MILESTONE_DATE_DUPLICATE');

    const deactivated = await patchMilestone(ctx, onEnd.body.id, {
      isActive: false,
    });
    expect(deactivated.status).toBe(200);
    const reuse = await createMilestone(ctx, {
      name: 'Reuse',
      dueOn: '2030-03-31',
    });
    expect(reuse.status).toBe(201);
  });

  it('keeps draft milestones fully editable and locks dates after publish', async () => {
    const ctx = await tenantWithDraftCampaign('locks');
    const created = await createMilestone(ctx, {
      name: '阶段',
      dueOn: '2030-03-10',
    });
    const id = created.body.id as string;

    const moved = await patchMilestone(ctx, id, { dueOn: '2030-03-12' });
    expect(moved.status).toBe(200);
    expect(moved.body.dueOn).toBe('2030-03-12');
    const off = await patchMilestone(ctx, id, { isActive: false });
    expect(off.status).toBe(200);
    const on = await patchMilestone(ctx, id, { isActive: true });
    expect(on.status).toBe(200);

    await publish(ctx);

    for (const body of [
      { dueOn: '2030-03-14' },
      { dueOn: null },
      { isActive: false },
    ]) {
      const locked = await patchMilestone(ctx, id, body);
      expect(locked.status).toBe(409);
      expect(locked.body.code).toBe('MILESTONE_LOCKED');
    }
    const lateDated = await createMilestone(ctx, {
      name: 'Late',
      dueOn: '2030-03-20',
    });
    expect(lateDated.status).toBe(409);
    expect(lateDated.body.code).toBe('MILESTONE_LOCKED');

    const edited = await patchMilestone(ctx, id, {
      name: '阶段一',
      description: 'Updated',
      metric: 'achieved_value',
      thresholdValue: 5,
      unit: 'days',
      translations: { en: { name: 'Stage one' } },
    }).set('Accept-Language', 'zh-Hans');
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({
      name: '阶段一',
      description: 'Updated',
      dueOn: '2030-03-12',
      hasGoal: true,
      thresholdValue: 5,
      translations: { en: { name: 'Stage one' } },
    });
  });

  it('skips evaluation of goal-less milestones', async () => {
    const ctx = await tenantWithDraftCampaign('goalless');
    const created = await createMilestone(ctx, {
      name: 'Checkpoint',
      dueOn: '2030-03-10',
    });
    await publish(ctx);

    const evaluated = await http()
      .post(`/api/v1/milestones/${created.body.id}/evaluate`)
      .set(auth(ctx.admin.accessToken));
    expect(evaluated.status).toBe(400);

    const history = await http()
      .get(`/api/v1/milestones/${created.body.id}/evaluations`)
      .set(auth(ctx.admin.accessToken));
    expect(history.status).toBe(200);
    expect(history.body).toEqual([]);

    const progress = await http()
      .get(`/api/v1/milestones/${created.body.id}/progress`)
      .set(auth(ctx.admin.accessToken));
    expect(progress.status).toBe(200);
    expect(progress.body).toMatchObject({ hasGoal: false, crossed: false });

    const rows = await dataSource.query(
      `SELECT count(*)::int AS count FROM milestone_evaluations WHERE milestone_id = $1`,
      [created.body.id],
    );
    expect(rows[0].count).toBe(0);
  });

  it('isolates periods and milestones between tenants', async () => {
    const a = await tenantWithDraftCampaign('tenant-a');
    const b = await tenantWithDraftCampaign('tenant-b');
    const milestone = await createMilestone(a, {
      name: 'A only',
      dueOn: '2030-03-10',
    });
    await publish(a);

    const periods = await http()
      .get(`/api/v1/campaigns/${a.campaignId}/periods`)
      .set(auth(b.member.accessToken));
    expect([403, 404]).toContain(periods.status);

    const read = await http()
      .get(`/api/v1/milestones/${milestone.body.id}`)
      .set(auth(b.member.accessToken));
    expect([403, 404]).toContain(read.status);

    const patch = await http()
      .patch(`/api/v1/milestones/${milestone.body.id}`)
      .set(auth(b.admin.accessToken))
      .send({ name: 'Hijack' });
    expect([403, 404]).toContain(patch.status);

    const unauthenticated = await http().get(
      `/api/v1/campaigns/${a.campaignId}/periods`,
    );
    expect(unauthenticated.status).toBe(401);
  });
});
