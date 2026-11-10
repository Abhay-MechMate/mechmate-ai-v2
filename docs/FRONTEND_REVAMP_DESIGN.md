# MechMate v2 — Frontend Revamp Design: Tokens, Sidebar, Dashboard, Breadcrumbs

**Status:** Design, for review before build. No app code in this document is final until implemented and verified.
**Scope source:** owner decisions of 2026-11-10 (listed below and not reopened here), plus the current UI in `src/app/**` and `src/components/site-header.tsx`.

**In scope:** design tokens in `globals.css` and a page-by-page swap away from raw `zinc-*`/`emerald-*` classes · a desktop sidebar plus a slim top bar on every signed-in page · a new signed-in home at `/dashboard` · breadcrumbs on nested pages · auth redirects that send signed-in users to the dashboard · Vitest coverage for every new pure module, plus machine-checked contrast and design-rule guards.

**Out of scope (do NOT build):** mobile layouts (pages must stay *usable* below 1024px, but there are no mobile-specific layouts, drawers, or bottom navs) · a light theme or theme toggle (already in `docs/BACKLOG.md`) · pre-signup diagnosis (parked in BACKLOG) · a landing-page redesign · new features on existing pages · the `src/middleware.ts` → `src/proxy.ts` rename (BACKLOG, §5.24) · icon or component libraries (no new dependencies).

### Approved decisions (owner, 2026-11-10; do not revisit)

1. A desktop sidebar replaces the 3-link header on every **signed-in** app page. A slim top bar keeps branding and account. Sidebar items: MechMate wordmark (home) · Garage · **New diagnosis** (pinned, visually distinct primary action) · Diagnoses history · account/sign-out at the bottom. Active state is required.
2. Token palette: canvas `#0B0F0D`, surface `#111814`, surface-raised `#17211B`, border `#2A3830`, text-primary `#F0F5F1`, text-secondary `#B1BDB5`, text-muted `#8B9A90`, accent-emerald `#34D399` (actions, active state, and focus **only**, never large fills), on-accent `#052E1B`.
3. Signed-in home = a dashboard (cars, recent diagnoses, in-progress assistant conversations). The landing page stays as it is for signed-out visitors.
4. Breadcrumbs on nested pages: Diagnoses › [Report] › Assistant conversation. Explicit return links stay.
5. Pre-signup diagnosis is parked.
6. Evidence rules: no popups ever · all text ≥ 4.5:1 against the surface it actually sits on · regular weights or heavier (no thin/light) · accent discipline · layered surfaces instead of shadows · value before commitment.

### Facts the implementer must know (verified in the repo on 2026-11-10)

- **Next.js 16.4.3 / React 19.3, Tailwind v4** (`@import "tailwindcss"` in `src/app/globals.css`, no `tailwind.config`). Authenticated pages render **without** page-level `<Suspense>` (see the note at the top of `src/app/diagnose/page.tsx`). New pages follow the same pattern: top-level `await`, then `redirect("/signin")`.
- **Layouts don't re-run on client navigation** (`node_modules/next/dist/docs/01-app/02-guides/authentication.md` → "Layouts and auth checks"). The new layouts may *read* the user to show the email, but **every page keeps its own `redirect("/signin")`**. Never gate access in a layout.
- `src/middleware.ts` is deprecated in Next 16 (renamed `proxy.ts`; see `.../03-file-conventions/middleware.md`) but still works. This revamp edits only the logic in `src/lib/supabase/middleware.ts`. The rename is a separate backlog item.
- **Existing bug:** `globals.css` sets `body { font-family: Arial, Helvetica, sans-serif; }`, which overrides Geist everywhere. It also carries a light `:root` and a `prefers-color-scheme` block that nothing uses. Tokens stage 0 (§1.4) fixes both.
- **Existing gap:** `src/app/garage/add/page.tsx` has **no auth check**. Signed-out visitors see the form and only hit `/signin` on submit. Fixed in §5.14.
- **Existing contrast failures:** `text-zinc-500` (#71717A) on `bg-zinc-900` is about 3.7:1, and `text-zinc-600` (separators, placeholders) is lower. The migration table maps both to `fg-muted` (≥ 5.6:1 on every surface).
- Every page under `garage/` and `diagnose/` renders `<SiteHeader />` and then its own `<main className="min-h-screen bg-zinc-950 …">`. `AddVehicleForm` renders its own `<main>` too. After the revamp, **the shell owns the only `<main>`**, so pages render a plain wrapper `<div>`.
- The assistant page's progress bar is `sticky top-0`. Under a sticky 56px top bar it must become `top-14`, and the round anchors' `scroll-mt-24` must become `scroll-mt-28` (§5.20).
- Imports use `@/app/diagnose/...` and `@/app/garage/...` in 27 files, tests included. That is why this design uses **per-segment layouts** instead of moving pages into an `(app)` route group (§2.1).
- Vitest runs `src/**/*.test.ts` in a **node** environment, with no DOM and no TSX tests. Anything worth testing has to live in a pure `.ts` module (§8).
- `diagnostic_sessions.vehicle_id` is `on delete set null`, and `vehicle_snapshot` keeps the label. `assistant_status` is set to `active` by `record_questions_turn` and set to `finished` by "I'm done" or by a successful round 3. A session stopped by `nothing_to_ask` **stays `active`**, so the dashboard must derive real state from turns (§3.3).

### The shell at a glance (desktop, ≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MechMate                                          owner@example.com      │  AppTopbar  h-14, bg-canvas, border-b line
├──────────────┬───────────────────────────────────────────────────────────┤
│ ▣ Garage     │  Diagnoses / 2014 Civic — Nov 10, 2026 / Assistant…       │  Breadcrumbs (in page)
│┃+ New diag.  │                                                           │
│ ☰ Diagnoses  │  <page content on bg-canvas; cards on bg-surface;          │
│              │   insets/chips on bg-surface-raised>                      │
│              │                                                           │
│ ⇤ Collapse   │                                                           │
│ ⎋ Sign out   │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
  AppSidebar w-60 (rail: w-16), bg-surface, border-r line, sticky under top bar
```

---

## 1. Tokens

### 1.1 Decisions

| Decision | Choice | Why |
|---|---|---|
| Where token values live | Raw values in **`:root` custom properties** (`--mm-*`), exposed to Tailwind with **`@theme inline`** (`--color-* : var(--mm-*)`) | This meets the owner's "CSS custom properties, used via Tailwind theme tokens" requirement. It also makes the backlog light theme a value swap under `[data-theme="light"]`, with no class churn. `inline` is required because the Tailwind utility must reference the variable, not a copied literal. |
| Utility names | `bg-canvas` `bg-surface` `bg-surface-raised` · `border-line` `border-line-strong` · `text-fg` `text-fg-secondary` `text-fg-muted` · `bg-accent` `text-accent` `hover:bg-accent-hover` `text-on-accent` · status `*-ok-*` `*-caution-*` `*-warn-*` `*-danger-*` | `text-fg` avoids `text-text-primary`, and `border-line` avoids `border-border`. Names are short enough that they don't tempt anyone back to `zinc-*`. |
| Extra tokens beyond the approved nine | `accent-hover` `#6EE7B7` · `line-strong` `#5A7064` · four status families (fg/bg/line) | **Hover:** a filled button needs a hover state that keeps on-accent ≥ 4.5:1 (it gives 9.8:1). **line-strong:** form-control and outline-button borders must reach **3:1** against adjacent colors (WCAG 1.4.11). The approved `#2A3830` gives about 1.5:1, which is fine for decorative dividers but not for an input's edge. **Status:** drivability, confidence, and alerts currently use raw `emerald/amber/orange/red`. Status is not "action", so it can't borrow the accent. |
| "OK to drive" color | `--mm-ok-fg #86EFAC` (green-300), **not** the emerald accent | This keeps accent discipline: green status must not read as a clickable action. |
| Status surfaces | **Solid** hex backgrounds, no alpha (`bg-red-950/50` today) | With solid colors the contrast is a fixed number the token test (§8.1) can compute. Alpha backgrounds change with whatever sits underneath. |
| Shadows | None. Elevation = canvas → surface → surface-raised, plus a `line` border | Evidence rule "layered surfaces instead of shadows". The guard test (§8.6) bans `shadow-*`. |
| Translucency/blur | Removed (`bg-zinc-950/90 backdrop-blur` → `bg-canvas`) | Blurred translucent bars put text on an unknowable surface, which breaks the "contrast against its actual surface" rule. |
| Default Tailwind palette | Left enabled during migration; banned in app code by the guard test once migration finishes | Removing it (`--color-*: initial`) on day one would break every page mid-migration. |

**Contrast of the approved pairs.** These are hand-computed with WCAG 2.x relative luminance and rounded down. The token test in §8.1 recomputes them from `globals.css` on every run, so a wrong number here fails CI rather than shipping.

| Foreground ↓ / Background → | canvas `#0B0F0D` | surface `#111814` | surface-raised `#17211B` |
|---|---|---|---|
| fg `#F0F5F1` | 17.4 | 16.3 | 15.0 |
| fg-secondary `#B1BDB5` | 9.9 | 9.3 | 8.5 |
| fg-muted `#8B9A90` | 6.5 | 6.1 | **5.6** (the lowest text pair in the system) |
| accent `#34D399` (link text) | 10.0 | 9.4 | 8.6 |
| line-strong `#5A7064` (non-text, needs 3:1) | 3.6 | 3.4 | 3.1 |
| line `#2A3830` (decorative only) | ~1.6 | ~1.5 | ~1.3 |

On-accent `#052E1B` reaches 7.7:1 on accent and 9.8:1 on accent-hover. Every status fg reaches ≥ 9:1 on its own status bg.

### 1.2 `src/app/globals.css` (exact target content)

```css
@import "tailwindcss";

/* MechMate design tokens. Dark is the only theme (light mode: docs/BACKLOG.md).
   Contrast pairs are asserted by src/app/__tests__/design-tokens.test.ts —
   change a value here and that test tells you whether it still passes. */
:root {
  /* Surfaces: canvas < surface < surface-raised. No shadows; layer instead. */
  --mm-canvas: #0b0f0d;
  --mm-surface: #111814;
  --mm-surface-raised: #17211b;

  /* Lines: line = decorative dividers/card edges; line-strong = control edges (≥3:1). */
  --mm-line: #2a3830;
  --mm-line-strong: #5a7064;

  /* Text */
  --mm-fg: #f0f5f1;
  --mm-fg-secondary: #b1bdb5;
  --mm-fg-muted: #8b9a90;

  /* Accent: actions, active state, focus. Never large fills. */
  --mm-accent: #34d399;
  --mm-accent-hover: #6ee7b7;
  --mm-on-accent: #052e1b;

  /* Status (drivability, confidence, alerts). Not actions; never the accent. */
  --mm-ok-fg: #86efac;
  --mm-ok-bg: #0e2a1f;
  --mm-ok-line: #1e5a42;
  --mm-caution-fg: #fcd34d;
  --mm-caution-bg: #2a2108;
  --mm-caution-line: #6b4f0e;
  --mm-warn-fg: #fdba74;
  --mm-warn-bg: #2b1a0c;
  --mm-warn-line: #7a3e12;
  --mm-danger-fg: #fca5a5;
  --mm-danger-bg: #2b1214;
  --mm-danger-line: #7f1d1d;
}

@theme inline {
  --color-canvas: var(--mm-canvas);
  --color-surface: var(--mm-surface);
  --color-surface-raised: var(--mm-surface-raised);
  --color-line: var(--mm-line);
  --color-line-strong: var(--mm-line-strong);
  --color-fg: var(--mm-fg);
  --color-fg-secondary: var(--mm-fg-secondary);
  --color-fg-muted: var(--mm-fg-muted);
  --color-accent: var(--mm-accent);
  --color-accent-hover: var(--mm-accent-hover);
  --color-on-accent: var(--mm-on-accent);
  --color-ok-fg: var(--mm-ok-fg);
  --color-ok-bg: var(--mm-ok-bg);
  --color-ok-line: var(--mm-ok-line);
  --color-caution-fg: var(--mm-caution-fg);
  --color-caution-bg: var(--mm-caution-bg);
  --color-caution-line: var(--mm-caution-line);
  --color-warn-fg: var(--mm-warn-fg);
  --color-warn-bg: var(--mm-warn-bg);
  --color-warn-line: var(--mm-warn-line);
  --color-danger-fg: var(--mm-danger-fg);
  --color-danger-bg: var(--mm-danger-bg);
  --color-danger-line: var(--mm-danger-line);

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

@layer base {
  html {
    color-scheme: dark; /* native scrollbars, date pickers, autofill in dark */
    background-color: var(--mm-canvas);
  }

  body {
    background-color: var(--mm-canvas);
    color: var(--mm-fg);
    font-family: var(--font-sans); /* was Arial — Geist was never applied */
  }

  /* One focus style everywhere. Components may add ring utilities, never remove this. */
  :focus-visible {
    outline: 2px solid var(--mm-accent);
    outline-offset: 2px;
  }
}
```

`src/app/layout.tsx` keeps loading Geist via `next/font` and setting `--font-geist-sans`/`--font-geist-mono` on `<html>`, so it needs no change.

### 1.3 Migration table (old class → token)

Apply these by **role, not mechanically**: the same zinc class can play different roles on different pages. Where the table lists a role, the role decides.

| Old | New | Notes |
|---|---|---|
| `bg-zinc-950` (page) | *(delete)*: the shell/body is already `canvas` | Pages no longer set a page background. |
| `bg-zinc-950`, `/40`, `/50`, `/60` **inside a card** (code chips, inputs, inset wells, `details` bodies) | `bg-canvas` | An inset sits *below* the card, so it is darker. |
| `bg-zinc-950/90 backdrop-blur` (sticky bars) | `bg-canvas` (opaque) | No translucency (§1.1). |
| `bg-zinc-900` (cards, sections, form panels) | `bg-surface` | |
| `bg-zinc-900/50` (dashed "add" tiles) | `bg-surface` | |
| `bg-zinc-800` (neutral chips, low-confidence badge) | `bg-surface-raised` | |
| `hover:bg-zinc-900`, `hover:bg-zinc-800`, `hover:bg-zinc-900/80` | `hover:bg-surface-raised` | |
| `border-zinc-800` | `border-line` | Card edges, dividers, `border-t` separators. |
| `border-zinc-700` on **inputs, selects, textareas, outline buttons, inactive tabs, dashed tiles** | `border-line-strong` | Needs 3:1 (WCAG 1.4.11). |
| `border-zinc-700` on **chips/blockquote rules** (decorative) | `border-line` | |
| `hover:border-zinc-500`, `hover:border-zinc-700` | `hover:border-fg-muted` | |
| `text-white`, `text-zinc-100`, `text-zinc-200` | `text-fg` | Headings, key values, input text. |
| `text-zinc-300` | `text-fg-secondary` | Body copy. Use `text-fg` where the text is the main value (e.g., `topCause`). |
| `text-zinc-400` | `text-fg-secondary` | Supporting copy. |
| `text-zinc-500`, `text-zinc-600` | `text-fg-muted` | Meta, captions, separators. **Fixes current contrast failures.** |
| `placeholder:text-zinc-600` | `placeholder:text-fg-muted` | Placeholders are text and also need 4.5:1. |
| `bg-emerald-500 text-emerald-950` | `bg-accent text-on-accent` | Primary buttons only. |
| `hover:bg-emerald-400` | `hover:bg-accent-hover` | |
| `text-emerald-400` on **links/text actions** | `text-accent` | |
| `hover:text-emerald-300`, `hover:text-emerald-200` | `hover:text-accent-hover` | |
| `hover:text-emerald-400` on back-links | `hover:text-accent` | |
| `text-emerald-400` on **headings/eyebrows** (garage card eyebrow, "The test that settles it:", landing feature titles) | `text-fg-muted` (eyebrow) / `text-fg` (title) | Accent discipline: these aren't actions. |
| `text-emerald-300` on **DTC codes** (`font-mono`) | `text-fg` | Codes are data, not actions. |
| `border-emerald-900/60 bg-emerald-950/20 text-emerald-100/90` (settling-test box) | `border-l-2 border-accent bg-canvas text-fg-secondary` | A thin accent rule is allowed (it marks the next action); a tinted fill is not. |
| `focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20` | `focus-visible:border-accent` | The global `:focus-visible` outline replaces the ring. |
| `focus-visible:ring-emerald-400 … ring-offset-zinc-900` | *(delete)* | Covered by the global focus style. |
| `size-7 bg-emerald-500 text-emerald-950` (cause rank number) | `border border-line-strong bg-surface-raised text-fg` | A rank is not an action. |
| `rounded-full bg-emerald-500 text-emerald-950` "+" icon in add tiles | `border border-line-strong text-accent` | The whole tile is the action; the icon must not be a filled blob. |
| `border-emerald-800 bg-emerald-950/50 text-emerald-300` (OK to drive, high confidence) | `tone="ok"` → `border-ok-line bg-ok-bg text-ok-fg` | Through `toneClasses()` (§5.4). |
| `border-amber-800 bg-amber-950/50 text-amber-300` | `tone="caution"` | |
| `border-orange-800 bg-orange-950/50 text-orange-300` | `tone="warn"` | |
| `border-red-800 bg-red-950/50 text-red-300`, `border-red-900/70 … text-red-300` (alerts) | `tone="danger"` | |
| `border-amber-900/70 bg-amber-950/40 text-amber-200` (built-in-guide notice) | `tone="caution"` | |
| `hover:text-red-400` (Delete) | `hover:text-danger-fg` | |
| `disabled:opacity-50` (or similar) on text controls | `disabled:text-fg-muted disabled:border-line disabled:bg-surface` | Opacity drops text below 4.5:1. The guard test bans `opacity-` on anything that contains text. |
| `font-light`, `font-extralight`, `font-thin` | `font-normal` or heavier | None exist today; the guard test keeps it that way. |

### 1.4 Staging

| Stage | What | Visible change | Gate |
|---|---|---|---|
| **0: tokens** | Replace `globals.css` (§1.2). Add `design-tokens.test.ts` (§8.1). No component changes. | Geist replaces Arial everywhere. The body background moves from `#0a0a0a` to canvas, which is barely visible because every page still paints `bg-zinc-950`. | `npm test` green, including the contrast test. |
| **1: primitives + shell** | `tone.ts`, `badge.tsx`, `breadcrumbs.tsx`, the sidebar, top bar, shell, and the three layouts. These are built **only** with tokens. Remove `<SiteHeader />` from app pages in the same commit, or two headers will render. | The app pages get the sidebar. Page bodies are still zinc, but since zinc-950 ≈ canvas the seam is minor. | Visual checks §7.1–7.2. |
| **2: dashboard + auth routing** | Data helpers, `/dashboard`, and the redirect changes. The dashboard is born tokenized. | Signed-in users land on `/dashboard`. | §7.3, §8.2–8.4. |
| **3: per-page swap** | One page per commit, in the §5 order: garage → garage/add → diagnose/new → history → report → assistant → signin/signup → landing. Each commit removes that page's files from the guard test's allowlist (§8.6). | Each page turns green-tinted dark. | The guard test allowlist shrinks; §7 checks for that page. |
| **4: lock** | The allowlist is empty. The guard test bans raw palette classes everywhere in `src/app` and `src/components`. | None. | `npm test`. |

---

## 2. Sidebar and top bar

### 2.1 Decisions

| Decision | Choice | Why |
|---|---|---|
| How the shell attaches | **Per-segment layouts**: `src/app/dashboard/layout.tsx`, `src/app/garage/layout.tsx`, and `src/app/diagnose/layout.tsx`. Each renders `<AppShell>{children}</AppShell>`. | An `(app)` route group is the textbook option, but it would move `garage/` and `diagnose/` and rewrite imports in 27 files, tests included, for zero user-visible gain. The cost of three layouts is that the shell remounts when you cross segments (garage → diagnose). That is acceptable because the shell holds no state the user would lose: the collapse mode lives in a cookie (below). |
| Signed-out pages | `/`, `/signin`, `/signup`, and `/auth/*` are **outside** those segments, so they get no shell. The landing keeps `SiteHeader` in its signed-out-only form. Signin/signup keep their centered card. | Decision 1 says signed-in pages only, and the landing is approved as is. |
| Auth in the shell | `AppShell` reads the user (for the email) through the request-cached `getAuthContext()` (§5.3). It **never redirects**. Pages keep `if (!user) redirect("/signin")`. | Next docs: layouts don't re-run on navigation, and a layout doesn't control whether the page renders. Caching means one Supabase `getUser` per request, not two. |
| Wordmark + account placement | The **top bar** carries the wordmark (home → `/dashboard`) on the left and the signed-in email on the right. The **sidebar** starts below the top bar: nav items at the top, then the collapse toggle and **Sign out** at the bottom. | Decision 1 places branding and account in both bars. Duplicating them would mean two wordmarks and two sign-outs on one screen. This split puts each control in exactly one place: identity at the top, the account *action* at the bottom of the sidebar. The wordmark sits directly above the sidebar column, so it reads as the sidebar's head. **Flag for the owner:** if the email should also sit at the sidebar bottom, it is a one-line change. |
| Item order | Garage · **New diagnosis** · Diagnoses (exactly as approved), then a flexible spacer, collapse toggle, and Sign out | Decision 1. "Pinned" = New diagnosis is never hidden; in rail mode it stays a filled accent tile. |
| Dashboard active state | `/dashboard` highlights **no** nav item. The wordmark link gets `aria-current="page"`, and the page's own `<h1>` says "Dashboard". | The approved list has no Dashboard item, and adding one would reopen decision 1. **Flag for the owner:** a "Home" item above Garage is the obvious follow-up if users miss it. |
| Width | Full: **240px** (`w-60`). Rail: **64px** (`w-16`). Top bar: **56px** (`h-14`). | Fits "Diagnoses" and "New diagnosis" at `text-sm` with 20px icons and comfortable padding. 1280px − 240px leaves room for the widest content column (`max-w-6xl` dashboard). |
| Collapse | A **pin toggle** at the sidebar bottom switches between `full` and `rail`. In rail mode, **hovering or keyboard-focusing** the rail expands it to 240px **as an overlay** on top of the content (no layout shift) and collapses it again on leave or blur. This is pure CSS (`group-hover`, `group-focus-within`), with no JS listeners. | "Hover/pin, minimal" from the brief. The hover expansion is the nav itself, not a popup: it's non-modal, never steals focus, and only appears when the pointer or keyboard is already on it. |
| Persisting the mode | Cookie `mm_sidebar=rail\|full` (1 year, `path=/`, `samesite=lax`), read on the server in `AppShell` | The first paint is correct (no flash). It survives the shell remount between segments. localStorage would flash. |
| Below 1024px | The sidebar renders as a rail regardless of the cookie (Tailwind `lg:` breakpoint), still hover/focus-expandable. The toggle is hidden. | Mobile is out of scope; this keeps it functional and never wider than 64px. |
| Icons | Four inline SVGs in `src/components/nav-icons.tsx` (garage, plus, list, sign-out) plus a collapse chevron. `aria-hidden="true"`, `stroke="currentColor"`, 20px. | No dependency for five icons. |
| Labels in rail mode | Labels stay in the DOM with `sr-only` (not removed), and links keep their accessible names | Screen readers always hear "Garage". There are no `title` tooltips because those are popups. |

### 2.2 Active-state logic: `src/components/app-nav.ts` (pure, no `"use client"`)

```ts
export type NavKey = "garage" | "new" | "history";
export type ActiveNav = NavKey | "dashboard" | null;

export const NAV_ITEMS: readonly { key: NavKey; href: string; label: string }[] = [
  { key: "garage", href: "/garage", label: "Garage" },
  { key: "new", href: "/diagnose/new", label: "New diagnosis" },
  { key: "history", href: "/diagnose", label: "Diagnoses" },
];

export const SIDEBAR_COOKIE = "mm_sidebar";
export type SidebarMode = "full" | "rail";

export function parseSidebarMode(value: string | undefined): SidebarMode {
  return value === "rail" ? "rail" : "full";
}

/** Exact `/diagnose/new` beats the `/diagnose` prefix. Report and assistant pages count as history. */
export function activeNav(pathname: string): ActiveNav {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return "dashboard";
  if (path === "/garage" || path.startsWith("/garage/")) return "garage";
  if (path === "/diagnose/new") return "new";
  if (path === "/diagnose" || path.startsWith("/diagnose/")) return "history";
  return null;
}
```

| Path | Active |
|---|---|
| `/dashboard` | wordmark (`aria-current`), no item |
| `/garage`, `/garage/add` | Garage |
| `/diagnose/new`, `/diagnose/new?vehicle=…` | New diagnosis |
| `/diagnose`, `/diagnose/[id]`, `/diagnose/[id]/assistant` | Diagnoses |
| `/diagnose/new-ish` (not a real route) | Diagnoses (prefix); the 404 renders in the shell |

### 2.3 `src/components/app-sidebar.tsx` (client component)

```tsx
"use client";

import { activeNav, NAV_ITEMS, SIDEBAR_COOKIE, type SidebarMode } from "@/components/app-nav";
import { NavIcon } from "@/components/nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AppSidebar({ initialMode }: { initialMode: SidebarMode }) {
  const pathname = usePathname();
  const active = activeNav(pathname);
  const [mode, setMode] = useState(initialMode);

  function toggle() {
    const next = mode === "full" ? "rail" : "full";
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setMode(next);
  }

  return (
    // Outer <aside> reserves layout width; inner panel is what expands on hover.
    <aside
      aria-label="App"
      data-mode={mode}
      className="group/sidebar sticky top-14 h-[calc(100vh-3.5rem)] w-16 shrink-0 data-[mode=full]:lg:w-60"
    >
      <div className="absolute inset-y-0 left-0 z-30 flex w-16 flex-col overflow-hidden border-r border-line bg-surface
                      group-hover/sidebar:w-60 group-focus-within/sidebar:w-60
                      group-data-[mode=full]/sidebar:lg:w-60 transition-[width] motion-reduce:transition-none">
        <nav aria-label="Main" className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => /* <NavLink> or <PrimaryNavLink> for key === "new" */ null)}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-line p-3">
          <button type="button" onClick={toggle} className="hidden lg:flex …" aria-pressed={mode === "full"}>
            {/* chevron + label: "Collapse sidebar" / "Pin sidebar open" */}
          </button>
          <form method="post" action="/auth/signout">
            <button type="submit" className="…">{/* sign-out icon + "Sign out" */}</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
```

Item anatomy (sizes are exact; class strings are guidance):

| Element | Inactive | Active (`aria-current="page"`) | Hover |
|---|---|---|---|
| Regular item (Garage, Diagnoses) | `h-10 rounded-lg px-3 gap-3 text-sm font-medium text-fg-secondary`, icon `text-fg-muted` | `bg-surface-raised text-fg` plus a **3px accent bar** on the left edge (`before:` pseudo, `before:bg-accent`), icon `text-accent` | `bg-surface-raised text-fg` |
| **New diagnosis** (primary) | `h-10 rounded-lg px-3 gap-3 bg-accent text-on-accent text-sm font-semibold` (a small fill; allowed as a primary *action*) | Same plus `ring-2 ring-accent-hover ring-offset-2 ring-offset-surface` (the button stays filled; the ring marks "you are here") | `bg-accent-hover` |
| Label | `whitespace-nowrap`. In rail mode: `sr-only` unless the sidebar is hovered or focused (`group-hover/sidebar:not-sr-only` …) | — | — |
| Collapse toggle, Sign out | Same as a regular item, never active | — | `bg-surface-raised text-fg` |

The sidebar is the **only** place `text-on-accent` appears outside primary buttons. In rail mode the New diagnosis tile is 40×40 and stays filled, which is what "pinned, visually distinct" means there.

### 2.4 `src/components/app-topbar.tsx` (server component)

```tsx
export function AppTopbar({ email, onDashboard }: { email: string | null; onDashboard?: boolean }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-line bg-canvas px-4">
      <Link href="/dashboard" aria-label="MechMate dashboard" className="text-xl font-bold tracking-tight">
        <span className="text-fg">Mech</span><span className="text-accent">Mate</span>
      </Link>
      {email ? (
        <p className="min-w-0 max-w-[18rem] truncate text-sm text-fg-muted">
          <span className="sr-only">Signed in as </span>{email}
        </p>
      ) : null}
    </header>
  );
}
```

- The wordmark keeps its brand split color. This is the one sanctioned non-action use of the accent (brand), as on the landing page today.
- The top bar can't know the pathname without becoming a client component. So the wordmark's `aria-current="page"` on `/dashboard` comes from a tiny client wrapper `WordmarkLink` inside `app-topbar.tsx` that calls `activeNav(usePathname()) === "dashboard"`. The top bar itself stays a server component.

### 2.5 `src/components/app-shell.tsx` (server component)

```tsx
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { parseSidebarMode, SIDEBAR_COOKIE } from "@/components/app-nav";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { cookies } from "next/headers";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [{ user }, jar] = await Promise.all([getAuthContext(), cookies()]);
  const mode = parseSidebarMode(jar.get(SIDEBAR_COOKIE)?.value);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-fg">
        Skip to content
      </a>
      <AppTopbar email={user?.email ?? null} />
      <div className="flex flex-1">
        <AppSidebar initialMode={mode} />
        <main id="main" className="min-w-0 flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
```

Each layout is three lines:

```tsx
// src/app/garage/layout.tsx  (same shape for dashboard/ and diagnose/, with their route literal)
import { AppShell } from "@/components/app-shell";

export default function GarageLayout({ children }: LayoutProps<"/garage">) {
  return <AppShell>{children}</AppShell>;
}
```

### 2.6 What dies

- `<SiteHeader />` on every page under `garage/` and `diagnose/` (6 page files).
- `SiteHeader`'s signed-in branch: the 3-link nav, email, and sign-out. The landing now redirects signed-in users (§3.4), so `SiteHeader` only ever renders signed out. It drops its `getUser()` call and becomes a plain synchronous component (wordmark + Sign in + Sign up).
- Top-of-page back links that the shell or breadcrumbs make redundant: `← Back to Garage` on `/diagnose/new` (the sidebar covers it), `← Back to Garage` in `AddVehicleForm`, `← All diagnoses` on the report, and `← Report` at the top of the assistant page (breadcrumbs replace these, §4). **In-content return links stay:** "Report →" in the assistant's sticky bar, every "Back to the report" button, and "Start another diagnosis".

---

## 3. Dashboard (`/dashboard`)

### 3.1 Decisions

| Decision | Choice | Why |
|---|---|---|
| Route | New `src/app/dashboard/page.tsx`, **not** a signed-in branch inside `src/app/page.tsx` | It keeps the approved landing untouched, gives the dashboard its own layout (shell) without touching the landing, and makes the auth routing a simple path table (§3.4). |
| Section order | 1. **Pick up where you left off** (open assistant conversations; hidden when empty) · 2. **Your cars** · 3. **Recent diagnoses** | Most actionable first. An unanswered question round is the only thing on the page that is waiting on the user. |
| First-run | When the user has 0 cars **or** 0 diagnoses, a **Get started** checklist replaces sections 1 and 3 and tops the page | "Actionable, not empty", plus value before commitment: each step says what you get before asking for anything. |
| Data reuse | `listSessions(supabase, 5)` (existing, extended by 2 columns) · new `listVehicles()` extracted from the garage page's inline query · new `listOpenConversations()` built on the existing `listTurns()` + `deriveConversation()` | No new SQL. No migration. Conversation state comes from the same function the assistant page uses, so the dashboard can never disagree with it. |
| Partial failure | Each data call returns `null` on error. Each section renders its own inline `role="alert"` (danger tone, in flow, not a popup) and the others still render. | One failing query shouldn't blank the home page. |
| Badges | Shared `<Badge tone>` (§5.4), the same as the history page | One visual language for status everywhere. |

### 3.2 Layout (≥ 1280px; content column `max-w-6xl mx-auto`)

```
Dashboard                                               ← h1 text-3xl font-bold text-fg
Your cars, recent diagnoses, and anything waiting on you. ← text-fg-secondary

┌ Pick up where you left off ─────────────────────────────────────────────┐  (only if ≥1)
│ 2014 Civic · "Rough idle when cold"          [Waiting for your answers] │  row = whole-row link
│ #1 Vacuum leak at intake · Round 2 of 3 · updated 2h ago      Continue →│  bg-surface, border-line
│─────────────────────────────────────────────────────────────────────────│
│ Work truck · P0300                              [Ready for more]         │
│ #1 Ignition coil · Round 1 of 3 done · Nov 9               Open →        │
└─────────────────────────────────────────────────────────────────────────┘

Your cars                                                 Manage garage →
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌ ─ ─ ─ ─ ─ ─ ─ ┐
│ 2014 HONDA … │ │ …            │ │ …            │   + Add a vehicle
│ Daily driver │ │              │ │              │ └ ─ ─ ─ ─ ─ ─ ─ ┘
│ EX · 1.8L    │                                       grid-cols-4 at xl, 3 at lg
│ 84,210 mi    │
│[Diagnose]    │   ← small filled primary per card
└──────────────┘
(+2 more in your garage →)  when > 6 cars

Recent diagnoses                                           View all →
<SessionCard compact> × up to 5 (same card as /diagnose history)
```

### 3.3 Data: types and functions

**`src/lib/diagnosis/types.ts`: extend the summary** (additive; history keeps working):

```ts
export type DiagnosticSessionSummary = {
  // …existing fields…
  vehicleId: string | null;        // null ⇒ car was deleted from the garage
  assistantStatus: AssistantStatus;
};
```

`listSessions` in `src/app/diagnose/data.ts` adds `vehicle_id, assistant_status` to its select string and maps them.

**`src/app/garage/data.ts` (new; `server-only`)**

```ts
export type GarageVehicle = {
  id: string; nickname: string | null; vin: string | null; modelYear: number | null;
  make: string; model: string; trimName: string | null; engine: string | null; mileage: number | null;
};

/** Newest first. null on error (callers show an inline alert). */
export async function listVehicles(supabase: SupabaseClient): Promise<GarageVehicle[] | null>;
```

This is the exact query from `src/app/garage/page.tsx` (lines 37–42), mapped to camelCase. The garage page switches to it. `/diagnose/new` keeps its own narrower select; it's not worth coupling.

**`src/app/diagnose/assistant-data.ts`: add `listOpenConversations`**

```ts
/** Sessions whose assistant is still in progress, most urgent first. null on error. */
export async function listOpenConversations(
  supabase: SupabaseClient,
  limit = 3,
): Promise<OpenConversation[] | null> {
  const { data, error } = await supabase
    .from("diagnostic_sessions")
    .select(
      "id, vehicle_id, vehicle_snapshot, symptoms, dtc_codes, initial_result, assistant_status, updated_at, top_cause:result->likelyCauses->0->>title",
    )
    .eq("assistant_status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit * 2); // over-fetch: some 'active' rows are actually stopped (nothing_to_ask)
  if (error || !data) return null;

  const rows = data as unknown as OpenSessionRow[];
  const turnLists = await Promise.all(rows.map((row) => listTurns(supabase, row.id)));
  return selectOpenConversations(rows.map((row, i) => ({ row, turns: turnLists[i] })), limit);
}
```

**`src/app/dashboard/model.ts` (new, pure, unit-tested)** holds everything the dashboard decides:

```ts
import type { AssistantTurn } from "@/lib/diagnosis/assistant-types";
import { ASSISTANT_MAX_ROUNDS } from "@/lib/diagnosis/assistant-types";
import { deriveConversation } from "@/lib/diagnosis/conversation";
import { normalizeResult } from "@/lib/diagnosis/upgrade";
import { vehicleLabel } from "@/app/diagnose/display";

export type OpenConversation = {
  sessionId: string;
  vehicleLabel: string;
  vehicleRemoved: boolean;           // vehicle_id is null
  inputSummary: string;              // first DTC codes, else symptoms ≤ 60 chars + "…"
  topCause: string | null;
  next: "answer" | "retry" | "ask_more";
  round: number;                     // the round awaiting action (ask_more: the round just finished)
  updatedAt: string;
  href: string;                      // answer/retry → …/assistant#round-n ; ask_more → …/assistant
};

export const OPEN_CONVERSATION_LABEL: Record<OpenConversation["next"], { badge: string; tone: Tone }> = {
  answer:   { badge: "Waiting for your answers",  tone: "caution" },
  retry:    { badge: "Update failed — answers saved", tone: "danger" },
  ask_more: { badge: "Ready for more questions", tone: "neutral" },
};

/** Drops rows whose turns failed to load or whose derived state is start/stopped.
 *  Sort: answer, then retry, then ask_more; ties by updatedAt desc. Then slice(limit). */
export function selectOpenConversations(
  items: { row: OpenSessionRow; turns: AssistantTurn[] | null }[],
  limit: number,
): OpenConversation[];

export type OnboardingStep = { key: "car" | "diagnose" | "assistant"; done: boolean };

/** Shown while !steps[0].done || !steps[1].done. */
export function onboardingSteps(input: {
  vehicleCount: number; sessionCount: number; anyRefined: boolean;
}): OnboardingStep[];

/** Cars shown on the dashboard (max 6) plus the overflow count for "+N more". */
export function dashboardCars<T>(vehicles: T[], max = 6): { shown: T[]; hidden: number };
```

`selectOpenConversations` calls `deriveConversation(turns, { initialResult: normalizeResult(row.initial_result), assistantStatus: row.assistant_status })`. Rows with `next.kind` of `start` or `stopped` are dropped. That covers the "`nothing_to_ask` stays `active`" case and any status/turns drift.

**Query cost:** 3 parallel queries, plus up to 6 `listTurns` calls (each small and indexed by `diagnostic_turns_session_idx`). That's acceptable for a page loaded a few times a day. If it ever matters, a Postgres view can replace it (BACKLOG).

### 3.4 `src/app/dashboard/page.tsx`

```tsx
// No page-level <Suspense> (see diagnose/page.tsx note).
export default async function DashboardPage() {
  const { supabase, user } = await getAuthContext();
  if (!user) redirect("/signin?next=/dashboard");

  const [vehicles, sessions, open] = await Promise.all([
    listVehicles(supabase),
    listSessions(supabase, 5),
    listOpenConversations(supabase, 3),
  ]);
  // onboardingSteps({ vehicleCount: vehicles?.length ?? 0, sessionCount: sessions?.length ?? 0,
  //                   anyRefined: sessions?.some((s) => s.refinedRound > 0) ?? false })
  // render: header, [Get started], [Pick up where you left off], Your cars, Recent diagnoses
}
```

Section requirements:

- **Header:** `<h1>Dashboard</h1>` and a one-line subtitle. No duplicate "New diagnosis" button, since the sidebar's is pinned on every page.
- **Get started** (first run): a `bg-surface` card with three numbered steps. Each has a one-line *value* sentence before its action:
  1. "Add your car. Diagnoses are tailored to the exact year, engine, and trim." → **Add a vehicle** (`/garage/add`).
  2. "Run a diagnosis. Enter a trouble code or describe the symptom; get ranked causes and the test that confirms each." → **New diagnosis** (`/diagnose/new`). It is disabled-looking (`fg-muted`, not opacity) until step 1 is done, with the text "Add a car first".
  3. "Answer the assistant's questions. It narrows the causes before you buy parts." This step has no button (it starts from a report) and shows a checkmark when `anyRefined`.
  Done steps show a check icon in `text-accent` plus "Done" (`sr-only`).
- **Pick up where you left off:** one `<ul>` inside a `bg-surface` card with rows divided by `border-line`. Each row is a whole-row `<Link>` to `href` with `hover:bg-surface-raised`. Contents: vehicle label (`text-fg font-semibold`, truncate) · `inputSummary` (`text-fg-secondary`, truncate) · `<Badge tone>` · `#1 {topCause}` · "Round n of 3" · relative time (`formatRelative`, §5.5) · a trailing "Continue →" in `text-accent`. If `vehicleRemoved`, add a neutral "Removed from garage" badge.
- **Your cars:** grid `lg:grid-cols-3 xl:grid-cols-4`. Each card (`bg-surface border-line rounded-xl p-5`) shows the label (`text-fg`, `line-clamp-2`, `break-words`), the detail line (trim · engine, `text-fg-secondary`), mileage (`text-fg-muted`), and a small **Diagnose** primary button (`bg-accent text-on-accent`, `/diagnose/new?vehicle={id}`). Last tile: a dashed `border-line-strong` "Add a vehicle" tile. If `hidden > 0`: "+{hidden} more in your garage →" (`text-accent`, `/garage`). The header has a "Manage garage →" link.
- **Recent diagnoses:** `<SessionCard compact>` (§5.18) × ≤5, then "View all diagnoses →" (`/diagnose`). With cars but no diagnoses, it shows inline: "No diagnoses yet." plus **Diagnose your {first car label}** (primary button) instead of an empty box.

### 3.5 Auth redirect changes

All routing rules live in one pure function, `src/lib/auth/routing.ts`. The proxy enforces it; pages keep their own `redirect("/signin")` as defense in depth.

```ts
const APP_PREFIXES = ["/dashboard", "/garage", "/diagnose"] as const;
const SIGNED_OUT_ONLY = ["/", "/signin", "/signup"] as const;
export const SIGNED_IN_HOME = "/dashboard";

export function isAppPath(pathname: string): boolean; // exact or prefix + "/"

/** null = let the request through. */
export function routeDecision(pathname: string, search: string, signedIn: boolean): string | null {
  if (signedIn && (SIGNED_OUT_ONLY as readonly string[]).includes(pathname)) return SIGNED_IN_HOME;
  if (!signedIn && isAppPath(pathname)) {
    return `/signin?next=${encodeURIComponent(pathname + search)}`;
  }
  return null;
}

/** Only same-site app paths survive; everything else → /dashboard. Blocks open redirects. */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return SIGNED_IN_HOME;
  }
  const pathname = raw.split(/[?#]/)[0];
  return isAppPath(pathname) ? raw : SIGNED_IN_HOME;
}
```

| Where | Today | After |
|---|---|---|
| `signInAction` success | `redirect("/garage")` | `redirect(safeNextPath(formData.get("next")))` |
| `signInAction` error | `/signin?error=…` | `/signin?error=…&next=…` (keep `next` across a failed attempt) |
| `signUpAction` success | `redirect("/garage")` | `redirect("/dashboard")` (new users see the Get started checklist) |
| `/auth/callback` | → `/` | → `/dashboard` |
| `/` (landing) signed in | landing with "Start a diagnosis" → `/garage` | proxy → `/dashboard`. The page also does `if (user) redirect("/dashboard")` as a fallback. |
| `/signin`, `/signup` signed in | form shown | proxy → `/dashboard` |
| App URL signed out | page → `/signin` | proxy → `/signin?next=<path+query>`. The page's own redirect stays. |
| `/auth/signout` | → `/signin` | unchanged |

Proxy change in `src/lib/supabase/middleware.ts` (after the existing `getClaims()`):

```ts
const { data } = await supabase.auth.getClaims();
const target = routeDecision(request.nextUrl.pathname, request.nextUrl.search, Boolean(data?.claims));
if (target) {
  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Carry refreshed auth cookies, or the user is signed out by the redirect.
  supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
return supabaseResponse;
```

---

## 4. Breadcrumbs

### 4.1 `src/components/breadcrumbs.tsx` (server component, no client JS)

```tsx
export type Crumb = { label: string; href?: string }; // last crumb: no href (current page)

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${index}:${item.label}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="text-fg-muted">/</span> : null}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className="max-w-[32ch] truncate font-medium text-fg">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="max-w-[32ch] truncate text-fg-secondary transition-colors hover:text-accent">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- Ancestors are `text-fg-secondary` (≥ 8.5:1). The current page is `text-fg`. The separator is decorative (`aria-hidden`).
- Labels truncate at 32ch. The full label is still in the DOM for screen readers, and the page `<h1>` repeats it in full. No `title` tooltip.
- Rendered **inside the page** above the `<h1>`, not in the top bar. Only the page has the session to label the crumb, and fetching it again in a layout would add a query per navigation.

### 4.2 Trails

Built by a pure helper in `src/app/diagnose/display.ts`:

```ts
export function diagnosisTrail(
  sessionId: string,
  snapshot: VehicleSnapshot,
  createdAt: string,
  leaf: "report" | "assistant",
): Crumb[] {
  const report = `${vehicleLabel(snapshot)} — ${formatSessionDay(createdAt)}`;
  return leaf === "report"
    ? [{ label: "Diagnoses", href: "/diagnose" }, { label: report }]
    : [
        { label: "Diagnoses", href: "/diagnose" },
        { label: report, href: `/diagnose/${sessionId}` },
        { label: "Assistant conversation" },
      ];
}
```

| Page | Trail | Replaces |
|---|---|---|
| `/dashboard`, `/garage`, `/diagnose`, `/diagnose/new` | none (top-level sidebar destinations) | `← Back to Garage` on `/diagnose/new` is removed |
| `/garage/add` | Garage / Add a vehicle | `← Back to Garage` |
| `/diagnose/[id]` | Diagnoses / {car} — {Nov 10, 2026} | `← All diagnoses` |
| `/diagnose/[id]/assistant` | Diagnoses / {car} — {date} / Assistant conversation | `← Report` (top). The "Report →" sticky link and the "Back to the report" buttons **stay**. |
| `/diagnose/[id]/assistant` "couldn't load" branch | same trail | `← Report` |
| `diagnose/not-found.tsx` | Diagnoses / Not found | — |

---

## 5. File-by-file build plan (in build order)

### 5.1 `src/app/globals.css`: REPLACE
Exact content in §1.2. Stage 0.

### 5.2 `src/app/__tests__/design-tokens.test.ts`: CREATE
See §8.1. It must pass before anything else is built on the tokens.

### 5.3 `src/lib/supabase/auth-context.ts`: CREATE
```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

/** One Supabase client + one getUser() per request, shared by layout and page. */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
});
```
Wrap `getUser()` in try/catch → `user: null` (same as `SiteHeader` does today), so a Supabase outage renders the sign-in redirect instead of a 500.

### 5.4 `src/components/tone.ts` + `src/components/badge.tsx`: CREATE
```ts
export type Tone = "neutral" | "ok" | "caution" | "warn" | "danger";
export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-line bg-surface-raised text-fg-secondary",
  ok: "border-ok-line bg-ok-bg text-ok-fg",
  caution: "border-caution-line bg-caution-bg text-caution-fg",
  warn: "border-warn-line bg-warn-bg text-warn-fg",
  danger: "border-danger-line bg-danger-bg text-danger-fg",
};
```
`<Badge tone children />` → `rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`. `<Alert tone>` (same file) → `role="alert"` (danger) or `role="status"` (others), `rounded-lg border px-3 py-2 text-sm`, always in flow.

### 5.5 `src/app/diagnose/display.ts`: MODIFY
- `DRIVABILITY_DISPLAY` / `CONFIDENCE_DISPLAY`: `{ label, className }` → `{ label, tone: Tone }` (ok / caution / warn / danger; low confidence → neutral). Callers use `TONE_CLASSES[tone]` for the drivability banner and `<Badge>` for chips.
- Add `formatSessionDay(iso)` (`dateStyle: "medium"`), `formatRelative(iso, now = Date.now())` ("just now", "2h ago", "yesterday", else `formatSessionDay`), `diagnosisTrail(...)` (§4.2), and `sessionSourceLabel(summary)` → `"AI analysis" | "Built-in guide"`.

### 5.6 `src/lib/auth/routing.ts`: CREATE
§3.5. Pure. Tests §8.3.

### 5.7 `src/lib/supabase/middleware.ts`: MODIFY
§3.5 proxy change. `src/middleware.ts` is unchanged (matcher already covers every page).

### 5.8 `src/app/auth/actions.ts`, `src/app/auth/callback/route.ts`: MODIFY
§3.5 table. `signInAction` reads the `next` hidden input.

### 5.9 `src/app/signin/page.tsx`: MODIFY
Read `next` from `searchParams` next to `error` and render `<input type="hidden" name="next" value={next ?? ""} />`. Token swap per §1.3. The layout stays the centered card. The "Create an account" link carries `next` through to `/signup` only if it's safe (`safeNextPath`).

### 5.10 `src/components/app-nav.ts`: CREATE
§2.2. Pure. Tests §8.2.

### 5.11 `src/components/nav-icons.tsx`, `app-sidebar.tsx`, `app-topbar.tsx`, `app-shell.tsx`, `breadcrumbs.tsx`: CREATE
§2.3–2.5, §4.1. Tokens only, from the first line.

### 5.12 `src/app/dashboard/layout.tsx`, `src/app/garage/layout.tsx`, `src/app/diagnose/layout.tsx`: CREATE
§2.5. **In the same commit, remove `<SiteHeader />` and the `<main className="min-h-screen bg-zinc-950 …">` wrappers from every page under `garage/` and `diagnose/`.** Each page root becomes `<div className="mx-auto max-w-{N}">`, keeping today's max width: garage `5xl`, history `4xl`, report `3xl`, assistant `2xl`, new `2xl`. `AddVehicleForm`'s `<main>` becomes a `<div>`.

### 5.13 `src/app/diagnose/not-found.tsx`: CREATE
Renders inside the diagnose layout, so the shell is present. It shows breadcrumbs (Diagnoses / Not found), "We couldn't find that diagnosis. It may have been removed, or the link is wrong.", and a "View all diagnoses" button.

### 5.14 `src/app/garage/data.ts`: CREATE, then `src/app/garage/page.tsx` and `src/app/garage/add/page.tsx`: MODIFY
- `listVehicles` (§3.3).
- Garage page: uses `getAuthContext()` + `listVehicles()`, swaps tokens, and moves the card eyebrow from `text-emerald-400` → `text-fg-muted`. The "+" tile becomes the line-strong dashed tile. Its "Diagnose" text link becomes a small primary button (matches the dashboard car card).
- **Add page: add the missing auth check** (`getAuthContext()`, `redirect("/signin?next=/garage/add")`) and render `<Breadcrumbs items={[{label:"Garage",href:"/garage"},{label:"Add a vehicle"}]} />` above `<AddVehicleForm>`.
- `src/app/garage/add/add-vehicle-form.tsx`: swap tokens (`<main>` → `<div>`, remove the back link, tabs: active = `bg-accent text-on-accent`, inactive = `border-line-strong text-fg-secondary`).

### 5.15 `src/lib/diagnosis/types.ts`, `src/app/diagnose/data.ts`: MODIFY
Add `vehicleId` and `assistantStatus` to `DiagnosticSessionSummary` and to `listSessions`' select/map (§3.3).

### 5.16 `src/app/diagnose/assistant-data.ts`: MODIFY
Add `listOpenConversations` (§3.3).

### 5.17 `src/app/dashboard/model.ts` + `src/app/dashboard/page.tsx`: CREATE
§3.3–3.4.

### 5.18 `src/app/diagnose/session-card.tsx`: CREATE, then `src/app/diagnose/page.tsx`: MODIFY
Extract the history list item (`src/app/diagnose/page.tsx` lines 71–129) into `<SessionCard session compact?>`.
- Badges: drivability (`<Badge tone>`), source (`neutral`: "AI analysis" / "Built-in guide". Today only "Built-in guide" shows; showing both makes the source explicit, per decision "source badges"), "Refined ×n" (`neutral`), "Assistant in progress" (`caution`, when `assistantStatus === "active"`), "Removed from garage" (`neutral`, when `vehicleId === null`).
- `compact` hides symptoms and DTC chips and keeps label, date, badges, and top cause.
- DTC chips: `bg-canvas font-mono text-fg`.
- History page: tokens, no breadcrumbs, `getAuthContext()`.

### 5.19 `src/app/diagnose/new/page.tsx` + `diagnosis-form.tsx`: MODIFY
Tokens. Remove `← Back to Garage`. **New:** when `?vehicle=` is present but not in the user's garage (deleted car), render `<Alert tone="caution">That car isn't in your garage anymore. Pick one below.</Alert>` above the form instead of silently selecting another car.

### 5.20 `src/app/diagnose/[id]/page.tsx` + `first-checks.tsx`: MODIFY
- Breadcrumbs `diagnosisTrail(..., "report")` replace `← All diagnoses`.
- Drivability banner: `TONE_CLASSES[drivability.tone]`. Confidence: `<Badge>`. Rank numbers: neutral (§1.3). Settling-test box: accent left rule (§1.3). Built-in-guide notice: `<Alert tone="caution">`. DTC chips and code-note `dt`: `text-fg`. "Ruled out" line-through title: `text-fg-muted` (line-through stays readable at 6.1:1).
- `#first-checks` `scroll-mt-24` → `scroll-mt-20` (56px top bar + breathing room).
- Remove `title={session.model}` from the "AI analysis" badge (it's a native tooltip, i.e. a popup). The model name already appears in the footer's "Source:" line.

### 5.21 `src/app/diagnose/[id]/assistant/page.tsx` + `answer-form.tsx` + `turn-views.tsx`: MODIFY
- Breadcrumbs `diagnosisTrail(..., "assistant")` in both the normal and the "couldn't load" branch.
- Sticky progress bar: `sticky top-0 … bg-zinc-950/90 backdrop-blur` → `sticky top-14 z-10 … bg-canvas` (opaque, under the top bar).
- Round sections `scroll-mt-24` → `scroll-mt-28` (top bar 56 + sticky bar ≈ 48 + 8).
- Question bubbles and update cards follow §1.3. Any `emerald` "assistant voice" styling becomes `bg-surface border-line`, and owner answers become `bg-surface-raised`. Accent appears only on submit buttons, links, and selected choice state (`border-accent`, with a check icon, so selection isn't conveyed by color alone).

### 5.22 `src/app/signup/page.tsx`, `src/app/page.tsx`, `src/components/site-header.tsx`: MODIFY
- Signup: token swap only.
- Landing ("keep as is, minor polish"): token swap; `if (user) redirect("/dashboard")` replaces `isAuthenticated`, so the CTA is always `/signup`; footer `text-zinc-500` → `text-fg-muted` (fixes contrast). **The one visible design change:** feature-card titles `text-emerald-400` → `text-fg` (accent discipline). The hero's "Then fix it." accent span stays as brand. Revert the titles if the owner prefers.
- `SiteHeader`: signed-out only (§2.6). No async, no Supabase.

### 5.23 `src/__tests__/design-rules.test.ts`: CREATE (stage 1), allowlist emptied by stage 4
§8.6.

### 5.24 `docs/BACKLOG.md`: MODIFY
Add: "Rename `src/middleware.ts` → `src/proxy.ts` (Next 16 deprecation; `npx @next/codemod@canary middleware-to-proxy .`)", "Mobile navigation (drawer/bottom nav) for the signed-in shell", "Dashboard 'Home' sidebar item if users miss it", "Postgres view for dashboard open conversations if the per-session `listTurns` fan-out ever shows up in latency". Light mode and pre-signup diagnosis are already listed.

---

## 6. Edge cases

| # | Situation | Behavior |
|---|---|---|
| 1 | Signed-out visit to `/dashboard`, `/garage…`, `/diagnose…` | Proxy 307 → `/signin?next=<path+query>`. After sign-in → `safeNextPath(next)`. If the proxy is bypassed (e.g., a matcher miss), the page's own `redirect("/signin")` still fires (without `next`, which is acceptable). |
| 2 | `next` is `https://evil.com`, `//evil.com`, `/\evil`, `/signin`, or garbage | `safeNextPath` → `/dashboard`. Only `/dashboard`, `/garage…`, and `/diagnose…` survive. |
| 3 | Signed-in visit to `/`, `/signin`, `/signup` | → `/dashboard`. The owner can no longer see the landing while signed in. That is intentional per decision 3; sign out to preview it. |
| 4 | Session expires mid-use, then a Server Action runs | The existing actions `redirect("/signin")`. Unchanged; no `next` (actions don't know the page URL). |
| 5 | Sign-up with email confirmation on (no session yet) | `redirect("/dashboard")` → proxy sees no claims → `/signin?next=/dashboard`. Same outcome as today's `/garage`. |
| 6 | Car deleted, diagnoses remain (`vehicle_id` null) | Session cards show the snapshot label plus a neutral "Removed from garage" badge. The report's "Start another diagnosis" already falls back to `/diagnose/new`. Open conversations still work (the assistant uses the snapshot) and show the same badge. |
| 7 | `/diagnose/new?vehicle=<deleted or foreign id>` | Caution alert "That car isn't in your garage anymore. Pick one below."; the form defaults to the newest car (today it silently picks one). |
| 8 | Car deleted in another tab while the dashboard is open, then **Diagnose** is clicked | Same as 7. |
| 9 | Empty garage, no diagnoses (brand-new user) | The dashboard shows only **Get started** (step 1 active) and **Your cars** with just the "Add a vehicle" tile. Sidebar "New diagnosis" still works and lands on the existing "Add a vehicle first" panel. |
| 10 | Cars but no diagnoses | Get started (step 1 done) + Your cars + Recent diagnoses' inline "No diagnoses yet — Diagnose your {car}" button. No conversations section. |
| 11 | Diagnoses but never used the assistant | No Get started (steps 1–2 done). No conversations section. Recent diagnoses render. |
| 12 | `assistant_status = 'active'` but derived `stopped` (`nothing_to_ask`), or turns failed to load | Excluded from "Pick up where you left off" (derive, don't trust the column). |
| 13 | More than 3 open conversations | The 3 most urgent (answer > retry > ask_more, then most recent). The rest are reachable from history via the "Assistant in progress" badge. |
| 14 | More than 6 cars | 6 newest shown plus "+N more in your garage →". |
| 15 | One dashboard query fails | That section shows an inline danger alert; the others render. If all three fail, there are three alerts and the page still renders the shell. |
| 16 | Daily assistant limit reached or AI unconfigured while a conversation is open | Still listed. Clicking through lands on the assistant page, which already explains the limit honestly. |
| 17 | Long car nickname (no DB length limit) | Dashboard/garage cards: `line-clamp-2 break-words`. Session cards and conversation rows: `truncate` inside `min-w-0`. Breadcrumbs: 32ch truncate. The `<h1>` wraps in full. |
| 18 | Long email | Top bar: `max-w-[18rem] truncate`, `min-w-0`. The full string stays in the DOM for assistive tech. |
| 19 | Report id is not a UUID or not owned | `notFound()` → `src/app/diagnose/not-found.tsx` inside the shell (sidebar shows Diagnoses active). |
| 20 | Supabase auth unreachable | `getAuthContext` → `user: null`. The shell renders without an email; the page redirects to `/signin`. |
| 21 | Viewport 1024–1279px | Full sidebar if pinned. Content columns are max-width-bound, so nothing overflows. Dashboard car grid drops to 3 columns. |
| 22 | Viewport < 1024px | Rail sidebar (64px), hover/focus expands as an overlay, and the toggle is hidden. Content stays usable. No further mobile work (out of scope). |
| 23 | JS disabled or not yet hydrated | All nav links work (server-rendered `<a>`). Sign out is a plain form POST. Only the pin toggle needs JS, and the hover-expand is pure CSS. |
| 24 | `prefers-reduced-motion` | Sidebar width transition disabled (`motion-reduce:transition-none`). |
| 25 | Keyboard user in rail mode | Tabbing into the sidebar expands it (`group-focus-within`), so labels become visible. The skip link is the first tab stop on every app page. |

---

## 7. Visual verification plan

Run `npm run dev` and use Chrome at **1440×900** (primary), plus one pass at **1280×800** and **1024×768**, and a functional-only pass at **390×844**. Test two accounts: a **fresh** account (no cars) and a **seasoned** one with ≥ 7 cars (one with a 60-character nickname), ≥ 6 diagnoses (one whose car was deleted, one rules-sourced, one refined ×2), and conversations in each state (waiting for answers, failed update, ask-more, finished, `nothing_to_ask`). Repeat the core checks on the Vercel preview before promoting.

**Contrast method:** Chrome DevTools → Inspect element → color swatch → the contrast ratio row (it computes against the *actual* rendered background). Each spot check below must show ≥ 4.5 (text) or ≥ 3 (control borders). Also run the axe DevTools extension once per page: zero "color-contrast" violations.

### 7.1 Shell (every signed-in page)
- [ ] Exactly one top bar and one sidebar. The old 3-link header is gone (search the DOM for `Main navigation`: no match).
- [ ] Wordmark → `/dashboard`. The email is right-aligned; a long email truncates without pushing the wordmark.
- [ ] Active state per §2.2 table, checked on each route: accent bar + raised background + `aria-current="page"` on exactly one item (none on `/dashboard`; the wordmark carries it there).
- [ ] New diagnosis is filled accent in every state. On `/diagnose/new` it also shows the ring.
- [ ] Collapse toggle → rail (64px). Reload → still rail (cookie). Navigate garage → diagnose → still rail, with no flash of the full width.
- [ ] Rail: hover expands as an overlay (content doesn't shift). Mouse out collapses. Tab into the rail expands it; tab out collapses.
- [ ] Below 1024px: rail regardless of cookie; toggle hidden.
- [ ] The skip link appears on first Tab and jumps to `#main`.
- [ ] Sign out → `/signin`, and the back button doesn't show app content without re-auth.
- [ ] Computed `font-family` on `body` starts with Geist (not Arial).
- [ ] No `box-shadow` on any shell element (Computed tab).
- [ ] Contrast spot checks: nav label (inactive) on surface, nav label (active) on surface-raised, email on canvas, "Sign out" on surface.

### 7.2 Auth routing
- [ ] Signed out: `/dashboard`, `/garage/add`, `/diagnose/<id>/assistant` → `/signin?next=…`. Signing in returns to that exact URL.
- [ ] `/signin?next=https://example.com` → signing in lands on `/dashboard`.
- [ ] Signed in: `/`, `/signin`, `/signup` → `/dashboard`.
- [ ] Sign up (fresh) → `/dashboard` with Get started.

### 7.3 Dashboard
- [ ] Fresh account: only Get started + Your cars (Add tile). Step 2's button reads "Add a car first" in `fg-muted` (contrast ≥ 4.5, not faded by opacity).
- [ ] Seasoned account: sections in order (conversations, cars, recent). Conversations show "Waiting for your answers" first, then "Update failed", then "Ready for more". The finished and `nothing_to_ask` sessions are **absent**.
- [ ] Each conversation row's link lands on the right round anchor, and the sticky bar doesn't cover the round heading.
- [ ] 6 cars + "+1 more in your garage →". The 60-char nickname clamps to 2 lines. **Diagnose** opens `/diagnose/new?vehicle=<that car>` with it preselected.
- [ ] Recent diagnoses: 5 cards with drivability, source, "Refined ×2", "Assistant in progress", and "Removed from garage" badges where applicable. "View all" → `/diagnose`.
- [ ] Simulated failure (temporarily break one select string locally): only that section shows an alert.
- [ ] Contrast spot checks: each status badge (ok/caution/warn/danger/neutral), "Continue →" link on surface, car mileage (`fg-muted` on surface), the "Add a vehicle" tile border (≥ 3:1).

### 7.4 Garage + Add vehicle
- [ ] Garage: no breadcrumb, sidebar Garage active, eyebrow no longer emerald, the Diagnose button is the only accent fill per card.
- [ ] Add: breadcrumb "Garage / Add a vehicle" (Garage links back), signed-out direct visit redirects, VIN/manual tabs show the active tab in accent, input borders ≥ 3:1, placeholder ≥ 4.5:1, focus outline visible on every input.

### 7.5 New diagnosis
- [ ] Sidebar New diagnosis active (ring). No back link.
- [ ] `?vehicle=<deleted id>` shows the caution alert.
- [ ] No cars → "Add a vehicle first" panel, tokenized.

### 7.6 Diagnoses history
- [ ] Diagnoses active. Cards match the dashboard's (same component). DTC chips are `text-fg` mono, not emerald.
- [ ] Empty account: the "Run your first diagnosis" tile is tokenized.

### 7.7 Report
- [ ] Breadcrumb "Diagnoses / {car} — {date}". "Diagnoses" works; the current crumb isn't a link.
- [ ] Drivability banner in each tone (find or seed one of each). Contrast on banner text and on the "Stop driving and get help if" list.
- [ ] Settling-test box: accent left rule, no tinted fill, text ≥ 4.5.
- [ ] Rank numbers are neutral (no accent fill). The only accent fills on the page are the first-checks primary button and "Start another diagnosis".
- [ ] `#first-checks` anchor scrolls clear of the top bar.
- [ ] A bogus id renders the not-found page inside the shell.

### 7.8 Assistant conversation
- [ ] Breadcrumb "Diagnoses / {car} — {date} / Assistant conversation". The middle crumb → report.
- [ ] The sticky progress bar sticks **below** the top bar (no overlap, opaque).
- [ ] "Report →" and "Back to the report" still present and working.
- [ ] Selected answer choices are visible without color (check icon), and focus outlines show on every choice.
- [ ] Contrast spot checks: question text in the bubble, the "round n" meta line, and the failed-update card text (danger tone).

### 7.9 Signed-out pages
- [ ] Landing: visually unchanged apart from tokens and fg feature titles. No sidebar. The header shows Sign in / Sign up. Footer contrast ≥ 4.5.
- [ ] Signin/signup: centered card, no sidebar, `next` preserved through a wrong-password attempt.

---

## 8. Test plan (Vitest, node environment, `.test.ts` only)

Navigation is mostly visual (§7), so tests target the pure decisions behind it, plus two repo-wide guards that make the evidence rules machine-checked.

### 8.1 `src/app/__tests__/design-tokens.test.ts`: CREATE
- Read `src/app/globals.css` with `fs` and parse every `--mm-*: #hex;` in `:root`.
- Implement WCAG 2.x relative luminance and contrast ratio in the test file (≈15 lines).
- Assert:
  - `fg`, `fg-secondary`, `fg-muted`, `accent`, `accent-hover` each on `canvas`, `surface`, `surface-raised` ≥ 4.5.
  - `on-accent` on `accent` and on `accent-hover` ≥ 4.5.
  - Each `{ok,caution,warn,danger}-fg` on its own `-bg` ≥ 4.5, and `fg-muted` on each status bg ≥ 4.5 (in case muted text lands inside a banner).
  - `line-strong` on `canvas`, `surface`, `surface-raised` ≥ 3.
  - `accent` (focus outline) on all three surfaces ≥ 3.
  - Every `--color-*` in `@theme inline` references an existing `--mm-*` (catches typos that silently produce no color).

### 8.2 `src/components/__tests__/app-nav.test.ts`: CREATE
- `activeNav`: the full §2.2 table, plus a trailing slash (`/garage/` → garage), `/diagnose/new` vs `/diagnose/newer` (history), `/` → null, and `/signin` → null.
- `parseSidebarMode`: `"rail"` → rail; `undefined`, `"full"`, `"garbage"` → full.
- `NAV_ITEMS` order is exactly garage, new, history (locks decision 1).

### 8.3 `src/lib/auth/__tests__/routing.test.ts`: CREATE
- `routeDecision`: signed in on `/`, `/signin`, `/signup` → `/dashboard`. Signed in on app paths → null. Signed out on `/dashboard`, `/garage/add`, `/diagnose/abc/assistant?x=1` → `/signin?next=` with the encoded path + query. Signed out on `/`, `/signin`, `/auth/callback` → null. Signed in on `/auth/signout` → null.
- `safeNextPath`: keeps `/dashboard`, `/garage/add`, `/diagnose/abc/assistant#round-2`. Rejects `https://x.com`, `//x.com`, `/\x.com`, `/signin`, `/`, `""`, `null`, and `42` → `/dashboard`.

### 8.4 `src/app/dashboard/__tests__/model.test.ts`: CREATE
Fixture turns built with the same helpers as `src/lib/diagnosis/__tests__/conversation.test.ts` (reuse `fixtures.ts`; add a `turnsFor(state)` helper there if needed).
- `selectOpenConversations`:
  - Derived `answer` → `next: "answer"`, `round` = open round, `href` ends `#round-n`.
  - `retry` → `href` ends `#round-n`.
  - `ask_more` → `href` = `/diagnose/{id}/assistant`, `round` = last finished round.
  - Status `active` but `nothing_to_ask` → excluded. `turns === null` → excluded. No turns (`start`) → excluded.
  - Ordering answer > retry > ask_more, ties by `updatedAt` desc. `limit` respected after filtering.
  - `vehicle_id: null` → `vehicleRemoved: true`.
  - `inputSummary`: codes win over symptoms, and symptoms are truncated at 60 with "…".
- `onboardingSteps`: (0,0,false) → none done. (2,0,false) → car done. (2,3,true) → all done.
- `dashboardCars`: 7 → 6 shown + 1 hidden. 0 → empty + 0.

### 8.5 Data-layer tests (mock Supabase like `assistant-data.test.ts`)
- `src/app/diagnose/__tests__/data.test.ts` (CREATE): `listSessions` selects `vehicle_id` and `assistant_status` and maps them to `vehicleId`/`assistantStatus` (a null `vehicle_id` stays null). It returns `null` on error. The `limit` argument is passed through.
- `src/app/diagnose/__tests__/assistant-data.test.ts` (MODIFY: add cases): `listOpenConversations` filters `assistant_status = 'active'`, orders by `updated_at` desc, over-fetches `limit * 2`, calls `listTurns` once per row, and returns `null` when the session query errors.
- `src/app/garage/__tests__/data.test.ts` (CREATE): `listVehicles` maps snake_case → camelCase, orders by `created_at` desc, and returns `null` on error.

### 8.6 `src/__tests__/design-rules.test.ts`: CREATE
Walk `src/app/**` and `src/components/**` (`.ts`/`.tsx`, excluding `__tests__`) and fail on:
- the raw palette `\b(bg|text|border|ring|from|to|via|placeholder|outline|divide|fill|stroke)-(zinc|neutral|gray|slate|stone|emerald|green|red|amber|orange|white|black)\b` (with optional `-\d+` / `/\d+`)
- `\bshadow-(?!none)`
- `\bfont-(thin|extralight|light)\b`
- `\bbackdrop-blur`
- `\b(disabled:)?opacity-\d+` on any line that also contains `text-`
- `title=` on JSX elements (a native tooltip is a popup; use visible text)

The test carries a `PENDING_MIGRATION: string[]` allowlist of not-yet-migrated files, which stage 3 empties one commit at a time. **Stage 4 = allowlist empty**, and the test then also asserts the allowlist *is* empty so it can't silently regrow.

### 8.7 Existing tests
None assert on `className` maps, routes, or `/garage` redirects (verified by grep), so no existing test should change behavior. `npm test` must stay fully green after every stage. `npm run lint` and `npm run build` must pass before each stage is called done (the build catches `LayoutProps<"/…">` route-literal typos).
