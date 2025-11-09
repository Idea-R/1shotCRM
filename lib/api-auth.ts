import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkPermission, getUserRole, UserRole } from '@/lib/rbac';

/**
 * Helper function to get authenticated user from request
 * Supports both Authorization header (Bearer token) and cookies
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<{ user: any; error: any } | null> {
  // Try Authorization header first (for API calls)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return { user, error: null };
  }

  // Try to get session from cookies (for browser requests)
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    // Extract session from cookies - Supabase stores it as sb-<project-ref>-auth-token
    const sessionMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
    if (sessionMatch) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(sessionMatch[1]));
        if (sessionData?.access_token) {
          const { data: { user }, error } = await supabase.auth.getUser(sessionData.access_token);
          if (!error && user) {
            return { user, error: null };
          }
        }
      } catch (e) {
        // Invalid session cookie
      }
    }
  }

  return null;
}

/**
 * Helper function to require authentication
 * Returns user or sends 401 response
 */
export async function requireAuth(req: NextRequest): Promise<{ user: any } | NextResponse> {
  const authResult = await getAuthenticatedUser(req);
  
  if (!authResult || !authResult.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  return { user: authResult.user };
}

/**
 * Helper function to require authentication and check permission
 * Returns user or sends 401/403 response
 */
export async function requireAuthAndPermission(
  req: NextRequest,
  permission: string,
  organizationId?: string | null
): Promise<{ user: any; organizationId?: string | null } | NextResponse> {
  const authResult = await getAuthenticatedUser(req);
  
  if (!authResult || !authResult.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const hasPermission = await checkPermission(
    authResult.user.id,
    permission,
    organizationId
  );

  if (!hasPermission) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return { user: authResult.user, organizationId };
}

/**
 * Helper function to require authentication and check role
 * Returns user or sends 401/403 response
 */
export async function requireAuthAndRole(
  req: NextRequest,
  roles: UserRole[],
  organizationId?: string | null
): Promise<{ user: any; organizationId?: string | null } | NextResponse> {
  const authResult = await getAuthenticatedUser(req);
  
  if (!authResult || !authResult.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const userRole = await getUserRole(authResult.user.id, organizationId);

  if (!roles.includes(userRole)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient role permissions' },
      { status: 403 }
    );
  }

  return { user: authResult.user, organizationId };
}

