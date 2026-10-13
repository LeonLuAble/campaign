import { MigrationInterface, QueryRunner } from 'typeorm';

const PHASE5_PERMISSIONS = [
  'action_definitions.create',
  'action_definitions.read',
  'action_definitions.update',
  'actions.create',
  'actions.read',
  'actions.update',
  'submissions.read',
  'submissions.update',
  'commitments.create',
  'commitments.read',
  'commitments.update',
] as const;

const MEMBER_PERMISSIONS = [
  'action_definitions.read',
  'actions.create',
  'actions.read',
  'submissions.read',
  'commitments.create',
  'commitments.read',
] as const;

export class CreateCommitmentActionTables1792465709000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "privacy_level_enum" AS ENUM (
        'private', 'group', 'community', 'customer', 'public'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "action_status_enum" AS ENUM (
        'recorded', 'cancelled'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "submission_status_enum" AS ENUM (
        'submitted', 'approved', 'rejected'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "action_definitions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "unit" varchar(50) NOT NULL,
        "description" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_action_definitions_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_action_definitions_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_action_definitions_campaign_key"
          UNIQUE ("campaign_id", "key"),
        CONSTRAINT "chk_action_definitions_key_not_blank"
          CHECK (char_length(trim("key")) > 0),
        CONSTRAINT "chk_action_definitions_name_not_blank"
          CHECK (char_length(trim("name")) > 0),
        CONSTRAINT "chk_action_definitions_unit_not_blank"
          CHECK (char_length(trim("unit")) > 0),
        CONSTRAINT "chk_action_definitions_settings_object"
          CHECK (jsonb_typeof("settings") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_action_definitions_tenant_id"
      ON "action_definitions" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_action_definitions_campaign_id"
      ON "action_definitions" ("campaign_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "commitments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "participation_id" uuid NOT NULL,
        "type_key" varchar(100),
        "target_value" integer NOT NULL,
        "unit" varchar(50) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_commitments_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_commitments_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_commitments_participation_id"
          FOREIGN KEY ("participation_id") REFERENCES "participations"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_commitments_participation_id" UNIQUE ("participation_id"),
        CONSTRAINT "chk_commitments_target_value_positive"
          CHECK ("target_value" > 0),
        CONSTRAINT "chk_commitments_unit_not_blank"
          CHECK (char_length(trim("unit")) > 0),
        CONSTRAINT "chk_commitments_payload_object"
          CHECK (jsonb_typeof("payload") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_commitments_tenant_id" ON "commitments" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_commitments_campaign_id"
      ON "commitments" ("campaign_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_commitments_tenant_campaign"
      ON "commitments" ("tenant_id", "campaign_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "actions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "participation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "action_definition_id" uuid NOT NULL,
        "occurred_on" date NOT NULL,
        "quantity" integer NOT NULL,
        "privacy_level" "privacy_level_enum" NOT NULL,
        "status" "action_status_enum" NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "idempotency_key" varchar(128),
        "recorded_by_user_id" uuid NOT NULL,
        "cancelled_at" timestamptz,
        "cancelled_by_user_id" uuid,
        "corrected_at" timestamptz,
        "corrected_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_actions_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_actions_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_actions_participation_id"
          FOREIGN KEY ("participation_id") REFERENCES "participations"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_actions_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_actions_action_definition_id"
          FOREIGN KEY ("action_definition_id") REFERENCES "action_definitions"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_actions_recorded_by_user_id"
          FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_actions_cancelled_by_user_id"
          FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_actions_corrected_by_user_id"
          FOREIGN KEY ("corrected_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_actions_quantity_positive"
          CHECK ("quantity" > 0),
        CONSTRAINT "chk_actions_payload_object"
          CHECK (jsonb_typeof("payload") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_actions_tenant_id" ON "actions" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_actions_campaign_id" ON "actions" ("campaign_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_actions_participation_id"
      ON "actions" ("participation_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_actions_user_id" ON "actions" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_actions_tenant_campaign_occurred_on"
      ON "actions" ("tenant_id", "campaign_id", "occurred_on");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_actions_recorded_participation_definition_day"
      ON "actions" ("participation_id", "action_definition_id", "occurred_on")
      WHERE "status" = 'recorded';
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_actions_participation_idempotency_key"
      ON "actions" ("participation_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "action_id" uuid NOT NULL,
        "status" "submission_status_enum" NOT NULL,
        "submitted_by_user_id" uuid NOT NULL,
        "reviewed_by_user_id" uuid,
        "reviewed_at" timestamptz,
        "review_note" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_submissions_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_submissions_action_id"
          FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_submissions_submitted_by_user_id"
          FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_submissions_reviewed_by_user_id"
          FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_submissions_action_id" UNIQUE ("action_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_submissions_tenant_id" ON "submissions" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_submissions_tenant_status"
      ON "submissions" ("tenant_id", "status");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_action_definition_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'action definition must belong to the same tenant as the campaign';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_action_definition_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, tenant_id ON action_definitions
      FOR EACH ROW EXECUTE FUNCTION enforce_action_definition_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_commitment_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM participations p
        WHERE p.id = NEW.participation_id
          AND p.tenant_id = NEW.tenant_id
          AND p.campaign_id = NEW.campaign_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'commitment must belong to the same tenant and campaign as the participation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_commitment_same_tenant
      BEFORE INSERT OR UPDATE OF participation_id, campaign_id, tenant_id
      ON commitments
      FOR EACH ROW EXECUTE FUNCTION enforce_commitment_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_action_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM participations p
        WHERE p.id = NEW.participation_id
          AND p.tenant_id = NEW.tenant_id
          AND p.campaign_id = NEW.campaign_id
          AND p.user_id = NEW.user_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'action must belong to the same tenant, campaign and user as the participation';
        END IF;
        PERFORM 1
        FROM action_definitions d
        WHERE d.id = NEW.action_definition_id
          AND d.tenant_id = NEW.tenant_id
          AND d.campaign_id = NEW.campaign_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'action definition must belong to the same tenant and campaign as the action';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_action_same_tenant
      BEFORE INSERT OR UPDATE OF participation_id, action_definition_id,
        campaign_id, tenant_id
      ON actions
      FOR EACH ROW EXECUTE FUNCTION enforce_action_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_submission_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM actions a
        WHERE a.id = NEW.action_id AND a.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'submission must belong to the same tenant as the action';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_submission_same_tenant
      BEFORE INSERT OR UPDATE OF action_id, tenant_id ON submissions
      FOR EACH ROW EXECUTE FUNCTION enforce_submission_same_tenant();
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('action_definitions.create', 'Create action definitions for campaigns in the current tenant'),
        ('action_definitions.read', 'View action definitions in the current tenant'),
        ('action_definitions.update', 'Update action definitions in the current tenant'),
        ('actions.create', 'Record actions against own campaign participations'),
        ('actions.read', 'View own recorded actions in the current tenant'),
        ('actions.update', 'Correct or cancel another participant''s recorded actions'),
        ('submissions.read', 'View action submissions in the current tenant'),
        ('submissions.update', 'Approve or reject action submissions in the current tenant'),
        ('commitments.create', 'Create a commitment on own campaign participations'),
        ('commitments.read', 'View own campaign commitments in the current tenant'),
        ('commitments.update', 'Correct another participant''s campaign commitment')
      ON CONFLICT ("key") DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'tenant_admin'
        AND r.is_system = true
        AND p.key IN (${PHASE5_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
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
      `DROP TRIGGER IF EXISTS trg_submission_same_tenant ON submissions;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_submission_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_action_same_tenant ON actions;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_action_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_commitment_same_tenant ON commitments;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_commitment_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_action_definition_same_tenant ON action_definitions;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_action_definition_same_tenant();`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "submissions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "actions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commitments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "action_definitions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submission_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "action_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "privacy_level_enum";`);

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
            AND p.key IN (${PHASE5_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'permissions'
        ) THEN
          DELETE FROM "permissions"
          WHERE "key" IN (${PHASE5_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
      END $$;
    `);
  }
}
