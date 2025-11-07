import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contact_id');

    let query = supabase
      .from('appliances')
      .select('*, contact:contacts(*), appliance_type:appliance_types(*)')
      .order('created_at', { ascending: false });

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact_id, name, category, appliance_type_id, model_number, serial_number, brand, purchase_date, install_date, age_years, notes } = body;

    if (!contact_id || !name || !category) {
      return NextResponse.json({ success: false, error: 'contact_id, name, and category are required' }, { status: 400 });
    }

    // Calculate age_years from install_date if provided and age_years not set
    let calculatedAge = age_years;
    if (install_date && !age_years) {
      const installDate = new Date(install_date);
      const today = new Date();
      calculatedAge = Math.floor((today.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    }

    const { data, error } = await supabase
      .from('appliances')
      .insert({
        contact_id,
        name,
        category,
        appliance_type_id: appliance_type_id || null,
        model_number: model_number || null,
        serial_number: serial_number || null,
        brand: brand || null,
        purchase_date: purchase_date || null,
        install_date: install_date || null,
        age_years: calculatedAge || null,
        notes: notes || null,
      })
      .select()
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
    const { id, name, category, appliance_type_id, model_number, serial_number, brand, purchase_date, install_date, age_years, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (appliance_type_id !== undefined) updateData.appliance_type_id = appliance_type_id;
    if (model_number !== undefined) updateData.model_number = model_number;
    if (serial_number !== undefined) updateData.serial_number = serial_number;
    if (brand !== undefined) updateData.brand = brand;
    if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
    if (install_date !== undefined) {
      updateData.install_date = install_date;
      // Recalculate age if install_date changed and age_years not explicitly provided
      if (install_date && age_years === undefined) {
        const installDate = new Date(install_date);
        const today = new Date();
        updateData.age_years = Math.floor((today.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }
    }
    if (age_years !== undefined) updateData.age_years = age_years;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('appliances')
      .update(updateData)
      .eq('id', id)
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
      .from('appliances')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

