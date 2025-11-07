import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deal_id, contact_id, type, title, description } = body;

    // Get authenticated user (optional - allows anonymous users)
    const authResult = await getAuthenticatedUser(req);
    const userId = authResult?.user?.id || null;
    const userEmail = authResult?.user?.email || null;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        deal_id: deal_id || null,
        contact_id: contact_id || null,
        type,
        title,
        description: description || null,
        created_by: userEmail || userId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

