import { google } from 'googleapis';

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{ email: string }>;
  recurrence?: string[]; // RRULE format
  colorId?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
}

/**
 * Get OAuth2 client with refresh token
 */
function getOAuth2Client(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calendar/google/callback`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Create a Google Calendar event
 */
export async function createGoogleCalendarEvent(
  refreshToken: string,
  event: GoogleCalendarEvent,
  calendarId: string = 'primary'
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id || '';
}

/**
 * List Google Calendar events
 */
export async function listGoogleCalendarEvents(
  refreshToken: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50
) {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin || new Date().toISOString(),
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

/**
 * Update a Google Calendar event
 */
export async function updateGoogleCalendarEvent(
  refreshToken: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId: string = 'primary'
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // First, get the existing event
  const existingEvent = await calendar.events.get({
    calendarId,
    eventId,
  });

  // Merge with updates
  const updatedEvent = {
    ...existingEvent.data,
    ...event,
  };

  const response = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: updatedEvent,
  });

  return response.data.id || '';
}

/**
 * Delete a Google Calendar event
 */
export async function deleteGoogleCalendarEvent(
  refreshToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId,
    eventId,
  });

  return true;
}

/**
 * List all calendars for a user
 */
export async function listGoogleCalendars(refreshToken: string): Promise<GoogleCalendar[]> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.calendarList.list();

  return (response.data.items || []).map((cal) => ({
    id: cal.id || '',
    summary: cal.summary || '',
    description: cal.description || undefined,
    timeZone: cal.timeZone || undefined,
    primary: cal.primary || false,
  }));
}

/**
 * Get a specific calendar
 */
export async function getGoogleCalendar(
  refreshToken: string,
  calendarId: string
): Promise<GoogleCalendar | null> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.calendars.get({
      calendarId,
    });

    return {
      id: response.data.id || '',
      summary: response.data.summary || '',
      description: response.data.description || undefined,
      timeZone: response.data.timeZone || undefined,
      primary: false,
    };
  } catch (error) {
    console.error('Error getting calendar:', error);
    return null;
  }
}

/**
 * Sync CRM events to Google Calendar (two-way sync)
 * This function should be called periodically to sync changes
 */
export async function syncCalendarEvents(
  refreshToken: string,
  calendarId: string = 'primary',
  syncToken?: string
) {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const params: any = {
    calendarId,
    singleEvents: true,
    orderBy: 'startTime',
  };

  // Use syncToken for incremental sync if available
  if (syncToken) {
    params.syncToken = syncToken;
  } else {
    params.timeMin = new Date().toISOString();
  }

  const response = await calendar.events.list(params);

  return {
    items: response.data.items || [],
    nextSyncToken: response.data.nextSyncToken || undefined,
  };
}

/**
 * Create a recurring event
 */
export async function createRecurringEvent(
  refreshToken: string,
  event: GoogleCalendarEvent,
  recurrenceRule: string, // RRULE format, e.g., "RRULE:FREQ=DAILY;COUNT=7"
  calendarId: string = 'primary'
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const recurringEvent = {
    ...event,
    recurrence: [recurrenceRule],
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: recurringEvent,
  });

  return response.data.id || '';
}

