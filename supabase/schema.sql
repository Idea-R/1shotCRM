-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value DECIMAL(10, 2) DEFAULT 0,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'task')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, "order", color) VALUES
  ('Lead', 1, '#EF4444'),
  ('Qualified', 2, '#F59E0B'),
  ('Proposal', 3, '#3B82F6'),
  ('Negotiation', 4, '#8B5CF6'),
  ('Won', 5, '#10B981'),
  ('Lost', 6, '#6B7280')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all on pipeline_stages" ON pipeline_stages FOR ALL USING (true);
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all on deals" ON deals FOR ALL USING (true);
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all on activities" ON activities FOR ALL USING (true);

-- Custom Field Definitions Table
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'select', 'textarea')),
  category TEXT NOT NULL DEFAULT 'General',
  "order" INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN DEFAULT FALSE,
  options JSONB, -- For select type: array of option strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Field Values Table
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT, -- Store as TEXT, can be JSON for complex types
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, field_definition_id)
);

-- Appliances/Equipment Table
CREATE TABLE IF NOT EXISTS appliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., "Refrigerator", "Washer", etc.
  appliance_type_id UUID REFERENCES appliance_types(id) ON DELETE SET NULL,
  model_number TEXT,
  serial_number TEXT,
  brand TEXT,
  purchase_date DATE,
  install_date DATE,
  age_years INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services/Jobs Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  appliance_id UUID REFERENCES appliances(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  service_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  technician TEXT,
  cost DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service History Table
CREATE TABLE IF NOT EXISTS service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  appliance_id UUID REFERENCES appliances(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('service', 'repair', 'maintenance', 'inspection')),
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  cost DECIMAL(10, 2),
  technician TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_custom_field_values_contact_id ON custom_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_definition_id ON custom_field_values(field_definition_id);
CREATE INDEX IF NOT EXISTS idx_appliances_contact_id ON appliances(contact_id);
CREATE INDEX IF NOT EXISTS idx_appliances_category ON appliances(category);
CREATE INDEX IF NOT EXISTS idx_services_contact_id ON services(contact_id);
CREATE INDEX IF NOT EXISTS idx_services_appliance_id ON services(appliance_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_service_date ON services(service_date);
CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_history_appliance_id ON service_history(appliance_id);
CREATE INDEX IF NOT EXISTS idx_service_history_contact_id ON service_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_service_history_date ON service_history(date);

-- Enable RLS for new tables
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Allow all on custom_field_definitions" ON custom_field_definitions FOR ALL USING (true);
CREATE POLICY "Allow all on custom_field_values" ON custom_field_values FOR ALL USING (true);
CREATE POLICY "Allow all on appliances" ON appliances FOR ALL USING (true);
CREATE POLICY "Allow all on services" ON services FOR ALL USING (true);
CREATE POLICY "Allow all on service_history" ON service_history FOR ALL USING (true);

-- Contact Profile Types Table
CREATE TABLE IF NOT EXISTS contact_profile_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  default_layout_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Profile Type Assignments Table
CREATE TABLE IF NOT EXISTS contact_profile_type_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  profile_type_id UUID REFERENCES contact_profile_types(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, profile_type_id)
);

-- Contact Categories Table
CREATE TABLE IF NOT EXISTS contact_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#6B7280',
  parent_category_id UUID REFERENCES contact_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Category Assignments Table
CREATE TABLE IF NOT EXISTS contact_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES contact_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, category_id)
);

-- Standard Appliance Types Table
CREATE TABLE IF NOT EXISTS appliance_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_contact_profile_type_assignments_contact_id ON contact_profile_type_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_profile_type_assignments_profile_type_id ON contact_profile_type_assignments(profile_type_id);
CREATE INDEX IF NOT EXISTS idx_contact_category_assignments_contact_id ON contact_category_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_category_assignments_category_id ON contact_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_appliances_appliance_type_id ON appliances(appliance_type_id);

-- Enable RLS for new tables
ALTER TABLE contact_profile_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_profile_type_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliance_types ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Allow all on contact_profile_types" ON contact_profile_types FOR ALL USING (true);
CREATE POLICY "Allow all on contact_profile_type_assignments" ON contact_profile_type_assignments FOR ALL USING (true);
CREATE POLICY "Allow all on contact_categories" ON contact_categories FOR ALL USING (true);
CREATE POLICY "Allow all on contact_category_assignments" ON contact_category_assignments FOR ALL USING (true);
CREATE POLICY "Allow all on appliance_types" ON appliance_types FOR ALL USING (true);

-- Insert default contact profile types
INSERT INTO contact_profile_types (name, icon, color, default_layout_config) VALUES
  ('Appliances', 'Wrench', '#3B82F6', '{"sections": ["custom_fields", "appliances", "service_history"]}'),
  ('Electrical', 'Zap', '#F59E0B', '{"sections": ["custom_fields", "appliances", "service_history"]}'),
  ('HVAC', 'Wind', '#10B981', '{"sections": ["custom_fields", "appliances", "service_history"]}'),
  ('Plumbing', 'Droplet', '#06B6D4', '{"sections": ["custom_fields", "appliances", "service_history"]}'),
  ('Lead', 'UserPlus', '#EF4444', '{"sections": ["custom_fields", "activities"]}'),
  ('General', 'User', '#6B7280', '{"sections": ["custom_fields", "activities", "deals", "tasks"]}')
ON CONFLICT (name) DO NOTHING;

-- Insert default contact categories
INSERT INTO contact_categories (name, description, icon, color) VALUES
  ('Leads', 'Potential customers', 'UserPlus', '#EF4444'),
  ('Referrals', 'Referred customers', 'Users', '#8B5CF6'),
  ('Business Partners', 'Business partners and vendors', 'Handshake', '#10B981'),
  ('Property Management', 'Property management companies', 'Building', '#3B82F6'),
  ('High Volume Clients', 'High volume customers', 'Star', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- Insert default appliance types
INSERT INTO appliance_types (name, category, icon) VALUES
  -- Kitchen
  ('Refrigerator', 'Kitchen', 'Refrigerator'),
  ('Dishwasher', 'Kitchen', 'Dishwasher'),
  ('Oven', 'Kitchen', 'Oven'),
  ('Range', 'Kitchen', 'Range'),
  ('Microwave', 'Kitchen', 'Microwave'),
  ('Garbage Disposal', 'Kitchen', 'Trash'),
  -- Laundry
  ('Washer', 'Laundry', 'Washer'),
  ('Dryer', 'Laundry', 'Dryer'),
  -- HVAC
  ('Air Conditioner', 'HVAC', 'Wind'),
  ('Furnace', 'HVAC', 'Flame'),
  ('Heat Pump', 'HVAC', 'Thermometer'),
  ('Water Heater', 'HVAC', 'Droplet'),
  -- Electrical
  ('Panel', 'Electrical', 'Zap'),
  ('Outlet', 'Electrical', 'Plug'),
  ('Switch', 'Electrical', 'Toggle'),
  ('Light Fixture', 'Electrical', 'Lightbulb'),
  -- Plumbing
  ('Sink', 'Plumbing', 'Droplet'),
  ('Toilet', 'Plumbing', 'Droplet'),
  ('Shower', 'Plumbing', 'Droplet'),
  ('Faucet', 'Plumbing', 'Droplet')
ON CONFLICT (name) DO NOTHING;
