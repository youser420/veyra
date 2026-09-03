# VEYRA — Complete MVP Cursor Prompt
> Paste this entire file into Cursor's AI chat (Agent mode). It will scaffold, build, and wire the full MVP with minimal back and forth.

---

## ROLE

You are a senior full-stack engineer building an MVP for **Veyra** — a trust infrastructure platform and marketplace for AI agents. Build the complete application end-to-end: database schema, backend API, frontend UI, auth, payments, and deployment config. Do not ask clarifying questions unless something is genuinely ambiguous and blocking. Make sensible defaults for everything else.

---

## WHAT IS VEYRA

Veyra is a three-sided platform:

1. **Agent Creators** build AI agents on external tools (LangChain, CrewAI, AutoGen, Flowise, etc.), then come to Veyra to get them **verified and scored**.
2. **Veyra** runs a battery of trust checks on each submitted agent and issues a **Credibility Score (0–100)** with a certificate. This is the core monetisation event — every verification is a paid API call.
3. **Agent Consumers** browse a **Marketplace** of only verified agents, pay a subscription to use them, and the creator earns a revenue share (70%).

The flywheel: more creators → more verified agents → better marketplace → more consumers → more creator revenue → more creators.

---

## TECH STACK

### Frontend
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** Zustand for client state, TanStack Query for server state
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod validation
- **File uploads:** react-dropzone

### Backend
- **API:** Next.js API Routes + Route Handlers (serverless, Vercel-native)
- **Verification Engine:** Separate Python FastAPI microservice (deploy to Railway or Render)
- **Database:** Supabase (PostgreSQL + Row Level Security + Realtime)
- **Auth:** Supabase Auth (email/password + email OTP)
- **Storage:** Supabase Storage (for agent config file uploads)
- **Queue:** Supabase pg_cron + pg_net for async verification jobs (or BullMQ on Redis for heavier load)
- **Payments:** Stripe (global) + Razorpay (India) with a routing layer
- **Email:** Resend

### DevOps
- **Frontend + API Routes:** Vercel
- **Python microservice:** Railway (or Render)
- **Environment secrets:** Vercel env vars + `.env.local`
- **CI/CD:** GitHub Actions (lint, typecheck, test on PR)

---

## PROJECT STRUCTURE

Scaffold exactly this structure:

```
veyra/
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── signup/page.tsx
│   │   │   ├── (marketing)/
│   │   │   │   ├── page.tsx          # Landing page
│   │   │   │   └── pricing/page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # Creator overview
│   │   │   │   ├── agents/page.tsx   # My agents list
│   │   │   │   ├── earnings/page.tsx
│   │   │   │   └── api-keys/page.tsx
│   │   │   ├── verify/
│   │   │   │   └── page.tsx          # Agent submission + live verification
│   │   │   ├── marketplace/
│   │   │   │   ├── page.tsx          # Browse agents
│   │   │   │   └── [id]/page.tsx     # Agent detail + subscribe
│   │   │   └── api/
│   │   │       ├── verify/route.ts
│   │   │       ├── agents/route.ts
│   │   │       ├── marketplace/route.ts
│   │   │       ├── payments/
│   │   │       │   ├── stripe/route.ts
│   │   │       │   └── razorpay/route.ts
│   │   │       └── webhooks/
│   │   │           ├── stripe/route.ts
│   │   │           └── razorpay/route.ts
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── DashboardSidebar.tsx
│   │   │   ├── verification/
│   │   │   │   ├── SubmitForm.tsx
│   │   │   │   ├── CheckProgress.tsx
│   │   │   │   └── ScoreReveal.tsx
│   │   │   ├── marketplace/
│   │   │   │   ├── AgentCard.tsx
│   │   │   │   ├── AgentFilters.tsx
│   │   │   │   └── AgentModal.tsx
│   │   │   └── shared/
│   │   │       ├── ScoreRing.tsx
│   │   │       └── CredentialBadge.tsx
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts
│   │   │   │   └── server.ts
│   │   │   ├── stripe.ts
│   │   │   ├── razorpay.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   └── verification-engine/          # Python FastAPI microservice
│       ├── main.py
│       ├── checks/
│       │   ├── guardrails.py
│       │   ├── prompt_injection.py
│       │   ├── hallucination.py
│       │   ├── consistency.py
│       │   ├── safety.py
│       │   ├── latency.py
│       │   ├── data_privacy.py
│       │   └── bias.py
│       ├── scorer.py
│       ├── requirements.txt
│       └── Dockerfile
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── .env.local.example
├── package.json
└── README.md
```

---

## DATABASE SCHEMA

Run this SQL in Supabase → SQL Editor. Create these tables with full RLS:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ──────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text default 'creator' check (role in ('creator', 'consumer', 'admin')),
  stripe_customer_id text,
  razorpay_customer_id text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── AGENTS ────────────────────────────────────────────────
create table agents (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null,
  submission_method text check (submission_method in ('url', 'file', 'oauth')),
  endpoint_url text,
  config_file_path text,
  oauth_provider text,
  status text default 'pending' check (status in ('pending', 'verifying', 'verified', 'failed', 'published')),
  score integer check (score >= 0 and score <= 100),
  certificate_id text unique,
  certificate_issued_at timestamptz,
  certificate_expires_at timestamptz,
  published_at timestamptz,
  price_monthly_usd integer,        -- in cents
  price_monthly_inr integer,        -- in paise
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table agents enable row level security;
create policy "Creators manage own agents" on agents for all using (auth.uid() = creator_id);
create policy "Anyone can read published agents" on agents for select using (status = 'published');

-- ─── VERIFICATION RUNS ─────────────────────────────────────
create table verification_runs (
  id uuid default uuid_generate_v4() primary key,
  agent_id uuid references agents(id) on delete cascade not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  final_score integer,
  status text default 'running' check (status in ('running', 'completed', 'failed'))
);
alter table verification_runs enable row level security;
create policy "Creators read own runs" on verification_runs for select
  using (exists (select 1 from agents where agents.id = agent_id and agents.creator_id = auth.uid()));

-- ─── VERIFICATION CHECK RESULTS ────────────────────────────
create table check_results (
  id uuid default uuid_generate_v4() primary key,
  run_id uuid references verification_runs(id) on delete cascade not null,
  check_name text not null,
  score integer,
  status text check (status in ('pending', 'running', 'passed', 'failed')),
  details jsonb,
  completed_at timestamptz
);
alter table check_results enable row level security;
create policy "Creators read own check results" on check_results for select
  using (exists (
    select 1 from verification_runs vr
    join agents a on a.id = vr.agent_id
    where vr.id = run_id and a.creator_id = auth.uid()
  ));

-- ─── SUBSCRIPTIONS ─────────────────────────────────────────
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  consumer_id uuid references profiles(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  stripe_subscription_id text,
  razorpay_subscription_id text,
  payment_gateway text check (payment_gateway in ('stripe', 'razorpay')),
  status text default 'active' check (status in ('active', 'cancelled', 'past_due')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  unique(consumer_id, agent_id)
);
alter table subscriptions enable row level security;
create policy "Users manage own subscriptions" on subscriptions for all using (auth.uid() = consumer_id);
create policy "Creators read subscriptions to their agents" on subscriptions for select
  using (exists (select 1 from agents where agents.id = agent_id and agents.creator_id = auth.uid()));

-- ─── PAYOUTS ───────────────────────────────────────────────
create table payouts (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  agent_id uuid references agents(id),
  amount_usd integer,               -- in cents
  amount_inr integer,               -- in paise
  period_start date,
  period_end date,
  status text default 'pending' check (status in ('pending', 'processing', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table payouts enable row level security;
create policy "Creators read own payouts" on payouts for select using (auth.uid() = creator_id);

-- ─── API KEYS ──────────────────────────────────────────────
create table api_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text default 'Default Key',
  key_hash text not null unique,    -- store bcrypt hash, never plaintext
  prefix text not null,             -- show first 8 chars for display e.g. "vyr_live"
  calls_used integer default 0,
  calls_limit integer default 5000,
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);
alter table api_keys enable row level security;
create policy "Users manage own API keys" on api_keys for all using (auth.uid() = user_id);

-- ─── INDEXES ───────────────────────────────────────────────
create index on agents(creator_id);
create index on agents(status);
create index on agents(category);
create index on verification_runs(agent_id);
create index on check_results(run_id);
create index on subscriptions(consumer_id);
create index on subscriptions(agent_id);
```

---

## ENVIRONMENT VARIABLES

Create `.env.local` with these keys:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Verification Engine
VERIFICATION_ENGINE_URL=https://your-engine.railway.app
VERIFICATION_ENGINE_SECRET=your_shared_secret_key

# Resend (email)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## DESIGN SYSTEM

Implement this design system precisely. Do not use generic purple-gradient or Inter font aesthetics.

### Aesthetic
**Dark industrial-luxe.** Bloomberg Terminal meets luxury watchmaker. Every trust score is treated like financial data — precise, meaningful, serious.

### Colors (add to `tailwind.config.ts`)
```ts
colors: {
  bg: {
    DEFAULT: '#0a0a0b',
    2: '#111114',
    3: '#18181d',
  },
  gold: {
    DEFAULT: '#c9a84c',
    dim: '#8a6e2f',
    muted: 'rgba(201,168,76,0.08)',
  },
  teal: {
    DEFAULT: '#00e5cc',
    dim: 'rgba(0,229,204,0.12)',
  },
  border: {
    DEFAULT: 'rgba(255,255,255,0.07)',
    accent: 'rgba(180,150,80,0.3)',
  },
  text: {
    DEFAULT: '#e8e6e0',
    2: '#8a8880',
    3: '#4a4845',
  },
}
```

### Typography (add Google Fonts to `layout.tsx`)
- **Display:** `Cormorant Garamond` (300, 400, 600) — headings and hero text
- **Mono:** `IBM Plex Mono` (300, 400, 500) — all data, scores, labels, tags, code
- **Body:** `DM Sans` (300, 400, 500, 600) — body copy, paragraphs

### Score Color Logic
```ts
export const scoreColor = (score: number) =>
  score >= 90 ? '#00e5cc' : score >= 75 ? '#f5c842' : '#ff4444';

export const scoreLabel = (score: number) =>
  score >= 90 ? 'TRUSTED' : score >= 75 ? 'MODERATE' : 'RISK';
```

### Key UI Patterns
- **ScoreRing:** SVG circle with score number inside. Color changes based on score. Subtle glow via `drop-shadow` filter.
- **Cards:** Dark bg, thin border, border glows gold on hover (`border-border-accent`).
- **Tags:** Monospace, uppercase, letter-spaced. Teal tint for trusted status, gold tint for scores.
- **Buttons:** Primary = gold fill, black text. Ghost = transparent + thin border. Teal = teal fill for publish actions.
- **Background:** Subtle grid lines (2px, low opacity) on marketing pages. Noise texture overlay at 3% opacity.
- **Inputs:** Dark bg3, mono font, subtle gold border on focus.
- **Animations:** `fadeUp` on page load with staggered delays. Score ring animates stroke-dasharray on reveal. Counter animation on landing stats.

---

## PAGE-BY-PAGE IMPLEMENTATION

### 1. Landing Page (`/`)

**Sections (in order):**

**Hero:**
- Full viewport height
- Left: eyebrow label with pulsing green dot ("Trust Infrastructure for AI Agents"), H1 in Cormorant Garamond ("Every AI agent, *verified* and *trusted.*" — italics in gold/teal), body copy, two CTAs (Verify Your Agent, Browse Marketplace)
- Right: decorative concentric circles with subtle radial glow (CSS only)
- Animated on load with staggered fadeUp (4 items, 100ms apart)

**Stats Bar:**
- Animated count-up on mount: `2,847 agents verified`, `1.2M trust checks run`, `18,400 active users`
- Mono font, bordered columns

**How It Works:**
- 4 steps in a grid: Submit Agent → Trust Checks → Score Issued → Publish & Earn
- Step number in gold-dim, title in Cormorant, description in DM Sans

**8 Layers of Trust:**
- Grid of all 8 checks with gold left-border accent
- Each shows name + description

**CTA Banner:**
- Large Cormorant heading + sign-up button

---

### 2. Auth Pages (`/login`, `/signup`)

**Layout:** Centred single card, full viewport, grid-line background.

**Sign Up form fields:** Full Name, Email, Password
**Sign In form fields:** Email, Password
**Tab toggle** between Sign Up / Sign In (gold fill = active tab)
**Email OTP flow:**
- Toggle button "Use Magic OTP"
- Shows email input → sends OTP → shows 6 individual digit boxes (auto-focus next on input, backspace focuses prev)
- On complete → calls Supabase `verifyOtp`

**Supabase integration:**
```ts
// Sign up
const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } });

// Sign in
const { error } = await supabase.auth.signInWithPassword({ email, password });

// OTP - send
const { error } = await supabase.auth.signInWithOtp({ email });

// OTP - verify
const { error } = await supabase.auth.verifyOtp({ email, token: otp.join(''), type: 'email' });
```

---

### 3. Verify Agent Page (`/verify`)

**3-step wizard, no page navigation between steps — controlled local state.**

**Step 1 — Submit:**
- Agent Name input
- Category dropdown (General, Legal, Finance, Healthcare, Engineering, Research, Sales, Education, Customer Support)
- Method selector tabs: API Endpoint | Upload Config | OAuth Connect
  - **URL:** text input for endpoint
  - **File:** `react-dropzone` area, accepts `.json`, `.yaml`, `.toml`. On drop → upload to Supabase Storage at `agent-configs/{user_id}/{filename}`
  - **OAuth:** grid of provider buttons (LangChain, CrewAI, AutoGen, Flowise, Dify, Make.com) — for MVP, clicking shows a "Coming soon" toast
- Description textarea (optional)
- "Run Verification" button → POST to `/api/verify` → creates `agents` row + `verification_runs` row → transitions to Step 2

**Step 2 — Running:**
- Header: "Trust verification in progress" + pulsing teal dot
- Subscribe to Supabase Realtime on `check_results` for this `run_id`
- Render all 8 checks as rows:
  - Pending: grey circle with number
  - Running: spinning border animation
  - Done: checkmark with score in score colour
  - Progress bar under running check (shimmer animation)
- On all checks complete → fetch final score from `verification_runs` → transition to Step 3

**8 checks (in order):** Guardrail Compliance, Prompt Injection Resistance, Hallucination Rate, Behavioral Consistency, Output Safety, Latency Profile, Data Privacy, Bias & Fairness

**Step 3 — Result:**
- Agent name + category tag + trust status tag
- Large ScoreRing (120px) animated in
- Breakdown table: each check → progress bar → score
- Veyra Trust Certificate card (gold border, certificate ID, issued date, expiry 90 days, score)
- CTA buttons: "Publish to Marketplace" (opens pricing/publish modal) | "Verify Another"

---

### 4. Marketplace Page (`/marketplace`)

**Layout:** Full width, no sidebar.

**Header:** Title + verified agent count + subtitle.

**Controls:**
- Search input (filter by name, description, category client-side)
- Sort dropdown: Highest Score | Most Used | Lowest Price
- Category filter pills: All + all categories

**Agent Grid:** Responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), each card:
- Category label (gold mono)
- Agent name (Cormorant, 20px)
- Creator name (mono, muted)
- ScoreRing (72px, top right)
- Description (DM Sans)
- Tags
- Divider
- Active user count (teal) + Price + "Use Agent" button

**Agent Detail Modal:**
- Triggered by clicking any card
- Full overlay with backdrop blur
- Shows all card info + expanded score breakdown + subscribe button
- Subscribe → if not logged in → redirect to `/signup` → else → open payment modal

---

### 5. Dashboard (`/dashboard`) — Protected Route

**Layout:** Fixed sidebar (220px) + main content area. Redirect to `/login` if not authenticated.

**Sidebar items:**
- Dashboard (overview icon)
- My Agents
- Earnings
- API Keys
- --- separator ---
- Verify New Agent (links to `/verify`)
- Marketplace (links to `/marketplace`)

**Overview tab:**
- 4 stat cards: Total Agents, Published, Revenue (Mo.), Total Users
- Recent agents table: Name | Status dot | Score | Users | Revenue

**My Agents tab:**
- List of agent cards showing: name, category, status badge, score ring
- Action buttons per status:
  - `pending` → "Verify Now" → `/verify`
  - `verified` → "Publish" → opens publish modal (set price, description, tags)
  - `published` → "View Listing" → `/marketplace/{id}`
- "+ Verify New Agent" button in header

**Publish Modal:**
- Monthly price input (USD + INR separate fields)
- Tags input (comma-separated)
- Confirm checkbox: "I confirm this agent is ready for public use"
- Submit → PATCH `/api/agents/{id}` sets status to `published`

**Earnings tab:**
- 4 stats: Total Earned, This Month, Pending Payout, Revenue Share %
- Payout history table: Date | Amount | Agent | Status badge

**API Keys tab:**
- List of keys showing prefix + masked key
- "Reveal" button (re-authenticates then shows full key for 10 seconds)
- Usage bar: calls used / calls limit
- "Generate New Key" button → POST `/api/api-keys` → returns full key once (copy prompt)

---

### 6. Pricing Page (`/pricing`)

**Monthly/Yearly billing toggle** (yearly = 20% discount, shown as badge)

**3 tier cards:**

| | Starter | Builder | Studio |
|---|---|---|---|
| Price | Free | $49/mo | $199/mo |
| Verifications | 5/mo | 50/mo | Unlimited |
| Check layers | 4/8 | All 8 | All 8 + custom |
| Revenue share | 60% | 70% | 80% |
| API calls | — | 5K/mo | Unlimited |
| Support | Community | Email | Dedicated |

Middle card has gold border + "Most Popular" tab.

**Pay-per-use API section** below the cards:
- Basic Verification: $0.08/call (4-layer)
- Full Verification: $0.25/call (8-layer)
- Continuous Monitor: $0.02/day
- Batch 100+: $0.18/call

---

## API ROUTES

### `POST /api/verify`
```ts
// Body: { agentId, method, endpointUrl?, configFilePath?, agentName, category }
// 1. Insert agent row (status: 'verifying')
// 2. Insert verification_run row
// 3. Insert 8 check_result rows (status: 'pending')
// 4. Fire-and-forget: POST to VERIFICATION_ENGINE_URL with { runId, agentId, endpointUrl }
// 5. Return { runId, agentId }
```

### `GET /api/agents`
```ts
// Query params: ?status=published&category=Legal&sort=score
// Returns paginated list of published agents with creator profile join
```

### `GET /api/agents/[id]`
```ts
// Returns agent + verification_run + check_results + creator profile
```

### `PATCH /api/agents/[id]`
```ts
// Body: { status, priceMonthlyUsd, priceMonthlyInr, tags }
// Only creator can update their own agent
```

### `POST /api/payments/stripe`
```ts
// Body: { agentId, priceId }
// Creates Stripe Checkout Session → return { sessionUrl }
```

### `POST /api/payments/razorpay`
```ts
// Body: { agentId, amount }
// Creates Razorpay Order → return { orderId, amount, currency }
```

### `POST /api/webhooks/stripe`
```ts
// Verify signature: stripe.webhooks.constructEvent(body, sig, secret)
// Events to handle:
//   checkout.session.completed → insert subscription row
//   customer.subscription.deleted → update subscription status = 'cancelled'
//   invoice.payment_failed → update subscription status = 'past_due'
```

### `POST /api/webhooks/razorpay`
```ts
// Verify signature: crypto HMAC-SHA256 with RAZORPAY_KEY_SECRET
// Events: payment.captured → insert subscription row
```

### `POST /api/api-keys`
```ts
// Generate: crypto.randomBytes(32).toString('hex')
// Prefix: 'vyr_live_' + first 8 chars
// Hash: bcrypt(fullKey, 10)
// Store: { userId, keyHash, prefix, name }
// Return: { fullKey } — only time full key is shown
```

---

## VERIFICATION ENGINE (Python FastAPI)

Build this as a completely separate FastAPI service. For MVP, the checks use simulated logic with realistic variance. Leave clear `TODO: replace with real check` comments throughout.

```python
# main.py
from fastapi import FastAPI, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel
import httpx, os, asyncio, random, time
from checks import guardrails, prompt_injection, hallucination, consistency, safety, latency, data_privacy, bias

app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ENGINE_SECRET = os.getenv("VERIFICATION_ENGINE_SECRET")

class VerifyRequest(BaseModel):
    run_id: str
    agent_id: str
    endpoint_url: str | None = None

@app.post("/verify")
async def verify(req: VerifyRequest, background_tasks: BackgroundTasks, x_engine_secret: str = Header(None)):
    if x_engine_secret != ENGINE_SECRET:
        raise HTTPException(status_code=401)
    background_tasks.add_task(run_verification, req)
    return {"status": "queued"}

async def run_verification(req: VerifyRequest):
    checks = [
        ("Guardrail Compliance", guardrails.run),
        ("Prompt Injection Resistance", prompt_injection.run),
        ("Hallucination Rate", hallucination.run),
        ("Behavioral Consistency", consistency.run),
        ("Output Safety", safety.run),
        ("Latency Profile", latency.run),
        ("Data Privacy", data_privacy.run),
        ("Bias & Fairness", bias.run),
    ]
    scores = []
    for name, fn in checks:
        await set_check_status(req.run_id, name, "running")
        await asyncio.sleep(random.uniform(2, 5))  # simulate work
        result = await fn(req.endpoint_url)        # real check logic goes here
        scores.append(result["score"])
        await set_check_result(req.run_id, name, result)

    final_score = int(sum(scores) / len(scores))
    await finalize_run(req.run_id, req.agent_id, final_score)

async def set_check_status(run_id, name, status):
    async with httpx.AsyncClient() as c:
        await c.patch(
            f"{SUPABASE_URL}/rest/v1/check_results",
            params={"run_id": f"eq.{run_id}", "check_name": f"eq.{name}"},
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
            json={"status": status}
        )

async def set_check_result(run_id, name, result):
    async with httpx.AsyncClient() as c:
        await c.patch(
            f"{SUPABASE_URL}/rest/v1/check_results",
            params={"run_id": f"eq.{run_id}", "check_name": f"eq.{name}"},
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
            json={"status": "passed" if result["score"] >= 70 else "failed", "score": result["score"], "details": result.get("details"), "completed_at": "now()"}
        )

async def finalize_run(run_id, agent_id, final_score):
    import datetime
    issued = datetime.datetime.utcnow()
    expires = issued + datetime.timedelta(days=90)
    cert_id = f"VCT-{run_id[:8].upper()}"
    async with httpx.AsyncClient() as c:
        await c.patch(
            f"{SUPABASE_URL}/rest/v1/verification_runs",
            params={"id": f"eq.{run_id}"},
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
            json={"status": "completed", "final_score": final_score, "completed_at": issued.isoformat()}
        )
        await c.patch(
            f"{SUPABASE_URL}/rest/v1/agents",
            params={"id": f"eq.{agent_id}"},
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
            json={"status": "verified", "score": final_score, "certificate_id": cert_id,
                  "certificate_issued_at": issued.isoformat(), "certificate_expires_at": expires.isoformat()}
        )
```

**Each check module** (e.g. `checks/guardrails.py`) follows this pattern:
```python
import random

async def run(endpoint_url: str | None) -> dict:
    # TODO: Replace with real check logic
    # Real implementation would:
    # 1. Send test prompts to endpoint_url
    # 2. Evaluate responses against safety criteria
    # 3. Return deterministic score based on results
    
    score = random.randint(75, 98)  # MVP: simulated
    return {
        "score": score,
        "details": {
            "tests_run": 240,
            "tests_passed": int(240 * score / 100),
            "summary": f"Agent passed {score}% of guardrail boundary tests"
        }
    }
```

---

## PAYMENT ROUTING LOGIC

Detect user's region and route to the correct gateway:

```ts
// lib/paymentRouter.ts
export function getPaymentGateway(countryCode: string): 'stripe' | 'razorpay' {
  const indiaCountries = ['IN'];
  return indiaCountries.includes(countryCode) ? 'razorpay' : 'stripe';
}

// Usage: detect from browser or IP geolocation
// Simple MVP: ask user "Are you paying from India?" with toggle
```

**Stripe flow:**
1. POST `/api/payments/stripe` → creates Checkout Session with `mode: 'subscription'`
2. Redirect to Stripe hosted page
3. Webhook `checkout.session.completed` → insert subscription → 70% of revenue queued for creator payout

**Razorpay flow:**
1. POST `/api/payments/razorpay` → creates Order
2. Load Razorpay JS on client → open checkout modal
3. On success → POST payment details for verification → insert subscription

---

## REALTIME VERIFICATION PROGRESS

Use Supabase Realtime to stream check progress to the frontend:

```ts
// In CheckProgress.tsx
useEffect(() => {
  const channel = supabase
    .channel(`run-${runId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'check_results',
      filter: `run_id=eq.${runId}`
    }, (payload) => {
      setChecks(prev => prev.map(c =>
        c.check_name === payload.new.check_name ? { ...c, ...payload.new } : c
      ));
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [runId]);
```

---

## COMPONENT SPECS

### `<ScoreRing score={number} size={number} />`
```tsx
// SVG circle with animated stroke-dasharray
// size prop: 64 | 72 | 80 | 88 | 120
// Color: scoreColor(score) — teal/yellow/red
// Shows: number + "SCORE" label in IBM Plex Mono
// Glow: drop-shadow filter matching color
// Animate: stroke-dasharray transitions over 1.2s on mount
```

### `<CredentialBadge certificateId score issuedAt />`
```tsx
// Gold-bordered card
// Shows: "VEYRA TRUST CERTIFICATE" label
// Grid of: Certificate ID | Issued | Valid Until | Score
// All in IBM Plex Mono gold
```

### `<AgentCard agent onSubscribe />`
```tsx
// Full card as described in Marketplace section
// Hover: border-color transitions to border-accent
// Click: opens AgentModal
```

---

## PROTECTED ROUTES

```ts
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const protectedPaths = ['/dashboard', '/verify'];
  if (protectedPaths.some(p => req.nextUrl.pathname.startsWith(p)) && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/verify/:path*'] };
```

---

## DEPLOYMENT

### Vercel (Frontend + API Routes)
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install"
}
```

1. Push to GitHub
2. Import repo in Vercel
3. Set all env vars in Vercel dashboard
4. Deploy

### Railway (Python Verification Engine)
```dockerfile
# apps/verification-engine/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```
# requirements.txt
fastapi==0.110.0
uvicorn==0.27.0
httpx==0.27.0
pydantic==2.6.0
python-multipart==0.0.9
```

1. Connect GitHub repo to Railway
2. Set root directory to `apps/verification-engine`
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERIFICATION_ENGINE_SECRET`
4. Deploy → copy URL → set as `VERIFICATION_ENGINE_URL` in Vercel

---

## EXECUTION ORDER

Build in this exact sequence to avoid blockers:

1. `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir=false --import-alias='@/*'`
2. Install dependencies: `npm i @supabase/supabase-js @supabase/auth-helpers-nextjs zustand @tanstack/react-query framer-motion react-hook-form zod react-dropzone stripe razorpay resend bcryptjs`
3. Install dev deps: `npm i -D @types/bcryptjs`
4. Initialize shadcn: `npx shadcn-ui@latest init` → choose dark theme
5. Add shadcn components: `npx shadcn-ui@latest add button input card dialog badge tabs select toast progress`
6. Set up Tailwind config with Veyra design tokens
7. Add Google Fonts to `app/layout.tsx`
8. Build Supabase client helpers (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
9. Run database SQL in Supabase
10. Build auth pages + middleware
11. Build landing page
12. Build verify page + realtime hook
13. Build marketplace page
14. Build dashboard (all 4 tabs)
15. Build pricing page
16. Wire Stripe + Razorpay
17. Build Python verification engine
18. Write `vercel.json` + `Dockerfile`
19. Push to GitHub + deploy both services

---

## NOTES & CONSTRAINTS

- All monetary values stored as integers (cents/paise) — never floats
- Never store raw API keys — always hash with bcrypt before DB insert
- All Supabase DB calls from API routes must use `service_role` key, never anon key
- Realtime subscription must be cleaned up on component unmount
- File uploads go to Supabase Storage bucket `agent-configs` — create this bucket in Supabase dashboard with private access
- The verification engine must validate `x-engine-secret` header on every request
- Revenue share calculation: subscription amount × 0.70 → creator payout (queued monthly)
- For MVP, payout disbursement is manual (admin reviews and transfers). Add Stripe Connect or Razorpay Route in v2.
- OTP digit inputs: max 1 char each, auto-focus next, backspace focuses previous
- Score ring SVG animation: use `strokeDasharray` and `strokeDashoffset` with a CSS transition, not JS animation
- All pages are server components by default; mark `'use client'` only where interactivity requires it

---

*End of Cursor prompt. Paste this entire document into Cursor Agent chat and hit enter.*
