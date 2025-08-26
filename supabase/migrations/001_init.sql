-- Enhanced Schema for Dipolog City Permit Application System
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE app_type AS ENUM ('business', 'building', 'barangay');
CREATE TYPE app_status AS ENUM ('submitted', 'under_review', 'approved', 'ready_for_pickup', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE document_kind AS ENUM ('attachment', 'requirement', 'approval', 'rejection');

-- Applicants table
CREATE TABLE IF NOT EXISTS applicants (
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
CREATE TABLE IF NOT EXISTS applications (
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
CREATE TABLE IF NOT EXISTS documents (
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
CREATE TABLE IF NOT EXISTS payments (
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
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(type);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_reference_no ON applications(reference_no);

CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_ref ON payments(external_ref);

CREATE INDEX IF NOT EXISTS idx_audit_logs_application_id ON audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_applicants_full_name_gin ON applicants USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_applications_description_gin ON applications USING gin(to_tsvector('english', COALESCE(description, '')));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
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
CREATE OR REPLACE FUNCTION audit_application_changes()
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

-- Insert sample data for testing (optional)
-- INSERT INTO applicants (full_name, phone, email) VALUES 
--   ('John Doe', '09123456789', 'john@example.com'),
--   ('Jane Smith', '09876543210', 'jane@example.com');

-- Storage bucket for documents (create in Supabase: "documents")
-- Security: Add RLS policies as needed. For MVP, you can disable RLS while bootstrapping, then enable with proper policies.

-- Comments for documentation
COMMENT ON TABLE applicants IS 'Stores applicant information for permit applications';
COMMENT ON TABLE applications IS 'Stores permit applications with their current status';
COMMENT ON TABLE documents IS 'Stores uploaded documents related to applications';
COMMENT ON TABLE payments IS 'Stores payment information for applications';
COMMENT ON TABLE audit_logs IS 'Stores audit trail for all application changes';
