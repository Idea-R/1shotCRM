-- RLS Policies Update for Role-Based Access Control
-- This file updates all existing RLS policies to check user roles

-- Update contacts RLS policies
DROP POLICY IF EXISTS "Allow all on contacts" ON contacts;

CREATE POLICY "Users can view contacts in their organization" ON contacts
  FOR SELECT USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = contacts.organization_id
    )
  );

CREATE POLICY "Users with contacts:write can create contacts" ON contacts
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'contacts:write', organization_id)
  );

CREATE POLICY "Users with contacts:write can update contacts" ON contacts
  FOR UPDATE USING (
    has_permission(auth.uid(), 'contacts:write', organization_id)
  );

CREATE POLICY "Users with contacts:delete can delete contacts" ON contacts
  FOR DELETE USING (
    has_permission(auth.uid(), 'contacts:delete', organization_id)
  );

-- Update deals RLS policies
DROP POLICY IF EXISTS "Allow all on deals" ON deals;

CREATE POLICY "Users can view deals in their organization" ON deals
  FOR SELECT USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = deals.organization_id
    )
  );

CREATE POLICY "Users with deals:write can create deals" ON deals
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'deals:write', organization_id)
  );

CREATE POLICY "Users with deals:write can update deals" ON deals
  FOR UPDATE USING (
    has_permission(auth.uid(), 'deals:write', organization_id)
  );

CREATE POLICY "Users with deals:delete can delete deals" ON deals
  FOR DELETE USING (
    has_permission(auth.uid(), 'deals:delete', organization_id)
  );

-- Update services RLS policies
DROP POLICY IF EXISTS "Allow all on services" ON services;

CREATE POLICY "Users can view services in their organization or assigned to them" ON services
  FOR SELECT USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = services.organization_id
    ) OR
    assigned_technician_id = auth.uid()
  );

CREATE POLICY "Users with services:write can create services" ON services
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'services:write', organization_id)
  );

CREATE POLICY "Users with services:write or assigned technicians can update services" ON services
  FOR UPDATE USING (
    has_permission(auth.uid(), 'services:write', organization_id) OR
    assigned_technician_id = auth.uid()
  );

CREATE POLICY "Users with services:delete can delete services" ON services
  FOR DELETE USING (
    has_permission(auth.uid(), 'services:delete', organization_id)
  );

-- Update tasks RLS policies
DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;

CREATE POLICY "Users can view tasks in their organization or assigned to them" ON tasks
  FOR SELECT USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = tasks.organization_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'csr', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Users with tasks:write can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'tasks:write', organization_id)
  );

CREATE POLICY "Users with tasks:write can update tasks" ON tasks
  FOR UPDATE USING (
    has_permission(auth.uid(), 'tasks:write', organization_id)
  );

CREATE POLICY "Users with tasks:delete can delete tasks" ON tasks
  FOR DELETE USING (
    has_permission(auth.uid(), 'tasks:delete', organization_id)
  );

-- Update activities RLS policies
DROP POLICY IF EXISTS "Allow all on activities" ON activities;

CREATE POLICY "Users can view activities in their organization" ON activities
  FOR SELECT USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = activities.organization_id
    ) OR
    EXISTS (
      SELECT 1 FROM services s
      WHERE s.id = activities.deal_id
      AND s.assigned_technician_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities in their organization" ON activities
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = activities.organization_id
    )
  );

-- Update appliances RLS policies
DROP POLICY IF EXISTS "Allow all on appliances" ON appliances;

CREATE POLICY "Users can view appliances in their organization or own appliances" ON appliances
  FOR SELECT USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = appliances.organization_id
    ) OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = appliances.contact_id
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'customer'
      )
    )
  );

CREATE POLICY "Users with appliances:write can create appliances" ON appliances
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'appliances:write', organization_id)
  );

CREATE POLICY "Users with appliances:write can update appliances" ON appliances
  FOR UPDATE USING (
    has_permission(auth.uid(), 'appliances:write', organization_id)
  );

CREATE POLICY "Users with appliances:delete can delete appliances" ON appliances
  FOR DELETE USING (
    has_permission(auth.uid(), 'appliances:delete', organization_id)
  );

-- Update attachments RLS policies (if they exist)
DO $$
BEGIN
  -- Check if attachments table has RLS enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'attachments'
  ) THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view attachments" ON attachments;
    DROP POLICY IF EXISTS "Users can create attachments" ON attachments;
    DROP POLICY IF EXISTS "Users can delete attachments" ON attachments;
    
    -- Create new role-based policies
    CREATE POLICY "Users can view attachments in their organization" ON attachments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.id::text = attachments.entity_id
          AND attachments.entity_type = 'contact'
          AND (
            c.organization_id IS NULL OR
            EXISTS (
              SELECT 1 FROM user_organizations uo
              WHERE uo.user_id = auth.uid()
              AND uo.organization_id = c.organization_id
            )
          )
        ) OR
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id::text = attachments.entity_id
          AND attachments.entity_type = 'service'
          AND (
            s.organization_id IS NULL OR
            EXISTS (
              SELECT 1 FROM user_organizations uo
              WHERE uo.user_id = auth.uid()
              AND uo.organization_id = s.organization_id
            ) OR
            s.assigned_technician_id = auth.uid()
          )
        ) OR
        EXISTS (
          SELECT 1 FROM deals d
          WHERE d.id::text = attachments.entity_id
          AND attachments.entity_type = 'deal'
          AND (
            d.organization_id IS NULL OR
            EXISTS (
              SELECT 1 FROM user_organizations uo
              WHERE uo.user_id = auth.uid()
              AND uo.organization_id = d.organization_id
            )
          )
        )
      );
    
    CREATE POLICY "Users with attachments:write can create attachments" ON attachments
      FOR INSERT WITH CHECK (
        has_permission(auth.uid(), 'attachments:write', NULL)
      );
    
    CREATE POLICY "Users with attachments:delete can delete attachments" ON attachments
      FOR DELETE USING (
        has_permission(auth.uid(), 'attachments:delete', NULL) OR
        uploaded_by = auth.uid()
      );
  END IF;
END $$;

