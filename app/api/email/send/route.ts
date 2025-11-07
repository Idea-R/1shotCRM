import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text, dealId, contactId, templateId } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'To, subject, and HTML content are required' },
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

    // Send email
    const emailResult = await sendEmail({
      to,
      subject,
      html,
      text,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Create activity log entry
    if (dealId || contactId) {
      await supabase.from('activities').insert({
        deal_id: dealId,
        contact_id: contactId,
        type: 'email',
        title: `Email sent to ${to}`,
        description: `Subject: ${subject}\n\n${text || html.replace(/<[^>]*>/g, '')}`,
        created_by: user.email || user.id,
      });
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

