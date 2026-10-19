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

describe('Per-period commitments (e2e)', () => {
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
   * Draft campaign with optional dated milestones, published (and started
   * unless `start` is false), plus two enrolled members.
   */
  async function campaign(
    suffix: string,
    options: {
      startsOn: string;
      endsOn: string;
      milestones?: string[];
      start?: boolean;
    },
  ) {
    const admin = await registerActivatedUser(
      app,
      notifications,
      `admin-period-${suffix}@example.com`,
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: `Period Org ${suffix}` });
    const customerId = customer.body.id as string;
    const roles = await http()
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const memberRoleId = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    ).id as string;

    const members = [];
    for (const name of ['one', 'two']) {
      const member = await registerActivatedUser(
        app,
        notifications,
        `member-${name}-${suffix}@example.com`,
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
      members.push(member);
    }

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
        name: 'Period Campaign',
        timezone: 'UTC',
        startsOn: options.startsOn,
        endsOn: options.endsOn,
        configuration: { rulesStrategy: 'vegetarian' },
      });
    expect(created.status).toBe(201);
    const campaignId = created.body.id as string;
    const definition = await http()
      .post(`/api/v1/campaigns/${campaignId}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_day', name: 'Vegetarian day', unit: 'days' });
    const milestoneIds: string[] = [];
    for (const [index, dueOn] of (options.milestones ?? []).entries()) {
      const milestone = await http()
        .post(`/api/v1/campaigns/${campaignId}/milestones`)
        .set(auth(admin.accessToken))
        .send({ name: `Stage ${index + 1}`, dueOn });
      expect(milestone.status).toBe(201);
      milestoneIds.push(milestone.body.id as string);
    }
    const published = await http()
      .post(`/api/v1/campaigns/${campaignId}/publish`)
      .set(auth(admin.accessToken));
    expect(published.status).toBe(200);
    if (options.start !== false) {
      const started = await http()
        .post(`/api/v1/campaigns/${campaignId}/start`)
        .set(auth(admin.accessToken));
      expect(started.status).toBe(200);
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
      members,
      campaignId,
      definitionId: definition.body.id as string,
      milestoneIds,
      participationIds,
    };
  }

  type Ctx = Awaited<ReturnType<typeof campaign>>;

  /** Periods: closed [-20,-10], open [-9,+5] (milestone 2), final [+6,+20]. */
  function periodised(suffix: string) {
    return campaign(suffix, {
      startsOn: day(-20),
      endsOn: day(20),
      milestones: [day(-10), day(5)],
    });
  }

  function commit(ctx: Ctx, body: Record<string, unknown>, member = 0) {
    return http()
      .post(`/api/v1/participations/${ctx.participationIds[member]}/commitments`)
      .set(auth(ctx.members[member].accessToken))
      .send(body);
  }

  function listCommitments(ctx: Ctx, member = 0) {
    return http()
      .get(`/api/v1/participations/${ctx.participationIds[member]}/commitments`)
      .set(auth(ctx.members[member].accessToken));
  }

  function periodsOf(ctx: Ctx, token: string, member = 0) {
    return http()
      .get(`/api/v1/participations/${ctx.participationIds[member]}/periods`)
      .set(auth(token));
  }

  it('keeps one commitment per (participation, period) and replaces within a period', async () => {
    const ctx = await periodised('per-period');

    const current = await commit(ctx, {
      typeKey: 'fa_yuan_su',
      targetValue: 3,
      unit: 'days',
    });
    expect(current.status).toBe(201);
    expect(current.body).toMatchObject({
      decision: 'committed',
      validFrom: day(0),
      validTo: day(5),
      periodKey: day(5),
      periodMilestoneId: ctx.milestoneIds[1],
    });

    const replaced = await commit(ctx, {
      typeKey: 'yi_zhou_su',
      targetValue: 6,
      unit: 'days',
      periodKey: day(5),
    });
    expect(replaced.status).toBe(201);
    expect(replaced.body).toMatchObject({
      id: current.body.id,
      typeKey: 'yi_zhou_su',
      targetValue: 6,
      validFrom: day(0),
    });

    const ahead = await commit(ctx, {
      typeKey: 'fa_yuan_su',
      targetValue: 10,
      unit: 'days',
      periodKey: day(20),
    });
    expect(ahead.status).toBe(201);
    expect(ahead.body).toMatchObject({
      validFrom: day(6),
      validTo: day(20),
      periodMilestoneId: null,
    });

    const listed = await listCommitments(ctx);
    expect(listed.body).toHaveLength(2);
    expect(
      listed.body.map((row: { periodKey: string }) => row.periodKey).sort(),
    ).toEqual([day(20), day(5)].sort());

    const rows = await dataSource.query(
      `SELECT count(*)::int AS count FROM commitments WHERE participation_id = $1`,
      [ctx.participationIds[0]],
    );
    expect(rows[0].count).toBe(2);
  });

  it('rejects closed periods and targets larger than the window', async () => {
    const ctx = await periodised('rules');

    const closed = await commit(ctx, {
      decision: 'not_taking_part',
      periodKey: day(-10),
    });
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBe('PERIOD_CLOSED');

    // Open window runs today..+5: 6 days, 18 meals.
    const tooManyDays = await commit(ctx, {
      typeKey: 'fa_yuan_su',
      targetValue: 7,
      unit: 'days',
    });
    expect(tooManyDays.status).toBe(400);
    expect(tooManyDays.body.code).toBe('COMMITMENT_TARGET_EXCEEDS_PERIOD');
    const tooManyMeals = await commit(ctx, {
      typeKey: 'sui_yuan_su',
      targetValue: 19,
      unit: 'meals',
    });
    expect(tooManyMeals.status).toBe(400);
    expect(tooManyMeals.body.code).toBe('COMMITMENT_TARGET_EXCEEDS_PERIOD');
    const fits = await commit(ctx, {
      typeKey: 'sui_yuan_su',
      targetValue: 18,
      unit: 'meals',
    });
    expect(fits.status).toBe(201);

    const unknown = await commit(ctx, {
      decision: 'not_taking_part',
      periodKey: day(1),
    });
    expect(unknown.status).toBe(400);

    const withdrawn = await http()
      .post(`/api/v1/participations/${ctx.participationIds[1]}/withdraw`)
      .set(auth(ctx.members[1].accessToken));
    expect(withdrawn.status).toBe(200);
    const afterWithdraw = await commit(
      ctx,
      { decision: 'not_taking_part' },
      1,
    );
    expect(afterWithdraw.status).toBe(400);
  });

  it('resolves 已全素 and commitment-options to the period window', async () => {
    const ctx = await periodised('window');

    const options = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/commitment-options`)
      .query({ periodKey: day(5) })
      .set(auth(ctx.members[0].accessToken));
    expect(options.status).toBe(200);
    expect(options.body).toMatchObject({
      periodKey: day(5),
      periodStatus: 'open',
      validFrom: day(0),
      validTo: day(5),
      dayCount: 6,
    });
    const yiQuan = options.body.choices.find(
      (choice: { key: string }) => choice.key === 'yi_quan_su',
    );
    expect(yiQuan).toMatchObject({ usesCampaignDuration: true, suggestedTarget: 6 });

    const ahead = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/commitment-options`)
      .query({ periodKey: day(20) })
      .set(auth(ctx.members[0].accessToken));
    expect(ahead.body).toMatchObject({
      periodStatus: 'upcoming',
      validFrom: day(6),
      dayCount: 15,
    });

    const badKey = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/commitment-options`)
      .query({ periodKey: 'soon' })
      .set(auth(ctx.members[0].accessToken));
    expect(badKey.status).toBe(400);

    const committed = await commit(ctx, {
      typeKey: '已全素',
      targetValue: 41,
      unit: 'days',
    });
    expect(committed.status).toBe(201);
    expect(committed.body).toMatchObject({
      typeKey: 'yi_quan_su',
      targetValue: 6,
    });
  });

  it('writes not taking part for the rest of the campaign', async () => {
    const ctx = await periodised('rest');
    await commit(ctx, { typeKey: 'fa_yuan_su', targetValue: 3, unit: 'days' });

    const rest = await commit(ctx, { restOfCampaign: true });
    expect(rest.status).toBe(201);
    expect(rest.body).toMatchObject({
      decision: 'not_taking_part',
      periodKey: day(5),
    });

    const listed = await listCommitments(ctx);
    expect(listed.body).toHaveLength(2);
    for (const row of listed.body as Array<{ decision: string }>) {
      expect(row.decision).toBe('not_taking_part');
    }

    const periods = await periodsOf(ctx, ctx.members[0].accessToken);
    expect(
      periods.body.map((row: { decision: string | null }) => row.decision),
    ).toEqual([null, 'not_taking_part', 'not_taking_part']);
  });

  it('defaults to the first period before the campaign starts', async () => {
    const ctx = await campaign('ahead', {
      startsOn: day(3),
      endsOn: day(20),
      milestones: [day(10)],
      start: false,
    });
    const created = await commit(ctx, {
      typeKey: 'fa_yuan_su',
      targetValue: 8,
      unit: 'days',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      validFrom: day(3),
      validTo: day(10),
      periodMilestoneId: ctx.milestoneIds[0],
    });
  });

  it('lists the participation periods with decision and result status', async () => {
    const ctx = await periodised('shapes');
    await commit(ctx, { typeKey: 'fa_yuan_su', targetValue: 3, unit: 'days' });
    const recorded = await http()
      .post('/api/v1/actions')
      .set(auth(ctx.members[0].accessToken))
      .send({
        participationId: ctx.participationIds[0],
        actionDefinitionId: ctx.definitionId,
        occurredOn: day(0),
      });
    expect(recorded.status).toBe(201);

    const periods = await periodsOf(ctx, ctx.members[0].accessToken);
    expect(periods.status).toBe(200);
    expect(periods.body).toHaveLength(3);
    expect(periods.body[0]).toMatchObject({
      key: day(-10),
      index: 0,
      startsOn: day(-20),
      endsOn: day(-10),
      milestoneId: ctx.milestoneIds[0],
      name: 'Stage 1',
      isFinal: false,
      dayCount: 11,
      status: 'closed',
      decision: null,
      commitment: null,
      resultStatus: 'not_submitted',
      coveredDays: 0,
      approvedDays: 0,
      achieved: 0,
      target: 0,
      unit: null,
    });
    expect(periods.body[1]).toMatchObject({
      key: day(5),
      status: 'open',
      decision: 'committed',
      commitment: {
        typeKey: 'fa_yuan_su',
        targetValue: 3,
        unit: 'days',
        validFrom: day(0),
        validTo: day(5),
      },
      resultStatus: 'submitted',
      coveredDays: 1,
      approvedDays: 1,
      achieved: 1,
      target: 3,
      unit: 'days',
    });
    expect(periods.body[2]).toMatchObject({
      key: day(20),
      status: 'upcoming',
      decision: null,
      resultStatus: 'awaiting',
      isFinal: true,
      milestoneId: null,
    });
  });

  it('keeps legacy campaigns on one whole-campaign commitment', async () => {
    const ctx = await campaign('legacy', {
      startsOn: day(-5),
      endsOn: day(30),
    });
    const first = await commit(ctx, {
      typeKey: 'fa_yuan_su',
      targetValue: 50,
      unit: 'days',
    });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      validFrom: null,
      validTo: null,
      periodKey: null,
      periodMilestoneId: null,
      targetValue: 50,
    });
    const second = await commit(ctx, { decision: 'not_taking_part' });
    expect(second.body.id).toBe(first.body.id);
    const back = await commit(ctx, { restOfCampaign: true });
    expect(back.body).toMatchObject({
      id: first.body.id,
      decision: 'not_taking_part',
    });
    expect((await listCommitments(ctx)).body).toHaveLength(1);

    const periods = await periodsOf(ctx, ctx.members[0].accessToken);
    expect(periods.body).toEqual([
      expect.objectContaining({
        key: day(30),
        startsOn: day(-5),
        milestoneId: null,
        isFinal: true,
        status: 'open',
        decision: 'not_taking_part',
        resultStatus: 'not_applicable',
      }),
    ]);

    const options = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/commitment-options`)
      .set(auth(ctx.members[0].accessToken));
    expect(options.body).toMatchObject({
      periodKey: day(30),
      validFrom: day(-5),
      validTo: day(30),
      dayCount: 36,
    });
  });

  it('isolates participation periods by owner, permission and tenant', async () => {
    const a = await periodised('iso-a');
    const b = await periodised('iso-b');

    const own = await periodsOf(a, a.members[0].accessToken);
    expect(own.status).toBe(200);

    const sameTenantMember = await periodsOf(a, a.members[1].accessToken);
    expect(sameTenantMember.status).toBe(404);

    const tenantAdmin = await periodsOf(a, a.admin.accessToken);
    expect(tenantAdmin.status).toBe(200);

    const otherTenant = await periodsOf(a, b.admin.accessToken);
    expect([403, 404]).toContain(otherTenant.status);

    const crossCommit = await http()
      .post(`/api/v1/participations/${a.participationIds[0]}/commitments`)
      .set(auth(b.members[0].accessToken))
      .send({ decision: 'not_taking_part' });
    expect([403, 404]).toContain(crossCommit.status);

    const anonymous = await http().get(
      `/api/v1/participations/${a.participationIds[0]}/periods`,
    );
    expect(anonymous.status).toBe(401);
  });
});
