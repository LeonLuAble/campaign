import type { Tenant } from '../domain/tenant.entity.js';

export interface CustomerResponse {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toCustomerResponse(tenant: Tenant): CustomerResponse {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    isActive: tenant.is_active,
    createdAt: tenant.created_at.toISOString(),
    updatedAt: tenant.updated_at.toISOString(),
  };
}
