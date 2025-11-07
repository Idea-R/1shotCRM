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
      .from('contact_profile_type_assignments')
      .select('*, profile_type:contact_profile_types(*)')
      .eq('contact_id', contactId)
      .order('is_primary', { ascending: false })
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
    const { contact_id, profile_type_id, is_primary } = body;

    if (!contact_id || !profile_type_id) {
      return NextResponse.json({ success: false, error: 'contact_id and profile_type_id are required' }, { status: 400 });
    }

    // If setting as primary, unset other primaries for this contact
    if (is_primary) {
      await supabase
        .from('contact_profile_type_assignments')
        .update({ is_primary: false })
        .eq('contact_id', contact_id);
    }

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('contact_profile_type_assignments')
      .upsert({
        contact_id,
        profile_type_id,
        is_primary: is_primary || false,
      }, {
        onConflict: 'contact_id,profile_type_id',
      })
      .select('*, profile_type:contact_profile_types(*)')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_primary } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    // If setting as primary, unset other primaries for this contact
    if (is_primary) {
      const { data: assignment } = await supabase
        .from('contact_profile_type_assignments')
        .select('contact_id')
        .eq('id', id)
        .single();

      if (assignment) {
        await supabase
          .from('contact_profile_type_assignments')
          .update({ is_primary: false })
          .eq('contact_id', assignment.contact_id)
          .neq('id', id);
      }
    }

    const { data, error } = await supabase
      .from('contact_profile_type_assignments')
      .update({ is_primary: is_primary || false })
      .eq('id', id)
      .select('*, profile_type:contact_profile_types(*)')
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
      .from('contact_profile_type_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
