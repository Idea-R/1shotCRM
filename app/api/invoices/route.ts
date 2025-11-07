import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('deal_id');
    const contactId = searchParams.get('contact_id');
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, deal:deals(*), contact:contacts(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    let query = supabase
      .from('invoices')
      .select('*, deal:deals(*), contact:contacts(*)')
      .order('created_at', { ascending: false });

    if (dealId) {
      query = query.eq('deal_id', dealId);
    }
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
    const { dealId, contactId, amount, dueDate, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const { data: invoiceNumber, error: numberError } = await supabase.rpc('generate_invoice_number');
    
    if (numberError) throw numberError;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        deal_id: dealId || null,
        contact_id: contactId || null,
        invoice_number: invoiceNumber,
        amount,
        status: 'draft',
        due_date: dueDate || null,
        notes: notes || null,
      })
      .select('*, deal:deals(*), contact:contacts(*)')
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
    const { id, status, amount, dueDate, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status;
    if (amount !== undefined) updateData.amount = amount;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select('*, deal:deals(*), contact:contacts(*)')
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
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

