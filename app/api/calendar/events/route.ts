import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, contactId, title, description, startDateTime, endDateTime, location } = body;

    if (!title || !startDateTime) {
      return NextResponse.json(
        { success: false, error: 'Title and start date/time are required' },
        { status: 400 }
      );
    }

    // Get user's calendar integration
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Get contact/deal info for event description
    let eventDescription = description || '';
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, email, phone')
        .eq('id', contactId)
        .single();
      
      if (contact) {
        eventDescription += `\n\nContact: ${contact.name}`;
        if (contact.email) eventDescription += `\nEmail: ${contact.email}`;
        if (contact.phone) eventDescription += `\nPhone: ${contact.phone}`;
      }
    }

    if (dealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('title, value')
        .eq('id', dealId)
        .single();
      
      if (deal) {
        eventDescription += `\n\nDeal: ${deal.title}`;
        if (deal.value) eventDescription += `\nValue: $${deal.value}`;
      }
    }

    // Create calendar event
    const eventId = await createGoogleCalendarEvent(integration.refresh_token, {
      summary: title,
      description: eventDescription,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime || new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      location,
    });

    // Create activity log entry
    if (dealId || contactId) {
      await supabase.from('activities').insert({
        deal_id: dealId,
        contact_id: contactId,
        type: 'meeting',
        title: `Calendar Event: ${title}`,
        description: `Created Google Calendar event: ${eventId}`,
      });
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

