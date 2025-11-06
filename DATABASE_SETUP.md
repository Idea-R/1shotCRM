# Database Setup Instructions

1. Go to your Supabase project: https://supabase.com/dashboard/project/otbaeguavfmruyuadjva

2. Navigate to SQL Editor

3. Copy and paste the contents of `supabase/schema.sql` into the SQL editor

4. Run the SQL script

5. Get your anon key:
   - Go to Settings > API
   - Copy the "anon public" key

6. Update `.env.local` with your Supabase anon key:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

7. The database is now ready!

