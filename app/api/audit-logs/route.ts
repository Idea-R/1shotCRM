import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndRole } from '@/lib/api-auth';
import { getAuditLogs, getEntityChangeLogs } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    // Only admins can view audit logs
    const authResult = await requireAuthAndRole(req, ['admin', 'super_admin']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const filters = {
      userId: searchParams.get('user_id') || undefined,
      resourceType: searchParams.get('resource_type') || undefined,
      resourceId: searchParams.get('resource_id') || undefined,
      action: searchParams.get('action') || undefined,
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await getAuditLogs(filters);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

