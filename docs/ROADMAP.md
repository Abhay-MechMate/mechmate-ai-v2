# MechMate AI — v2 Roadmap

**Status:** In progress, not released.
**v1:** Preserved as-is in `Abhay-MechMate/mechmate-ai` (plus the archived repo). Nothing in v2 touches it.

---

## 1. What v2 is (one sentence)

A real website where a car owner enters a check-engine code or describes a symptom, gets
ranked likely causes and inspection steps, talks through the diagnosis with an AI assistant,
and ends with the exact parts to buy — with store options — all for their specific vehicle.

The v1 loop was: enter code → read canned guidance → done.
The v2 loop is: enter code/symptom → **guided back-and-forth** → ranked diagnosis → **parts with availability** → saved history.

---

## 2. What went wrong in v1 → the rules for v2

| v1 problem | v2 rule |
|---|---|
| Messy architecture, hard to extend | Clean layers: pages → API routes → services → database. Each feature touches all layers once, end-to-end, before the next feature starts. |
| Half-finished features | One feature is DONE (works, tested, deployed) before the next one is started. No parallel half-features. |
| Bare, unproduct-like UI | A design system (reusable styled components) is set up in Phase 1, before features are built on top of it. |
| SQLite, local-only | Hosted Postgres database (Supabase) — real users, real traffic, no "it only works on my machine." |
| Everything local, deployed last | Deployed to the internet on day 1 and stays deployed. Every new feature goes live the day it's finished. |

---

## 3. The stack (and why, in plain language)

| Piece | Choice | What it is / why |
|---|---|---|
| Website framework | **Next.js + TypeScript** | The current industry standard. One project contains both the pages people see and the server logic behind them — that alone removes half the mess of v1 (two separate app halves). TypeScript = Python-style type checking for JavaScript; it catches mistakes before they go live. |
| Look & feel | **Tailwind CSS + shadcn/ui** | Pre-built, professional-looking components (buttons, forms, cards) you assemble, instead of hand-writing CSS like v1's single styles.css. |
| Database | **Supabase (Postgres)** | A real multi-user database, hosted for you. Also gives login/signup accounts built in. Free tier to start. |
| AI layer | **LLM API via OpenRouter, behind a service module** | OpenRouter is one account that gives access to many AI models at often lower prices than going direct — easy to switch models to control cost. Budget: ≤ $10–20/month with a hard cap. v1's rule engine stays as the fallback; the AI agent calls it like a tool. The rest of the app never talks to the provider directly. |
| Hosting | **Vercel** | Made by the Next.js team. Push code to GitHub → site redeploys automatically. Free tier is fine while building. |
| Testing | **pytest-equivalent: Vitest + Playwright** | Same discipline as v1's pytest: the diagnostic engine gets real tests; key flows get browser tests. |

Everything above has a free tier. The only real cost while building is the AI API
(pennies per diagnosis — set a monthly spending cap on the account).

---

## 4. The features, in build order (phases)

### Phase 0 — Setup & skeleton (week 1)
- New repo `mechmate-ai-v2` (v1 repos untouched).
- Initialize Next.js + TypeScript + Tailwind + shadcn/ui.
- **Deploy a "hello world" to a real URL on day 1.** From then on, every push auto-deploys.
- Database connected, sign-up/login working.
- *You learn:* how a Next.js page works, git, and the push-to-deploy loop.

### Phase 1 — The Garage (weeks 2–3)
- User adds vehicles: year/make/model pickers + VIN autofill via the free NHTSA API (already proven in v1).
- "My Garage" page: saved vehicles, mileage, photo.
- Design system applied everywhere — this is where the site starts feeling like a product.
- *Definition of done:* I can sign up, add my car by VIN, see it in my garage, from my phone.

### Phase 2 — The diagnosis loop (weeks 4–6) — the heart
- Start a **diagnostic session** on a garage vehicle.
- Input a DTC code (e.g., P0420) and/or describe symptoms in plain words.
- The engine: LLM agent + structured knowledge base (code → common causes → checks → fixes),
  cross-referenced with the vehicle's year/make/model/engine, producing **ranked likely causes
  with confidence and safety framing** (what's dangerous to drive on, when to stop and call a shop).
- Free-text symptom entry matters ("it shudders when I brake downhill") — the AI maps it to
  systems and codes, which v1's rigid forms couldn't do.
- Session saved to history with a clean diagnosis report page.
- *Definition of done:* my car throws P0420, I get ranked causes, first checks, and a saved report.

### Phase 3 — The guided assistant (weeks 7–8)
- The AI asks the user questions mid-session (triage style: "any smell? does it happen cold or hot?"),
  and the diagnosis narrows as answers come in.
- User can ask follow-ups at any point ("can I still drive it?", "what tool do I need?").
- This is what makes it a product instead of a form — v1 had none of this.
- *Definition of done:* a full back-and-forth session ends in a better diagnosis than the first guess.

### Phase 4 — Parts recommendations (weeks 9–10)
- Diagnosis → specific parts with part numbers (e.g., "upstream O2 sensor, Bosch 15717").
- Store picker: curated deep links to RockAuto / AutoZone / O'Reilly with prices for that part.
- Real-time availability via store APIs is a later upgrade — most stores don't offer public APIs;
  affiliate programs do, and they can also pay you. v2 ships curated links first, live availability after.

### Phase 5 — OBD-II dongle integration (later)
- Read live codes/data from a cheap ELM327 Bluetooth dongle through the browser's Bluetooth API —
  no app store needed. Big differentiator; only after the core loop is solid.

### Phase 6 — Hardening for real users (ongoing)
- Rate limiting and AI cost caps, monitoring (uptime + error alerts), mobile polish,
  clear "not a substitute for a mechanic" disclaimers, user feedback channel.
- Then, and only then: public launch.

---

## 5. Anti-mess rules (write these on the wall)

1. **One feature at a time, end-to-end, deployed.** Nothing half-built lives on `main`.
2. **Layers:** pages never touch the database; they call API routes; API routes call services;
   services own the AI and database logic. Keeps every part swappable — v1's weakness.
3. **The AI is behind one module.** Swap/upgrade/limit it in one place.
4. **The diagnostic engine has tests.** Same P0420 input must always produce sane output.
5. **Secrets in environment variables, never in code** (v1 had keys-in-repo habits to break).
6. **Small pull requests.** Even solo, you review your own diff before merging — it's how you catch mess early.

---

## 6. Open decisions

| # | Decision | Made |
|---|---|---|
| 1 | Repo name for v2 | ✅ New repo `mechmate-ai-v2` (v1 untouched) |
| 2 | AI provider & budget | ✅ OpenRouter, hard cap ≤ $10–20/month |
| 3 | Timeline | ~10 weeks to public-ready at a sustainable student pace |
