import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendSMS } from '@/lib/twilio-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, message, dealId, contactId } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'To and message are required' },
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

    // Send SMS
    const smsResult = await sendSMS({
      to,
      body: message,
    });

    if (!smsResult.success) {
      return NextResponse.json(
        { success: false, error: smsResult.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // Create activity log entry
    if (dealId || contactId) {
      await supabase.from('activities').insert({
        deal_id: dealId,
        contact_id: contactId,
        type: 'call', // Using 'call' type for SMS
        title: `SMS sent to ${to}`,
        description: message,
        created_by: user.email || user.id,
      });
    }

    return NextResponse.json({
      success: true,
      messageId: smsResult.messageId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

