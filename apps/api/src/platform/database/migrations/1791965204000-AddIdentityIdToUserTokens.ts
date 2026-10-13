import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentityIdToUserTokens1791965204000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_tokens"
      ADD COLUMN "identity_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "user_tokens"
      ADD CONSTRAINT "fk_user_tokens_identity_id"
      FOREIGN KEY ("identity_id")
      REFERENCES "user_identities"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_tokens_identity_id"
      ON "user_tokens"("identity_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_user_tokens_identity_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_tokens"
      DROP CONSTRAINT IF EXISTS "fk_user_tokens_identity_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_tokens"
      DROP COLUMN IF EXISTS "identity_id"
    `);
  }
}
