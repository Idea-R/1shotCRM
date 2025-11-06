# Deployment Guide

## Prerequisites

1. Supabase project set up at: https://supabase.com/dashboard/project/otbaeguavfmruyuadjva
2. GitHub repository: https://github.com/Idea-R/1shotCRM
3. Netlify account with access to team: idea-r

## Step 1: Set Up Supabase Database

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/otbaeguavfmruyuadjva/sql/new
2. Copy the contents of `supabase/schema.sql`
3. Paste and run in SQL Editor
4. Get your anon key from Settings > API

## Step 2: Deploy to Netlify

### Option A: Via Netlify Dashboard

1. Go to: https://app.netlify.com/teams/idea-r/sites
2. Click "Add new site" > "Import an existing project"
3. Connect to GitHub and select `Idea-R/1shotCRM`
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://otbaeguavfmruyuadjva.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (your Supabase anon key)
   - `OPENAI_API_KEY`: (your OpenAI API key)
6. Deploy!

### Option B: Via Netlify CLI

```bash
netlify login
netlify init
netlify deploy --prod
```

## Step 3: Configure Custom Domain

1. In Netlify dashboard, go to Site settings > Domain management
2. Add custom domain: `1shotcrm.com`
3. Configure DNS as instructed by Netlify

## Environment Variables for Netlify

Make sure these are set in Netlify:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

