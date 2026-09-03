# Phase 2 — Agent lifecycle ✅

Phase 1 delivered real trust checks. Phase 2 focuses on **what creators do after verify/publish**.

**Status: green** — unpublish, re-verify, archive, expiry warnings on dashboard.

## Goals

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Unpublish agent (marketplace → verified, hidden) | Done |
| 2 | Re-verify expired or failed agent (new run, preserve history) | Done |
| 3 | Archive / soft-delete agent | Done |
| 4 | Dashboard agent actions (status badges, action menu) | Done |
| 5 | Certificate expiry warnings in dashboard | Done |
| 6 | OAuth connect flow (replace manual endpoint URL) | Phase 2b |

Payments / subscribe remain a **deploy** task.

## Migration required

Run in Supabase SQL Editor:

`supabase/migrations/006_lifecycle.sql`

Adds `archived` status, `archived_at`, expiry index.

## Features

### Unpublish
Dashboard → published agent → **Unpublish**. Status → `verified`, removed from marketplace. Prices/tags kept for quick re-publish.

### Re-verify
Dashboard → **Re-verify** (or `/verify?agent=<id>`). Form prefilled; creates new `verification_run`. Published agents hidden while `verifying`.

### Archive
Dashboard → **Archive**. Status → `archived`, hidden from default agent list. Toggle **Show archived** to view.

### Expiry warnings
Agents with certificates expiring within **14 days** show a gold warning; expired certs show red.

## Test checklist

- [x] Run migration `006_lifecycle.sql`
- [x] Unpublish a published agent → gone from `/marketplace`
- [x] Re-publish without re-entering prices (if still set)
- [x] Re-verify → new score/certificate; old runs still in DB
- [x] Archive → hidden from dashboard; show archived toggle works

## Phase 2b (later)

OAuth connect — store provider tokens, adapter reads token instead of manual URL.

## Next

**[PHASE3.md](PHASE3.md)** — continuous monitor + trust incidents.
