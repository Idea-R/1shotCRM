import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export type UserRole = 'customer' | 'csr' | 'technician' | 'admin' | 'super_admin';

export interface PermissionCheck {
  userId: string;
  permission: string;
  organizationId?: string | null;
}

export interface RoleCheck {
  userId: string;
  roles: UserRole[];
  organizationId?: string | null;
}

/**
 * Check if a user has a specific permission
 * Uses the has_permission database function
 */
export async function checkPermission(
  userId: string,
  permission: string,
  organizationId?: string | null
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_permission', {
      p_user_id: userId,
      p_permission_name: permission,
      p_organization_id: organizationId || null,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get a user's role in an organization
 * Uses the get_user_role database function
 */
export async function getUserRole(
  userId: string,
  organizationId?: string | null
): Promise<UserRole> {
  try {
    const { data, error } = await supabase.rpc('get_user_role', {
      p_user_id: userId,
      p_organization_id: organizationId || null,
    });

    if (error) {
      console.error('Error getting user role:', error);
      return 'customer'; // Default role
    }

    return (data as UserRole) || 'customer';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'customer';
  }
}

/**
 * Check if a user has one of the required roles
 */
export async function requireRole(
  userId: string,
  roles: UserRole[],
  organizationId?: string | null
): Promise<boolean> {
  const userRole = await getUserRole(userId, organizationId);
  return roles.includes(userRole);
}

/**
 * Middleware to require a specific permission
 * Returns NextResponse with 403 if permission denied
 */
export async function requirePermission(
  req: NextRequest,
  permission: string,
  organizationId?: string | null
): Promise<{ user: any; organizationId?: string | null } | NextResponse> {
  // Get authenticated user
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check permission
  const hasPermission = await checkPermission(user.id, permission, organizationId);

  if (!hasPermission) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return { user, organizationId };
}

/**
 * Middleware to require one of the specified roles
 * Returns NextResponse with 403 if role not allowed
 */
export async function requireRoleMiddleware(
  req: NextRequest,
  roles: UserRole[],
  organizationId?: string | null
): Promise<{ user: any; organizationId?: string | null } | NextResponse> {
  // Get authenticated user
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check role
  const hasRole = await requireRole(user.id, roles, organizationId);

  if (!hasRole) {
    return NextResponse.json(
      { success: false, error: 'Insufficient role permissions' },
      { status: 403 }
    );
  }

  return { user, organizationId };
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_user_organizations', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error getting user organizations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user organizations:', error);
    return [];
  }
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  userId: string,
  role: UserRole,
  organizationId?: string | null,
  assignedBy?: string
) {
  try {
    const { data, error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
      organization_id: organizationId || null,
      assigned_by: assignedBy || null,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error assigning role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(role: UserRole) {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission:permissions(*)')
      .eq('role', role);

    if (error) throw error;
    return { success: true, data: data?.map((rp: any) => rp.permission) || [] };
  } catch (error: any) {
    console.error('Error getting role permissions:', error);
    return { success: false, error: error.message, data: [] };
  }
}

