-- Email Templates Migration
-- This will be applied after tags system

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  variables TEXT[], -- Array of available variables like ['contact_name', 'deal_title', 'company']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all on email_templates" ON email_templates FOR ALL USING (true);

-- Insert default templates
INSERT INTO email_templates (name, subject, body, category, variables) VALUES
  ('Welcome Email', 'Welcome to {{company}}!', 'Hi {{contact_name}},\n\nThank you for your interest in our services. We''re excited to work with you!\n\nBest regards,\nThe Team', 'general', ARRAY['contact_name', 'company']),
  ('Follow Up', 'Following up on {{deal_title}}', 'Hi {{contact_name}},\n\nI wanted to follow up on our conversation about {{deal_title}}. Let me know if you have any questions!\n\nBest regards', 'follow-up', ARRAY['contact_name', 'deal_title']),
  ('Proposal Sent', 'Proposal for {{deal_title}}', 'Hi {{contact_name}},\n\nI''ve attached the proposal for {{deal_title}} (Value: ${{deal_value}}). Please review and let me know if you have any questions.\n\nBest regards', 'proposal', ARRAY['contact_name', 'deal_title', 'deal_value'])
ON CONFLICT DO NOTHING;

