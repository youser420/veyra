# Step 1 — Supabase

Do these in order. Check each box when done.

## 1.1 Create project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → pick org, name (e.g. `veyra`), database password, region
3. Wait until the project status is **Active** (~2 min)

## 1.2 Run database migrations

1. In the project: **SQL Editor** → **New query**
2. Open `supabase/migrations/001_initial.sql` from this repo, copy **all** contents, paste, **Run**
3. New query again → paste `supabase/migrations/002_phase0_framework.sql` → **Run**  
   **Required for verify** — adds `agents.framework` and verification snapshot columns.
4. Confirm: **Table Editor** → `agents` table has a **`framework`** column
5. Confirm other tables exist: `profiles`, `verification_runs`, `check_results`, etc.

## 1.3 Enable email auth

1. **Authentication** → **Providers** → **Email**
2. Enable Email provider
3. (Optional) Enable **Confirm email** off for faster local testing

## 1.4 Storage bucket

1. **Storage** → **New bucket**
2. Name: `agent-configs`
3. **Public bucket:** OFF (private)
4. Create

## 1.5 Realtime for verify UI

Run migration `004_realtime_check_results.sql` in SQL Editor (sets replica identity + publication).

Or manually:
1. **Database** → **Publications** → `supabase_realtime` → add **`check_results`**
2. SQL: `alter table check_results replica identity full;` (required for filtered Realtime)

## 1.6 Copy API keys (for Step 2)

1. **Project Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and engine `SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY` — never expose in frontend code

When 1.1–1.6 are done, tell Cursor: **"Step 1 done"** and we’ll configure `.env` files (Step 2).
