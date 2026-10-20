import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M-P3: range submissions. A batch records "the same figure on each of N
 * days"; it expands to one `actions` row per day (each with its own
 * submission), so progress, outcomes and reminders keep reading per-day
 * rows. `uq_actions_recorded_participation_definition_day` stays the
 * overlap backstop.
 */
export class CreateActionBatches1793466617000 implements MigrationInterface {
  name = 'CreateActionBatches1793466617000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "action_batches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "participation_id" uuid NOT NULL,
        "action_definition_id" uuid NOT NULL,
        "start_on" date NOT NULL,
        "end_on" date NOT NULL,
        "day_count" integer NOT NULL,
        "quantity_per_day" integer NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "idempotency_key" varchar(128),
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_action_batches_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_action_batches_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_action_batches_participation_id"
          FOREIGN KEY ("participation_id") REFERENCES "participations"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_action_batches_action_definition_id"
          FOREIGN KEY ("action_definition_id")
          REFERENCES "action_definitions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_action_batches_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_action_batches_day_count"
          CHECK ("day_count" BETWEEN 1 AND 92),
        CONSTRAINT "chk_action_batches_range"
          CHECK ("end_on" = "start_on" + ("day_count" - 1)),
        CONSTRAINT "chk_action_batches_quantity_positive"
          CHECK ("quantity_per_day" > 0),
        CONSTRAINT "chk_action_batches_payload_object"
          CHECK (jsonb_typeof("payload") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_action_batches_tenant_id"
      ON "action_batches" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_action_batches_campaign_id"
      ON "action_batches" ("campaign_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_action_batches_participation_id"
      ON "action_batches" ("participation_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_action_batches_participation_idempotency_key"
      ON "action_batches" ("participation_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_action_batch_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM participations p
        WHERE p.id = NEW.participation_id
          AND p.tenant_id = NEW.tenant_id
          AND p.campaign_id = NEW.campaign_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'action batch must belong to the same tenant and campaign as the participation';
        END IF;
        PERFORM 1
        FROM action_definitions d
        WHERE d.id = NEW.action_definition_id
          AND d.tenant_id = NEW.tenant_id
          AND d.campaign_id = NEW.campaign_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'action definition must belong to the same tenant and campaign as the action batch';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_action_batch_same_tenant
      BEFORE INSERT OR UPDATE OF participation_id, action_definition_id,
        campaign_id, tenant_id
      ON action_batches
      FOR EACH ROW EXECUTE FUNCTION enforce_action_batch_same_tenant();
    `);

    await queryRunner.query(`
      ALTER TABLE "actions"
        ADD COLUMN "batch_id" uuid NULL,
        ADD CONSTRAINT "fk_actions_batch_id"
          FOREIGN KEY ("batch_id") REFERENCES "action_batches"("id")
          ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_actions_batch_id"
      ON "actions" ("batch_id")
      WHERE "batch_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_action_batch_membership()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.batch_id IS NULL THEN
          RETURN NEW;
        END IF;
        PERFORM 1
        FROM action_batches b
        WHERE b.id = NEW.batch_id
          AND b.tenant_id = NEW.tenant_id
          AND b.participation_id = NEW.participation_id
          AND b.action_definition_id = NEW.action_definition_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'action must belong to the same tenant, participation and definition as its batch';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_action_batch_membership
      BEFORE INSERT OR UPDATE OF batch_id, participation_id,
        action_definition_id, tenant_id
      ON actions
      FOR EACH ROW EXECUTE FUNCTION enforce_action_batch_membership();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_action_batch_membership ON actions;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_action_batch_membership();`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_actions_batch_id";`);
    await queryRunner.query(`
      ALTER TABLE "actions"
        DROP CONSTRAINT IF EXISTS "fk_actions_batch_id",
        DROP COLUMN IF EXISTS "batch_id";
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_action_batch_same_tenant ON action_batches;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_action_batch_same_tenant();`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "action_batches";`);
  }
}
