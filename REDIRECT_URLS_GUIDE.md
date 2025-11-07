# Complete Redirect URLs Guide

## Overview
This document lists all redirect URLs you need to configure for authentication and OAuth integrations.

## 1. Supabase Auth Redirect URLs

### In Supabase Dashboard
**Location**: Authentication > URL Configuration > Redirect URLs

Add these URLs:

```
# Development
http://localhost:3000/**
http://localhost:3000/auth/callback

# Production
https://1shotcrm.com/**
https://www.1shotcrm.com/**
https://1shotcrm.com/auth/callback
https://www.1shotcrm.com/auth/callback
```

**Note**: The `/**` wildcard covers all paths, but explicit callbacks are recommended for clarity.

## 2. Google OAuth for Supabase Auth (Google Sign-In)

### In Google Cloud Console
**Location**: APIs & Services > Credentials > Your OAuth 2.0 Client ID > Authorized redirect URIs

Add this URL:

```
https://otbaeguavfmruyuadjva.supabase.co/auth/v1/callback
```

**Note**: This is Supabase's callback endpoint. Supabase handles the redirect to your app after authentication.

### In Supabase Dashboard
**Location**: Authentication > Providers > Google

1. Enable Google provider
2. Enter your Google OAuth Client ID and Client Secret
3. Supabase will automatically use the callback URL above

## 3. Google Calendar Integration OAuth

### In Google Cloud Console
**Location**: APIs & Services > Credentials > Your OAuth 2.0 Client ID > Authorized redirect URIs

Add these URLs (separate from Supabase Auth):

```
# Development
http://localhost:3000/api/calendar/google/callback

# Production
https://1shotcrm.com/api/calendar/google/callback
https://www.1shotcrm.com/api/calendar/google/callback
```

**Note**: This is for the Google Calendar integration feature (creating calendar events from the CRM). This is separate from Google Sign-In.

## 4. Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback
```

### Production (Netlify Environment Variables)
```env
NEXT_PUBLIC_SITE_URL=https://1shotcrm.com
GOOGLE_REDIRECT_URI=https://1shotcrm.com/api/calendar/google/callback
```

## Summary Checklist

### Supabase Auth Configuration
- [ ] Site URL set: `https://1shotcrm.com` (production) and `http://localhost:3000` (development)
- [ ] Redirect URLs added (see section 1 above)
- [ ] Email provider configured
- [ ] Google provider enabled (optional)

### Google Cloud Console (for Google Sign-In)
- [ ] OAuth 2.0 Client ID created
- [ ] Authorized redirect URI: `https://otbaeguavfmruyuadjva.supabase.co/auth/v1/callback`
- [ ] Client ID and Secret added to Supabase

### Google Cloud Console (for Calendar Integration)
- [ ] OAuth 2.0 Client ID created (can be same or different from above)
- [ ] Authorized redirect URIs added (see section 3 above)
- [ ] Google Calendar API enabled
- [ ] Client ID and Secret set in environment variables

## Important Notes

1. **Two Different Google OAuth Setups**:
   - **Google Sign-In via Supabase**: Uses Supabase's callback endpoint
   - **Google Calendar Integration**: Uses your app's callback endpoint (`/api/calendar/google/callback`)

2. **You can use the same Google OAuth Client ID** for both, just add all redirect URLs to it.

3. **Development vs Production**: Make sure to add both development and production URLs to all services.

4. **Wildcards**: Supabase supports `/**` wildcards, but Google Cloud Console requires exact URLs.

5. **Testing**: After adding redirect URLs, wait a few minutes for changes to propagate before testing.

