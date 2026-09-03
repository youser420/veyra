# Phase 3 — Continuous monitor + trust incidents

Phase 2 handled creator lifecycle. Phase 3 adds **scheduled re-checks** of published agents and **trust incidents** when something goes wrong.

## Goals

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | `trust_incidents` table + RLS | Done |
| 2 | Monitor runs (`run_type = monitor`) | Done |
| 3 | Engine monitor finalization + auto-unpublish on fail | Done |
| 4 | Cron endpoint to queue monitors | Done |
| 5 | Certificate expiry → incident + unpublish | Done |
| 6 | Dashboard incidents page | Done |
| 7 | Open incidents on dashboard stats | Done |

## Migration required

Run in Supabase SQL Editor:

`supabase/migrations/007_monitoring.sql`

## Env (web)

Add to `apps/web/.env.local`:

```bash
CRON_SECRET=veyra_cron_dev_change_me
```

Use the same value when triggering monitors locally.

## How monitoring works

1. **Cron** `POST /api/cron/monitor` (header `x-cron-secret`) runs on a schedule (Vercel Cron in production).
2. Finds **published** agents with `monitor_enabled` and `next_monitor_at <= now`.
3. Starts a full verification run with `run_type = monitor`.
4. Engine compares scores:
   - **Score &lt; 75** → critical incident, agent **unpublished**, status `failed`
   - **Drop &gt; 10 points** → medium `score_drop` incident
   - **Pass** → refresh cert expiry (+90 days) if still published
5. **Expired certificates** → high incident + unpublish (no engine run).

Default monitor interval: **7 days** (`MONITOR_INTERVAL_DAYS` on engine).

## Local test

```powershell
# 1. Run migration 007
# 2. Add CRON_SECRET to apps/web/.env.local
# 3. Restart web + engine

# Publish an agent, then force monitor due:
# Supabase → agents → set next_monitor_at to past timestamp

# Trigger cron
cd apps/verification-engine
py -3.12 scripts/trigger_monitor.py

# Or curl
curl -X POST http://localhost:3000/api/cron/monitor -H "x-cron-secret: YOUR_SECRET"
```

4. Watch engine logs + dashboard → **Trust Incidents**
5. If monitor fails threshold, agent leaves marketplace and incident appears

## Production cron (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/monitor", "schedule": "0 6 * * *" }]
}
```

Set `CRON_SECRET` in Vercel env. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` — extend route if needed for production.

## Phase 3 complete when

- [ ] Migration `007` applied
- [ ] `CRON_SECRET` set
- [ ] Manual cron trigger queues monitor for published agent
- [ ] Incident appears on `/dashboard/incidents` when monitor fails or cert expires
- [ ] Acknowledge / resolve works

Say **Phase 3 green** when checked.

## Next

- **Deploy** — Vercel + Railway, Stripe webhooks
- **Phase 2b** — OAuth connect
- Email alerts for incidents (Resend)
