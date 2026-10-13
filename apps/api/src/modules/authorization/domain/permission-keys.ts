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
];
