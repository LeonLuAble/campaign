import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F1 / F-SEC-1: replace the seeded `member` role's grants with an explicit
 * allow-list. Removes memberships.read, roles.read, and user_imports.read
 * (import rows contain email, mobile, and raw CSV) from every existing
 * system `member` role. New tenants pick up the same list via
 * MEMBER_PERMISSION_KEYS in authorization.service seedSystemRoles.
 */
const MEMBER_PERMISSION_ALLOW_LIST = [
  'customers.read',
  'communities.read',
  'campaigns.read',
  'campaign_templates.read',
  'campaign_scopes.read',
  'action_definitions.read',
  'participations.read',
  'actions.read',
  'submissions.read',
  'commitments.read',
  'progress.read',
  'achievements.read',
  'milestones.read',
  'measurement_definitions.read',
  'measurements.read',
  'impact_factors.read',
  'outcomes.read',
  'visualizations.read',
  'dashboards.read',
  'notifications.read',
  'reports.read',
  'commitments.create',
  'actions.create',
  'notifications.update',
] as const;

const MEMBER_PERMISSION_REVOKE = [
  'memberships.read',
  'roles.read',
  'user_imports.read',
] as const;

const allowListSql = MEMBER_PERMISSION_ALLOW_LIST.map((key) => `'${key}'`).join(
  ', ',
);
const revokeSql = MEMBER_PERMISSION_REVOKE.map((key) => `'${key}'`).join(', ');

export class TightenMemberRolePermissions1792866113000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r, "permissions" p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.key = 'member'
        AND r.is_system = true
        AND p.key NOT IN (${allowListSql});
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'member'
        AND r.is_system = true
        AND p.key IN (${allowListSql})
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.key = 'member'
        AND r.is_system = true
        AND p.key IN (${revokeSql})
      ON CONFLICT DO NOTHING;
    `);
  }
}
