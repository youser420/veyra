# Step 3 — End-to-end verify test

Prerequisites: web on :3000, engine on :8000, mock agent on :9090.

## 3.1 Start mock agent (if not running)

```powershell
cd C:\Users\tarun\veyra\apps\verification-engine
py -3.12 -m uvicorn scripts.mock_agent:app --reload --port 9090
```

## 3.2 Sign up / login

1. http://localhost:3000/signup — create account
2. Confirm you land on `/dashboard` (or login at `/login`)

## 3.3 Run verification

1. Go to http://localhost:3000/verify
2. **Agent name:** `Test Mock Agent`
3. **Framework:** `LangChain / LangServe`
4. **Method:** API Endpoint
5. **URL:** `http://localhost:9090`
6. Click **Run Verification**
7. Watch 8 checks complete (Realtime)

## 3.4 Publish

1. On results screen → **Publish to Marketplace**
2. Set price (e.g. USD `9.99`, INR `799`)
3. Confirm checkbox → Publish

## 3.5 Marketplace

1. http://localhost:3000/marketplace
2. Your agent should appear

Say **Phase 0 green** when this works.
