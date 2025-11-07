import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calendar/google/callback`
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Can include user ID or redirect URL

    if (!code) {
      return NextResponse.redirect(new URL('/settings?error=no_code', req.url));
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/settings?error=no_refresh_token', req.url));
    }

    // For now, we'll need to get user from state or session
    // In production, you'd store state with user ID in session/database
    // For now, redirect to settings with success message
    // The frontend will handle saving the token via POST to /api/calendar/google

    return NextResponse.redirect(new URL(`/settings?calendar_code=${code}`, req.url));
  } catch (error: any) {
    console.error('Calendar callback error:', error);
    return NextResponse.redirect(new URL('/settings?error=calendar_auth_failed', req.url));
  }
}

