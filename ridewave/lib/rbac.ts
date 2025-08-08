// Role-Based Access Control (RBAC) System
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Define all available permissions
export const PERMISSIONS = {
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',
  
  // Booking permissions
  BOOKING_CREATE: 'booking:create',
  BOOKING_READ: 'booking:read',
  BOOKING_UPDATE: 'booking:update',
  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_LIST: 'booking:list',
  BOOKING_MANAGE_ALL: 'booking:manage_all',
  
  // Trip permissions
  TRIP_CREATE: 'trip:create',
  TRIP_READ: 'trip:read',
  TRIP_UPDATE: 'trip:update',
  TRIP_DELETE: 'trip:delete',
  TRIP_LIST: 'trip:list',
  TRIP_MANAGE: 'trip:manage',
  
  // Vehicle permissions
  VEHICLE_CREATE: 'vehicle:create',
  VEHICLE_READ: 'vehicle:read',
  VEHICLE_UPDATE: 'vehicle:update',
  VEHICLE_DELETE: 'vehicle:delete',
  VEHICLE_LIST: 'vehicle:list',
  VEHICLE_ASSIGN_DRIVER: 'vehicle:assign_driver',
  
  // Route permissions
  ROUTE_CREATE: 'route:create',
  ROUTE_READ: 'route:read',
  ROUTE_UPDATE: 'route:update',
  ROUTE_DELETE: 'route:delete',
  ROUTE_LIST: 'route:list',
  
  // Payment permissions
  PAYMENT_PROCESS: 'payment:process',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_MANAGE: 'payment:manage',
  
  // Analytics permissions
  ANALYTICS_VIEW_OWN: 'analytics:view_own',
  ANALYTICS_VIEW_ALL: 'analytics:view_all',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Admin permissions
  ADMIN_USER_MANAGE: 'admin:user_manage',
  ADMIN_OPERATOR_MANAGE: 'admin:operator_manage',
  ADMIN_SYSTEM_SETTINGS: 'admin:system_settings',
  ADMIN_PLATFORM_OVERVIEW: 'admin:platform_overview',
  
  // Support permissions
  SUPPORT_TICKET_CREATE: 'support:ticket_create',
  SUPPORT_TICKET_READ: 'support:ticket_read',
  SUPPORT_TICKET_UPDATE: 'support:ticket_update',
  SUPPORT_TICKET_ASSIGN: 'support:ticket_assign',
  SUPPORT_TICKET_RESOLVE: 'support:ticket_resolve',
  
  // Driver permissions
  DRIVER_VEHICLE_OPERATE: 'driver:vehicle_operate',
  DRIVER_LOCATION_UPDATE: 'driver:location_update',
  DRIVER_TRIP_STATUS_UPDATE: 'driver:trip_status_update',
  
  // Notification permissions
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_BROADCAST: 'notification:broadcast',
  
  // Review permissions
  REVIEW_CREATE: 'review:create',
  REVIEW_READ: 'review:read',
  REVIEW_MODERATE: 'review:moderate',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  USER: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE, // Own profile only
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ, // Own bookings only
    PERMISSIONS.BOOKING_CANCEL, // Own bookings only
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_LIST,
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.ROUTE_LIST,
    PERMISSIONS.PAYMENT_VIEW, // Own payments only
    PERMISSIONS.SUPPORT_TICKET_CREATE,
    PERMISSIONS.SUPPORT_TICKET_READ, // Own tickets only
    PERMISSIONS.REVIEW_CREATE,
    PERMISSIONS.REVIEW_READ,
  ],
  
  DRIVER: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE, // Own profile only
    PERMISSIONS.BOOKING_READ, // Assigned trips only
    PERMISSIONS.BOOKING_LIST, // Assigned trips only
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_LIST, // Assigned trips only
    PERMISSIONS.VEHICLE_READ, // Assigned vehicles only
    PERMISSIONS.VEHICLE_UPDATE, // Status updates only
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.DRIVER_VEHICLE_OPERATE,
    PERMISSIONS.DRIVER_LOCATION_UPDATE,
    PERMISSIONS.DRIVER_TRIP_STATUS_UPDATE,
    PERMISSIONS.SUPPORT_TICKET_CREATE,
    PERMISSIONS.SUPPORT_TICKET_READ, // Own tickets only
  ],
  
  OPERATOR: [
    PERMISSIONS.USER_READ, // Limited to own customers
    PERMISSIONS.BOOKING_READ, // Own operator bookings
    PERMISSIONS.BOOKING_LIST, // Own operator bookings
    PERMISSIONS.BOOKING_MANAGE_ALL, // Own operator bookings
    PERMISSIONS.TRIP_CREATE,
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_UPDATE,
    PERMISSIONS.TRIP_DELETE,
    PERMISSIONS.TRIP_LIST,
    PERMISSIONS.TRIP_MANAGE,
    PERMISSIONS.VEHICLE_CREATE,
    PERMISSIONS.VEHICLE_READ,
    PERMISSIONS.VEHICLE_UPDATE,
    PERMISSIONS.VEHICLE_DELETE,
    PERMISSIONS.VEHICLE_LIST,
    PERMISSIONS.VEHICLE_ASSIGN_DRIVER,
    PERMISSIONS.ROUTE_CREATE,
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.ROUTE_UPDATE,
    PERMISSIONS.ROUTE_DELETE,
    PERMISSIONS.ROUTE_LIST,
    PERMISSIONS.PAYMENT_VIEW, // Own payments
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.ANALYTICS_VIEW_OWN,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.SUPPORT_TICKET_READ, // Own operator tickets
    PERMISSIONS.NOTIFICATION_SEND, // To own customers
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_MODERATE, // Own operator reviews
  ],
  
  SUPPORT: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_LIST,
    PERMISSIONS.BOOKING_UPDATE, // For support purposes
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_LIST,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.SUPPORT_TICKET_READ,
    PERMISSIONS.SUPPORT_TICKET_UPDATE,
    PERMISSIONS.SUPPORT_TICKET_ASSIGN,
    PERMISSIONS.SUPPORT_TICKET_RESOLVE,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_MODERATE,
  ],
  
  ADMIN: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_LIST,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_LIST,
    PERMISSIONS.BOOKING_MANAGE_ALL,
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_LIST,
    PERMISSIONS.TRIP_MANAGE,
    PERMISSIONS.VEHICLE_READ,
    PERMISSIONS.VEHICLE_LIST,
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.ROUTE_LIST,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.ANALYTICS_VIEW_ALL,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.ADMIN_USER_MANAGE,
    PERMISSIONS.ADMIN_OPERATOR_MANAGE,
    PERMISSIONS.ADMIN_PLATFORM_OVERVIEW,
    PERMISSIONS.SUPPORT_TICKET_READ,
    PERMISSIONS.SUPPORT_TICKET_UPDATE,
    PERMISSIONS.SUPPORT_TICKET_ASSIGN,
    PERMISSIONS.SUPPORT_TICKET_RESOLVE,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.NOTIFICATION_BROADCAST,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_MODERATE,
  ],

  // Added tenant roles
  TENANT_ADMIN: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_LIST,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_LIST,
    PERMISSIONS.BOOKING_MANAGE_ALL,
    PERMISSIONS.TRIP_CREATE,
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_UPDATE,
    PERMISSIONS.TRIP_DELETE,
    PERMISSIONS.TRIP_LIST,
    PERMISSIONS.TRIP_MANAGE,
    PERMISSIONS.VEHICLE_CREATE,
    PERMISSIONS.VEHICLE_READ,
    PERMISSIONS.VEHICLE_UPDATE,
    PERMISSIONS.VEHICLE_DELETE,
    PERMISSIONS.VEHICLE_LIST,
    PERMISSIONS.VEHICLE_ASSIGN_DRIVER,
    PERMISSIONS.ROUTE_CREATE,
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.ROUTE_UPDATE,
    PERMISSIONS.ROUTE_DELETE,
    PERMISSIONS.ROUTE_LIST,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.ANALYTICS_VIEW_OWN,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.SUPPORT_TICKET_READ,
    PERMISSIONS.SUPPORT_TICKET_UPDATE,
    PERMISSIONS.SUPPORT_TICKET_ASSIGN,
    PERMISSIONS.SUPPORT_TICKET_RESOLVE,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_MODERATE,
  ],

  TENANT_USER: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.TRIP_READ,
    PERMISSIONS.TRIP_LIST,
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.ROUTE_LIST,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.SUPPORT_TICKET_CREATE,
    PERMISSIONS.SUPPORT_TICKET_READ,
    PERMISSIONS.REVIEW_CREATE,
    PERMISSIONS.REVIEW_READ,
  ],
  
  SUPER_ADMIN: [
    // Super admin has all permissions
    ...Object.values(PERMISSIONS),
    PERMISSIONS.ADMIN_SYSTEM_SETTINGS,
  ],
}

// Permission checking functions
export class PermissionChecker {
  constructor(
    private userRole: UserRole,
    private userPermissions: string[] = [],
    private userId?: string,
    private operatorId?: string
  ) {}

  // Check if user has a specific permission
  hasPermission(permission: Permission): boolean {
    // Super admin has all permissions
    if (this.userRole === 'SUPER_ADMIN') {
      return true
    }

    // Check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[this.userRole] || []
    if (rolePermissions.includes(permission)) {
      return true
    }

    // Check specific user permissions
    return this.userPermissions.includes(permission)
  }

  // Check if user has any of the provided permissions
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  // Check if user has all of the provided permissions
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  // Check resource ownership (for own resources)
  canAccessOwnResource(resourceUserId: string): boolean {
    return this.userId === resourceUserId
  }

  // Check operator resource access
  canAccessOperatorResource(resourceOperatorId: string): boolean {
    if (this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN') {
      return true
    }
    return this.operatorId === resourceOperatorId
  }

  // Check if user can manage users
  canManageUsers(): boolean {
    return this.hasPermission(PERMISSIONS.ADMIN_USER_MANAGE)
  }

  // Check if user can view analytics
  canViewAnalytics(isOwnData: boolean = false): boolean {
    if (isOwnData) {
      return this.hasPermission(PERMISSIONS.ANALYTICS_VIEW_OWN)
    }
    return this.hasPermission(PERMISSIONS.ANALYTICS_VIEW_ALL)
  }

  // Check if user can manage bookings
  canManageBookings(bookingUserId?: string, bookingOperatorId?: string): boolean {
    if (this.hasPermission(PERMISSIONS.BOOKING_MANAGE_ALL)) {
      return true
    }

    // Users can manage their own bookings
    if (bookingUserId && this.canAccessOwnResource(bookingUserId)) {
      return this.hasPermission(PERMISSIONS.BOOKING_UPDATE)
    }

    // Operators can manage their bookings
    if (bookingOperatorId && this.canAccessOperatorResource(bookingOperatorId)) {
      return true
    }

    return false
  }
}

// Get user permissions from database
export async function getUserPermissions(userId: string): Promise<{
  role: UserRole
  permissions: string[]
  operatorId?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { externalId: userId },
      select: {
        role: true,
        permissions: true,
        operatedVehicles: {
          select: {
            operatorId: true
          },
          take: 1
        }
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Get operator ID if user is a driver
    const operatorId = user.operatedVehicles[0]?.operatorId

    return {
      role: user.role,
      permissions: user.permissions,
      operatorId
    }
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return {
      role: 'USER' as UserRole,
      permissions: []
    }
  }
}

// Create permission checker for user
export async function createPermissionChecker(userId: string): Promise<PermissionChecker> {
  const { role, permissions, operatorId } = await getUserPermissions(userId)
  return new PermissionChecker(role, permissions, userId, operatorId)
}

// Middleware function to check permissions
export function requirePermission(permission: Permission) {
  return async (userId: string): Promise<boolean> => {
    const checker = await createPermissionChecker(userId)
    return checker.hasPermission(permission)
  }
}

// Middleware function to check multiple permissions
export function requireAnyPermission(permissions: Permission[]) {
  return async (userId: string): Promise<boolean> => {
    const checker = await createPermissionChecker(userId)
    return checker.hasAnyPermission(permissions)
  }
}

// Role checking utilities
export const isUser = (role: UserRole) => role === 'USER'
export const isDriver = (role: UserRole) => role === 'DRIVER'
export const isOperator = (role: UserRole) => role === 'OPERATOR'
export const isSupport = (role: UserRole) => role === 'SUPPORT'
export const isAdmin = (role: UserRole) => role === 'ADMIN'
export const isSuperAdmin = (role: UserRole) => role === 'SUPER_ADMIN'

export const isAdminLevel = (role: UserRole) => 
  role === 'ADMIN' || role === 'SUPER_ADMIN'

export const isStaffLevel = (role: UserRole) => 
  role === 'SUPPORT' || role === 'ADMIN' || role === 'SUPER_ADMIN'

// Permission-based component visibility
export function canShowComponent(
  userRole: UserRole,
  requiredPermissions: Permission[],
  userPermissions: string[] = []
): boolean {
  const checker = new PermissionChecker(userRole, userPermissions)
  return checker.hasAnyPermission(requiredPermissions)
}

// Exports consolidated above