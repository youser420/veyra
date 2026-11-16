# Veyra MVP

Monorepo with Next.js web app (`apps/web`), Supabase migration (`supabase/migrations/001_initial.sql`), and FastAPI verification engine (`apps/verification-engine`).

## Quickstart
1. Follow **[docs/PHASE0.md](docs/PHASE0.md)** (Supabase, env, engine, test flow).
2. Copy `apps/web/.env.local.example` → `apps/web/.env.local` and fill values.
3. Run SQL migrations `001_initial.sql` + `002_phase0_framework.sql` in Supabase.
4. `npm install` at repo root → `npm run dev`.

## Development phases
| Phase | Focus |
|-------|--------|
| **0** | E2E loop, framework adapters, env/deploy checklist |
| **1** | Real trust checks (injection, guardrails, safety, weighted scorer) — [docs/PHASE1.md](docs/PHASE1.md) ✅ |
| **2** | Lifecycle (unpublish, re-verify, archive, expiry UX) — [docs/PHASE2.md](docs/PHASE2.md) ✅ |
| **3** (now) | Continuous monitor + trust incidents — [docs/PHASE3.md](docs/PHASE3.md) |

## Deploy
- Web/API on Vercel
- Verification engine on Render (free tier) via the `render.yaml` Blueprint: Render → New → Blueprint →
  this repo, then enter `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERIFICATION_ENGINE_SECRET` and
  `ANTHROPIC_API_KEY` when prompted. Set Vercel's `VERIFICATION_ENGINE_URL` to the Render service URL.
  Free instances sleep when idle; the first verification after a quiet spell waits ~30-60s for it to wake.

## Production checklist
1. Run `supabase/migrations/001_initial.sql` in Supabase SQL Editor.
2. Enable Realtime on `check_results` table.
3. Create private Storage bucket `agent-configs`.
4. Copy `.env.local.example` → `apps/web/.env.local` and fill all keys.
5. Configure Stripe webhook → `POST /api/webhooks/stripe` (events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`).
6. Configure Razorpay webhook → `POST /api/webhooks/razorpay` (event: `payment.captured`).
7. Deploy verification engine; set `VERIFICATION_ENGINE_URL` on Vercel.
