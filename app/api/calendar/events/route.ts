import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createGoogleCalendarEvent, listGoogleCalendarEvents, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/google-calendar-enhanced';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, contactId, title, description, startDateTime, endDateTime, location, calendarId } = body;

    if (!title || !startDateTime) {
      return NextResponse.json(
        { success: false, error: 'Title and start date/time are required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.calendar_enabled) {
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
    const eventId = await createGoogleCalendarEvent(
      integration.refresh_token,
      {
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
        location: location || undefined,
      },
      calendarId || 'primary'
    );

    // Log activity
    if (dealId || contactId) {
      await supabase.from('activities').insert({
        deal_id: dealId || null,
        contact_id: contactId || null,
        type: 'meeting',
        title: `Calendar Event: ${title}`,
        description: `Created Google Calendar event: ${eventId}`,
        created_by: authResult.user.email || authResult.user.id,
      });
    }

    // Log audit event
    await logAction(
      authResult.user.id,
      'create',
      'calendar_event',
      eventId,
      { title, calendarId: calendarId || 'primary' },
      req
    );

    return NextResponse.json({ success: true, data: { eventId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get('calendar_id') || 'primary';
    const timeMin = searchParams.get('time_min') || undefined;
    const timeMax = searchParams.get('time_max') || undefined;

    // Get user's calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.calendar_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // List events
    const events = await listGoogleCalendarEvents(
      integration.refresh_token,
      calendarId,
      timeMin,
      timeMax
    );

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, calendarId, ...updates } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.calendar_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Update event
    await updateGoogleCalendarEvent(
      integration.refresh_token,
      eventId,
      updates,
      calendarId || 'primary'
    );

    // Log audit event
    await logAction(
      authResult.user.id,
      'update',
      'calendar_event',
      eventId,
      { updates },
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');
    const calendarId = searchParams.get('calendar_id') || 'primary';

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.calendar_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Delete event
    await deleteGoogleCalendarEvent(
      integration.refresh_token,
      eventId,
      calendarId
    );

    // Log audit event
    await logAction(
      authResult.user.id,
      'delete',
      'calendar_event',
      eventId,
      null,
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
