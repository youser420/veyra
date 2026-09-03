# Phase 0 — Stabilize MVP

Complete this checklist before Phase 1 (real trust checks).

## 1. Supabase setup

- [ ] Create a Supabase project
- [ ] Run `supabase/migrations/001_initial.sql` in SQL Editor
- [ ] Run `supabase/migrations/002_phase0_framework.sql`
- [ ] Authentication → enable Email provider
- [ ] Storage → create bucket **`agent-configs`** (private)
- [ ] Database → Replication → enable **`check_results`** for Realtime
- [ ] Copy API URL + anon key + service role key to `apps/web/.env.local`

## 2. Web app (`apps/web`)

```bash
cp .env.local.example .env.local
# fill Supabase, Stripe, Razorpay, VERIFICATION_ENGINE_* keys
npm install
npm run dev
```

Test flow:

1. Sign up / login at `/signup`
2. `/verify` — pick framework + endpoint → run verification
3. Wait for 8 checks (Realtime on `check_results`)
4. Publish from results or `/dashboard/agents`
5. See agent on `/marketplace` (non-expired cert only)

## 3. Verification engine

```bash
cd apps/verification-engine
cp .env.example .env
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VERIFICATION_ENGINE_SECRET
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Set in `apps/web/.env.local`:

```bash
VERIFICATION_ENGINE_URL=http://localhost:8000
VERIFICATION_ENGINE_SECRET=same-as-engine-.env
```

### Local mock agent (optional)

```bash
cd apps/verification-engine
py -3.12 -m uvicorn scripts.mock_agent:app --port 9090
```

| Framework       | Endpoint                         |
|-----------------|----------------------------------|
| `generic_http`  | `http://localhost:9090/run`      |
| `langchain`     | `http://localhost:9090`          |

Submit verify with that URL + framework.

## 4. Deploy (when ready)

- [ ] Railway: root `apps/verification-engine`, env vars, public URL
- [ ] Vercel: monorepo, `apps/web`, all env vars
- [ ] Stripe + Razorpay webhooks pointed at production `/api/webhooks/*`

## 5. Framework adapters (Phase 0 deliverable)

| Framework      | Adapter module        | Status                          |
|----------------|-----------------------|---------------------------------|
| generic_http   | `adapters/generic_http.py` | Implemented              |
| langchain      | `adapters/langchain.py`    | Implemented              |
| crewai         | `adapters/crewai.py`       | Implemented              |
| autogen        | `adapters/autogen.py`      | Implemented              |
| flowise        | `adapters/flowise.py`      | Implemented              |
| dify           | `adapters/dify.py`         | Needs `DIFY_API_KEY` if required |
| make           | `adapters/make.py`         | Webhook via generic POST |

**Latency check** uses the adapter for real HTTP timing when an endpoint is set. Other checks remain simulated until Phase 1.

## 6. Known Phase 0 limits

- File-only agents: config stored in Supabase Storage; engine does not load files yet (Phase 1).
- OAuth buttons: use manual endpoint URL until Phase 2 OAuth.
- Failed verify (`score < 75`) sets agent `failed` — re-run from `/verify`.

## Phase 0 complete

Proceed to **[PHASE1.md](PHASE1.md)** — real trust checks, weighted scorer, config loading.
