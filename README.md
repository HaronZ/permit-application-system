# Dipolog City Permit Application System (MVP)

Next.js + Supabase MVP for online permits (business, building, barangay) with uploads, status tracking, payments (Xendit), and SMS (SemaphorePH).

## Stack
- Next.js (App Router) on Vercel
- Supabase (Postgres, Auth, Storage)
- Tailwind CSS
- Xendit (GCash/PayMaya)
- SemaphorePH SMS

## Quick Start
1) Prerequisites
- Node.js 18+ and npm
- Supabase account

2) Clone and install
```bash
npm install
```

3) Configure environment
Copy `.env.example` to `.env.local` and fill in values:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
XENDIT_API_KEY=...
XENDIT_WEBHOOK_SECRET=...
SEMAPHORE_API_KEY=...
SEMAPHORE_SENDER=...
```

4) Supabase setup
- Create a project in Supabase
- Storage: create a bucket named `documents`
- SQL: open SQL Editor and run `supabase/migrations/001_init.sql`
- For development you may keep RLS disabled; enable later with proper policies

5) Run dev server
```bash
npm run dev
```
Open http://localhost:3000

## App URLs
- `/` home
- `/apply/[type]` where type is `business|building|barangay`
- `/dashboard` citizen list
- `/admin` simple review actions

## Notes
- Webhook placeholder at `src/app/api/webhooks/xendit/route.ts` – add signature verification and DB updates.
- File uploads go to Supabase Storage bucket `documents` with a record in `documents` table.
- Improve security with RLS and role-based access before production.

## Deploy
- Vercel for the Next.js app
- Add env vars in Vercel project settings
- Point webhooks (Xendit) to your deployed URL `/api/webhooks/xendit`
