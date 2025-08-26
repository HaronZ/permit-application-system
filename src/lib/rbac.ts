// Role-Based Access Control (RBAC) System
import { supabase } from './supabaseClient';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  // Application permissions
  VIEW_OWN_APPLICATIONS = 'view_own_applications',
  EDIT_OWN_APPLICATIONS = 'edit_own_applications',
  DELETE_OWN_APPLICATIONS = 'delete_own_applications',
  VIEW_ALL_APPLICATIONS = 'view_all_applications',
  EDIT_ALL_APPLICATIONS = 'edit_all_applications',
  DELETE_ALL_APPLICATIONS = 'delete_all_applications',
  
  // User management permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ADMINS = 'manage_admins',
  
  // System permissions
  SYSTEM_SETTINGS = 'system_settings',
  AUDIT_LOGS = 'audit_logs',
  PERFORMANCE_MONITORING = 'performance_monitoring'
}

export interface UserPermissions {
  role: UserRole;
  permissions: Permission[];
}

// Cache for user permissions to avoid repeated database calls
const permissionCache = new Map<string, { permissions: UserPermissions; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user role and permissions from database
 */
export async function getUserPermissions(userEmail: string): Promise<UserPermissions> {
  // Check cache first
  const cached = permissionCache.get(userEmail);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.permissions;
  }

  try {
    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_user_role', { user_email: userEmail });

    if (roleError) throw roleError;

    const role = roleData || UserRole.USER;

    // Get permissions based on role
    let permissions: Permission[] = [];

    if (role === UserRole.SUPER_ADMIN) {
      // Super admin gets all permissions
      permissions = Object.values(Permission);
    } else if (role === UserRole.ADMIN) {
      // Admin gets most permissions except super admin ones
      permissions = [
        Permission.VIEW_OWN_APPLICATIONS,
        Permission.EDIT_OWN_APPLICATIONS,
        Permission.DELETE_OWN_APPLICATIONS,
        Permission.VIEW_ALL_APPLICATIONS,
        Permission.EDIT_ALL_APPLICATIONS,
        Permission.DELETE_ALL_APPLICATIONS,
        Permission.MANAGE_USERS,
        Permission.AUDIT_LOGS,
        Permission.PERFORMANCE_MONITORING
      ];
    } else {
      // Regular users get basic permissions
      permissions = [
        Permission.VIEW_OWN_APPLICATIONS,
        Permission.EDIT_OWN_APPLICATIONS,
        Permission.DELETE_OWN_APPLICATIONS
      ];
    }

    const userPermissions: UserPermissions = { role, permissions };

    // Cache the result
    permissionCache.set(userEmail, { permissions: userPermissions, timestamp: Date.now() });

    return userPermissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    // Return basic user permissions on error
    return {
      role: UserRole.USER,
      permissions: [
        Permission.VIEW_OWN_APPLICATIONS,
        Permission.EDIT_OWN_APPLICATIONS,
        Permission.DELETE_OWN_APPLICATIONS
      ]
    };
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userEmail: string, permission: Permission): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userEmail);
    return userPermissions.permissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userEmail: string, permissions: Permission[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userEmail);
    return permissions.some(permission => userPermissions.permissions.includes(permission));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(userEmail: string, permissions: Permission[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userEmail);
    return permissions.every(permission => userPermissions.permissions.includes(permission));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Check if user is admin (admin or super_admin)
 */
export async function isAdmin(userEmail: string): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userEmail);
    return userPermissions.role === UserRole.ADMIN || userPermissions.role === UserRole.SUPER_ADMIN;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userEmail: string): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userEmail);
    return userPermissions.role === UserRole.SUPER_ADMIN;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

/**
 * Clear permission cache for a user (useful after role changes)
 */
export function clearPermissionCache(userEmail: string): void {
  permissionCache.delete(userEmail);
}

/**
 * Clear all permission cache
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Administrator';
    case UserRole.ADMIN:
      return 'Administrator';
    case UserRole.USER:
      return 'User';
    default:
      return 'Unknown';
  }
}

/**
 * Get permission display name
 */
export function getPermissionDisplayName(permission: Permission): string {
  switch (permission) {
    case Permission.VIEW_OWN_APPLICATIONS:
      return 'View Own Applications';
    case Permission.EDIT_OWN_APPLICATIONS:
      return 'Edit Own Applications';
    case Permission.DELETE_OWN_APPLICATIONS:
      return 'Delete Own Applications';
    case Permission.VIEW_ALL_APPLICATIONS:
      return 'View All Applications';
    case Permission.EDIT_ALL_APPLICATIONS:
      return 'Edit All Applications';
    case Permission.DELETE_ALL_APPLICATIONS:
      return 'Delete All Applications';
    case Permission.MANAGE_USERS:
      return 'Manage Users';
    case Permission.MANAGE_ADMINS:
      return 'Manage Administrators';
    case Permission.SYSTEM_SETTINGS:
      return 'System Settings';
    case Permission.AUDIT_LOGS:
      return 'Audit Logs';
    case Permission.PERFORMANCE_MONITORING:
      return 'Performance Monitoring';
    default:
      return 'Unknown Permission';
  }
}
