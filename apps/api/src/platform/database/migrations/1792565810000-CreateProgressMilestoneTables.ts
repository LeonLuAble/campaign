import { MigrationInterface, QueryRunner } from 'typeorm';

const PHASE6_PERMISSIONS = [
  'achievements.read',
  'progress.read',
  'milestones.create',
  'milestones.read',
  'milestones.update',
  'milestones.evaluate',
] as const;

const MEMBER_PERMISSIONS = [
  'achievements.read',
  'progress.read',
  'milestones.read',
] as const;

export class CreateProgressMilestoneTables1792565810000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "milestone_metric_enum" AS ENUM (
        'completion_percent', 'achieved_value'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "milestones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" varchar(2000),
        "metric" "milestone_metric_enum" NOT NULL,
        "threshold_value" integer NOT NULL,
        "unit" varchar(50) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_milestones_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_milestones_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_milestones_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_milestones_campaign_key" UNIQUE ("campaign_id", "key"),
        CONSTRAINT "chk_milestones_key_not_blank"
          CHECK (char_length(trim("key")) > 0),
        CONSTRAINT "chk_milestones_name_not_blank"
          CHECK (char_length(trim("name")) > 0),
        CONSTRAINT "chk_milestones_unit_not_blank"
          CHECK (char_length(trim("unit")) > 0),
        CONSTRAINT "chk_milestones_threshold_positive"
          CHECK ("threshold_value" > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_milestones_tenant_id" ON "milestones" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_milestones_campaign_id"
      ON "milestones" ("campaign_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "milestone_progress" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "milestone_id" uuid NOT NULL,
        "achieved_value" integer NOT NULL,
        "target_value" integer NOT NULL,
        "completion_percent" numeric(10, 2),
        "status" varchar(32) NOT NULL,
        "crossed" boolean NOT NULL,
        "computed_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_milestone_progress_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_milestone_progress_milestone_id"
          FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_milestone_progress_milestone_id" UNIQUE ("milestone_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_milestone_progress_tenant_id"
      ON "milestone_progress" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "milestone_evaluations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "milestone_id" uuid NOT NULL,
        "evaluated_by_user_id" uuid NOT NULL,
        "achieved_value" integer NOT NULL,
        "target_value" integer NOT NULL,
        "completion_percent" numeric(10, 2),
        "status" varchar(32) NOT NULL,
        "crossed" boolean NOT NULL,
        "evaluated_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_milestone_evaluations_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_milestone_evaluations_milestone_id"
          FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_milestone_evaluations_evaluated_by_user_id"
          FOREIGN KEY ("evaluated_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_milestone_evaluations_tenant_id"
      ON "milestone_evaluations" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_milestone_evaluations_milestone_id"
      ON "milestone_evaluations" ("milestone_id");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_milestone_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'milestone must belong to the same tenant as the campaign';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_milestone_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, tenant_id ON milestones
      FOR EACH ROW EXECUTE FUNCTION enforce_milestone_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_milestone_progress_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM milestones m
        WHERE m.id = NEW.milestone_id AND m.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'milestone progress must belong to the same tenant as the milestone';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_milestone_progress_same_tenant
      BEFORE INSERT OR UPDATE OF milestone_id, tenant_id ON milestone_progress
      FOR EACH ROW EXECUTE FUNCTION enforce_milestone_progress_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_milestone_evaluation_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM milestones m
        WHERE m.id = NEW.milestone_id AND m.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'milestone evaluation must belong to the same tenant as the milestone';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_milestone_evaluation_same_tenant
      BEFORE INSERT OR UPDATE OF milestone_id, tenant_id ON milestone_evaluations
      FOR EACH ROW EXECUTE FUNCTION enforce_milestone_evaluation_same_tenant();
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('achievements.read', 'View own campaign achievements in the current tenant'),
        ('progress.read', 'View own progress and allowed campaign or community aggregates'),
        ('milestones.create', 'Create campaign milestones in the current tenant'),
        ('milestones.read', 'View campaign milestones and evaluations in the current tenant'),
        ('milestones.update', 'Update campaign milestones in the current tenant'),
        ('milestones.evaluate', 'Evaluate campaign milestones in the current tenant')
      ON CONFLICT ("key") DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'tenant_admin'
        AND r.is_system = true
        AND p.key IN (${PHASE6_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
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
      `DROP TRIGGER IF EXISTS trg_milestone_evaluation_same_tenant ON milestone_evaluations;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_milestone_evaluation_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_milestone_progress_same_tenant ON milestone_progress;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_milestone_progress_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_milestone_same_tenant ON milestones;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_milestone_same_tenant();`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "milestone_evaluations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestone_progress";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestones";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "milestone_metric_enum";`);

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
            AND p.key IN (${PHASE6_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'permissions'
        ) THEN
          DELETE FROM "permissions"
          WHERE "key" IN (${PHASE6_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
      END $$;
    `);
  }
}
