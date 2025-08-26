-- CONSOLIDATED MIGRATION: Complete Setup for Dipolog City Permit Application System
-- This combines all migrations: 001_init.sql, 002_rls.sql, 003_add_permit_fields.sql, and 004_user_permissions.sql
-- Run this single file to set up your complete database schema
-- This version handles existing objects gracefully

-- ============================================================================
-- PHASE 0: CLEANUP EXISTING OBJECTS (if any)
-- ============================================================================

-- Drop existing policies first (if they exist) - with proper table existence checks
DO $$ 
BEGIN
    -- Drop policies only if tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'applicants') THEN
        DROP POLICY IF EXISTS "Users can view their own applicant profile" ON applicants;
        DROP POLICY IF EXISTS "Users can insert their own applicant profile" ON applicants;
        DROP POLICY IF EXISTS "Users can update their own applicant profile" ON applicants;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'applications') THEN
        DROP POLICY IF EXISTS "Users can view their own applications" ON applications;
        DROP POLICY IF EXISTS "Users can insert applications" ON applications;
        DROP POLICY IF EXISTS "Users can update their own applications" ON applications;
        DROP POLICY IF EXISTS "Users can delete their own applications" ON applications;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
        DROP POLICY IF EXISTS "Users can view documents for their applications" ON documents;
        DROP POLICY IF EXISTS "Users can insert documents" ON documents;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP POLICY IF EXISTS "Users can view payments for their applications" ON payments;
        DROP POLICY IF EXISTS "Users can insert payments" ON payments;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        DROP POLICY IF EXISTS "Users can view audit logs for their applications" ON audit_logs;
        DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
        DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
        DROP POLICY IF EXISTS "Super admins can manage all roles" ON user_roles;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'permissions') THEN
        DROP POLICY IF EXISTS "All authenticated users can view permissions" ON permissions;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        DROP POLICY IF EXISTS "Super admins can manage role permissions" ON role_permissions;
    END IF;
END $$;

-- Drop storage policies (these are safe to drop without existence checks)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- Drop existing triggers with existence checks
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'applications') THEN
        DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
        DROP TRIGGER IF EXISTS audit_applications ON applications;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
    END IF;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS audit_application_changes() CASCADE;
DROP FUNCTION IF EXISTS check_user_permission(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(TEXT) CASCADE;

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS app_type CASCADE;
DROP TYPE IF EXISTS app_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS document_kind CASCADE;

-- ============================================================================
-- PHASE 1: INITIAL SCHEMA SETUP (from 001_init.sql)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE app_type AS ENUM ('business', 'building', 'barangay');
CREATE TYPE app_status AS ENUM ('submitted', 'under_review', 'approved', 'ready_for_pickup', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE document_kind AS ENUM ('attachment', 'requirement', 'approval', 'rejection');

-- Applicants table
CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  gov_id_no TEXT,
  address TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  type app_type NOT NULL,
  status app_status NOT NULL DEFAULT 'submitted',
  reference_no TEXT GENERATED ALWAYS AS (LEFT(REPLACE(id::text, '-', ''), 10)) STORED,
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT fee_amount_positive CHECK (fee_amount >= 0)
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind document_kind NOT NULL DEFAULT 'attachment',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT file_size_positive CHECK (file_size > 0)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'xendit',
  method TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  external_ref TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 2: ADD PERMIT-SPECIFIC FIELDS (from 003_add_permit_fields.sql)
-- ============================================================================

-- Add Business Permit fields
ALTER TABLE applications ADD COLUMN business_name TEXT;
ALTER TABLE applications ADD COLUMN business_type TEXT;
ALTER TABLE applications ADD COLUMN business_address TEXT;
ALTER TABLE applications ADD COLUMN business_registration TEXT;

-- Add Building Permit fields
ALTER TABLE applications ADD COLUMN building_type TEXT;
ALTER TABLE applications ADD COLUMN building_address TEXT;
ALTER TABLE applications ADD COLUMN land_ownership TEXT;
ALTER TABLE applications ADD COLUMN structural_calculations TEXT;
ALTER TABLE applications ADD COLUMN site_development_plan TEXT;

-- Add Barangay Clearance fields
ALTER TABLE applications ADD COLUMN purpose_of_clearance TEXT;
ALTER TABLE applications ADD COLUMN residency_address TEXT;
ALTER TABLE applications ADD COLUMN community_tax_number TEXT;

-- ============================================================================
-- PHASE 3: RBAC SYSTEM SETUP (from 004_user_permissions.sql)
-- ============================================================================

-- Create user roles table for RBAC
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'super_admin')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Create permissions table for granular control
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- PHASE 4: INDEXES AND PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create indexes for better performance
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_type ON applications(type);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_applications_reference_no ON applications(reference_no);

CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_kind ON documents(kind);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

CREATE INDEX idx_payments_application_id ON payments(application_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_external_ref ON payments(external_ref);

CREATE INDEX idx_audit_logs_application_id ON audit_logs(application_id);
CREATE INDEX idx_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create full-text search indexes
CREATE INDEX idx_applicants_full_name_gin ON applicants USING gin(to_tsvector('english', full_name));
CREATE INDEX idx_applications_description_gin ON applications USING gin(to_tsvector('english', COALESCE(description, '')));

-- Add indexes for new permit fields
CREATE INDEX idx_applications_business_name ON applications(business_name);
CREATE INDEX idx_applications_building_type ON applications(building_type);
CREATE INDEX idx_applications_purpose_clearance ON applications(purpose_of_clearance);

-- RBAC indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================================
-- PHASE 5: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Create updated_at trigger function
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit log trigger function
CREATE FUNCTION audit_application_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (actor_id, application_id, action, details)
        VALUES (
            NEW.applicant_id,
            NEW.id,
            'status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_fee_amount', OLD.fee_amount,
                'new_fee_amount', NEW.fee_amount
            )
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (actor_id, application_id, action, details)
        VALUES (
            NEW.applicant_id,
            NEW.id,
            'application_created',
            jsonb_build_object(
                'type', NEW.type,
                'status', NEW.status,
                'fee_amount', NEW.fee_amount
            )
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit trigger
CREATE TRIGGER audit_applications
    AFTER INSERT OR UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION audit_application_changes();

-- ============================================================================
-- PHASE 6: INSERT DEFAULT DATA
-- ============================================================================

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  ('view_own_applications', 'View own applications', 'applications'),
  ('edit_own_applications', 'Edit own applications', 'applications'),
  ('delete_own_applications', 'Delete own applications', 'applications'),
  ('view_all_applications', 'View all applications', 'applications'),
  ('edit_all_applications', 'Edit all applications', 'applications'),
  ('delete_all_applications', 'Delete all applications', 'applications'),
  ('manage_users', 'Manage user accounts', 'users'),
  ('manage_admins', 'Manage admin accounts', 'users'),
  ('system_settings', 'Access system settings', 'system'),
  ('audit_logs', 'View audit logs', 'system'),
  ('performance_monitoring', 'Access performance metrics', 'system');

-- ============================================================================
-- PHASE 7: ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Applicants policies - Allow authenticated users to manage their own profile
CREATE POLICY "Users can view their own applicant profile" ON applicants
    FOR SELECT USING (auth.email() = email);

CREATE POLICY "Users can insert their own applicant profile" ON applicants
    FOR INSERT WITH CHECK (auth.email() = email);

CREATE POLICY "Users can update their own applicant profile" ON applicants
    FOR UPDATE USING (auth.email() = email);

-- Applications policies - Allow authenticated users to manage their applications
CREATE POLICY "Users can view their own applications" ON applications
    FOR SELECT USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE email = auth.email()
        )
    );

CREATE POLICY "Users can insert applications" ON applications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their own applications" ON applications
    FOR UPDATE USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE email = auth.email()
        )
    );

-- Add DELETE permission for users on their own applications
CREATE POLICY "Users can delete their own applications" ON applications
    FOR DELETE USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE email = auth.email()
        )
    );

-- Documents policies - Allow authenticated users to manage documents
CREATE POLICY "Users can view documents for their applications" ON documents
    FOR SELECT USING (
        application_id IN (
            SELECT a.id FROM applications a
            JOIN applicants app ON a.applicant_id = app.id
            WHERE app.email = auth.email()
        )
    );

CREATE POLICY "Users can insert documents" ON documents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Payments policies - Allow authenticated users to manage payments
CREATE POLICY "Users can view payments for their applications" ON payments
    FOR SELECT USING (
        application_id IN (
            SELECT a.id FROM applications a
            JOIN applicants app ON a.applicant_id = app.id
            WHERE app.email = auth.email()
        )
    );

CREATE POLICY "Users can insert payments" ON payments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Audit logs policies - Allow authenticated users to view their audit logs
CREATE POLICY "Users can view audit logs for their applications" ON audit_logs
    FOR SELECT USING (
        application_id IN (
            SELECT a.id FROM applications a
            JOIN applicants app ON a.applicant_id = app.id
            WHERE app.email = auth.email()
        )
    );

CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- RBAC policies
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
        )
    );

CREATE POLICY "All authenticated users can view permissions" ON permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage role permissions" ON role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
        )
    );

-- ============================================================================
-- PHASE 8: HELPER FUNCTIONS
-- ============================================================================

-- Function to check user permissions
CREATE FUNCTION check_user_permission(
  user_email TEXT,
  permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Check if user has the permission through their role
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = user_email 
    AND p.name = permission_name
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE FUNCTION get_user_role(user_email TEXT) 
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT ur.role INTO user_role
  FROM user_roles ur
  JOIN auth.users u ON ur.user_id = u.id
  WHERE u.email = user_email;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 9: STORAGE POLICIES
-- ============================================================================

-- Storage policies for documents bucket - Very permissive for authenticated users
CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

-- ============================================================================
-- PHASE 10: COMMENTS AND DOCUMENTATION
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE applicants IS 'Stores applicant information for permit applications';
COMMENT ON TABLE applications IS 'Stores permit applications with their current status';
COMMENT ON TABLE documents IS 'Stores uploaded documents related to applications';
COMMENT ON TABLE payments IS 'Stores payment information for applications';
COMMENT ON TABLE audit_logs IS 'Stores audit trail for all application changes';
COMMENT ON TABLE user_roles IS 'User role assignments for RBAC system';
COMMENT ON TABLE permissions IS 'Available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Role-permission assignments';

-- Column comments for new permit fields
COMMENT ON COLUMN applications.business_name IS 'Business name for business permit applications';
COMMENT ON COLUMN applications.business_type IS 'Type of business (retail, service, manufacturing, etc.)';
COMMENT ON COLUMN applications.business_address IS 'Complete business address';
COMMENT ON COLUMN applications.business_registration IS 'DTI/SEC registration number';
COMMENT ON COLUMN applications.building_type IS 'Type of building (residential, commercial, industrial)';
COMMENT ON COLUMN applications.building_address IS 'Complete building address';
COMMENT ON COLUMN applications.land_ownership IS 'Land ownership status (owned, leased, rented)';
COMMENT ON COLUMN applications.structural_calculations IS 'Engineer structural calculations details';
COMMENT ON COLUMN applications.site_development_plan IS 'Site development plan details';
COMMENT ON COLUMN applications.purpose_of_clearance IS 'Purpose of barangay clearance (employment, business, travel, etc.)';
COMMENT ON COLUMN applications.residency_address IS 'Complete residency address for barangay clearance';
COMMENT ON COLUMN applications.community_tax_number IS 'Community tax certificate number';

-- Function comments
COMMENT ON FUNCTION check_user_permission IS 'Check if user has specific permission';
COMMENT ON FUNCTION get_user_role IS 'Get user role from email';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This migration is now complete!
-- Your database includes:
-- ✅ Complete schema setup (applicants, applications, documents, payments, audit_logs)
-- ✅ Permit-specific fields for business, building, and barangay permits
-- ✅ Full RBAC system with user roles and permissions
-- ✅ Row Level Security (RLS) policies
-- ✅ Performance indexes and triggers
-- ✅ Helper functions for permission checking
-- ✅ Storage policies for document management
