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
  profile_types?: ContactProfileTypeAssignment[];
  categories?: ContactCategoryAssignment[];
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

export interface UserCredits {
  credits: number;
  plan: 'free' | 'pro' | 'enterprise';
  total_used: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  category: string;
  order: number;
  required: boolean;
  options?: string[]; // For select type
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  contact_id: string;
  field_definition_id: string;
  value: string;
  created_at: string;
  updated_at: string;
  field_definition?: CustomFieldDefinition;
}

export interface Appliance {
  id: string;
  contact_id: string;
  name: string;
  category: string;
  appliance_type_id?: string;
  model_number?: string;
  serial_number?: string;
  brand?: string;
  purchase_date?: string;
  install_date?: string;
  age_years?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  appliance_type?: ApplianceType;
}

export interface Service {
  id: string;
  contact_id: string;
  appliance_id?: string;
  title: string;
  description?: string;
  service_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  technician?: string;
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  appliance?: Appliance;
}

export interface ServiceHistory {
  id: string;
  service_id?: string;
  appliance_id?: string;
  contact_id: string;
  type: 'service' | 'repair' | 'maintenance' | 'inspection';
  description: string;
  date: string;
  cost?: number;
  technician?: string;
  created_at: string;
  service?: Service;
  appliance?: Appliance;
  contact?: Contact;
}

export interface ContactProfileType {
  id: string;
  name: string;
  icon?: string;
  color: string;
  default_layout_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContactProfileTypeAssignment {
  id: string;
  contact_id: string;
  profile_type_id: string;
  is_primary: boolean;
  created_at: string;
  profile_type?: ContactProfileType;
}

export interface ContactCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  parent_category_id?: string;
  created_at: string;
  updated_at: string;
  parent_category?: ContactCategory;
}

export interface ContactCategoryAssignment {
  id: string;
  contact_id: string;
  category_id: string;
  created_at: string;
  category?: ContactCategory;
}

export interface ApplianceType {
  id: string;
  name: string;
  category: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  appliance_id?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  tags?: string[];
  upload_source?: 'web' | 'pwa_customer' | 'pwa_technician' | 'api';
  organization_id?: string;
  uploaded_by?: string;
  created_at: string;
  url?: string;
}

