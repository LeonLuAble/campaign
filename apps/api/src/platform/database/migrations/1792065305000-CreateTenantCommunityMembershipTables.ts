import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantCommunityMembershipTables1792065305000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_tenants_name_not_blank" CHECK (char_length(trim("name")) > 0),
        CONSTRAINT "chk_tenants_slug_not_blank" CHECK (char_length(trim("slug")) > 0),
        CONSTRAINT "uq_tenants_slug" UNIQUE ("slug")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tenants_is_active" ON "tenants" ("is_active");
    `);

    await queryRunner.query(`
      CREATE TABLE "community_nodes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "parent_id" uuid,
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_community_nodes_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_community_nodes_parent_id"
          FOREIGN KEY ("parent_id") REFERENCES "community_nodes"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_community_nodes_name_not_blank" CHECK (char_length(trim("name")) > 0),
        CONSTRAINT "chk_community_nodes_slug_not_blank" CHECK (char_length(trim("slug")) > 0),
        CONSTRAINT "chk_community_nodes_parent_not_self"
          CHECK ("parent_id" IS NULL OR "parent_id" <> "id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_community_nodes_tenant_id" ON "community_nodes" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_community_nodes_parent_id" ON "community_nodes" ("parent_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_community_nodes_tenant_parent_slug"
      ON "community_nodes" (
        "tenant_id",
        COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'),
        "slug"
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "memberships" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "community_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_memberships_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_memberships_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_memberships_community_id"
          FOREIGN KEY ("community_id") REFERENCES "community_nodes"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_memberships_tenant_id" ON "memberships" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_memberships_user_id" ON "memberships" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_memberships_tenant_user" ON "memberships" ("tenant_id", "user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_memberships_community_id" ON "memberships" ("community_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_memberships_tenant_user_community"
      ON "memberships" ("tenant_id", "user_id", "community_id")
      WHERE "community_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_memberships_tenant_user_tenant_level"
      ON "memberships" ("tenant_id", "user_id")
      WHERE "community_id" IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(100) NOT NULL,
        "description" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_permissions_key" UNIQUE ("key")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_roles_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_roles_tenant_key" UNIQUE ("tenant_id", "key"),
        CONSTRAINT "chk_roles_key_not_blank" CHECK (char_length(trim("key")) > 0),
        CONSTRAINT "chk_roles_name_not_blank" CHECK (char_length(trim("name")) > 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_roles_tenant_id" ON "roles" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role_id"
          FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission_id"
          FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "membership_roles" (
        "membership_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("membership_id", "role_id"),
        CONSTRAINT "fk_membership_roles_membership_id"
          FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_membership_roles_role_id"
          FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_membership_roles_role_id" ON "membership_roles" ("role_id");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_community_parent_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.parent_id IS NOT NULL THEN
          PERFORM 1
          FROM community_nodes p
          WHERE p.id = NEW.parent_id AND p.tenant_id = NEW.tenant_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'parent community must belong to the same tenant';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_community_parent_same_tenant
      BEFORE INSERT OR UPDATE OF parent_id, tenant_id ON community_nodes
      FOR EACH ROW EXECUTE FUNCTION enforce_community_parent_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_membership_community_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.community_id IS NOT NULL THEN
          PERFORM 1
          FROM community_nodes c
          WHERE c.id = NEW.community_id AND c.tenant_id = NEW.tenant_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'community must belong to the same tenant as the membership';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_membership_community_same_tenant
      BEFORE INSERT OR UPDATE OF community_id, tenant_id ON memberships
      FOR EACH ROW EXECUTE FUNCTION enforce_membership_community_same_tenant();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_membership_role_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        PERFORM 1
        FROM memberships m
        JOIN roles r ON r.id = NEW.role_id
        WHERE m.id = NEW.membership_id
          AND m.tenant_id = r.tenant_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'role must belong to the same tenant as the membership';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_membership_role_same_tenant
      BEFORE INSERT OR UPDATE ON membership_roles
      FOR EACH ROW EXECUTE FUNCTION enforce_membership_role_same_tenant();
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('customers.read', 'View customer records in the current tenant'),
        ('customers.update', 'Update customer records in the current tenant'),
        ('communities.create', 'Create community nodes in the current tenant'),
        ('communities.read', 'View community nodes in the current tenant'),
        ('communities.update', 'Update community nodes in the current tenant'),
        ('memberships.create', 'Create memberships in the current tenant'),
        ('memberships.read', 'View memberships in the current tenant'),
        ('memberships.update', 'Update memberships in the current tenant'),
        ('memberships.delete', 'Deactivate memberships in the current tenant'),
        ('roles.read', 'View roles in the current tenant'),
        ('roles.create', 'Create custom roles in the current tenant'),
        ('roles.update', 'Update custom roles in the current tenant'),
        ('roles.assign', 'Assign or remove roles on memberships');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_membership_role_same_tenant ON membership_roles;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_membership_role_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_membership_community_same_tenant ON memberships;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_membership_community_same_tenant();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_community_parent_same_tenant ON community_nodes;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_community_parent_same_tenant();`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "membership_roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "memberships";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_nodes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants";`);
  }
}
