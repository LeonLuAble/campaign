import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { ReminderScheduler } from '../src/modules/notifications/application/reminder-scheduler.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

type Member = { userId: string; accessToken: string };

describe('Commitment decision and participation summary (e2e)', () => {
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

  const http = () => request(app.getHttpServer());

  async function addMember(
    adminToken: string,
    customerId: string,
    identifier: string,
    communityId: string | null,
    roleId: string | null,
  ): Promise<Member> {
    const user = await registerActivatedUser(app, notifications, identifier);
    const membership = await http()
      .post('/api/v1/memberships')
      .set(auth(adminToken))
      .send({
        customerId,
        userId: user.userId,
        ...(communityId ? { communityId } : {}),
      });
    expect(membership.status).toBe(201);
    if (roleId) {
      await http()
        .post(`/api/v1/memberships/${membership.body.id}/roles`)
        .set(auth(adminToken))
        .send({ roleId });
    }
    return user;
  }

  async function startedCampaign() {
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin-decision@example.com',
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: 'Decision Org' });
    const customerId = customer.body.id as string;
    const region = await http()
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId, name: 'Region' });
    const chapter = await http()
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId, parentId: region.body.id, name: 'Chapter' });
    const roles = await http()
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const memberRoleId = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    ).id as string;

    const regionId = region.body.id as string;
    const chapterId = chapter.body.id as string;
    const committed = await addMember(
      admin.accessToken,
      customerId,
      'committed@example.com',
      regionId,
      memberRoleId,
    );
    const declined = await addMember(
      admin.accessToken,
      customerId,
      'declined@example.com',
      chapterId,
      memberRoleId,
    );
    const undecided = await addMember(
      admin.accessToken,
      customerId,
      'undecided@example.com',
      chapterId,
      memberRoleId,
    );
    const leaver = await addMember(
      admin.accessToken,
      customerId,
      'leaver@example.com',
      regionId,
      memberRoleId,
    );

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
        name: 'Decision Campaign',
        timezone: 'UTC',
        startsOn: '2020-01-01',
        endsOn: '2099-12-31',
        configuration: { rulesStrategy: 'vegetarian' },
      });
    expect(campaign.status).toBe(201);
    const campaignId = campaign.body.id as string;
    const definition = await http()
      .post(`/api/v1/campaigns/${campaignId}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_day', name: 'Vegetarian day', unit: 'days' });
    await http()
      .post(`/api/v1/campaigns/${campaignId}/publish`)
      .set(auth(admin.accessToken));
    await http()
      .post(`/api/v1/campaigns/${campaignId}/start`)
      .set(auth(admin.accessToken));

    const participationIds: Record<string, string> = {};
    for (const [key, member] of Object.entries({
      committed,
      declined,
      undecided,
      leaver,
    })) {
      const enrolled = await http()
        .post(`/api/v1/campaigns/${campaignId}/participations`)
        .set(auth(member.accessToken))
        .send({});
      expect(enrolled.status).toBe(201);
      participationIds[key] = enrolled.body.id as string;
    }

    return {
      admin,
      customerId,
      memberRoleId,
      regionId,
      chapterId,
      campaignId,
      definitionId: definition.body.id as string,
      members: { committed, declined, undecided, leaver },
      participationIds,
    };
  }

  type Ctx = Awaited<ReturnType<typeof startedCampaign>>;

  async function pledge(ctx: Ctx, key: keyof Ctx['members'], target = 10) {
    const response = await http()
      .post(`/api/v1/participations/${ctx.participationIds[key]}/commitments`)
      .set(auth(ctx.members[key].accessToken))
      .send({ typeKey: 'fa_yuan_su', targetValue: target, unit: 'days' });
    expect(response.status).toBe(201);
    return response;
  }

  async function decline(ctx: Ctx, key: keyof Ctx['members']) {
    const response = await http()
      .post(`/api/v1/participations/${ctx.participationIds[key]}/commitments`)
      .set(auth(ctx.members[key].accessToken))
      .send({ decision: 'not_taking_part' });
    expect(response.status).toBe(201);
    return response;
  }

  async function record(
    ctx: Ctx,
    key: keyof Ctx['members'],
    occurredOn: string,
  ) {
    const response = await http()
      .post('/api/v1/actions')
      .set(auth(ctx.members[key].accessToken))
      .send({
        participationId: ctx.participationIds[key],
        actionDefinitionId: ctx.definitionId,
        occurredOn,
      });
    expect(response.status).toBe(201);
  }

  async function communityProgress(ctx: Ctx, communityId: string) {
    const response = await http()
      .get(
        `/api/v1/campaigns/${ctx.campaignId}/communities/${communityId}/progress`,
      )
      .set(auth(ctx.admin.accessToken));
    expect(response.status).toBe(200);
    return response.body;
  }

  it('records not taking part without lowering the community percentage and can switch back', async () => {
    const ctx = await startedCampaign();
    await pledge(ctx, 'committed');
    const firstPledge = await pledge(ctx, 'declined');
    await record(ctx, 'committed', '2026-10-01');
    await record(ctx, 'committed', '2026-10-02');
    await record(ctx, 'declined', '2026-10-01');

    const before = await communityProgress(ctx, ctx.regionId);
    expect(before.units[0]).toMatchObject({
      achievedValue: 3,
      targetValue: 20,
      completionPercent: 15,
    });

    const declined = await decline(ctx, 'declined');
    expect(declined.body).toMatchObject({
      id: firstPledge.body.id,
      decision: 'not_taking_part',
      typeKey: null,
      targetValue: 0,
      unit: null,
    });
    const participation = await http()
      .get(`/api/v1/participations/${ctx.participationIds.declined}`)
      .set(auth(ctx.members.declined.accessToken));
    expect(participation.body.engagement).toBe('not_taking_part');

    const after = await communityProgress(ctx, ctx.regionId);
    expect(after.units[0]).toMatchObject({
      achievedValue: 2,
      targetValue: 10,
      completionPercent: 20,
    });
    expect(after.units[0].completionPercent).toBeGreaterThanOrEqual(
      before.units[0].completionPercent,
    );
    expect(after).toMatchObject({
      participantCount: 4,
      committedParticipantCount: 1,
      notTakingPartCount: 1,
      awaitingCommitmentCount: 2,
    });

    const own = await http()
      .get(`/api/v1/participations/${ctx.participationIds.declined}/progress`)
      .set(auth(ctx.members.declined.accessToken));
    expect(own.status).toBe(200);
    expect(own.body).toMatchObject({
      engagement: 'not_taking_part',
      achievedValue: 0,
      targetValue: 0,
      commitment: null,
    });

    const recommitted = await pledge(ctx, 'declined', 10);
    expect(recommitted.body).toMatchObject({
      id: firstPledge.body.id,
      decision: 'committed',
      targetValue: 10,
      unit: 'days',
    });
    const restored = await communityProgress(ctx, ctx.regionId);
    expect(restored.units[0]).toMatchObject({
      achievedValue: 3,
      targetValue: 20,
      completionPercent: 15,
    });

    const listed = await http()
      .get(`/api/v1/participations/${ctx.participationIds.declined}/commitments`)
      .set(auth(ctx.members.declined.accessToken));
    expect(listed.body).toHaveLength(1);
  });

  it('rejects an incomplete commitment and decisions after the campaign completes', async () => {
    const ctx = await startedCampaign();
    const missing = await http()
      .post(`/api/v1/participations/${ctx.participationIds.committed}/commitments`)
      .set(auth(ctx.members.committed.accessToken))
      .send({ decision: 'committed' });
    expect(missing.status).toBe(400);

    const unknown = await http()
      .post(`/api/v1/participations/${ctx.participationIds.committed}/commitments`)
      .set(auth(ctx.members.committed.accessToken))
      .send({ decision: 'maybe' });
    expect(unknown.status).toBe(400);

    const completed = await http()
      .post(`/api/v1/campaigns/${ctx.campaignId}/complete`)
      .set(auth(ctx.admin.accessToken));
    expect(completed.status).toBe(200);
    const late = await http()
      .post(`/api/v1/participations/${ctx.participationIds.committed}/commitments`)
      .set(auth(ctx.members.committed.accessToken))
      .send({ decision: 'not_taking_part' });
    expect(late.status).toBe(400);
  });

  it('summarises engagement per status and community subtree, excluding withdrawn from progress', async () => {
    const ctx = await startedCampaign();
    await pledge(ctx, 'committed');
    await decline(ctx, 'declined');
    await pledge(ctx, 'leaver');
    await record(ctx, 'committed', '2026-10-01');
    await record(ctx, 'leaver', '2026-10-01');
    await record(ctx, 'leaver', '2026-10-02');
    const withdrawn = await http()
      .post(`/api/v1/participations/${ctx.participationIds.leaver}/withdraw`)
      .set(auth(ctx.members.leaver.accessToken));
    expect(withdrawn.status).toBe(200);

    const summary = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .set(auth(ctx.members.committed.accessToken));
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual({
      customerId: ctx.customerId,
      campaignId: ctx.campaignId,
      communityId: null,
      enrolled: 3,
      takingPart: 1,
      notTakingPart: 1,
      awaitingCommitment: 1,
      withdrawn: 1,
    });
    const serialized = JSON.stringify(summary.body);
    for (const member of Object.values(ctx.members)) {
      expect(serialized).not.toContain(member.userId);
    }

    const chapter = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .query({ communityId: ctx.chapterId })
      .set(auth(ctx.admin.accessToken));
    expect(chapter.status).toBe(200);
    expect(chapter.body).toMatchObject({
      communityId: ctx.chapterId,
      enrolled: 2,
      takingPart: 0,
      notTakingPart: 1,
      awaitingCommitment: 1,
      withdrawn: 0,
    });

    const region = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .query({ communityId: ctx.regionId })
      .set(auth(ctx.admin.accessToken));
    expect(region.body).toMatchObject({
      enrolled: 3,
      takingPart: 1,
      notTakingPart: 1,
      awaitingCommitment: 1,
      withdrawn: 1,
    });

    const progress = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/progress`)
      .set(auth(ctx.admin.accessToken));
    expect(progress.body).toMatchObject({
      participantCount: 3,
      committedParticipantCount: 1,
      notTakingPartCount: 1,
      awaitingCommitmentCount: 1,
    });
    expect(progress.body.units[0]).toMatchObject({
      achievedValue: 1,
      targetValue: 10,
      completionPercent: 10,
    });

    const report = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/report`)
      .set(auth(ctx.admin.accessToken));
    expect(report.status).toBe(200);
    expect(report.body.progress).toMatchObject({
      participantCount: 3,
      committedParticipantCount: 1,
      notTakingPartCount: 1,
      awaitingCommitmentCount: 1,
    });

    const leaverProgress = await http()
      .get(`/api/v1/participations/${ctx.participationIds.leaver}/progress`)
      .set(auth(ctx.members.leaver.accessToken));
    expect(leaverProgress.status).toBe(200);
    expect(leaverProgress.body).toMatchObject({
      engagement: 'withdrawn',
      achievedValue: 2,
    });
  });

  it('keeps the summary tenant-isolated and permission-guarded', async () => {
    const ctx = await startedCampaign();
    const noRole = await addMember(
      ctx.admin.accessToken,
      ctx.customerId,
      'norole@example.com',
      null,
      null,
    );
    const forbidden = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .set(auth(noRole.accessToken));
    expect(forbidden.status).toBe(403);

    const otherCustomer = await http()
      .post('/api/v1/customers')
      .set(auth(ctx.admin.accessToken))
      .send({ name: 'Other Org' });
    const otherCommunity = await http()
      .post('/api/v1/communities')
      .set(auth(ctx.admin.accessToken))
      .send({ customerId: otherCustomer.body.id, name: 'Elsewhere' });
    const otherRoles = await http()
      .get('/api/v1/roles')
      .query({ customerId: otherCustomer.body.id })
      .set(auth(ctx.admin.accessToken));
    const outsider = await addMember(
      ctx.admin.accessToken,
      otherCustomer.body.id,
      'outsider@example.com',
      null,
      otherRoles.body.find((role: { key: string }) => role.key === 'member')
        .id,
    );
    const crossTenant = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .set(auth(outsider.accessToken));
    expect([403, 404]).toContain(crossTenant.status);
    expect(crossTenant.body.enrolled).toBeUndefined();

    const foreignCommunity = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .query({ communityId: otherCommunity.body.id })
      .set(auth(ctx.members.committed.accessToken));
    expect(foreignCommunity.status).toBe(404);

    const badQuery = await http()
      .get(`/api/v1/campaigns/${ctx.campaignId}/participation-summary`)
      .query({ communityId: 'not-a-uuid' })
      .set(auth(ctx.members.committed.accessToken));
    expect(badQuery.status).toBe(400);
  });

  it('skips reminders for not-taking-part and withdrawn participants', async () => {
    const ctx = await startedCampaign();
    await pledge(ctx, 'committed');
    await decline(ctx, 'declined');
    await http()
      .post(`/api/v1/participations/${ctx.participationIds.leaver}/withdraw`)
      .set(auth(ctx.members.leaver.accessToken));
    for (const member of Object.values(ctx.members)) {
      await http()
        .put('/api/v1/me/notification-preferences')
        .set(auth(member.accessToken))
        .send({ reminderLocalTime: '00:00' });
    }

    const utcNow = new Date();
    const yesterdayNoon = new Date(
      Date.UTC(
        utcNow.getUTCFullYear(),
        utcNow.getUTCMonth(),
        utcNow.getUTCDate() - 1,
        12,
        0,
        0,
      ),
    );
    await reminders.processDueReminders(yesterdayNoon);

    async function remindedCount(member: Member) {
      const inbox = await http()
        .get('/api/v1/notifications')
        .query({ customerId: ctx.customerId })
        .set(auth(member.accessToken));
      expect(inbox.status).toBe(200);
      return inbox.body.filter(
        (row: { type: string }) => row.type === 'action_reminder',
      ).length;
    }

    expect(await remindedCount(ctx.members.committed)).toBe(1);
    expect(await remindedCount(ctx.members.undecided)).toBe(1);
    expect(await remindedCount(ctx.members.declined)).toBe(0);
    expect(await remindedCount(ctx.members.leaver)).toBe(0);
  });
});
