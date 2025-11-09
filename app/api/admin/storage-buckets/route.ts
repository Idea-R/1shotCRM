import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndRole } from '@/lib/api-auth';
import { createStorageBuckets, getDefaultBucketConfigs } from '@/lib/storage-buckets';
import { logAction } from '@/lib/audit-logger';
import { supabase } from '@/lib/supabase';

/**
 * Admin API route to create storage buckets
 * Requires admin or super_admin role
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin role
    const authResult = await requireAuthAndRole(req, ['admin', 'super_admin']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { configs } = body;

    // Use provided configs or default configs
    const bucketConfigs = configs || getDefaultBucketConfigs();

    const result = await createStorageBuckets(bucketConfigs);

    // Log audit event
    await logAction(
      authResult.user.id,
      'create',
      'storage_buckets',
      null,
      { created: result.created, existing: result.existing, errors: result.errors },
      req
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Require admin role
    const authResult = await requireAuthAndRole(req, ['admin', 'super_admin']);
    if (authResult instanceof NextResponse) return authResult;

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: buckets || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

