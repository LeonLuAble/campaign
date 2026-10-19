import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M-E: enrolment source on participations and decision columns on commitments.
 * Additive only. Does not touch uq_commitments_participation_id (P2).
 */
export class AddEnrolmentSourceAndCommitmentDecision1793166314000
  implements MigrationInterface
{
  name = 'AddEnrolmentSourceAndCommitmentDecision1793166314000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "enrolment_source_enum" AS ENUM ('self', 'auto', 'admin');
    `);
    await queryRunner.query(`
      CREATE TYPE "commitment_decision_enum" AS ENUM (
        'committed', 'not_taking_part'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "participations"
        ADD COLUMN "enrolment_source" "enrolment_source_enum"
          NOT NULL DEFAULT 'self';
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD COLUMN "decision" "commitment_decision_enum"
          NOT NULL DEFAULT 'committed';
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        ALTER COLUMN "target_value" DROP NOT NULL,
        ALTER COLUMN "unit" DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        DROP CONSTRAINT "chk_commitments_target_value_positive",
        DROP CONSTRAINT "chk_commitments_unit_not_blank";
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD CONSTRAINT "chk_commitments_decision_target"
          CHECK (
            "decision" = 'not_taking_part'
            OR (
              "target_value" IS NOT NULL
              AND "target_value" > 0
              AND "unit" IS NOT NULL
              AND char_length(trim("unit")) > 0
            )
          );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commitments"
        DROP CONSTRAINT "chk_commitments_decision_target";
    `);

    await queryRunner.query(`
      UPDATE "commitments"
      SET "target_value" = 1
      WHERE "target_value" IS NULL;
    `);
    await queryRunner.query(`
      UPDATE "commitments"
      SET "unit" = 'days'
      WHERE "unit" IS NULL OR char_length(trim("unit")) = 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        ALTER COLUMN "target_value" SET NOT NULL,
        ALTER COLUMN "unit" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments"
        ADD CONSTRAINT "chk_commitments_target_value_positive"
          CHECK ("target_value" > 0),
        ADD CONSTRAINT "chk_commitments_unit_not_blank"
          CHECK (char_length(trim("unit")) > 0);
    `);

    await queryRunner.query(`
      ALTER TABLE "commitments" DROP COLUMN "decision";
    `);
    await queryRunner.query(`
      ALTER TABLE "participations" DROP COLUMN "enrolment_source";
    `);

    await queryRunner.query(`DROP TYPE "commitment_decision_enum";`);
    await queryRunner.query(`DROP TYPE "enrolment_source_enum";`);
  }
}
