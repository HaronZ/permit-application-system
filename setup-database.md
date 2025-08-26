# Database Setup Guide

This guide will help you set up your Supabase database and storage for the permit application system.

## Prerequisites

1. A Supabase project (create one at https://supabase.com)
2. Your Supabase project URL and anon key
3. Access to the Supabase SQL Editor

## Step 1: Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste the following SQL:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom ENUM types
CREATE TYPE app_type AS ENUM ('business', 'building', 'barangay');
CREATE TYPE app_status AS ENUM ('submitted', 'under_review', 'approved', 'ready_for_pickup', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE document_kind AS ENUM ('identification', 'business_license', 'building_plan', 'barangay_clearance', 'other');

-- Create applicants table
CREATE TABLE IF NOT EXISTS applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(254) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    type app_type NOT NULL,
    status app_status DEFAULT 'submitted',
    reference_no VARCHAR(50) UNIQUE,
    description TEXT,
    notes TEXT,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fee_amount_positive CHECK (fee_amount >= 0)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    kind document_kind NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_method VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    actor_email VARCHAR(254),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(type);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_application_id ON audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for applications
CREATE OR REPLACE FUNCTION audit_application_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (application_id, action, details)
        VALUES (NEW.id, 'application_created', jsonb_build_object(
            'type', NEW.type,
            'status', NEW.status,
            'fee_amount', NEW.fee_amount
        ));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (application_id, action, details)
        VALUES (NEW.id, 'application_updated', jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'old_type', OLD.type,
            'new_type', NEW.type
        ));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER audit_applications_changes
    AFTER INSERT OR UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION audit_application_changes();

-- Add comments for documentation
COMMENT ON TABLE applicants IS 'Stores applicant information';
COMMENT ON TABLE applications IS 'Stores permit applications';
COMMENT ON TABLE documents IS 'Stores uploaded documents for applications';
COMMENT ON TABLE payments IS 'Stores payment information for applications';
COMMENT ON TABLE audit_logs IS 'Stores audit trail for application changes';
```

4. Click **Run** to execute the SQL

## Step 2: Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Set the following:
   - **Name**: `documents`
   - **Public bucket**: Unchecked (private)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Step 3: Set Up Row Level Security (RLS)

1. Go to **SQL Editor** again
2. Create a new query and paste the following SQL:

```sql
-- Enable RLS on all tables
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Applicants policies
CREATE POLICY "Users can view own profile" ON applicants
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own profile" ON applicants
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON applicants
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Applications policies
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Users can insert own applications" ON applications
    FOR INSERT WITH CHECK (
        applicant_id IN (
            SELECT id FROM applicants WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Users can update own applications" ON applications
    FOR UPDATE USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE auth.uid()::text = id::text
        )
    );

-- Admin policies for applications
CREATE POLICY "Admins can view all applications" ON applications
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Admins can update all applications" ON applications
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (
        application_id IN (
            SELECT id FROM applications 
            WHERE applicant_id IN (
                SELECT id FROM applicants WHERE auth.uid()::text = id::text
            )
        )
    );

CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (
        application_id IN (
            SELECT id FROM applications 
            WHERE applicant_id IN (
                SELECT id FROM applicants WHERE auth.uid()::text = id::text
            )
        )
    );

-- Admin policies for documents
CREATE POLICY "Admins can view all documents" ON documents
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        application_id IN (
            SELECT id FROM applications 
            WHERE applicant_id IN (
                SELECT id FROM applicants WHERE auth.uid()::text = id::text
            )
        )
    );

CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT WITH CHECK (
        application_id IN (
            SELECT id FROM applications 
            WHERE applicant_id IN (
                SELECT id FROM applicants WHERE auth.uid()::text = id::text
            )
        )
    );

-- Admin policies for payments
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (
        application_id IN (
            SELECT id FROM applications 
            WHERE applicant_id IN (
                SELECT id FROM applicants WHERE auth.uid()::text = id::text
            )
        )
    );

-- Admin policies for audit logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Storage policies for documents bucket
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Admin policies for storage
CREATE POLICY "Admins can access all documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'documents' AND
        auth.jwt() ->> 'role' = 'admin'
    );
```

3. Click **Run** to execute the SQL

## Step 4: Verify Setup

1. Go to **Table Editor** and verify all tables are created:
   - `applicants`
   - `applications`
   - `documents`
   - `payments`
   - `audit_logs`

2. Go to **Storage** and verify the `documents` bucket exists

3. Go to **Authentication > Policies** and verify RLS policies are active

## Step 5: Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Troubleshooting

### Common Issues:

1. **"relation does not exist"**: Make sure you ran the SQL in the correct order
2. **RLS policies not working**: Check that RLS is enabled on all tables
3. **Storage access denied**: Verify the storage bucket exists and policies are correct
4. **UUID extension error**: The extension should be created automatically, but you can manually enable it

### Need Help?

- Check the Supabase documentation: https://supabase.com/docs
- Review the error messages in the SQL Editor
- Verify your environment variables are correct

## Next Steps

After completing this setup:

1. Start your development server: `npm run dev`
2. Test the application by creating a new account
3. Try submitting a permit application
4. Check that files upload correctly to storage
5. Verify admin functionality works

Your permit application system should now be fully functional with a secure database and file storage!
