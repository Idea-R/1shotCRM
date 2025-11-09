import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';
import { listGoogleCalendars, getGoogleCalendar, syncCalendarEvents } from '@/lib/google-calendar-enhanced';
import { requireAuth } from '@/lib/api-auth';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calendar/google/callback`
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'auth') {
      // Generate OAuth URL
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
      });

      return NextResponse.json({ success: true, authUrl });
    }

    if (action === 'calendars') {
      // Get authenticated user
      const authResult = await requireAuth(req);
      if (authResult instanceof NextResponse) return authResult;

      // Get user's calendar integration
      const { data: integration, error: integrationError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', authResult.user.id)
        .eq('provider', 'google')
        .single();

      if (integrationError || !integration) {
        return NextResponse.json(
          { success: false, error: 'Google Calendar not connected' },
          { status: 400 }
        );
      }

      // List calendars
      const calendars = await listGoogleCalendars(integration.refresh_token);

      return NextResponse.json({ success: true, data: calendars });
    }

    if (action === 'sync') {
      // Get authenticated user
      const authResult = await requireAuth(req);
      if (authResult instanceof NextResponse) return authResult;

      const calendarId = searchParams.get('calendar_id') || 'primary';
      const syncToken = searchParams.get('sync_token') || undefined;

      // Get user's calendar integration
      const { data: integration, error: integrationError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', authResult.user.id)
        .eq('provider', 'google')
        .single();

      if (integrationError || !integration) {
        return NextResponse.json(
          { success: false, error: 'Google Calendar not connected' },
          { status: 400 }
        );
      }

      // Sync events
      const syncResult = await syncCalendarEvents(
        integration.refresh_token,
        calendarId,
        syncToken
      );

      return NextResponse.json({ success: true, data: syncResult });
    }

    // Get user's calendar integration status
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { data: integration, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (error || !integration) {
      return NextResponse.json({ success: false, connected: false });
    }

    return NextResponse.json({ success: true, connected: true, integration });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return NextResponse.json({ success: false, error: 'No refresh token received' }, { status: 400 });
    }

    // Get user from session
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    // Save or update integration
    const { data, error } = await supabase
      .from('calendar_integrations')
      .upsert({
        user_id: authResult.user.id,
        provider: 'google',
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })
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
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { error } = await supabase
      .from('calendar_integrations')
      .delete()
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
