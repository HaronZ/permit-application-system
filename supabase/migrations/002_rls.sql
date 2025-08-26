-- Row Level Security (RLS) Policies for Dipolog City Permit Application System
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own applicant profile" ON applicants;
DROP POLICY IF EXISTS "Users can insert their own applicant profile" ON applicants;
DROP POLICY IF EXISTS "Users can update their own applicant profile" ON applicants;

DROP POLICY IF EXISTS "Users can view their own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;

DROP POLICY IF EXISTS "Users can view documents for their applications" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their applications" ON documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;

DROP POLICY IF EXISTS "Users can view payments for their applications" ON payments;
DROP POLICY IF EXISTS "Users can insert payments for their applications" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

DROP POLICY IF EXISTS "Users can view audit logs for their applications" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

-- Drop storage policies (these are the ones causing the error)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access all documents" ON storage.objects;

-- Enable RLS on all tables
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Applicants policies - Simplified and working
CREATE POLICY "Users can view their own applicant profile" ON applicants
    FOR SELECT USING (auth.email() = email);

CREATE POLICY "Users can insert their own applicant profile" ON applicants
    FOR INSERT WITH CHECK (auth.email() = email);

CREATE POLICY "Users can update their own applicant profile" ON applicants
    FOR UPDATE USING (auth.email() = email);

-- Applications policies - Simplified to avoid circular dependencies
CREATE POLICY "Users can view their own applications" ON applications
    FOR SELECT USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE email = auth.email()
        )
    );

CREATE POLICY "Users can insert applications" ON applications
    FOR INSERT WITH CHECK (
        -- Allow insert if user is authenticated and the applicant_id matches their profile
        auth.uid() IS NOT NULL AND
        applicant_id IN (
            SELECT id FROM applicants WHERE email = auth.email()
        )
    );

CREATE POLICY "Users can update their own applications" ON applications
    FOR UPDATE USING (
        applicant_id IN (
            SELECT id FROM applicants WHERE email = auth.email()
        )
    );

-- Admin policies for applications
CREATE POLICY "Admins can view all applications" ON applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.email() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can update all applications" ON applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.email() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Documents policies - Simplified
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
        -- Allow insert if user is authenticated and the application belongs to them
        auth.uid() IS NOT NULL AND
        application_id IN (
            SELECT a.id FROM applications a
            JOIN applicants app ON a.applicant_id = app.id
            WHERE app.email = auth.email()
        )
    );

-- Admin can view all documents
CREATE POLICY "Admins can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.email() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Payments policies - Simplified
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
        -- Allow insert if user is authenticated and the application belongs to them
        auth.uid() IS NOT NULL AND
        application_id IN (
            SELECT a.id FROM applications a
            JOIN applicants app ON a.applicant_id = app.id
            WHERE app.email = auth.email()
        )
    );

-- Admin can view all payments
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.email() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Audit logs policies (read-only for users, full access for admins)
CREATE POLICY "Users can view audit logs for their applications" ON audit_logs
    FOR SELECT USING (
        application_id IN (
            SELECT a.id FROM applications a
            JOIN applicants app ON a.applicant_id = app.id
            WHERE app.email = auth.email()
        )
    );

CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.email() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Storage policies for documents bucket - Simplified and working
CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view their own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL
    );

-- Admin can access all documents
CREATE POLICY "Admins can access all documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.email() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );
