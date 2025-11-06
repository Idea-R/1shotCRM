import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://otbaeguavfmruyuadjva.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
}

export interface Deal {
  id: string;
  contact_id: string;
  title: string;
  value: number;
  stage_id: string;
  probability?: number;
  expected_close_date?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  stage?: PipelineStage;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  contact_id?: string;
  deal_id?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  deal?: Deal;
}

export interface Activity {
  id: string;
  deal_id?: string;
  contact_id?: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task';
  title: string;
  description?: string;
  created_at: string;
  created_by?: string;
}

