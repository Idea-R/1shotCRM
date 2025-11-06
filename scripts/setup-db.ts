// Setup script for Supabase database
// Run this after setting up your Supabase project

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// This script should be run with your Supabase credentials
// Get your anon key from: https://supabase.com/dashboard/project/otbaeguavfmruyuadjva/settings/api

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://otbaeguavfmruyuadjva.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Read and execute schema
  const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Execute SQL statements
  const statements = schema.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error('Error executing statement:', error);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    }
  }
  
  console.log('Database setup complete!');
}

setupDatabase();

