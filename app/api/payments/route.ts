import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createStripeCheckoutSession, createStripePaymentIntent } from '@/lib/stripe-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, dealId, contactId, amount, type } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Get user from session
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Payment processing not configured' },
        { status: 500 }
      );
    }

    const metadata: Record<string, string> = {};
    if (invoiceId) metadata.invoice_id = invoiceId;
    if (dealId) metadata.deal_id = dealId;
    if (contactId) metadata.contact_id = contactId;
    metadata.user_id = user.id;

    if (type === 'checkout') {
      // Create Stripe Checkout session
      const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/pipeline/${dealId || ''}?payment=success`;
      const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/pipeline/${dealId || ''}?payment=cancelled`;
      
      const checkoutUrl = await createStripeCheckoutSession(
        amount,
        'usd',
        successUrl,
        cancelUrl,
        metadata
      );

      return NextResponse.json({ success: true, checkoutUrl });
    } else {
      // Create Payment Intent for embedded payment
      const { clientSecret, paymentIntentId } = await createStripePaymentIntent(
        amount,
        'usd',
        metadata
      );

      return NextResponse.json({
        success: true,
        clientSecret,
        paymentIntentId,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('invoice_id');
    const dealId = searchParams.get('deal_id');
    const contactId = searchParams.get('contact_id');

    let query = supabase
      .from('payments')
      .select('*, invoice:invoices(*), deal:deals(*), contact:contacts(*)')
      .order('created_at', { ascending: false });

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }
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

