import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contact_id');
    const applianceId = searchParams.get('appliance_id');
    const serviceId = searchParams.get('service_id');

    let query = supabase
      .from('service_history')
      .select('*, service:services(*), appliance:appliances(*), contact:contacts(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    if (applianceId) {
      query = query.eq('appliance_id', applianceId);
    }
    if (serviceId) {
      query = query.eq('service_id', serviceId);
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
    const { service_id, appliance_id, contact_id, type, description, date, cost, technician } = body;

    if (!contact_id || !type || !description) {
      return NextResponse.json({ success: false, error: 'contact_id, type, and description are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('service_history')
      .insert({
        service_id: service_id || null,
        appliance_id: appliance_id || null,
        contact_id,
        type,
        description,
        date: date || new Date().toISOString(),
        cost: cost || null,
        technician: technician || null,
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
    const { id, type, description, date, cost, technician } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {};

    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;
    if (cost !== undefined) updateData.cost = cost;
    if (technician !== undefined) updateData.technician = technician;

    const { data, error } = await supabase
      .from('service_history')
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
      .from('service_history')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

