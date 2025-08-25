-- RLS policies for applicants, applications, documents, and basic admin allowlist
-- Note: requires Supabase JWT to include the user's email (default). Admin emails are kept in admin_emails table.

begin;

-- Admin allowlist
create table if not exists admin_emails (
  email text primary key
);

-- Helper function: is_admin()
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from admin_emails ae where ae.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
  );
$$;

-- Enable RLS
alter table applicants enable row level security;
alter table applications enable row level security;
alter table documents enable row level security;

-- Applicants policies
-- Read own applicant row or admin
create policy applicants_select_self on applicants
  for select using (
    is_admin() OR email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
  );
-- Insert: only if email matches JWT or admin
create policy applicants_insert_self on applicants
  for insert with check (
    is_admin() OR email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
  );
-- Update: only own row or admin
create policy applicants_update_self on applicants
  for update using (
    is_admin() OR email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
  ) with check (
    is_admin() OR email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
  );

-- Applications policies
-- Read: apps whose applicant email matches JWT, or admin
create policy applications_select_owned on applications
  for select using (
    is_admin() OR exists (
      select 1 from applicants a where a.id = applications.applicant_id
        and a.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
    )
  );
-- Insert: only when belongs to own applicant row or admin
create policy applications_insert_owned on applications
  for insert with check (
    is_admin() OR exists (
      select 1 from applicants a where a.id = applications.applicant_id
        and a.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
    )
  );
-- Update: admin only (citizens shouldn't change status)
create policy applications_update_admin on applications
  for update using (is_admin()) with check (is_admin());

-- Documents policies
-- Read: documents for owned applications or admin
create policy documents_select_owned on documents
  for select using (
    is_admin() OR exists (
      select 1 from applications ap
      join applicants a on a.id = ap.applicant_id
      where ap.id = documents.application_id
        and a.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
    )
  );
-- Insert: only for owned applications or admin
create policy documents_insert_owned on documents
  for insert with check (
    is_admin() OR exists (
      select 1 from applications ap
      join applicants a on a.id = ap.applicant_id
      where ap.id = documents.application_id
        and a.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
    )
  );
-- Update/Delete: admin only
create policy documents_update_admin on documents for update using (is_admin()) with check (is_admin());
create policy documents_delete_admin on documents for delete using (is_admin());

-- Storage policies for bucket "documents"
-- Ensure bucket exists in dashboard. Apply read/write based on ownership or admin.
-- Note: storage policies use storage.objects and object metadata.
create policy if not exists storage_documents_read on storage.objects
  for select using (
    bucket_id = 'documents' and (
      is_admin() OR exists (
        select 1 from documents d
        join applications ap on ap.id = d.application_id
        join applicants a on a.id = ap.applicant_id
        where d.file_path = storage.objects.name and a.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
      )
    )
  );

create policy if not exists storage_documents_write on storage.objects
  for insert with check (
    bucket_id = 'documents' and (
      is_admin() OR exists (
        select 1 from documents d
        join applications ap on ap.id = d.application_id
        join applicants a on a.id = ap.applicant_id
        where d.file_path = storage.objects.name and a.email = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email','')
      )
    )
  );

commit;
