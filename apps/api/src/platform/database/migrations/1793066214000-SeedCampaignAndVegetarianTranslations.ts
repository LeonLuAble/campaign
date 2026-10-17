import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds platform translations for campaign rule strategies and vegetarian
 * pledge choice labels/descriptions (en + zh-Hans). Additive only.
 */
export class SeedCampaignAndVegetarianTranslations1793066214000
  implements MigrationInterface
{
  name = 'SeedCampaignAndVegetarianTranslations1793066214000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "translations" ("locale", "namespace", "key", "value")
      VALUES
        ('en', 'campaigns', 'strategies.generic.label', 'Generic'),
        ('en', 'campaigns', 'strategies.generic.description', 'No built-in pledge catalog. Configure action definitions for the campaign.'),
        ('zh-Hans', 'campaigns', 'strategies.generic.label', '通用'),
        ('zh-Hans', 'campaigns', 'strategies.generic.description', '无内置发愿目录。请为活动配置行动定义。'),

        ('en', 'vegetarian', 'strategy.label', 'Vegetarian (速素数数)'),
        ('en', 'vegetarian', 'strategy.description', 'Seven pledge choices with days and meals units for a vegetarian observance campaign.'),
        ('en', 'vegetarian', 'actions.vegetarian_day.name', 'Vegetarian day'),
        ('en', 'vegetarian', 'actions.vegetarian_meal.name', 'Vegetarian meal'),
        ('zh-Hans', 'vegetarian', 'strategy.label', '速素数数'),
        ('zh-Hans', 'vegetarian', 'strategy.description', '七种发愿选择，以「日」与「餐」为单位记录素食行动。'),
        ('zh-Hans', 'vegetarian', 'actions.vegetarian_day.name', '素食日'),
        ('zh-Hans', 'vegetarian', 'actions.vegetarian_meal.name', '素食餐'),

        ('en', 'vegetarian', 'choices.sui_yuan_su.label', 'Sui Yuan Su'),
        ('en', 'vegetarian', 'choices.sui_yuan_su.description', 'Join when you can; record vegetarian meals without a fixed target.'),
        ('en', 'vegetarian', 'choices.huan_xi_su.label', 'Huan Xi Su'),
        ('en', 'vegetarian', 'choices.huan_xi_su.description', 'Joyful vegetarian meals; set your own meal target.'),
        ('en', 'vegetarian', 'choices.ding_ri_su.label', 'Ding Ri Su'),
        ('en', 'vegetarian', 'choices.ding_ri_su.description', 'Fixed vegetarian days; set your own day target.'),
        ('en', 'vegetarian', 'choices.yi_zhou_su.label', 'Yi Zhou Su'),
        ('en', 'vegetarian', 'choices.yi_zhou_su.description', 'One week of vegetarian days (suggested target: 7 days).'),
        ('en', 'vegetarian', 'choices.quan_yue_su.label', 'Quan Yue Su'),
        ('en', 'vegetarian', 'choices.quan_yue_su.description', 'A full month of vegetarian days (suggested target: 30 days).'),
        ('en', 'vegetarian', 'choices.fa_yuan_su.label', 'Fa Yuan Su'),
        ('en', 'vegetarian', 'choices.fa_yuan_su.description', 'A personal vow; set your own day target.'),
        ('en', 'vegetarian', 'choices.yi_quan_su.label', 'Yi Quan Su'),
        ('en', 'vegetarian', 'choices.yi_quan_su.description', 'Fully vegetarian for the whole campaign duration.'),

        ('zh-Hans', 'vegetarian', 'choices.sui_yuan_su.label', '随缘素'),
        ('zh-Hans', 'vegetarian', 'choices.sui_yuan_su.description', '随缘参与，以餐为单位记录，不设固定目标。'),
        ('zh-Hans', 'vegetarian', 'choices.huan_xi_su.label', '欢喜素'),
        ('zh-Hans', 'vegetarian', 'choices.huan_xi_su.description', '欢喜素食餐次，可自行设定餐数目标。'),
        ('zh-Hans', 'vegetarian', 'choices.ding_ri_su.label', '定日素'),
        ('zh-Hans', 'vegetarian', 'choices.ding_ri_su.description', '选定素食日，可自行设定天数目标。'),
        ('zh-Hans', 'vegetarian', 'choices.yi_zhou_su.label', '一周素'),
        ('zh-Hans', 'vegetarian', 'choices.yi_zhou_su.description', '一周素食日（建议目标：7 天）。'),
        ('zh-Hans', 'vegetarian', 'choices.quan_yue_su.label', '全月素'),
        ('zh-Hans', 'vegetarian', 'choices.quan_yue_su.description', '全月素食日（建议目标：30 天）。'),
        ('zh-Hans', 'vegetarian', 'choices.fa_yuan_su.label', '发愿素'),
        ('zh-Hans', 'vegetarian', 'choices.fa_yuan_su.description', '个人发愿，可自行设定天数目标。'),
        ('zh-Hans', 'vegetarian', 'choices.yi_quan_su.label', '已全素'),
        ('zh-Hans', 'vegetarian', 'choices.yi_quan_su.description', '活动期间全程素食（目标为活动天数）。')
      ON CONFLICT ("locale", "namespace", "key") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "translations"
      WHERE ("namespace" = 'campaigns' AND "key" LIKE 'strategies.generic.%')
         OR ("namespace" = 'vegetarian');
    `);
  }
}
