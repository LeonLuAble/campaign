import { MigrationInterface, QueryRunner } from 'typeorm';

const PHASE7_PERMISSIONS = [
  'measurement_definitions.create',
  'measurement_definitions.read',
  'measurement_definitions.update',
  'measurements.read',
  'impact_factors.create',
  'impact_factors.read',
  'impact_factors.update',
  'outcomes.read',
  'visualizations.create',
  'visualizations.read',
  'visualizations.update',
  'dashboards.read',
] as const;

const MEMBER_PERMISSIONS = [
  'measurement_definitions.read',
  'measurements.read',
  'impact_factors.read',
  'outcomes.read',
  'visualizations.read',
  'dashboards.read',
] as const;

export class CreateMeasurementOutcomeVisualizationTables1792665911000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "measurement_definitions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "source_unit" varchar(50) NOT NULL,
        "description" varchar(2000),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_measurement_definitions_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_measurement_definitions_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_measurement_definitions_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_measurement_definitions_campaign_key"
          UNIQUE ("campaign_id", "key"),
        CONSTRAINT "uq_measurement_definitions_campaign_source_unit"
          UNIQUE ("campaign_id", "source_unit"),
        CONSTRAINT "chk_measurement_definitions_key_not_blank"
          CHECK (char_length(trim("key")) > 0),
        CONSTRAINT "chk_measurement_definitions_name_not_blank"
          CHECK (char_length(trim("name")) > 0),
        CONSTRAINT "chk_measurement_definitions_source_unit_not_blank"
          CHECK (char_length(trim("source_unit")) > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_measurement_definitions_tenant_id"
      ON "measurement_definitions" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_measurement_definitions_campaign_id"
      ON "measurement_definitions" ("campaign_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "impact_factors" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid,
        "source_unit" varchar(50) NOT NULL,
        "outcome_metric" varchar(100) NOT NULL,
        "outcome_unit" varchar(50) NOT NULL,
        "factor_value" numeric(20, 8) NOT NULL,
        "version" integer NOT NULL,
        "source" varchar(2000) NOT NULL,
        "effective_from" date NOT NULL,
        "effective_to" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_impact_factors_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_impact_factors_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_impact_factors_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_impact_factors_source_unit_not_blank"
          CHECK (char_length(trim("source_unit")) > 0),
        CONSTRAINT "chk_impact_factors_outcome_metric_not_blank"
          CHECK (char_length(trim("outcome_metric")) > 0),
        CONSTRAINT "chk_impact_factors_outcome_unit_not_blank"
          CHECK (char_length(trim("outcome_unit")) > 0),
        CONSTRAINT "chk_impact_factors_source_not_blank"
          CHECK (char_length(trim("source")) > 0),
        CONSTRAINT "chk_impact_factors_factor_positive"
          CHECK ("factor_value" > 0),
        CONSTRAINT "chk_impact_factors_version_positive"
          CHECK ("version" > 0),
        CONSTRAINT "chk_impact_factors_effective_range"
          CHECK (
            "effective_to" IS NULL OR "effective_to" > "effective_from"
          )
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_impact_factors_version"
      ON "impact_factors" (
        "tenant_id",
        COALESCE("campaign_id", '00000000-0000-0000-0000-000000000000'),
        "source_unit",
        "outcome_metric",
        "version"
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_impact_factors_tenant_id"
      ON "impact_factors" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_impact_factors_campaign_id"
      ON "impact_factors" ("campaign_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_impact_factors_source_metric"
      ON "impact_factors" ("source_unit", "outcome_metric");
    `);

    await queryRunner.query(`
      CREATE TABLE "visualizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_visualizations_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_visualizations_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_visualizations_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_visualizations_campaign_id" UNIQUE ("campaign_id"),
        CONSTRAINT "chk_visualizations_type_not_blank"
          CHECK (char_length(trim("type")) > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_visualizations_tenant_id"
      ON "visualizations" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_measurement_definition_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'measurement definition must belong to the same tenant as the campaign';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_measurement_definition_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, tenant_id ON measurement_definitions
      FOR EACH ROW EXECUTE FUNCTION enforce_measurement_definition_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_impact_factor_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.campaign_id IS NOT NULL THEN
          PERFORM 1
          FROM campaigns c
          WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'impact factor must belong to the same tenant as the campaign';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_impact_factor_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, tenant_id ON impact_factors
      FOR EACH ROW EXECUTE FUNCTION enforce_impact_factor_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_visualization_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'visualization must belong to the same tenant as the campaign';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_visualization_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, tenant_id ON visualizations
      FOR EACH ROW EXECUTE FUNCTION enforce_visualization_same_tenant();
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('measurement_definitions.create', 'Create campaign measurement definitions in the current tenant'),
        ('measurement_definitions.read', 'View campaign measurement definitions in the current tenant'),
        ('measurement_definitions.update', 'Update campaign measurement definitions in the current tenant'),
        ('measurements.read', 'View own measurements and allowed campaign or community aggregates'),
        ('impact_factors.create', 'Create versioned impact factors in the current tenant'),
        ('impact_factors.read', 'View impact factors in the current tenant'),
        ('impact_factors.update', 'Update impact factor metadata in the current tenant'),
        ('outcomes.read', 'View own outcomes and allowed campaign or community aggregates'),
        ('visualizations.create', 'Create campaign visualizations in the current tenant'),
        ('visualizations.read', 'View campaign visualizations in the current tenant'),
        ('visualizations.update', 'Update campaign visualizations in the current tenant'),
        ('dashboards.read', 'View own dashboards and allowed campaign or community aggregates')
      ON CONFLICT ("key") DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'tenant_admin'
        AND r.is_system = true
        AND p.key IN (${PHASE7_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
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
      `DROP TRIGGER IF EXISTS trg_visualization_same_tenant ON visualizations;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_visualization_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_impact_factor_same_tenant ON impact_factors;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_impact_factor_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_measurement_definition_same_tenant ON measurement_definitions;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_measurement_definition_same_tenant();`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "visualizations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "impact_factors";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "measurement_definitions";`);

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
            AND p.key IN (${PHASE7_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'permissions'
        ) THEN
          DELETE FROM "permissions"
          WHERE "key" IN (${PHASE7_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
      END $$;
    `);
  }
}
