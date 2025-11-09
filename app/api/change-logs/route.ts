import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getEntityChangeLogs } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    const result = await getEntityChangeLogs({
      entityType,
      entityId,
    });

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

