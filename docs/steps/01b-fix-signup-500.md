# Fix signup 500 error

A `POST .../auth/v1/signup 500` almost always means the **database trigger** that creates a `profiles` row failed.

## Quick fix (run in Supabase SQL Editor)

1. Open your project → **SQL Editor** → **New query**
2. Paste the full contents of `supabase/migrations/003_fix_signup_trigger.sql`
3. Click **Run**

## Verify migrations ran

In **Table Editor**, confirm these tables exist:
- `profiles`
- `agents`

If `profiles` is missing, run `001_initial.sql` first, then `003_fix_signup_trigger.sql`.

## Check Auth logs

**Authentication** → **Logs** (or **Logs** → filter Auth) — look for errors mentioning `handle_new_user` or `profiles`.

## Email confirmation

If signup succeeds but you cannot log in:
- **Authentication** → **Providers** → **Email** → disable **Confirm email** for local dev

## Sign in does nothing after signup?

1. **Disable Confirm email** (Auth → Email) for local dev
2. Restart `npm run dev` after code updates (browser client must use cookies for middleware)
3. Sign in again — you should redirect to `/dashboard`

## Retry

1. Restart `npm run dev`
2. Try `/signup` again with a **new email** (not one that partially failed before)
