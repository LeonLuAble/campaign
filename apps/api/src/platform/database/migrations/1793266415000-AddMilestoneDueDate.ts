import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M-P1: dated milestones. Adds a nullable due date and makes the collective
 * goal optional (all three goal columns set, or none). Existing rows keep
 * their goal and get a NULL due date.
 */
export class AddMilestoneDueDate1793266415000 implements MigrationInterface {
  name = 'AddMilestoneDueDate1793266415000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "milestones" ADD COLUMN "due_on" date NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "milestones"
        ALTER COLUMN "metric" DROP NOT NULL,
        ALTER COLUMN "threshold_value" DROP NOT NULL,
        ALTER COLUMN "unit" DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "milestones"
        ADD CONSTRAINT "chk_milestones_goal_all_or_none"
          CHECK (
            (
              "metric" IS NULL
              AND "threshold_value" IS NULL
              AND "unit" IS NULL
            )
            OR (
              "metric" IS NOT NULL
              AND "threshold_value" IS NOT NULL
              AND "unit" IS NOT NULL
            )
          );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_milestones_campaign_due_on"
      ON "milestones" ("campaign_id", "due_on")
      WHERE "due_on" IS NOT NULL AND "is_active";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_milestones_campaign_due_on";
    `);
    await queryRunner.query(`
      ALTER TABLE "milestones"
        DROP CONSTRAINT "chk_milestones_goal_all_or_none";
    `);
    // Goal-less rows cannot satisfy NOT NULL; deactivate them with a
    // placeholder goal rather than deleting history.
    await queryRunner.query(`
      UPDATE "milestones"
      SET "metric" = 'achieved_value',
          "threshold_value" = 1,
          "unit" = 'days',
          "is_active" = false
      WHERE "metric" IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "milestones"
        ALTER COLUMN "metric" SET NOT NULL,
        ALTER COLUMN "threshold_value" SET NOT NULL,
        ALTER COLUMN "unit" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "milestones" DROP COLUMN "due_on";
    `);
  }
}
