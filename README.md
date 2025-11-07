# 1shotCRM

AI-first CRM inspired by Pipedrive, built with Next.js, Supabase, and GPT-4o-mini.

## Features

- AI Assistant on every page with full CRM data access
- Dashboard with CRM health metrics and charts
- Contacts management with custom fields and profile types
- Pipeline Kanban board with drag-and-drop
- Tasks with table and calendar views
- Activity logging with rich text editor
- Email templates and sending (Resend)
- SMS sending (Twilio)
- Google Calendar integration
- Payment processing (Stripe)
- File attachments
- Service history tracking
- Customizable contact profiles

## Tech Stack

- Next.js 15 (App Router)
- React 18
- TypeScript
- Supabase (Database, Auth, Storage)
- OpenAI GPT-4o-mini
- Tailwind CSS
- DnD Kit for drag-and-drop
- TipTap for rich text editing

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Set up Supabase database (see `documents/SUPABASE_SETUP.md`)

4. Run the development server:
```bash
npm run dev
```

## Documentation

Setup guides and documentation are in the `/documents` folder:
- `SUPABASE_SETUP.md` - Database setup
- `SUPABASE_AUTH_SETUP.md` - Authentication configuration
- `REDIRECT_URLS_GUIDE.md` - OAuth redirect URLs
- `CODEBASE_REVIEW.md` - Complete codebase overview

