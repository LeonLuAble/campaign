import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "first_name" varchar(100),
        "last_name" varchar(100),
        "display_name" varchar(255),
        "locale" varchar(10),
        "timezone" varchar(10),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "identity_type_enum" AS ENUM ('email', 'mobile');
    `);

    await queryRunner.query(`
      CREATE TABLE "user_identities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" identity_type_enum NOT NULL,
        "identifier" varchar(255) NOT NULL,
        "normalized_identifier" varchar(255) NOT NULL,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_identities_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_user_identities_type_normalized" UNIQUE ("type", "normalized_identifier")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_identities_user_id" ON "user_identities"("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_identities_type_normalized" ON "user_identities"("type", "normalized_identifier");
    `);

    await queryRunner.query(`
      CREATE TABLE "user_credentials" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_credentials_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_credentials_user_id" ON "user_credentials"("user_id");
    `);

    await queryRunner.query(`
      CREATE TYPE "social_provider_enum" AS ENUM ('google', 'apple');
    `);

    await queryRunner.query(`
      CREATE TABLE "user_social_identities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "provider" social_provider_enum NOT NULL,
        "provider_subject" varchar(255) NOT NULL,
        "provider_email" varchar(255),
        "last_used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_social_identities_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_user_social_identities_provider_subject" UNIQUE ("provider", "provider_subject")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_social_identities_user_id" ON "user_social_identities"("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_social_identities_provider_subject" ON "user_social_identities"("provider", "provider_subject");
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "family_id" uuid NOT NULL,
        "parent_token_id" uuid,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "revocation_reason" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_family_id" ON "refresh_tokens"("family_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");
    `);

    await queryRunner.query(`
      CREATE TYPE "user_token_type_enum" AS ENUM ('activation', 'password_reset');
    `);

    await queryRunner.query(`
      CREATE TABLE "user_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" user_token_type_enum NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_tokens_user_id" ON "user_tokens"("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_tokens_token_hash" ON "user_tokens"("token_hash");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_tokens_type_expires_at" ON "user_tokens"("type", "expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tokens" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_token_type_enum";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE;`);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_social_identities" CASCADE;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "social_provider_enum";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_credentials" CASCADE;`);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_identities" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_type_enum";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
  }
}
