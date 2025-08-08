import { headers } from 'next/headers'

export type TenantContext = {
  tenantId?: string | null
  tenantSlug?: string | null
  tenantDomain?: string | null
  userTenantId?: string | null
  userRole?: string | null
}

export async function getTenantContext(): Promise<TenantContext> {
  const hdrs = await headers()
  return {
    tenantId: hdrs.get('x-tenant-id'),
    tenantSlug: hdrs.get('x-tenant-slug'),
    tenantDomain: hdrs.get('x-tenant-domain'),
    userTenantId: hdrs.get('x-user-tenant-id'),
    userRole: hdrs.get('x-user-role'),
  }
}

// Helpers to build tenant-scoped where clauses for common models
export function whereForTripByTenant(tenantId?: string | null) {
  if (!tenantId) return {}
  return { operator: { tenantId } }
}

export function whereForVehicleByTenant(tenantId?: string | null) {
  if (!tenantId) return {}
  return { operator: { tenantId } }
}

export function whereForOperatorByTenant(tenantId?: string | null) {
  if (!tenantId) return {}
  return { tenantId }
}

export function whereForBookingByTenant(tenantId?: string | null) {
  if (!tenantId) return {}
  return { trip: { operator: { tenantId } } }
}