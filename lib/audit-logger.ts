import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface AuditLogFilters {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ChangeLogFilters {
  entityType: string;
  entityId: string;
}

/**
 * Log an audit event
 */
export async function logAction(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string | null,
  changes?: Record<string, any>,
  req?: NextRequest
): Promise<string | null> {
  try {
    // Extract IP address and user agent from request if provided
    const ipAddress = req?.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req?.headers.get('x-real-ip') || 
                     null;
    const userAgent = req?.headers.get('user-agent') || null;

    // Get organization_id from changes metadata if available
    const metadata = changes?.organization_id 
      ? { organization_id: changes.organization_id }
      : null;

    const { data, error } = await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: action,
      p_resource_type: resource,
      p_resource_id: resourceId || null,
      p_changes: changes || null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: metadata || null,
    });

    if (error) {
      console.error('Error logging audit event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging audit event:', error);
    return null;
  }
}

/**
 * Log a field change
 */
export async function logFieldChange(
  entityType: string,
  entityId: string,
  fieldName: string,
  oldValue: any,
  newValue: any,
  changedBy?: string | null,
  changeReason?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_field_change', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_field_name: fieldName,
      p_old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
      p_new_value: newValue !== null && newValue !== undefined ? String(newValue) : null,
      p_changed_by: changedBy || null,
      p_change_reason: changeReason || null,
    });

    if (error) {
      console.error('Error logging field change:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging field change:', error);
    return null;
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: AuditLogFilters) {
  try {
    const { data, error } = await supabase.rpc('get_audit_logs', {
      p_user_id: filters.userId || null,
      p_resource_type: filters.resourceType || null,
      p_resource_id: filters.resourceId || null,
      p_action: filters.action || null,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_limit: filters.limit || 100,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error('Error getting audit logs:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting audit logs:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get change logs for a specific entity
 */
export async function getEntityChangeLogs(filters: ChangeLogFilters) {
  try {
    const { data, error } = await supabase.rpc('get_entity_change_logs', {
      p_entity_type: filters.entityType,
      p_entity_id: filters.entityId,
    });

    if (error) {
      console.error('Error getting change logs:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting change logs:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Helper to extract IP address from NextRequest
 */
export function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return null;
}

/**
 * Helper to extract user agent from NextRequest
 */
export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent');
}

