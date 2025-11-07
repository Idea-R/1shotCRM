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
      .from('contact_category_assignments')
      .select('*, category:contact_categories(*)')
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
    const { contact_id, category_id } = body;

    if (!contact_id || !category_id) {
      return NextResponse.json({ success: false, error: 'contact_id and category_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contact_category_assignments')
      .insert({
        contact_id,
        category_id,
      })
      .select('*, category:contact_categories(*)')
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
    const contactId = searchParams.get('contact_id');
    const categoryId = searchParams.get('category_id');

    if (!id && (!contactId || !categoryId)) {
      return NextResponse.json({ success: false, error: 'ID or contact_id+category_id required' }, { status: 400 });
    }

    let query = supabase.from('contact_category_assignments').delete();

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('contact_id', contactId!).eq('category_id', categoryId!);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

