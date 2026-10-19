import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M-P2: per-period commitments. Adds the commitment window and the milestone
 * that closes the period, and relaxes one-commitment-per-participation to one
 * per (participation, period). Existing rows keep NULL windows and remain
 * whole-campaign commitments; no data is rewritten.
 */
export class AddCommitmentPeriods1793366516000 implements MigrationInterface {
  name = 'AddCommitmentPeriods1793366516000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD COLUMN "valid_from" date NULL,
        ADD COLUMN "valid_to" date NULL,
        ADD COLUMN "period_milestone_id" uuid NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD CONSTRAINT "fk_commitments_period_milestone_id"
          FOREIGN KEY ("period_milestone_id") REFERENCES "milestones"("id")
          ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD CONSTRAINT "chk_commitments_window"
          CHECK (
            ("valid_from" IS NULL AND "valid_to" IS NULL)
            OR (
              "valid_from" IS NOT NULL
              AND "valid_to" IS NOT NULL
              AND "valid_from" <= "valid_to"
            )
          );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_commitments_period_milestone_id"
      ON "commitments" ("period_milestone_id")
      WHERE "period_milestone_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        DROP CONSTRAINT "uq_commitments_participation_id";
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_commitments_participation_whole_campaign"
      ON "commitments" ("participation_id")
      WHERE "valid_to" IS NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_commitments_participation_period"
      ON "commitments" ("participation_id", "valid_to")
      WHERE "valid_to" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT count(*)::int AS count
      FROM (
        SELECT "participation_id"
        FROM "commitments"
        GROUP BY "participation_id"
        HAVING count(*) > 1
      ) AS periodised;
    `)) as Array<{ count: number }>;
    if ((rows[0]?.count ?? 0) > 0) {
      throw new Error(
        'Cannot revert AddCommitmentPeriods: participations hold per-period commitments',
      );
    }
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_commitments_participation_period";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_commitments_participation_whole_campaign";
    `);
    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD CONSTRAINT "uq_commitments_participation_id"
          UNIQUE ("participation_id");
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_commitments_period_milestone_id";
    `);
    await queryRunner.query(`
      ALTER TABLE "commitments"
        DROP CONSTRAINT "chk_commitments_window",
        DROP CONSTRAINT "fk_commitments_period_milestone_id",
        DROP COLUMN "period_milestone_id",
        DROP COLUMN "valid_to",
        DROP COLUMN "valid_from";
    `);
  }
}
