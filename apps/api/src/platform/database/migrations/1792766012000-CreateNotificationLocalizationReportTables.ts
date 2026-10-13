import { MigrationInterface, QueryRunner } from 'typeorm';

const PHASE8_PERMISSIONS = [
  'notifications.read',
  'notifications.update',
  'reports.read',
  'reports.export',
] as const;

const MEMBER_PERMISSIONS = [
  'notifications.read',
  'notifications.update',
  'reports.read',
] as const;

export class CreateNotificationLocalizationReportTables1792766012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_notification_preferences" (
        "user_id" uuid PRIMARY KEY,
        "in_app_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT true,
        "sms_enabled" boolean NOT NULL DEFAULT false,
        "push_enabled" boolean NOT NULL DEFAULT false,
        "reminders_enabled" boolean NOT NULL DEFAULT true,
        "reminder_local_time" time NOT NULL DEFAULT '09:00',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_notification_preferences_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "locale" varchar(16) NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" varchar(2000) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notifications_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notifications_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_notifications_type_not_blank"
          CHECK (char_length(trim("type")) > 0),
        CONSTRAINT "chk_notifications_locale_not_blank"
          CHECK (char_length(trim("locale")) > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_tenant_user_created"
      ON "notifications" ("tenant_id", "user_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "notification_id" uuid,
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "channel" varchar(20) NOT NULL,
        "template" varchar(50) NOT NULL,
        "status" varchar(20) NOT NULL,
        "skip_reason" varchar(100),
        "provider" varchar(20),
        "dedupe_key" varchar(300) NOT NULL,
        "scheduled_at" timestamptz NOT NULL DEFAULT now(),
        "sent_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notification_deliveries_notification_id"
          FOREIGN KEY ("notification_id") REFERENCES "notifications"("id")
          ON DELETE SET NULL,
        CONSTRAINT "fk_notification_deliveries_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notification_deliveries_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_notification_deliveries_dedupe_key"
          UNIQUE ("dedupe_key"),
        CONSTRAINT "chk_notification_deliveries_channel"
          CHECK ("channel" IN ('in_app', 'email', 'sms', 'push')),
        CONSTRAINT "chk_notification_deliveries_status"
          CHECK ("status" IN ('pending', 'sent', 'skipped', 'failed'))
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_deliveries_tenant_user"
      ON "notification_deliveries" ("tenant_id", "user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_deliveries_scheduled_at"
      ON "notification_deliveries" ("scheduled_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "translations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "locale" varchar(16) NOT NULL,
        "namespace" varchar(50) NOT NULL,
        "key" varchar(100) NOT NULL,
        "value" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_translations_locale_namespace_key"
          UNIQUE ("locale", "namespace", "key"),
        CONSTRAINT "chk_translations_locale_not_blank"
          CHECK (char_length(trim("locale")) > 0),
        CONSTRAINT "chk_translations_namespace_not_blank"
          CHECK (char_length(trim("namespace")) > 0),
        CONSTRAINT "chk_translations_key_not_blank"
          CHECK (char_length(trim("key")) > 0)
      );
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_notification_same_tenant_user()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1 FROM tenants t WHERE t.id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'notification tenant must exist';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_notification_same_tenant
      BEFORE INSERT OR UPDATE OF tenant_id ON notifications
      FOR EACH ROW EXECUTE FUNCTION enforce_notification_same_tenant_user();
    `);

    await queryRunner.query(`
      INSERT INTO "translations" ("locale", "namespace", "key", "value")
      VALUES
        ('en', 'notifications', 'campaign_started.title', 'Campaign started'),
        ('en', 'notifications', 'campaign_started.body', '{campaignName} has started. You can begin recording actions.'),
        ('en', 'notifications', 'action_reminder.title', 'Daily action reminder'),
        ('en', 'notifications', 'action_reminder.body', 'You have not recorded an approved action for {campaignName} on {occurredOn}.'),
        ('en', 'notifications', 'milestone_achieved.title', 'Milestone reached'),
        ('en', 'notifications', 'milestone_achieved.body', '{campaignName} reached the {milestoneName} milestone.'),
        ('zh-Hans', 'notifications', 'campaign_started.title', '活动已开始'),
        ('zh-Hans', 'notifications', 'campaign_started.body', '{campaignName} 已开始。你可以开始记录行动。'),
        ('zh-Hans', 'notifications', 'action_reminder.title', '每日行动提醒'),
        ('zh-Hans', 'notifications', 'action_reminder.body', '你尚未为 {campaignName} 在 {occurredOn} 记录已核准的行动。'),
        ('zh-Hans', 'notifications', 'milestone_achieved.title', '已达成里程碑'),
        ('zh-Hans', 'notifications', 'milestone_achieved.body', '{campaignName} 已达成「{milestoneName}」里程碑。')
      ON CONFLICT ("locale", "namespace", "key") DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('notifications.read', 'View own in-app notifications in the current tenant'),
        ('notifications.update', 'Mark own in-app notifications as read in the current tenant'),
        ('reports.read', 'View own reports and allowed campaign or community aggregates'),
        ('reports.export', 'Export campaign, community or participant reports as CSV')
      ON CONFLICT ("key") DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'tenant_admin'
        AND r.is_system = true
        AND p.key IN (${PHASE8_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'member'
        AND r.is_system = true
        AND p.key IN (${MEMBER_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_notification_same_tenant ON notifications;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_notification_same_tenant_user();`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_deliveries";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_notification_preferences";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "translations";`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'role_permissions'
        ) THEN
          DELETE FROM "role_permissions" rp
          USING "permissions" p
          WHERE rp.permission_id = p.id
            AND p.key IN (${PHASE8_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'permissions'
        ) THEN
          DELETE FROM "permissions"
          WHERE "key" IN (${PHASE8_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
      END $$;
    `);
  }
}
