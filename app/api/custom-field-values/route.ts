import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contact_id');

    if (!contactId) {
      return NextResponse.json({ success: false, error: 'contact_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_field_values')
      .select(`
        *,
        field_definition:custom_field_definitions(*)
      `)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact_id, field_definition_id, value } = body;

    if (!contact_id || !field_definition_id) {
      return NextResponse.json({ success: false, error: 'contact_id and field_definition_id are required' }, { status: 400 });
    }

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('custom_field_values')
      .upsert({
        contact_id,
        field_definition_id,
        value: value || '',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'contact_id,field_definition_id',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('custom_field_values')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

