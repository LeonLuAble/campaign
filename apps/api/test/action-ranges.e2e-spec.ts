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

/** Campaign-local (UTC) day offset from today, `YYYY-MM-DD`. */
function day(offset: number): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset),
  )
    .toISOString()
    .slice(0, 10);
}

describe('Range submissions and day coverage (e2e)', () => {
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

  /**
   * Started vegetarian campaign over [-20, +20] (UTC) with a days and a meals
   * definition and two enrolled members. Dated milestones make it periodised.
   */
  async function campaign(
    suffix: string,
    options: { milestones?: string[]; review?: 'auto' | 'manual' } = {},
  ) {
    const admin = await registerActivatedUser(
      app,
      notifications,
      `admin-range-${suffix}@example.com`,
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: `Range Org ${suffix}` });
    const customerId = customer.body.id as string;
    const roles = await http()
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const memberRoleId = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    ).id as string;

    const addMember = async (name: string, roleId: string) => {
      const member = await registerActivatedUser(
        app,
        notifications,
        `${name}-${suffix}@example.com`,
      );
      const membership = await http()
        .post('/api/v1/memberships')
        .set(auth(admin.accessToken))
        .send({ customerId, userId: member.userId });
      expect(membership.status).toBe(201);
      const assigned = await http()
        .post(`/api/v1/memberships/${membership.body.id}/roles`)
        .set(auth(admin.accessToken))
        .send({ roleId });
      expect(assigned.status).toBe(201);
      return member;
    };
    const members = [
      await addMember('member-one', memberRoleId),
      await addMember('member-two', memberRoleId),
    ];

    const template = await http()
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({ customerId, name: 'Environmental Action' });
    const scope = await http()
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({ customerId, templateId: template.body.id, name: 'Vegetarian' });
    const created = await http()
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: 'Range Campaign',
        timezone: 'UTC',
        startsOn: day(-20),
        endsOn: day(20),
        configuration: {
          rulesStrategy: 'vegetarian',
          submissionReview: options.review ?? 'auto',
        },
      });
    expect(created.status).toBe(201);
    const campaignId = created.body.id as string;
    const daysDefinition = await http()
      .post(`/api/v1/campaigns/${campaignId}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_day', name: 'Vegetarian day', unit: 'days' });
    const mealsDefinition = await http()
      .post(`/api/v1/campaigns/${campaignId}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_meal', name: 'Vegetarian meal', unit: 'meals' });
    for (const [index, dueOn] of (options.milestones ?? []).entries()) {
      const milestone = await http()
        .post(`/api/v1/campaigns/${campaignId}/milestones`)
        .set(auth(admin.accessToken))
        .send({ name: `Stage ${index + 1}`, dueOn });
      expect(milestone.status).toBe(201);
    }
    for (const step of ['publish', 'start']) {
      const moved = await http()
        .post(`/api/v1/campaigns/${campaignId}/${step}`)
        .set(auth(admin.accessToken));
      expect(moved.status).toBe(200);
    }
    const participationIds: string[] = [];
    for (const member of members) {
      const enrolled = await http()
        .post(`/api/v1/campaigns/${campaignId}/participations`)
        .set(auth(member.accessToken))
        .send({});
      expect(enrolled.status).toBe(201);
      participationIds.push(enrolled.body.id as string);
    }
    return {
      admin,
      customerId,
      members,
      addMember,
      campaignId,
      daysId: daysDefinition.body.id as string,
      mealsId: mealsDefinition.body.id as string,
      participationIds,
    };
  }

  type Ctx = Awaited<ReturnType<typeof campaign>>;

  function range(ctx: Ctx, body: Record<string, unknown>, member = 0) {
    return http()
      .post(`/api/v1/participations/${ctx.participationIds[member]}/action-ranges`)
      .set(auth(ctx.members[member].accessToken))
      .send(body);
  }

  function recordDay(ctx: Ctx, body: Record<string, unknown>, member = 0) {
    return http()
      .post('/api/v1/actions')
      .set(auth(ctx.members[member].accessToken))
      .send({ participationId: ctx.participationIds[member], ...body });
  }

  async function progress(ctx: Ctx, member = 0) {
    const response = await http()
      .get(`/api/v1/participations/${ctx.participationIds[member]}/progress`)
      .set(auth(ctx.members[member].accessToken));
    expect(response.status).toBe(200);
    return response.body as {
      achievedValue: number;
      distinctApprovedDays: number;
      approvedActionCount: number;
    };
  }

  function asAdmin(ctx: Ctx, method: 'get' | 'post', path: string) {
    return http()[method](`/api/v1${path}`).set(auth(ctx.admin.accessToken));
  }

  it('records a range per day, rejects overlaps with conflictingDates and allows re-entry over cancelled days', async () => {
    const ctx = await campaign('overlap');
    const single = await recordDay(ctx, {
      actionDefinitionId: ctx.mealsId,
      occurredOn: day(-5),
      quantity: 2,
    });
    expect(single.status).toBe(201);
    expect(single.body.batchId).toBeNull();

    const overlap = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-7),
      days: 4,
      quantityPerDay: 3,
    });
    expect(overlap.status).toBe(409);
    expect(overlap.body.code).toBe('SUBMISSION_OVERLAP');
    expect(overlap.body.details).toEqual({ conflictingDates: [day(-5)] });
    const afterReject = await http()
      .get(`/api/v1/participations/${ctx.participationIds[0]}/actions`)
      .set(auth(ctx.members[0].accessToken));
    expect(afterReject.body).toHaveLength(1);

    const duplicateDay = await recordDay(ctx, {
      actionDefinitionId: ctx.mealsId,
      occurredOn: day(-5),
      quantity: 1,
    });
    expect(duplicateDay.status).toBe(409);
    expect(duplicateDay.body.code).toBe('SUBMISSION_OVERLAP');

    const cancelled = await http()
      .post(`/api/v1/actions/${single.body.id}/cancel`)
      .set(auth(ctx.members[0].accessToken));
    expect(cancelled.status).toBe(200);

    const created = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-7),
      days: 4,
      quantityPerDay: 3,
    });
    expect(created.status).toBe(201);
    expect(created.body.batch).toMatchObject({
      startOn: day(-7),
      endOn: day(-4),
      dayCount: 4,
      quantityPerDay: 3,
      totalQuantity: 12,
      status: 'approved',
      cancelled: false,
      counts: { approved: 4, submitted: 0, rejected: 0, cancelled: 0 },
    });
    expect(
      created.body.actions.map((row: { occurredOn: string }) => row.occurredOn),
    ).toEqual([day(-7), day(-6), day(-5), day(-4)]);
    for (const row of created.body.actions) {
      expect(row).toMatchObject({
        quantity: 3,
        batchId: created.body.batch.id,
        submission: { status: 'approved' },
      });
    }

    const againstRange = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-4),
      days: 3,
      quantityPerDay: 1,
    });
    expect(againstRange.status).toBe(409);
    expect(againstRange.body.details.conflictingDates).toEqual([day(-4)]);

    const otherDefinition = await range(ctx, {
      actionDefinitionId: ctx.daysId,
      startOn: day(-7),
      days: 4,
      quantityPerDay: 1,
    });
    expect(otherDefinition.status).toBe(201);
  });

  it('validates every day with the strategy and the range bounds', async () => {
    const ctx = await campaign('validate');
    const cases: Array<[Record<string, unknown>, number]> = [
      [{ actionDefinitionId: ctx.daysId, startOn: day(-3), days: 2, quantityPerDay: 2 }, 400],
      [{ actionDefinitionId: ctx.mealsId, startOn: day(-3), days: 2, quantityPerDay: 4 }, 400],
      [{ actionDefinitionId: ctx.mealsId, startOn: day(-3), days: 0, quantityPerDay: 1 }, 400],
      [{ actionDefinitionId: ctx.mealsId, startOn: day(-100), days: 93, quantityPerDay: 1 }, 400],
      [{ actionDefinitionId: ctx.mealsId, startOn: day(-1), days: 3, quantityPerDay: 1 }, 400],
      [{ actionDefinitionId: ctx.mealsId, startOn: day(1), days: 1, quantityPerDay: 1 }, 400],
      [{ actionDefinitionId: ctx.mealsId, startOn: day(-22), days: 3, quantityPerDay: 1 }, 400],
    ];
    for (const [body, status] of cases) {
      const response = await range(ctx, body);
      expect(response.status, JSON.stringify(body)).toBe(status);
    }
    const future = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-1),
      days: 3,
      quantityPerDay: 1,
    });
    expect(future.body.message).toMatch(/future/);

    expect(
      (
        await range(ctx, {
          actionDefinitionId: ctx.mealsId,
          startOn: day(-3),
          days: 4,
          quantityPerDay: 3,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await range(ctx, {
          actionDefinitionId: ctx.daysId,
          startOn: day(-20),
          days: 21,
          quantityPerDay: 1,
        })
      ).status,
    ).toBe(201);
  });

  it('lets exactly one of two concurrent identical ranges win', async () => {
    const ctx = await campaign('race');
    const body = {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-10),
      days: 7,
      quantityPerDay: 2,
    };
    const results = await Promise.all([range(ctx, body), range(ctx, body)]);
    const statuses = results.map((row) => row.status).sort();
    expect(statuses).toEqual([201, 409]);
    const loser = results.find((row) => row.status === 409)!;
    expect(loser.body.code).toBe('SUBMISSION_OVERLAP');
    expect(loser.body.details.conflictingDates).toHaveLength(7);

    const keyed = { ...body, startOn: day(-3), days: 3, idempotencyKey: 'race-key' };
    const replays = await Promise.all([range(ctx, keyed), range(ctx, keyed)]);
    expect(replays.map((row) => row.status)).toEqual([201, 201]);
    expect(replays[0].body.batch.id).toBe(replays[1].body.batch.id);

    const [{ count }] = (await dataSource.query(
      'SELECT count(*)::int AS count FROM actions WHERE participation_id = $1',
      [ctx.participationIds[0]],
    )) as Array<{ count: number }>;
    expect(count).toBe(10);
  });

  it('replays the original batch for the same idempotency key', async () => {
    const ctx = await campaign('replay');
    const body = {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-6),
      days: 3,
      quantityPerDay: 2,
      idempotencyKey: 'range-1',
    };
    const first = await range(ctx, body);
    expect(first.status).toBe(201);
    const again = await range(ctx, body);
    expect(again.status).toBe(201);
    expect(again.body.batch.id).toBe(first.body.batch.id);
    expect(again.body.actions).toHaveLength(3);
    const changed = await range(ctx, { ...body, quantityPerDay: 3 });
    expect(changed.status).toBe(409);
    expect(changed.body.code).toBe('CONFLICT');
    const list = await http()
      .get(`/api/v1/participations/${ctx.participationIds[0]}/action-batches`)
      .set(auth(ctx.members[0].accessToken));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('keeps progress equal to the per-day sums and recomputes after cancel', async () => {
    const ctx = await campaign('progress');
    const committed = await http()
      .post(`/api/v1/participations/${ctx.participationIds[0]}/commitments`)
      .set(auth(ctx.members[0].accessToken))
      .send({ typeKey: 'sui_yuan_su', targetValue: 30, unit: 'meals' });
    expect(committed.status).toBe(201);
    const batch = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-8),
      days: 4,
      quantityPerDay: 3,
    });
    expect(batch.status).toBe(201);
    expect(
      (
        await recordDay(ctx, {
          actionDefinitionId: ctx.mealsId,
          occurredOn: day(-1),
          quantity: 2,
        })
      ).status,
    ).toBe(201);
    expect(await progress(ctx)).toMatchObject({
      achievedValue: 14,
      distinctApprovedDays: 5,
      approvedActionCount: 5,
    });

    const cancel = () =>
      http()
        .post(`/api/v1/action-batches/${batch.body.batch.id}/cancel`)
        .set(auth(ctx.members[0].accessToken));
    const cancelled = await cancel();
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.batch.cancelled).toBe(true);
    expect(
      cancelled.body.actions.every(
        (row: { status: string }) => row.status === 'cancelled',
      ),
    ).toBe(true);
    expect((await cancel()).status).toBe(200);
    expect(await progress(ctx)).toMatchObject({
      achievedValue: 2,
      distinctApprovedDays: 1,
    });

    const reentered = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-8),
      days: 4,
      quantityPerDay: 1,
    });
    expect(reentered.status).toBe(201);
    expect((await progress(ctx)).achievedValue).toBe(6);
    const [{ count }] = (await dataSource.query(
      'SELECT count(*)::int AS count FROM actions WHERE batch_id = $1',
      [batch.body.batch.id],
    )) as Array<{ count: number }>;
    expect(count).toBe(4);
  });

  it('honours manual review: whole-batch approve and reject, and a single-day reject makes it mixed', async () => {
    const ctx = await campaign('manual', { review: 'manual' });
    const created = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-5),
      days: 3,
      quantityPerDay: 2,
    });
    expect(created.status).toBe(201);
    expect(created.body.batch.status).toBe('submitted');
    expect(
      created.body.actions.every(
        (row: { submission: { status: string } }) =>
          row.submission.status === 'submitted',
      ),
    ).toBe(true);
    expect((await progress(ctx)).achievedValue).toBe(0);
    const batchId = created.body.batch.id as string;

    const memberApprove = await http()
      .post(`/api/v1/action-batches/${batchId}/approve`)
      .set(auth(ctx.members[0].accessToken))
      .send({});
    expect(memberApprove.status).toBe(403);

    const approved = await asAdmin(ctx, 'post', `/action-batches/${batchId}/approve`).send({
      note: 'Looks right',
    });
    expect(approved.status).toBe(200);
    expect(approved.body.batch).toMatchObject({
      status: 'approved',
      counts: { approved: 3 },
    });
    expect((await progress(ctx)).achievedValue).toBe(6);

    const middle = approved.body.actions[1].submission.id as string;
    const single = await asAdmin(ctx, 'post', `/submissions/${middle}/reject`).send({
      note: 'Not this day',
    });
    expect(single.status).toBe(200);
    const mixed = await asAdmin(ctx, 'get', `/action-batches/${batchId}`);
    expect(mixed.body.batch).toMatchObject({
      status: 'mixed',
      counts: { approved: 2, rejected: 1 },
    });
    expect((await progress(ctx)).achievedValue).toBe(4);

    const rejected = await asAdmin(ctx, 'post', `/action-batches/${batchId}/reject`).send({});
    expect(rejected.body.batch.status).toBe('rejected');
    expect((await progress(ctx)).achievedValue).toBe(0);

    const auto = await campaign('auto-review');
    const autoBatch = await range(auto, {
      actionDefinitionId: auto.mealsId,
      startOn: day(-2),
      days: 2,
      quantityPerDay: 1,
    });
    expect(autoBatch.body.batch.status).toBe('approved');
    expect((await progress(auto)).achievedValue).toBe(2);
  });

  it('requires a committed window in periodised campaigns', async () => {
    // Periods: [-20,-10] closed, [-9,+5], [+6,+20].
    const ctx = await campaign('coverage', { milestones: [day(-10), day(5)] });

    const uncommitted = await recordDay(ctx, {
      actionDefinitionId: ctx.daysId,
      occurredOn: day(-1),
    });
    expect(uncommitted.status).toBe(409);
    expect(uncommitted.body.code).toBe('NO_COMMITMENT_FOR_DATE');

    const committed = await http()
      .post(`/api/v1/participations/${ctx.participationIds[0]}/commitments`)
      .set(auth(ctx.members[0].accessToken))
      .send({ typeKey: 'fa_yuan_su', targetValue: 5, unit: 'days' });
    expect(committed.status).toBe(201);
    expect(committed.body.validFrom).toBe(day(0));
    expect(
      (
        await recordDay(ctx, { actionDefinitionId: ctx.daysId, occurredOn: day(-1) })
      ).body.code,
    ).toBe('NO_COMMITMENT_FOR_DATE');
    expect(
      (
        await range(ctx, {
          actionDefinitionId: ctx.daysId,
          startOn: day(-2),
          days: 3,
          quantityPerDay: 1,
        })
      ).body.code,
    ).toBe('RANGE_SPANS_PERIODS');

    await dataSource.query(
      'UPDATE commitments SET valid_from = $1 WHERE id = $2',
      [day(-9), committed.body.id],
    );
    const spans = await range(ctx, {
      actionDefinitionId: ctx.daysId,
      startOn: day(-12),
      days: 4,
      quantityPerDay: 1,
    });
    expect(spans.status).toBe(400);
    expect(spans.body.code).toBe('RANGE_SPANS_PERIODS');
    const closedPeriod = await recordDay(ctx, {
      actionDefinitionId: ctx.daysId,
      occurredOn: day(-10),
    });
    expect(closedPeriod.body.code).toBe('NO_COMMITMENT_FOR_DATE');
    const inside = await range(ctx, {
      actionDefinitionId: ctx.daysId,
      startOn: day(-9),
      days: 10,
      quantityPerDay: 1,
    });
    expect(inside.status).toBe(201);
    expect(inside.body.batch.dayCount).toBe(10);

    const declined = await http()
      .post(`/api/v1/participations/${ctx.participationIds[1]}/commitments`)
      .set(auth(ctx.members[1].accessToken))
      .send({ decision: 'not_taking_part' });
    expect(declined.status).toBe(201);
    const blockedDay = await recordDay(
      ctx,
      { actionDefinitionId: ctx.daysId, occurredOn: day(0) },
      1,
    );
    expect(blockedDay.status).toBe(409);
    expect(blockedDay.body.code).toBe('NO_COMMITMENT_FOR_DATE');
    const blockedRange = await range(
      ctx,
      { actionDefinitionId: ctx.daysId, startOn: day(0), days: 1, quantityPerDay: 1 },
      1,
    );
    expect(blockedRange.body.code).toBe('NO_COMMITMENT_FOR_DATE');
  });

  it('keeps campaigns without dated milestones open, except for not taking part', async () => {
    const ctx = await campaign('legacy');
    expect(
      (await recordDay(ctx, { actionDefinitionId: ctx.daysId, occurredOn: day(-3) }))
        .status,
    ).toBe(201);
    expect(
      (
        await range(ctx, {
          actionDefinitionId: ctx.daysId,
          startOn: day(-20),
          days: 10,
          quantityPerDay: 1,
        })
      ).status,
    ).toBe(201);
    const declined = await http()
      .post(`/api/v1/participations/${ctx.participationIds[1]}/commitments`)
      .set(auth(ctx.members[1].accessToken))
      .send({ decision: 'not_taking_part' });
    expect(declined.status).toBe(201);
    const blocked = await recordDay(
      ctx,
      { actionDefinitionId: ctx.daysId, occurredOn: day(-3) },
      1,
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('NO_COMMITMENT_FOR_DATE');
  });

  it('isolates batches by owner and tenant', async () => {
    const ctx = await campaign('isolation');
    const created = await range(ctx, {
      actionDefinitionId: ctx.mealsId,
      startOn: day(-4),
      days: 2,
      quantityPerDay: 1,
    });
    const batchId = created.body.batch.id as string;
    const other = ctx.members[1].accessToken;

    expect((await asAdmin(ctx, 'get', `/action-batches/${batchId}`)).status).toBe(200);
    expect(
      (await http().get(`/api/v1/action-batches/${batchId}`).set(auth(other))).status,
    ).toBe(404);
    expect(
      (await http().post(`/api/v1/action-batches/${batchId}/cancel`).set(auth(other)))
        .status,
    ).toBe(404);
    expect(
      (
        await http()
          .get(`/api/v1/participations/${ctx.participationIds[0]}/action-batches`)
          .set(auth(other))
      ).status,
    ).toBe(404);
    expect(
      (
        await http()
          .post(`/api/v1/participations/${ctx.participationIds[0]}/action-ranges`)
          .set(auth(other))
          .send({
            actionDefinitionId: ctx.mealsId,
            startOn: day(-10),
            days: 1,
            quantityPerDay: 1,
          })
      ).status,
    ).toBe(404);
    expect((await http().get(`/api/v1/action-batches/${batchId}`)).status).toBe(401);

    const outsider = await campaign('isolation-other');
    const crossTenant = await http()
      .get(`/api/v1/action-batches/${batchId}`)
      .set(auth(outsider.members[0].accessToken));
    expect([403, 404]).toContain(crossTenant.status);
    const crossAdmin = await http()
      .post(`/api/v1/action-batches/${batchId}/reject`)
      .set(auth(outsider.members[0].accessToken))
      .send({});
    expect([403, 404]).toContain(crossAdmin.status);
    const after = await asAdmin(ctx, 'get', `/action-batches/${batchId}`);
    expect(after.body.batch.status).toBe('approved');
  });

  it('lets reviewers read periods, never other members', async () => {
    const ctx = await campaign('periods-read');
    const roles = await http()
      .get('/api/v1/roles')
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.admin.accessToken));
    expect(roles.status).toBe(200);
    const makeRole = async (key: string, permissionKeys: string[]) => {
      const role = await http()
        .post('/api/v1/roles')
        .set(auth(ctx.admin.accessToken))
        .send({ customerId: ctx.customerId, key, name: key, permissionKeys });
      expect(role.status).toBe(201);
      return role.body.id as string;
    };
    const reviewer = await ctx.addMember(
      'reviewer',
      await makeRole('reviewer', [
        'campaigns.read',
        'participations.read',
        'submissions.read',
        'submissions.update',
      ]),
    );
    const reader = await ctx.addMember(
      'reader',
      await makeRole('reader', ['campaigns.read', 'participations.read']),
    );
    const periods = (token: string) =>
      http()
        .get(`/api/v1/participations/${ctx.participationIds[0]}/periods`)
        .set(auth(token));

    expect((await periods(ctx.members[0].accessToken)).status).toBe(200);
    expect((await periods(ctx.members[1].accessToken)).status).toBe(404);
    expect((await periods(reader.accessToken)).status).toBe(404);
    const asReviewer = await periods(reviewer.accessToken);
    expect(asReviewer.status).toBe(200);
    expect(asReviewer.body).toHaveLength(1);
    expect((await periods(ctx.admin.accessToken)).status).toBe(200);
  });
});
