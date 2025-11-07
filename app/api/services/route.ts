import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contact_id');
    const applianceId = searchParams.get('appliance_id');
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    // If ID is provided, fetch single service
    if (id) {
      const { data, error } = await supabase
        .from('services')
        .select('*, contact:contacts(*), appliance:appliances(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // Otherwise, fetch filtered list
    let query = supabase
      .from('services')
      .select('*, contact:contacts(*), appliance:appliances(*)')
      .order('service_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    if (applianceId) {
      query = query.eq('appliance_id', applianceId);
    }
    if (status) {
      query = query.eq('status', status);
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
    const { contact_id, appliance_id, title, description, service_date, status, technician, cost, notes } = body;

    if (!contact_id || !title) {
      return NextResponse.json({ success: false, error: 'contact_id and title are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('services')
      .insert({
        contact_id,
        appliance_id: appliance_id || null,
        title,
        description: description || null,
        service_date: service_date || null,
        status: status || 'scheduled',
        technician: technician || null,
        cost: cost || null,
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
    const { id, title, description, service_date, status, technician, cost, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (service_date !== undefined) updateData.service_date = service_date;
    if (status !== undefined) updateData.status = status;
    if (technician !== undefined) updateData.technician = technician;
    if (cost !== undefined) updateData.cost = cost;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('services')
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
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

