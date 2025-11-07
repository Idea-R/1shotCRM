import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .order('category', { ascending: true })
      .order('order', { ascending: true });

    if (error) throw error;

    // Parse options JSON for each field
    const parsedData = data.map((field: any) => ({
      ...field,
      options: field.options ? JSON.parse(field.options) : null,
    }));

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, category, order, required, options } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: 'Name and type are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        name,
        type,
        category: category || 'General',
        order: order || 0,
        required: required || false,
        options: options ? JSON.stringify(options) : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Parse options JSON for response
    const responseData = {
      ...data,
      options: data.options ? JSON.parse(data.options) : null,
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, type, category, order, required, options } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    if (required !== undefined) updateData.required = required;
    if (options !== undefined) updateData.options = options ? JSON.stringify(options) : null;

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Parse options JSON for response
    const responseData = {
      ...data,
      options: data.options ? JSON.parse(data.options) : null,
    };

    return NextResponse.json({ success: true, data: responseData });
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
      .from('custom_field_definitions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

