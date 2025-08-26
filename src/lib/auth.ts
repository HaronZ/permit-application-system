import { isAdmin as rbacIsAdmin, isSuperAdmin, getUserPermissions, UserRole } from './rbac';

// Legacy function for backward compatibility
export function isAdmin(email?: string | null) {
  if (!email) return false;
  
  // For MVP, use a public env allowlist. In production, move to server-only checks.
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const list = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  
  // Check both legacy email list and new RBAC system
  if (list.includes(email.toLowerCase())) {
    return true;
  }
  
  // Try RBAC system (this will be async, so we'll need to handle it differently)
  // For now, return false and let the component handle async RBAC check
  return false;
}

// New async admin check using RBAC
export async function checkAdminStatus(email?: string | null): Promise<boolean> {
  if (!email) return false;
  
  try {
    // Check legacy email list first
    const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const list = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    
    if (list.includes(email.toLowerCase())) {
      return true;
    }
    
    // Check RBAC system
    return await rbacIsAdmin(email);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// New async super admin check
export async function checkSuperAdminStatus(email?: string | null): Promise<boolean> {
  if (!email) return false;
  
  try {
    return await isSuperAdmin(email);
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

// Get user permissions
export async function getUserPermissionsAsync(email?: string | null) {
  if (!email) return null;
  
  try {
    return await getUserPermissions(email);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

// Export RBAC types for components
export { UserRole } from './rbac';
export type { UserPermissions } from './rbac';
