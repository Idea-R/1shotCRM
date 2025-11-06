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

