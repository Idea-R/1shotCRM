-- Role-Based Access Control (RBAC) Schema
-- This schema implements a comprehensive RBAC system for multi-tenant CRM

-- User Roles Table
-- Maps users to their roles within organizations
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID, -- NULL for system-wide roles, UUID for organization-specific
  role TEXT NOT NULL CHECK (role IN ('customer', 'csr', 'technician', 'admin', 'super_admin')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, role)
);

-- Permissions Table
-- Defines all available permissions in the system
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'contacts:read', 'services:write'
  resource TEXT NOT NULL, -- e.g., 'contacts', 'services', 'deals'
  action TEXT NOT NULL, -- e.g., 'read', 'write', 'delete', 'admin'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Permissions Junction Table
-- Maps roles to their permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('customer', 'csr', 'technician', 'admin', 'super_admin')),
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- User Organizations Table
-- Multi-tenant support: users can belong to multiple organizations
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL, -- UUID identifier for organization
  organization_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'csr', 'technician', 'admin', 'super_admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to existing tables for multi-tenant support
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE services ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE appliances ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add role tracking to services (for technician assignments)
ALTER TABLE services ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_assigned_technician_id ON services(assigned_technician_id);

-- Enable RLS on new tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles in their organization" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
      AND (ur.organization_id = user_roles.organization_id OR ur.organization_id IS NULL)
    )
  );

-- RLS Policies for permissions (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for role_permissions (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view role permissions" ON role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for user_organizations
CREATE POLICY "Users can view own organizations" ON user_organizations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all users in their organization" ON user_organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.role IN ('admin', 'super_admin')
      AND uo.organization_id = user_organizations.organization_id
    )
  );

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('contacts:read', 'contacts', 'read', 'View contacts'),
  ('contacts:write', 'contacts', 'write', 'Create and edit contacts'),
  ('contacts:delete', 'contacts', 'delete', 'Delete contacts'),
  ('contacts:admin', 'contacts', 'admin', 'Full contact management'),
  ('deals:read', 'deals', 'read', 'View deals'),
  ('deals:write', 'deals', 'write', 'Create and edit deals'),
  ('deals:delete', 'deals', 'delete', 'Delete deals'),
  ('deals:admin', 'deals', 'admin', 'Full deal management'),
  ('services:read', 'services', 'read', 'View services'),
  ('services:write', 'services', 'write', 'Create and edit services'),
  ('services:delete', 'services', 'delete', 'Delete services'),
  ('services:assign', 'services', 'assign', 'Assign services to technicians'),
  ('services:admin', 'services', 'admin', 'Full service management'),
  ('tasks:read', 'tasks', 'read', 'View tasks'),
  ('tasks:write', 'tasks', 'write', 'Create and edit tasks'),
  ('tasks:delete', 'tasks', 'delete', 'Delete tasks'),
  ('tasks:admin', 'tasks', 'admin', 'Full task management'),
  ('appliances:read', 'appliances', 'read', 'View appliances'),
  ('appliances:write', 'appliances', 'write', 'Create and edit appliances'),
  ('appliances:delete', 'appliances', 'delete', 'Delete appliances'),
  ('appliances:admin', 'appliances', 'admin', 'Full appliance management'),
  ('attachments:read', 'attachments', 'read', 'View attachments'),
  ('attachments:write', 'attachments', 'write', 'Upload attachments'),
  ('attachments:delete', 'attachments', 'delete', 'Delete attachments'),
  ('settings:read', 'settings', 'read', 'View settings'),
  ('settings:write', 'settings', 'write', 'Edit settings'),
  ('settings:admin', 'settings', 'admin', 'Full settings management'),
  ('users:read', 'users', 'read', 'View users'),
  ('users:write', 'users', 'write', 'Create and edit users'),
  ('users:admin', 'users', 'admin', 'Full user management'),
  ('reports:read', 'reports', 'read', 'View reports'),
  ('reports:admin', 'reports', 'admin', 'Full report access')
ON CONFLICT (name) DO NOTHING;

-- Assign default permissions to roles
-- Customer permissions
INSERT INTO role_permissions (role, permission_id) 
SELECT 'customer', id FROM permissions 
WHERE name IN (
  'contacts:read', 'services:read', 'tasks:read', 
  'appliances:read', 'attachments:read', 'attachments:write'
)
ON CONFLICT DO NOTHING;

-- CSR permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'csr', id FROM permissions
WHERE name IN (
  'contacts:read', 'contacts:write', 'deals:read', 'deals:write',
  'services:read', 'services:write', 'tasks:read', 'tasks:write',
  'appliances:read', 'appliances:write', 'attachments:read', 'attachments:write',
  'settings:read'
)
ON CONFLICT DO NOTHING;

-- Technician permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'technician', id FROM permissions
WHERE name IN (
  'services:read', 'services:write', 'tasks:read', 'tasks:write',
  'appliances:read', 'appliances:write', 'attachments:read', 'attachments:write',
  'contacts:read'
)
ON CONFLICT DO NOTHING;

-- Admin permissions (all except user management)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE name NOT LIKE 'users:%'
ON CONFLICT DO NOTHING;

-- Super Admin permissions (everything)
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Function to get user's role in an organization
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_organization_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id
  AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'technician' THEN 3
      WHEN 'csr' THEN 4
      WHEN 'customer' THEN 5
    END
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_permission_name TEXT,
  p_organization_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user's role
  v_user_role := get_user_role(p_user_id, p_organization_id);
  
  -- Check if role has permission
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = v_user_role
    AND p.name = p_permission_name
  ) INTO v_has_permission;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE(organization_id UUID, organization_name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id, uo.organization_name, uo.role
  FROM user_organizations uo
  WHERE uo.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

