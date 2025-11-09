import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'contacts:read');
    if (authResult instanceof NextResponse) return authResult;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    // Log read action
    await logAction(authResult.user.id, 'read', 'contact', null, null, req);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'contacts:write');
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { name, email, phone, company, organization_id } = body;

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        organization_id: organization_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log creation (triggers will also log, but this ensures it's logged even if trigger fails)
    await logAction(
      authResult.user.id,
      'create',
      'contact',
      data.id,
      { contact: data },
      req
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

