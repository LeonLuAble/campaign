import { MigrationInterface, QueryRunner } from 'typeorm';

const CAMPAIGN_PERMISSIONS = [
  'campaign_templates.create',
  'campaign_templates.read',
  'campaign_templates.update',
  'campaign_scopes.create',
  'campaign_scopes.read',
  'campaign_scopes.update',
  'campaigns.create',
  'campaigns.read',
  'campaigns.update',
  'participations.create',
  'participations.read',
  'participations.update',
] as const;

const CAMPAIGN_READ_PERMISSIONS = CAMPAIGN_PERMISSIONS.filter((key) =>
  key.endsWith('.read'),
);

export class CreateCampaignTables1792365608000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "campaign_status_enum" AS ENUM (
        'draft', 'published', 'started', 'completed'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "participation_status_enum" AS ENUM (
        'enrolled', 'withdrawn'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "campaign_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_campaign_templates_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_campaign_templates_tenant_key" UNIQUE ("tenant_id", "key"),
        CONSTRAINT "chk_campaign_templates_key_not_blank"
          CHECK (char_length(trim("key")) > 0),
        CONSTRAINT "chk_campaign_templates_name_not_blank"
          CHECK (char_length(trim("name")) > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaign_templates_tenant_id"
      ON "campaign_templates" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "campaign_scopes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "template_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_campaign_scopes_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_campaign_scopes_template_id"
          FOREIGN KEY ("template_id") REFERENCES "campaign_templates"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_campaign_scopes_template_key" UNIQUE ("template_id", "key"),
        CONSTRAINT "chk_campaign_scopes_key_not_blank"
          CHECK (char_length(trim("key")) > 0),
        CONSTRAINT "chk_campaign_scopes_name_not_blank"
          CHECK (char_length(trim("name")) > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaign_scopes_tenant_id"
      ON "campaign_scopes" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaign_scopes_template_id"
      ON "campaign_scopes" ("template_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "template_id" uuid NOT NULL,
        "scope_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "description" varchar(2000),
        "status" "campaign_status_enum" NOT NULL,
        "timezone" varchar(64) NOT NULL,
        "starts_on" date,
        "ends_on" date,
        "created_by_user_id" uuid NOT NULL,
        "published_at" timestamptz,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_campaigns_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_campaigns_template_id"
          FOREIGN KEY ("template_id") REFERENCES "campaign_templates"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_campaigns_scope_id"
          FOREIGN KEY ("scope_id") REFERENCES "campaign_scopes"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_campaigns_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_campaigns_tenant_slug" UNIQUE ("tenant_id", "slug"),
        CONSTRAINT "chk_campaigns_name_not_blank"
          CHECK (char_length(trim("name")) > 0),
        CONSTRAINT "chk_campaigns_slug_not_blank"
          CHECK (char_length(trim("slug")) > 0),
        CONSTRAINT "chk_campaigns_timezone_not_blank"
          CHECK (char_length(trim("timezone")) > 0),
        CONSTRAINT "chk_campaigns_date_order"
          CHECK (
            "starts_on" IS NULL
            OR "ends_on" IS NULL
            OR "ends_on" >= "starts_on"
          )
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaigns_tenant_id" ON "campaigns" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaigns_tenant_status"
      ON "campaigns" ("tenant_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaigns_tenant_starts_on"
      ON "campaigns" ("tenant_id", "starts_on");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaigns_template_id" ON "campaigns" ("template_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaigns_scope_id" ON "campaigns" ("scope_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "campaign_configurations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_campaign_configurations_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_campaign_configurations_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE CASCADE,
        CONSTRAINT "uq_campaign_configurations_campaign_id" UNIQUE ("campaign_id"),
        CONSTRAINT "chk_campaign_configurations_settings_object"
          CHECK (jsonb_typeof("settings") = 'object')
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaign_configurations_tenant_id"
      ON "campaign_configurations" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "campaign_communities" (
        "campaign_id" uuid NOT NULL,
        "community_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("campaign_id", "community_id"),
        CONSTRAINT "fk_campaign_communities_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_campaign_communities_community_id"
          FOREIGN KEY ("community_id") REFERENCES "community_nodes"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_campaign_communities_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaign_communities_tenant_id"
      ON "campaign_communities" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_campaign_communities_community_id"
      ON "campaign_communities" ("community_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "participations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "community_id" uuid,
        "status" "participation_status_enum" NOT NULL,
        "enrolled_at" timestamptz NOT NULL DEFAULT now(),
        "withdrawn_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_participations_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_participations_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_participations_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_participations_community_id"
          FOREIGN KEY ("community_id") REFERENCES "community_nodes"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_participations_campaign_user" UNIQUE ("campaign_id", "user_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_participations_tenant_id" ON "participations" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_participations_campaign_id"
      ON "participations" ("campaign_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_participations_user_id" ON "participations" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_participations_tenant_campaign"
      ON "participations" ("tenant_id", "campaign_id");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_campaign_scope_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaign_templates t
        WHERE t.id = NEW.template_id AND t.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'template must belong to the same tenant as the scope';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_campaign_scope_same_tenant
      BEFORE INSERT OR UPDATE OF template_id, tenant_id ON campaign_scopes
      FOR EACH ROW EXECUTE FUNCTION enforce_campaign_scope_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_campaign_catalog_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaign_templates t
        WHERE t.id = NEW.template_id AND t.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'template must belong to the same tenant as the campaign';
        END IF;
        PERFORM 1
        FROM campaign_scopes s
        WHERE s.id = NEW.scope_id
          AND s.tenant_id = NEW.tenant_id
          AND s.template_id = NEW.template_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'scope must belong to the campaign template and tenant';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_campaign_catalog_same_tenant
      BEFORE INSERT OR UPDATE OF template_id, scope_id, tenant_id ON campaigns
      FOR EACH ROW EXECUTE FUNCTION enforce_campaign_catalog_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_campaign_configuration_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'configuration must belong to the same tenant as the campaign';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_campaign_configuration_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, tenant_id ON campaign_configurations
      FOR EACH ROW EXECUTE FUNCTION enforce_campaign_configuration_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_campaign_community_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'campaign must belong to the same tenant as the target community';
        END IF;
        PERFORM 1
        FROM community_nodes n
        WHERE n.id = NEW.community_id AND n.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'community must belong to the same tenant as the campaign';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_campaign_community_same_tenant
      BEFORE INSERT OR UPDATE ON campaign_communities
      FOR EACH ROW EXECUTE FUNCTION enforce_campaign_community_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_participation_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM campaigns c
        WHERE c.id = NEW.campaign_id AND c.tenant_id = NEW.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'participation must belong to the same tenant as the campaign';
        END IF;
        IF NEW.community_id IS NOT NULL THEN
          PERFORM 1
          FROM community_nodes n
          WHERE n.id = NEW.community_id AND n.tenant_id = NEW.tenant_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'community must belong to the same tenant as the participation';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_participation_same_tenant
      BEFORE INSERT OR UPDATE OF campaign_id, community_id, tenant_id
      ON participations
      FOR EACH ROW EXECUTE FUNCTION enforce_participation_same_tenant();
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('campaign_templates.create', 'Create campaign templates in the current tenant'),
        ('campaign_templates.read', 'View campaign templates in the current tenant'),
        ('campaign_templates.update', 'Update campaign templates in the current tenant'),
        ('campaign_scopes.create', 'Create campaign scopes in the current tenant'),
        ('campaign_scopes.read', 'View campaign scopes in the current tenant'),
        ('campaign_scopes.update', 'Update campaign scopes in the current tenant'),
        ('campaigns.create', 'Create campaigns in the current tenant'),
        ('campaigns.read', 'View campaigns in the current tenant'),
        ('campaigns.update', 'Update campaigns and drive lifecycle in the current tenant'),
        ('participations.create', 'Enroll users in campaigns in the current tenant'),
        ('participations.read', 'View campaign participations in the current tenant'),
        ('participations.update', 'Withdraw campaign participations in the current tenant')
      ON CONFLICT ("key") DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'tenant_admin'
        AND r.is_system = true
        AND p.key IN (${CAMPAIGN_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'member'
        AND r.is_system = true
        AND p.key IN (${CAMPAIGN_READ_PERMISSIONS.map((key) => `'${key}'`).join(', ')})
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_participation_same_tenant ON participations;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_participation_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_campaign_community_same_tenant ON campaign_communities;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_campaign_community_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_campaign_configuration_same_tenant ON campaign_configurations;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_campaign_configuration_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_campaign_catalog_same_tenant ON campaigns;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_campaign_catalog_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_campaign_scope_same_tenant ON campaign_scopes;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_campaign_scope_same_tenant();`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "participations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_communities";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_configurations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_scopes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_templates";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "participation_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_status_enum";`);

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
            AND p.key IN (${CAMPAIGN_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'permissions'
        ) THEN
          DELETE FROM "permissions"
          WHERE "key" IN (${CAMPAIGN_PERMISSIONS.map((key) => `'${key}'`).join(', ')});
        END IF;
      END $$;
    `);
  }
}
