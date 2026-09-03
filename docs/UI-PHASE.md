# UI Phase — Glass + Aurora redesign

A full visual overhaul of the Veyra web app: new theme system, component kit, and motion. Backend, APIs, and data flows are untouched.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Visual direction | **Glassmorphism + aurora gradients** |
| Accent palette | **Keep gold (`#c9a84c`) + teal (`#00e5cc`)** as brand accents |
| Tailwind | **Upgrade v3.4 → v4** with CSS-variable design tokens |
| Theme modes | **Dark + light** with a toggle (`next-themes`) |
| Motion | **Mixed** — rich on marketing/landing, subtle in app/dashboard |
| Component base | **shadcn / base-ui** for the app; **21st.dev / reactbits** for marketing showpieces |
| Rollout | **Foundation first**, then migrate surfaces one at a time |

## Current state (baseline)

- **Two conflicting systems:** pages use a custom palette (`bg-bg`, `text-gold`, `.card-industrial`) with hand-rolled inline buttons; `components/ui/*` are shadcn/base-ui primitives that reference **undefined** tokens (`--primary`, `--muted`, `--radius`, `border-input`, …) so they render unstyled and are bypassed everywhere.
- **Tailwind 3.4.1**, `@tailwind` directives, JS config.
- `framer-motion` v12 installed but barely used; motion is mostly CSS `animate-pulse`/`animate-spin`.
- Fonts: Cormorant Garamond (display), DM Sans (body), IBM Plex Mono (labels).
- Dark-only; `sonner` hardcoded to `theme="dark"`.

Goal: collapse to **one** token-driven system, fix the shadcn primitives, and apply a glass/aurora skin.

---

## UI-Phase A — Foundation (build + tokens)

| # | Task | Status |
|---|------|--------|
| A1 | Upgrade Tailwind v3 → v4 (`@tailwindcss/postcss`, `@import "tailwindcss"`) | Planned |
| A2 | Define full token set (dark + light) in `@theme` / CSS vars (oklch) | Planned |
| A3 | Glass + aurora tokens (`--glass-bg`, `--glass-border`, `--blur`, aurora stops) | Planned |
| A4 | `next-themes` ThemeProvider + theme toggle in navbar | Planned |
| A5 | Fix `sonner` to follow active theme | Planned |
| A6 | Verify shadcn primitives render (Button/Card/Input/Dialog/Select/Tabs/Badge/Progress) | Planned |

**Token contract** (must exist for shadcn primitives to work):
`--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring --radius`
plus brand: `--gold --teal`, and glass: `--glass-bg --glass-border --glass-blur`.

**Exit criteria:** dev server builds clean; existing pages still render; a temporary `<Button>` and `<Card>` look correct in both dark and light.

---

## UI-Phase B — Component kit

| # | Task | Status |
|---|------|--------|
| B1 | Canonical `<Button>` variants (solid / glass / ghost / outline / destructive) | Planned |
| B2 | `<GlassCard>` + refit shadcn `Card` | Planned |
| B3 | `<AuroraBackground>` (animated gradient, respects `prefers-reduced-motion`) | Planned |
| B4 | Motion primitives: `FadeIn`, `Stagger`, `HoverLift`, page-transition wrapper | Planned |
| B5 | Form controls (Input/Select/Textarea), Dialog, Tabs, Badge, Tooltip, Skeleton on tokens | Planned |
| B6 | Refit `ScoreRing`, `CredentialBadge`, status/severity pills to tokens | Planned |

**Library policy**
- App/dashboard → shadcn primitives (dense, accessible).
- Marketing/landing → 21st.dev / reactbits showpieces (copy-paste, framer-motion driven).
- All new components consume tokens — no hard-coded hex.

---

## UI-Phase C — Migrate surfaces (one at a time)

App stays functional after each step.

| Order | Surface | Motion | Status |
|-------|---------|--------|--------|
| C1 | Layout shell + Navbar (+ theme toggle, mobile nav) | subtle | Planned |
| C2 | Landing / marketing (`/`, `/pricing`) — aurora hero showpiece | rich | Planned |
| C3 | Marketplace (`/marketplace`, `/marketplace/[id]`, filters, cards, subscribe) | subtle+ | Planned |
| C4 | Dashboard (overview, agents, incidents, earnings, api-keys, sidebar) | subtle | Planned |
| C5 | Verify flow (submit, progress, score reveal) | subtle+ | Planned |
| C6 | Auth (login, signup, OTP) | subtle | Planned |

Each migration: replace inline buttons with `<Button>`, apply glass cards, add `FadeIn`/`Stagger`, confirm light + dark.

---

## Risks & guardrails

- **Tailwind v4 is a build-config change** (`postcss.config`, `globals.css`, `tailwind.config.ts`). Verify `npm run dev` builds before any page migration.
- Keep custom utilities working (`.card-industrial`, `.grid-noise`) or migrate their usages in the same pass.
- `prefers-reduced-motion` honored for aurora/heavy effects.
- No backend/API/schema changes in this phase.

## Done when

- [ ] One token system; shadcn primitives render in dark + light
- [ ] Theme toggle works; sonner follows theme
- [ ] All surfaces migrated to the kit; no stray inline `bg-gold px-4 py-2` buttons
- [ ] Marketing has aurora showpiece; app motion is subtle
- [ ] Lint/build clean

## Next after UI Phase

Deploy prep (Vercel + Railway), then Stripe subscribe / OAuth (Phase 2b).
