import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deal_id, contact_id, type, title, description } = body;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        deal_id: deal_id || null,
        contact_id: contact_id || null,
        type,
        title,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

