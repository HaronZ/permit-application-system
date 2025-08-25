-- Schema for Dipolog City Permit Application System
-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text unique not null,
  gov_id_no text,
  created_at timestamptz not null default now()
);

create type app_type as enum ('business','building','barangay');
create type app_status as enum ('submitted','under_review','approved','ready_for_pickup','rejected');

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete cascade,
  type app_type not null,
  status app_status not null default 'submitted',
  reference_no text generated always as (left(replace(id::text,'-',''), 10)) stored,
  fee_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  kind text not null,
  file_path text not null,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  provider text not null default 'xendit',
  method text,
  amount numeric not null,
  status text not null default 'pending',
  external_ref text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  application_id uuid references applications(id) on delete cascade,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Storage bucket for documents (create in Supabase: "documents")
-- Security: Add RLS policies as needed. For MVP, you can disable RLS while bootstrapping, then enable with proper policies.
