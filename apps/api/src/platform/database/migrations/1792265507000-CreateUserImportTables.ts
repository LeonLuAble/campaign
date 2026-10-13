import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserImportTables1792265507000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_import_status_enum" AS ENUM (
        'uploaded', 'mapped', 'validated', 'confirmed'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "user_import_row_status_enum" AS ENUM (
        'pending', 'valid', 'invalid', 'review', 'created', 'matched'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "user_imports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "uploaded_by_user_id" uuid NOT NULL,
        "default_community_id" uuid,
        "original_filename" varchar(255) NOT NULL,
        "status" "user_import_status_enum" NOT NULL,
        "headers" jsonb NOT NULL,
        "column_mapping" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "confirmed_at" timestamptz,
        CONSTRAINT "fk_user_imports_tenant_id"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_imports_uploaded_by_user_id"
          FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_user_imports_default_community_id"
          FOREIGN KEY ("default_community_id") REFERENCES "community_nodes"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_imports_tenant_id" ON "user_imports" ("tenant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_imports_tenant_created_at"
      ON "user_imports" ("tenant_id", "created_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "user_import_rows" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "import_id" uuid NOT NULL,
        "row_number" int NOT NULL,
        "raw_data" jsonb NOT NULL,
        "external_id" varchar(100),
        "email" varchar(255),
        "mobile" varchar(32),
        "first_name" varchar(100),
        "last_name" varchar(100),
        "display_name" varchar(255),
        "community_id" uuid,
        "status" "user_import_row_status_enum" NOT NULL,
        "error_code" varchar(100),
        "error_message" varchar(255),
        "resolved_user_id" uuid,
        "resolved_membership_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_import_rows_import_id"
          FOREIGN KEY ("import_id") REFERENCES "user_imports"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_import_rows_community_id"
          FOREIGN KEY ("community_id") REFERENCES "community_nodes"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_user_import_rows_resolved_user_id"
          FOREIGN KEY ("resolved_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_user_import_rows_resolved_membership_id"
          FOREIGN KEY ("resolved_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL,
        CONSTRAINT "uq_user_import_rows_import_row_number"
          UNIQUE ("import_id", "row_number")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_import_rows_import_id" ON "user_import_rows" ("import_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_import_rows_external_id"
      ON "user_import_rows" ("external_id")
      WHERE "external_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_user_import_community_same_tenant()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.default_community_id IS NOT NULL THEN
          PERFORM 1
          FROM community_nodes c
          WHERE c.id = NEW.default_community_id AND c.tenant_id = NEW.tenant_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'community must belong to the same tenant as the import';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_user_import_community_same_tenant
      BEFORE INSERT OR UPDATE OF default_community_id, tenant_id ON user_imports
      FOR EACH ROW EXECUTE FUNCTION enforce_user_import_community_same_tenant();
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description")
      VALUES
        ('user_imports.create', 'Upload, map, validate and confirm user imports'),
        ('user_imports.read', 'View user imports and per-row results')
      ON CONFLICT ("key") DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'tenant_admin'
        AND r.is_system = true
        AND p.key IN ('user_imports.create', 'user_imports.read')
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'member'
        AND r.is_system = true
        AND p.key = 'user_imports.read'
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_user_import_community_same_tenant ON user_imports;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enforce_user_import_community_same_tenant();`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_import_rows";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_imports";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "user_import_row_status_enum";`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "user_import_status_enum";`);
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
            AND p.key IN ('user_imports.create', 'user_imports.read');
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'permissions'
        ) THEN
          DELETE FROM "permissions"
          WHERE "key" IN ('user_imports.create', 'user_imports.read');
        END IF;
      END $$;
    `);
  }
}
