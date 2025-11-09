import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

export interface GoogleOAuthScopes {
  calendar?: boolean;
  sheets?: boolean;
  drive?: boolean;
  contacts?: boolean;
}

/**
 * Get OAuth2 client
 */
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calendar/google/callback`
  );
}

/**
 * Generate OAuth URL with requested scopes
 */
export function generateGoogleOAuthUrl(scopes: GoogleOAuthScopes): string {
  const oauth2Client = getOAuth2Client();
  
  const scopeArray: string[] = [];
  
  if (scopes.calendar) {
    scopeArray.push(
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    );
  }
  
  if (scopes.sheets) {
    scopeArray.push('https://www.googleapis.com/auth/spreadsheets');
  }
  
  if (scopes.drive) {
    scopeArray.push('https://www.googleapis.com/auth/drive');
  }
  
  if (scopes.contacts) {
    scopeArray.push('https://www.googleapis.com/auth/contacts');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopeArray,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get or refresh access token for a user
 */
export async function getAccessToken(userId: string): Promise<string | null> {
  const { data: integration, error } = await supabase
    .from('google_integrations')
    .select('refresh_token, access_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !integration) {
    return null;
  }

  // Check if token is expired or expires soon (within 5 minutes)
  const expiresAt = integration.token_expires_at 
    ? new Date(integration.token_expires_at)
    : null;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt && expiresAt < fiveMinutesFromNow) {
    // Token expired or expiring soon, refresh it
    return await refreshAccessToken(userId);
  }

  return integration.access_token || null;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(userId: string): Promise<string | null> {
  const { data: integration, error } = await supabase
    .from('google_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !integration || !integration.refresh_token) {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: integration.refresh_token });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update stored tokens
    await supabase
      .from('google_integrations')
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date 
          ? new Date(credentials.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    return credentials.access_token || null;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

/**
 * Save Google integration tokens
 */
export async function saveGoogleIntegration(
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  },
  scopes: GoogleOAuthScopes
) {
  const scopeArray: string[] = [];
  if (scopes.calendar) scopeArray.push('calendar');
  if (scopes.sheets) scopeArray.push('sheets');
  if (scopes.drive) scopeArray.push('drive');
  if (scopes.contacts) scopeArray.push('contacts');

  const { data, error } = await supabase
    .from('google_integrations')
    .upsert({
      user_id: userId,
      provider: 'google',
      refresh_token: tokens.refresh_token || null,
      access_token: tokens.access_token || null,
      token_expires_at: tokens.expiry_date 
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      scopes: scopeArray,
      calendar_enabled: scopes.calendar || false,
      sheets_enabled: scopes.sheets || false,
      drive_enabled: scopes.drive || false,
      contacts_enabled: scopes.contacts || false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's Google integration status
 */
export async function getGoogleIntegrationStatus(userId: string) {
  const { data, error } = await supabase
    .from('google_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !data) {
    return {
      connected: false,
      calendar: false,
      sheets: false,
      drive: false,
      contacts: false,
    };
  }

  return {
    connected: true,
    calendar: data.calendar_enabled || false,
    sheets: data.sheets_enabled || false,
    drive: data.drive_enabled || false,
    contacts: data.contacts_enabled || false,
    scopes: data.scopes || [],
  };
}

/**
 * Update Google integration enabled services
 */
export async function updateGoogleIntegrationServices(
  userId: string,
  services: GoogleOAuthScopes
) {
  const { data, error } = await supabase
    .from('google_integrations')
    .update({
      calendar_enabled: services.calendar || false,
      sheets_enabled: services.sheets || false,
      drive_enabled: services.drive || false,
      contacts_enabled: services.contacts || false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete Google integration
 */
export async function deleteGoogleIntegration(userId: string) {
  const { error } = await supabase
    .from('google_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google');

  if (error) throw error;
  return true;
}

/**
 * Get OAuth2 client with user's refresh token
 */
export async function getAuthenticatedOAuth2Client(userId: string) {
  const { data: integration, error } = await supabase
    .from('google_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !integration || !integration.refresh_token) {
    throw new Error('Google integration not found or not authenticated');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: integration.refresh_token });
  return oauth2Client;
}

