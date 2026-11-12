# MechMate v2 — Phase 4 Design: Parts Recommendations

**Status:** Design, for review before build. No app code in this document is final until implemented and verified.
**Scope source:** `docs/ROADMAP.md` → Phase 4 (*"Diagnosis → specific parts with part numbers … Store picker: curated deep links"*) and its own footnote: *"v2 ships curated links first, live availability after."*

**In scope:** a "Parts you may need" section on the diagnosis report page · deterministic derivation of part lines from the session's current result (rules causes AND AI causes) · curated store deep links to RockAuto, AutoZone and O'Reilly, vehicle-scoped where the store supports it · pure, fully tested derivation and link modules · no database changes.

**Out of scope (do NOT build):** invented or unverified part numbers (see §1.2 — this is a deliberate deviation from the roadmap one-liner, flagged for owner sign-off) · live prices or availability scraping (backlog "Phase 4 upgrade") · affiliate IDs / referral params (parked until there is traffic to monetize; the link builders keep a single place to add them) · parts UI on the assistant conversation page · a store-affiliation picker or user store preferences · "add to cart" integrations · mobile-specific layout.

---

## 1. Product decisions

### 1.1 What the section promises (and does not)

The section says: **"Here is the part you'd likely be buying, named the way stores name it. Tap a store to see fitment and prices for your car."** It does not promise: "this exact SKU fits your car." That promise is only keepable with a fitment catalog we do not have (see §1.2), and an over-promised part number that turns out wrong is worse for trust than an honest, well-named search link that lands on the right catalog page.

### 1.2 Part numbers: deferred, and why (needs owner sign-off)

The roadmap one-liner used "upstream O2 sensor, Bosch 15717" as its example. Building that honestly requires a parts-fitment data source. Verified in the research pass (2026-11-12):

- None of the three stores offers a public parts-search or fitment API (RockAuto explicitly has no API; AutoZone and O'Reilly sit behind bot protection and affiliate-only feeds).
- LLMs hallucinate part numbers confidently. The repo's own prompt rule — *"Do not invent part numbers"* — exists because of this.
- Free fitment-ish sources (NHTSA vPIC, etc.) cover vehicle metadata only, not part applications.

**Decision:** v1 ships part *lines* ("Front brake pads", "Upstream O2 sensor") with store links; part numbers appear only when one is curated by hand into the parts map with a source noted (start with zero). A "verify via store interchange" backlog item covers the later upgrade path (affiliate feeds / scraping-with-permission / user-reported fitment). **The owner should explicitly approve this deviation before build.**

### 1.3 Derived, not stored

Parts are **computed at render time** from `diagnostic_sessions.result` + the vehicle row. No migration, no backfill, no sync problem when the assistant rewrites `result` mid-conversation — the parts section always reflects the current best diagnosis. Consequence: parts can never be referenced by URL from history rows; the report page is the only surface (§5).

### 1.4 Which causes get parts

Only causes that are plausibly *fixable by buying something* get part lines. A cause like "Wiring chafing — locate and repair" maps to nothing and the section simply omits it. Every cause gets *attempted* (title match → system match → generic-title fallback, §4.2), so AI-generated cause titles still land somewhere sensible.

---

## 2. The parts map (`src/lib/parts/map.ts`)

A plain typed object — no database, no AI. Two lookup tiers, in order:

1. **`CAUSE_PARTS`** — keyed by normalized cause title. Exact, curated, best quality. Seeded from every cause in `DTC_KNOWLEDGE` and `SYMPTOM_RULES` today (~35 entries), e.g.:
   - `"Aging or failed catalytic converter"` → catalytic converter (+ gasket kit), upstream O2 sensor, downstream O2 sensor
   - `"Worn brake pads or rotors"` → front/rear brake pads, rotors (pair note: "replace in pairs, resurface or replace rotors if scored"), brake fluid (if bleeding)
   - `"Worn steering or suspension parts (tie rods, ball joints, bushings)"` → sway bar link pair, tie rod end, ball joint — with the note "diagnose which joint before buying"
   - `"Slow puncture or bead leak"` → tire repair plug kit, (note: shops plug for ~$30; DIY plug only for tread punctures)
2. **`SYSTEM_PARTS`** — keyed by `VehicleSystem` (`brakes`, `cooling`, `emissions`, …). Fallback for AI causes whose titles don't match a curated entry: 1–2 generic part lines per system ("coolant", "thermostat", "radiator cap" for `cooling`).

Each part line carries:

```ts
type PartLine = {
  label: string;          // "Front brake pads" — store vocabulary, owner-readable
  searchTerms: string;    // "front brake pads" — fed to store search
  note?: string;          // max 1 sentence; pairs, position, tooling warnings
  difficulty?: "diy_easy" | "diy_moderate" | "shop_recommended";
};
```

Rules for map entries: labels use store vocabulary, never brand names; `note` never recommends a brand; entries are data + comments only so a non-coder can extend them; every curated entry gets a test asserting its search terms return sane store results *for a fixed reference vehicle* (§9).

---

## 3. Store links (`src/lib/parts/stores.ts`)

URL formats **verified live on 2026-11-12** (RockAuto fetched and confirmed to resolve to the right vehicle catalog; AutoZone/O'Reilly formats confirmed from the stores' own indexed pages — both serve a bot-wall 403 to scripts, which is irrelevant to a real browser, but both formats get re-verified in the owner's browser during visual verification §8):

| Store | Link built | Vehicle-scoped? |
|---|---|---|
| RockAuto | `https://www.rockauto.com/en/catalog/{make},{year},{model}[,{parttype+slug}]` | **Yes** — fitment pre-filtered server-side; part-type slug optional and omitted in v1 (omitting it lands on the vehicle's full catalog with the part types listed) |
| AutoZone | `https://www.autozone.com/searchresult?searchText={terms}` | No — the owner picks their vehicle once in AutoZone's UI, then results are fitment-filtered |
| O'Reilly | `https://www.oreillyauto.com/search?q={terms}` | No — same as AutoZone ("Select a Vehicle" filter) |

Builder rules:

- Pure functions: `(vehicle, partLine) → url`. Vehicle make/model lowercased, spaces → `-` (RockAuto) or `+`/`%20` (search params); `model_year ?? year` used for RockAuto's year slot; a vehicle with no year/build yet degrades to term-only search links.
- Each store link is labeled with its real trade-off: **RockAuto — "online, ship-to-home"** · **AutoZone — "online + same-day store pickup"** · **O'Reilly — "online + same-day store pickup"**. No fake prices, no fake "in stock."
- One `buildStoreLinks(vehicle, partLine)` returning all three; per-store affiliate params can be appended in exactly one place later (parked).
- Links open in a new tab (`target="_blank" rel="noopener noreferrer"`).

---

## 4. Derivation (`src/lib/parts/derive.ts`)

`deriveParts(result: DiagnosisResult, vehicle) → { causeTitle, causeSystem, parts: PartLine[] }[]`

1. Take the top **3** `likelyCauses` of the current result (the report already ranks them).
2. Resolve each: exact title match in `CAUSE_PARTS` → else `SYSTEM_PARTS[cause.system]` → else **generic fallback**: one part line whose `searchTerms` is the cause title itself (stores' free-text search handles it surprisingly well; label = title, difficulty omitted, note: "search by this name — part names vary").
3. If a cause yields nothing fixable (map says so explicitly for known non-part causes), omit it. If **no** cause yields anything, the whole section renders with the generic fallback for the top cause — the section is never empty on a real diagnosis, and a "no parts map entry yet" console-free fallback keeps honesty.
4. Dedupe part lines by normalized `label` across causes (a car diagnosed with P0420 *and* P0135 shows the O2 sensor once, grouped under the first cause that claims it).
5. Cap: max 3 causes × 3 lines = 9 rows before dedupe.

Determinism: pure function, no randomness, unit-tested against both a rules result and a realistic AI result fixture.

---

## 5. UI (`src/components/parts-section.tsx` on `src/app/diagnose/[id]/page.tsx`)

- Placement: after **First checks**, before the safety/stop-warning block (read order: what's wrong → what to do → what you'd buy → safety framing).
- Header: small caps section label **"PARTS YOU MAY NEED"** (same style as "YOU · FIRST CHECKS"), plus one line of framing: *"Search links, not guaranteed SKUs — each store confirms fitment for your car."*
- Per cause: cause title as a plain bold row, part lines under it. Each line: label · optional note (fg-muted, regular weight) · three compact store links (secondary-style links, NOT filled accent buttons — accent discipline; per-store pickup/ship label as fg-muted suffix).
- Empty case cannot occur on a real diagnosis (§4.3) but the component still handles it defensively (renders nothing).
- Shop-only / do-not-drive causes: parts still show — the owner may be sourcing parts for a shop or fixing it after the fix. No behavior change by verdict.

---

## 6. File-by-file plan (build order)

| # | File | Action | Requirement |
|---|---|---|---|
| 1 | `src/lib/parts/map.ts` | new | `CAUSE_PARTS` + `SYSTEM_PARTS` + types + non-fixable-cause list; data only, no logic |
| 2 | `src/lib/parts/stores.ts` | new | link builders per §3, pure, no imports beyond types |
| 3 | `src/lib/parts/derive.ts` | new | `deriveParts` per §4, pure |
| 4 | `src/lib/parts/__tests__/parts.test.ts` | new | units per §9 (map integrity, link formats, derivation, determinism, fallbacks) |
| 5 | `src/components/parts-section.tsx` | new | §5; uses existing tokens/classes only (passes the zinc/shadow design-rule gate) |
| 6 | `src/app/diagnose/[id]/page.tsx` | modify | render `<PartsSection>` after First checks; server-side `deriveParts(result, vehicle)` |
| 7 | `docs/BACKLOG.md` | modify | add: verified part numbers via store interchange/affiliate feeds; parts on assistant page; store preference; affiliate params |

No migration, no `data.ts` changes, no API route, no OpenRouter call.

---

## 7. Edge cases

- **Vehicle missing year or not in RockAuto's catalog** → RockAuto link degrades to `https://www.rockauto.com/en/catalog/{make}` (their make-level catalog); search stores unaffected.
- **Sessions from before Phase 4 / v1 results** — `result` shape is unchanged, so old sessions render parts identically; `normalizeResult` already guarantees `likelyCauses` exists.
- **AI cause title with a quirky/verbose wording** — generic fallback uses the full title as terms; stores' fuzzy search absorbs it; quality flagged in the visual pass, added to `CAUSE_PARTS` if weak.
- **Same part from two causes** — deduped (§4.4).
- **Very long cause titles** — clamp label display to 2 lines (CSS), full text in title attribute; links unaffected.
- **Owner clicks a link, store changed its URL scheme** — store search pages are 404-tolerant (they render "no results"), and each builder has a unit test pinning the exact format so drift is caught by review, not by users.

---

## 8. Visual verification plan (owner, in browser, on prod)

1. Run one P0420 diagnosis → report shows "Parts you may need" with catalytic converter + O2 sensors; each link opens the right store pre-searched; RockAuto lands on the 2023 Audi Q5 (or test vehicle) catalog.
2. Run a brake-wear symptom diagnosis → pads/rotors lines with the pair note; no invented numbers visible anywhere.
3. Open AutoZone link in a fresh profile → vehicle not preselected, search terms correct; after selecting the vehicle once, results fit-filter.
4. Contrast spot-check: store links and notes pass 4.5:1 on their surface (the design-tokens test already gates the tokens; this is a visual pass on real content).
5. Assistant round that narrows the top cause → reload report → parts section reflects the narrowed cause (proves the derived-not-stored decision).

---

## 9. Test plan (`src/lib/parts/__tests__/parts.test.ts`)

- **Map integrity:** every `CAUSE_PARTS` key normalizes to an existing rules cause title OR is documented as legacy; every `SYSTEM_PARTS` key is a real `VehicleSystem`; every part line has non-empty `label`/`searchTerms`, `note` ≤ 200 chars, no brand names (regex deny-list: Bosch, Duralast, NAPA, AutoZone, O'Reilly, RockAuto, Fel-Pro, …).
- **Link builders:** exact-format assertions for all three stores (including space/`+`/`-` handling and the degraded RockAuto variant).
- **`deriveParts`:** rules fixture (P0420) → curated parts; symptom fixture (brake wear) → pads/rotors; AI-style fixture with unmapped titles → generic fallback; dedupe; cap of 3 causes; empty-causes defensive case; deterministic (same input → deep-equal output).
- **Existing suites untouched:** no changes to diagnosis modules, so `engine.test.ts`/`rules.test.ts` pass as-is; full `npx vitest run` + `npm run lint` + `npm run build` before push.

---

## 10. Open questions for the owner (answer before build)

1. **§1.2 part numbers** — approve shipping without part numbers in v1 (they return later via verified feeds)?
2. **Store set** — RockAuto + AutoZone + O'Reilly as the launch trio, or drop one? (Roadmap named all three.)
3. **Placement** — parts after First checks on the report page (§5) OK, or above First checks?
