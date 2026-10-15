import type { Tenant } from '../domain/tenant.entity.js';

export interface CustomerResponse {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present when a new or unactivated initial admin needs to set a password. */
  activationToken?: string;
}

export function toCustomerResponse(
  tenant: Tenant,
  extras?: { activationToken?: string },
): CustomerResponse {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    isActive: tenant.is_active,
    createdAt: tenant.created_at.toISOString(),
    updatedAt: tenant.updated_at.toISOString(),
    ...(extras?.activationToken
      ? { activationToken: extras.activationToken }
      : {}),
  };
}
