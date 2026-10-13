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
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

export const READ_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSION_KEYS.filter(
  (key) => key.endsWith('.read'),
);

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
];
