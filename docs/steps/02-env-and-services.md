# Step 2 — Environment + local services

## 2.1 Web env (`apps/web/.env.local`)

Required (you should have these from Step 1):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERIFICATION_ENGINE_URL=http://127.0.0.1:8000` (use `127.0.0.1`, not `localhost` — Node on Windows may resolve `localhost` to IPv6 `::1` while uvicorn binds IPv4 only)
- `VERIFICATION_ENGINE_SECRET` (same string in engine `.env`)
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## 2.2 Engine env (`apps/verification-engine/.env`)

- `SUPABASE_URL` — same URL as web (no `NEXT_PUBLIC_`)
- `SUPABASE_SERVICE_ROLE_KEY` — same service role key
- `VERIFICATION_ENGINE_SECRET` — must match web exactly

## 2.3 Start services (3 terminals)

**Terminal 1 — Web**
```bash
npm run dev
```

**Terminal 2 — Verification engine** (use **Python 3.12**, not 3.14)

```powershell
py install 3.12
cd apps/verification-engine
py -3.12 -m pip install -r requirements.txt
py -3.12 -m uvicorn main:app --reload --port 8000
```

If `pip install` fails with `link.exe not found`, you are on Python 3.14 — install 3.12 as above.

**Terminal 3 — Mock agent (for testing verify)**

Port 8080 is often taken on Windows — use **9090** instead:

```powershell
cd apps/verification-engine
py -3.12 -m uvicorn scripts.mock_agent:app --reload --port 9090
```

Verify URLs: `http://localhost:9090` (langchain) or `http://localhost:9090/run` (generic_http)

## 2.4 Quick checks

- Engine health: http://localhost:8000/health
- Marketplace: http://localhost:3000/marketplace (empty list OK)
- Signup: http://localhost:3000/signup

When all three terminals run and signup works, say **Step 2 done**.
