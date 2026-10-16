export const PERMISSIONS = {
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_UPDATE: 'customers.update',
  COMMUNITIES_CREATE: 'communities.create',
  COMMUNITIES_READ: 'communities.read',
  COMMUNITIES_UPDATE: 'communities.update',
  MEMBERSHIPS_CREATE: 'memberships.create',
  MEMBERSHIPS_READ: 'memberships.read',
  MEMBERSHIPS_UPDATE: 'memberships.update',
  MEMBERSHIPS_DELETE: 'memberships.delete',
  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_ASSIGN: 'roles.assign',
  USER_IMPORTS_CREATE: 'user_imports.create',
  USER_IMPORTS_READ: 'user_imports.read',
  CAMPAIGN_TEMPLATES_CREATE: 'campaign_templates.create',
  CAMPAIGN_TEMPLATES_READ: 'campaign_templates.read',
  CAMPAIGN_TEMPLATES_UPDATE: 'campaign_templates.update',
  CAMPAIGN_SCOPES_CREATE: 'campaign_scopes.create',
  CAMPAIGN_SCOPES_READ: 'campaign_scopes.read',
  CAMPAIGN_SCOPES_UPDATE: 'campaign_scopes.update',
  CAMPAIGNS_CREATE: 'campaigns.create',
  CAMPAIGNS_READ: 'campaigns.read',
  CAMPAIGNS_UPDATE: 'campaigns.update',
  PARTICIPATIONS_CREATE: 'participations.create',
  PARTICIPATIONS_READ: 'participations.read',
  PARTICIPATIONS_UPDATE: 'participations.update',
  ACTION_DEFINITIONS_CREATE: 'action_definitions.create',
  ACTION_DEFINITIONS_READ: 'action_definitions.read',
  ACTION_DEFINITIONS_UPDATE: 'action_definitions.update',
  ACTIONS_CREATE: 'actions.create',
  ACTIONS_READ: 'actions.read',
  ACTIONS_UPDATE: 'actions.update',
  SUBMISSIONS_READ: 'submissions.read',
  SUBMISSIONS_UPDATE: 'submissions.update',
  COMMITMENTS_CREATE: 'commitments.create',
  COMMITMENTS_READ: 'commitments.read',
  COMMITMENTS_UPDATE: 'commitments.update',
  ACHIEVEMENTS_READ: 'achievements.read',
  PROGRESS_READ: 'progress.read',
  MILESTONES_CREATE: 'milestones.create',
  MILESTONES_READ: 'milestones.read',
  MILESTONES_UPDATE: 'milestones.update',
  MILESTONES_EVALUATE: 'milestones.evaluate',
  MEASUREMENT_DEFINITIONS_CREATE: 'measurement_definitions.create',
  MEASUREMENT_DEFINITIONS_READ: 'measurement_definitions.read',
  MEASUREMENT_DEFINITIONS_UPDATE: 'measurement_definitions.update',
  MEASUREMENTS_READ: 'measurements.read',
  IMPACT_FACTORS_CREATE: 'impact_factors.create',
  IMPACT_FACTORS_READ: 'impact_factors.read',
  IMPACT_FACTORS_UPDATE: 'impact_factors.update',
  OUTCOMES_READ: 'outcomes.read',
  VISUALIZATIONS_CREATE: 'visualizations.create',
  VISUALIZATIONS_READ: 'visualizations.read',
  VISUALIZATIONS_UPDATE: 'visualizations.update',
  DASHBOARDS_READ: 'dashboards.read',
  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_UPDATE: 'notifications.update',
  REPORTS_READ: 'reports.read',
  REPORTS_EXPORT: 'reports.export',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

export const READ_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSION_KEYS.filter(
  (key) => key.endsWith('.read'),
);

export const MEMBER_SELF_CREATE_PERMISSION_KEYS: PermissionKey[] = [
  PERMISSIONS.COMMITMENTS_CREATE,
  PERMISSIONS.ACTIONS_CREATE,
  PERMISSIONS.NOTIFICATIONS_UPDATE,
];

/**
 * Explicit member read allow-list (F1 / F-SEC-1).
 * Deliberately excludes memberships.read, roles.read, and user_imports.read —
 * those expose other users' memberships, role catalogs, or import-row PII.
 */
export const MEMBER_READ_PERMISSION_KEYS: PermissionKey[] = [
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.COMMUNITIES_READ,
  PERMISSIONS.CAMPAIGNS_READ,
  PERMISSIONS.CAMPAIGN_TEMPLATES_READ,
  PERMISSIONS.CAMPAIGN_SCOPES_READ,
  PERMISSIONS.ACTION_DEFINITIONS_READ,
  PERMISSIONS.PARTICIPATIONS_READ,
  PERMISSIONS.ACTIONS_READ,
  PERMISSIONS.SUBMISSIONS_READ,
  PERMISSIONS.COMMITMENTS_READ,
  PERMISSIONS.PROGRESS_READ,
  PERMISSIONS.ACHIEVEMENTS_READ,
  PERMISSIONS.MILESTONES_READ,
  PERMISSIONS.MEASUREMENT_DEFINITIONS_READ,
  PERMISSIONS.MEASUREMENTS_READ,
  PERMISSIONS.IMPACT_FACTORS_READ,
  PERMISSIONS.OUTCOMES_READ,
  PERMISSIONS.VISUALIZATIONS_READ,
  PERMISSIONS.DASHBOARDS_READ,
  PERMISSIONS.NOTIFICATIONS_READ,
  PERMISSIONS.REPORTS_READ,
];

export const MEMBER_PERMISSION_KEYS: PermissionKey[] = [
  ...new Set([
    ...MEMBER_READ_PERMISSION_KEYS,
    ...MEMBER_SELF_CREATE_PERMISSION_KEYS,
  ]),
];

export const SYSTEM_ROLE_TENANT_ADMIN = 'tenant_admin';
export const SYSTEM_ROLE_MEMBER = 'member';

export const PERMISSION_CATALOG: ReadonlyArray<{
  key: PermissionKey;
  description: string;
}> = [
  {
    key: PERMISSIONS.CUSTOMERS_READ,
    description: 'View customer records in the current tenant',
  },
  {
    key: PERMISSIONS.CUSTOMERS_UPDATE,
    description: 'Update customer records in the current tenant',
  },
  {
    key: PERMISSIONS.COMMUNITIES_CREATE,
    description: 'Create community nodes in the current tenant',
  },
  {
    key: PERMISSIONS.COMMUNITIES_READ,
    description: 'View community nodes in the current tenant',
  },
  {
    key: PERMISSIONS.COMMUNITIES_UPDATE,
    description: 'Update community nodes in the current tenant',
  },
  {
    key: PERMISSIONS.MEMBERSHIPS_CREATE,
    description: 'Create memberships in the current tenant',
  },
  {
    key: PERMISSIONS.MEMBERSHIPS_READ,
    description: 'View memberships in the current tenant',
  },
  {
    key: PERMISSIONS.MEMBERSHIPS_UPDATE,
    description: 'Update memberships in the current tenant',
  },
  {
    key: PERMISSIONS.MEMBERSHIPS_DELETE,
    description: 'Deactivate memberships in the current tenant',
  },
  {
    key: PERMISSIONS.ROLES_READ,
    description: 'View roles in the current tenant',
  },
  {
    key: PERMISSIONS.ROLES_CREATE,
    description: 'Create custom roles in the current tenant',
  },
  {
    key: PERMISSIONS.ROLES_UPDATE,
    description: 'Update custom roles in the current tenant',
  },
  {
    key: PERMISSIONS.ROLES_ASSIGN,
    description: 'Assign or remove roles on memberships',
  },
  {
    key: PERMISSIONS.USER_IMPORTS_CREATE,
    description: 'Upload, map, validate and confirm user imports',
  },
  {
    key: PERMISSIONS.USER_IMPORTS_READ,
    description: 'View user imports and per-row results',
  },
  {
    key: PERMISSIONS.CAMPAIGN_TEMPLATES_CREATE,
    description: 'Create campaign templates in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGN_TEMPLATES_READ,
    description: 'View campaign templates in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGN_TEMPLATES_UPDATE,
    description: 'Update campaign templates in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGN_SCOPES_CREATE,
    description: 'Create campaign scopes in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGN_SCOPES_READ,
    description: 'View campaign scopes in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGN_SCOPES_UPDATE,
    description: 'Update campaign scopes in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGNS_CREATE,
    description: 'Create campaigns in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGNS_READ,
    description: 'View campaigns in the current tenant',
  },
  {
    key: PERMISSIONS.CAMPAIGNS_UPDATE,
    description: 'Update campaigns and drive lifecycle in the current tenant',
  },
  {
    key: PERMISSIONS.PARTICIPATIONS_CREATE,
    description: 'Enroll users in campaigns in the current tenant',
  },
  {
    key: PERMISSIONS.PARTICIPATIONS_READ,
    description: 'View campaign participations in the current tenant',
  },
  {
    key: PERMISSIONS.PARTICIPATIONS_UPDATE,
    description: 'Withdraw campaign participations in the current tenant',
  },
  {
    key: PERMISSIONS.ACTION_DEFINITIONS_CREATE,
    description:
      'Create action definitions for campaigns in the current tenant',
  },
  {
    key: PERMISSIONS.ACTION_DEFINITIONS_READ,
    description: 'View action definitions in the current tenant',
  },
  {
    key: PERMISSIONS.ACTION_DEFINITIONS_UPDATE,
    description: 'Update action definitions in the current tenant',
  },
  {
    key: PERMISSIONS.ACTIONS_CREATE,
    description: 'Record actions against own campaign participations',
  },
  {
    key: PERMISSIONS.ACTIONS_READ,
    description: 'View own recorded actions in the current tenant',
  },
  {
    key: PERMISSIONS.ACTIONS_UPDATE,
    description: "Correct or cancel another participant's recorded actions",
  },
  {
    key: PERMISSIONS.SUBMISSIONS_READ,
    description: 'View action submissions in the current tenant',
  },
  {
    key: PERMISSIONS.SUBMISSIONS_UPDATE,
    description: 'Approve or reject action submissions in the current tenant',
  },
  {
    key: PERMISSIONS.COMMITMENTS_CREATE,
    description: 'Create a commitment on own campaign participations',
  },
  {
    key: PERMISSIONS.COMMITMENTS_READ,
    description: 'View own campaign commitments in the current tenant',
  },
  {
    key: PERMISSIONS.COMMITMENTS_UPDATE,
    description: "Correct another participant's campaign commitment",
  },
  {
    key: PERMISSIONS.ACHIEVEMENTS_READ,
    description: 'View own campaign achievements in the current tenant',
  },
  {
    key: PERMISSIONS.PROGRESS_READ,
    description:
      'View own progress and allowed campaign or community aggregates',
  },
  {
    key: PERMISSIONS.MILESTONES_CREATE,
    description: 'Create campaign milestones in the current tenant',
  },
  {
    key: PERMISSIONS.MILESTONES_READ,
    description:
      'View campaign milestones and evaluations in the current tenant',
  },
  {
    key: PERMISSIONS.MILESTONES_UPDATE,
    description: 'Update campaign milestones in the current tenant',
  },
  {
    key: PERMISSIONS.MILESTONES_EVALUATE,
    description: 'Evaluate campaign milestones in the current tenant',
  },
  {
    key: PERMISSIONS.MEASUREMENT_DEFINITIONS_CREATE,
    description:
      'Create campaign measurement definitions in the current tenant',
  },
  {
    key: PERMISSIONS.MEASUREMENT_DEFINITIONS_READ,
    description: 'View campaign measurement definitions in the current tenant',
  },
  {
    key: PERMISSIONS.MEASUREMENT_DEFINITIONS_UPDATE,
    description:
      'Update campaign measurement definitions in the current tenant',
  },
  {
    key: PERMISSIONS.MEASUREMENTS_READ,
    description:
      'View own measurements and allowed campaign or community aggregates',
  },
  {
    key: PERMISSIONS.IMPACT_FACTORS_CREATE,
    description: 'Create versioned impact factors in the current tenant',
  },
  {
    key: PERMISSIONS.IMPACT_FACTORS_READ,
    description: 'View impact factors in the current tenant',
  },
  {
    key: PERMISSIONS.IMPACT_FACTORS_UPDATE,
    description: 'Update impact factor metadata in the current tenant',
  },
  {
    key: PERMISSIONS.OUTCOMES_READ,
    description:
      'View own outcomes and allowed campaign or community aggregates',
  },
  {
    key: PERMISSIONS.VISUALIZATIONS_CREATE,
    description: 'Create campaign visualizations in the current tenant',
  },
  {
    key: PERMISSIONS.VISUALIZATIONS_READ,
    description: 'View campaign visualizations in the current tenant',
  },
  {
    key: PERMISSIONS.VISUALIZATIONS_UPDATE,
    description: 'Update campaign visualizations in the current tenant',
  },
  {
    key: PERMISSIONS.DASHBOARDS_READ,
    description:
      'View own dashboards and allowed campaign or community aggregates',
  },
  {
    key: PERMISSIONS.NOTIFICATIONS_READ,
    description: 'View own in-app notifications in the current tenant',
  },
  {
    key: PERMISSIONS.NOTIFICATIONS_UPDATE,
    description: 'Mark own in-app notifications as read in the current tenant',
  },
  {
    key: PERMISSIONS.REPORTS_READ,
    description:
      'View own reports and allowed campaign or community aggregates',
  },
  {
    key: PERMISSIONS.REPORTS_EXPORT,
    description: 'Export campaign, community or participant reports as CSV',
  },
];
