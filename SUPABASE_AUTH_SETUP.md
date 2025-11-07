# Supabase Authentication Setup Guide

## Overview
This guide will help you configure Supabase Authentication so that sign-in works properly in your CRM application.

## Step 1: Configure Supabase Auth Settings

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/otbaeguavfmruyuadjva/auth/url-configuration

2. **Set Site URL**
   - **Production**: `https://1shotcrm.com`
   - **Development**: `http://localhost:3000`
   - Add both URLs to "Redirect URLs" section

3. **Configure Email Auth**
   - Go to: Authentication > Providers > Email
   - **Enable Email provider** (should be enabled by default)
   - **Disable "Confirm email"** (for easier testing) OR keep it enabled and configure email templates
   - **Email Template Settings**:
     - If email confirmation is disabled, users can sign in immediately
     - If enabled, users must click confirmation link in email

4. **Configure Redirect URLs**
   - Go to: Authentication > URL Configuration
   - Add these redirect URLs:
     ```
     http://localhost:3000/**
     https://1shotcrm.com/**
     https://www.1shotcrm.com/**
     ```

## Step 2: Verify Database Setup

Run this SQL in Supabase SQL Editor to ensure auth triggers are set up:

```sql
-- Verify user_credits table exists
SELECT * FROM user_credits LIMIT 1;

-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If trigger doesn't exist, create it:
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits, plan)
  VALUES (NEW.id, 100, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();
```

## Step 3: Test Sign-In

1. **Create a test user**:
   - Go to `/login` page
   - Click "Sign up"
   - Enter email and password (min 6 characters)
   - Submit

2. **If email confirmation is enabled**:
   - Check your email for confirmation link
   - Click the link to confirm
   - Then sign in

3. **If email confirmation is disabled**:
   - You should be signed in immediately
   - Check that credits are initialized (should see 100 credits in sidebar)

## Step 4: Troubleshooting

### Issue: "Invalid login credentials"
- **Solution**: Make sure email confirmation is completed (if enabled)
- Check Supabase Auth logs: Dashboard > Authentication > Logs

### Issue: "Email not confirmed"
- **Solution**: 
  - Disable email confirmation in Auth settings, OR
  - Check spam folder for confirmation email, OR
  - Resend confirmation email from Supabase dashboard

### Issue: Sign-in works but can't create activities/tasks
- **Solution**: 
  - Check browser console for errors
  - Verify API routes are receiving auth token
  - Check RLS policies allow inserts

### Issue: "Authentication required" errors
- **Solution**: 
  - Make sure you're signed in
  - Check that session is being sent with API requests
  - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

## Step 5: Environment Variables

Make sure these are set in your `.env.local` (development) and Netlify (production):

```env
NEXT_PUBLIC_SUPABASE_URL=https://otbaeguavfmruyuadjva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 6: Verify RLS Policies

The current RLS policies allow all operations. If you want to restrict access:

```sql
-- Example: Only allow users to see their own data
-- (Currently set to allow all for easier setup)

-- To restrict contacts to user ownership, you'd need to add user_id to contacts table:
-- ALTER TABLE contacts ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- Then update RLS policies accordingly
```

## Current Status

✅ **What's Working**:
- Auth context provider
- Login/signup page
- Session management
- Credit system initialization
- API routes support optional auth

⚠️ **What Needs Configuration**:
- Supabase Auth URL settings
- Email confirmation settings (optional)
- Redirect URLs

## Quick Setup Checklist

- [ ] Set Site URL in Supabase Auth settings
- [ ] Add redirect URLs
- [ ] Configure email provider (enable/disable confirmation)
- [ ] Verify user_credits trigger exists
- [ ] Test sign-up flow
- [ ] Test sign-in flow
- [ ] Verify credits are initialized
- [ ] Test creating activities/tasks while signed in

## Need Help?

If sign-in still doesn't work after following this guide:
1. Check Supabase Auth logs: Dashboard > Authentication > Logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Check that Supabase project is active and healthy

