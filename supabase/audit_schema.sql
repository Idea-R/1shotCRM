-- Audit Logging and Change Tracking Schema
-- Comprehensive audit trail for all system actions and data changes

-- Audit Logs Table
-- Records all user actions in the system
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'login', 'export'
  resource_type TEXT NOT NULL, -- e.g., 'contact', 'deal', 'service', 'user'
  resource_id UUID, -- ID of the affected resource
  changes JSONB, -- JSON object with before/after values or action details
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Additional context (organization_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Change Logs Table
-- Detailed field-level change tracking
CREATE TABLE IF NOT EXISTS change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- e.g., 'contacts', 'deals', 'services'
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT, -- Stored as text, can be JSON for complex types
  new_value TEXT, -- Stored as text, can be JSON for complex types
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT -- Optional reason for the change
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_logs_entity_type ON change_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_change_logs_entity_id ON change_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_by ON change_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON change_logs(changed_at DESC);

-- Enable RLS on audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all audit logs in their organization
CREATE POLICY "Admins can view organization audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
      AND (
        ur.organization_id = (audit_logs.metadata->>'organization_id')::UUID
        OR ur.organization_id IS NULL
      )
    )
  );

-- RLS Policies for change_logs
-- Users can view change logs for entities they have access to
CREATE POLICY "Users can view change logs for accessible entities" ON change_logs
  FOR SELECT USING (
    -- Allow if user has read permission for the entity type
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role = ur.role
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.name = change_logs.entity_type || ':read'
    )
  );

-- Function to log an audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    changes,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_changes,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log a field change
CREATE OR REPLACE FUNCTION log_field_change(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_field_name TEXT,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_changed_by UUID DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_change_id UUID;
BEGIN
  INSERT INTO change_logs (
    entity_type,
    entity_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    change_reason
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_field_name,
    p_old_value,
    p_new_value,
    COALESCE(p_changed_by, auth.uid()),
    p_change_reason
  )
  RETURNING id INTO v_change_id;
  
  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically log changes to contacts
CREATE OR REPLACE FUNCTION audit_contacts_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}'::JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log creation
    PERFORM log_audit_event(
      COALESCE(NEW.organization_id::TEXT::UUID, auth.uid()),
      'create',
      'contact',
      NEW.id,
      jsonb_build_object('contact', row_to_json(NEW)),
      NULL,
      NULL,
      jsonb_build_object('organization_id', NEW.organization_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Build changes object
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      PERFORM log_field_change('contacts', NEW.id, 'name', OLD.name, NEW.name);
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      PERFORM log_field_change('contacts', NEW.id, 'email', OLD.email, NEW.email);
      v_changes := v_changes || jsonb_build_object('email', jsonb_build_object('old', OLD.email, 'new', NEW.email));
    END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      PERFORM log_field_change('contacts', NEW.id, 'phone', OLD.phone, NEW.phone);
      v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('old', OLD.phone, 'new', NEW.phone));
    END IF;
    
    -- Log update if there were changes
    IF v_changes != '{}'::JSONB THEN
      PERFORM log_audit_event(
        auth.uid(),
        'update',
        'contact',
        NEW.id,
        v_changes,
        NULL,
        NULL,
        jsonb_build_object('organization_id', NEW.organization_id)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Log deletion
    PERFORM log_audit_event(
      auth.uid(),
      'delete',
      'contact',
      OLD.id,
      jsonb_build_object('contact', row_to_json(OLD)),
      NULL,
      NULL,
      jsonb_build_object('organization_id', OLD.organization_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contacts
DROP TRIGGER IF EXISTS audit_contacts_trigger ON contacts;
CREATE TRIGGER audit_contacts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION audit_contacts_changes();

-- Trigger function for deals
CREATE OR REPLACE FUNCTION audit_deals_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}'::JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'create',
      'deal',
      NEW.id,
      jsonb_build_object('deal', row_to_json(NEW)),
      NULL,
      NULL,
      jsonb_build_object('organization_id', NEW.organization_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      PERFORM log_field_change('deals', NEW.id, 'title', OLD.title, NEW.title);
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF OLD.value IS DISTINCT FROM NEW.value THEN
      PERFORM log_field_change('deals', NEW.id, 'value', OLD.value::TEXT, NEW.value::TEXT);
      v_changes := v_changes || jsonb_build_object('value', jsonb_build_object('old', OLD.value, 'new', NEW.value));
    END IF;
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      PERFORM log_field_change('deals', NEW.id, 'stage_id', OLD.stage_id::TEXT, NEW.stage_id::TEXT);
      v_changes := v_changes || jsonb_build_object('stage_id', jsonb_build_object('old', OLD.stage_id, 'new', NEW.stage_id));
    END IF;
    
    IF v_changes != '{}'::JSONB THEN
      PERFORM log_audit_event(
        auth.uid(),
        'update',
        'deal',
        NEW.id,
        v_changes,
        NULL,
        NULL,
        jsonb_build_object('organization_id', NEW.organization_id)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'delete',
      'deal',
      OLD.id,
      jsonb_build_object('deal', row_to_json(OLD)),
      NULL,
      NULL,
      jsonb_build_object('organization_id', OLD.organization_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for deals
DROP TRIGGER IF EXISTS audit_deals_trigger ON deals;
CREATE TRIGGER audit_deals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION audit_deals_changes();

-- Trigger function for services
CREATE OR REPLACE FUNCTION audit_services_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}'::JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'create',
      'service',
      NEW.id,
      jsonb_build_object('service', row_to_json(NEW)),
      NULL,
      NULL,
      jsonb_build_object('organization_id', NEW.organization_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_field_change('services', NEW.id, 'status', OLD.status, NEW.status);
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id THEN
      PERFORM log_field_change('services', NEW.id, 'assigned_technician_id', OLD.assigned_technician_id::TEXT, NEW.assigned_technician_id::TEXT);
      v_changes := v_changes || jsonb_build_object('assigned_technician_id', jsonb_build_object('old', OLD.assigned_technician_id, 'new', NEW.assigned_technician_id));
    END IF;
    
    IF v_changes != '{}'::JSONB THEN
      PERFORM log_audit_event(
        auth.uid(),
        'update',
        'service',
        NEW.id,
        v_changes,
        NULL,
        NULL,
        jsonb_build_object('organization_id', NEW.organization_id)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'delete',
      'service',
      OLD.id,
      jsonb_build_object('service', row_to_json(OLD)),
      NULL,
      NULL,
      jsonb_build_object('organization_id', OLD.organization_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for services
DROP TRIGGER IF EXISTS audit_services_trigger ON services;
CREATE TRIGGER audit_services_trigger
  AFTER INSERT OR UPDATE OR DELETE ON services
  FOR EACH ROW
  EXECUTE FUNCTION audit_services_changes();

-- Function to get audit logs with filters
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.changes,
    al.ip_address,
    al.user_agent,
    al.metadata,
    al.created_at
  FROM audit_logs al
  WHERE (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_resource_id IS NULL OR al.resource_id = p_resource_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (
      -- Users can see their own logs
      al.user_id = auth.uid()
      OR
      -- Admins can see organization logs
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
        AND (
          ur.organization_id = (al.metadata->>'organization_id')::UUID
          OR ur.organization_id IS NULL
        )
      )
    )
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get change logs for an entity
CREATE OR REPLACE FUNCTION get_entity_change_logs(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE,
  change_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.field_name,
    cl.old_value,
    cl.new_value,
    cl.changed_by,
    cl.changed_at,
    cl.change_reason
  FROM change_logs cl
  WHERE cl.entity_type = p_entity_type
    AND cl.entity_id = p_entity_id
    AND (
      -- Users can see changes if they have read permission
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON rp.role = ur.role
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = auth.uid()
        AND p.name = p_entity_type || ':read'
      )
    )
  ORDER BY cl.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

