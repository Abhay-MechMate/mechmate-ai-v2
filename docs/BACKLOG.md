# MechMate v2 — Backlog (parked ideas)

Ideas live here until their phase comes up in the roadmap (`ROADMAP.md`).
Nothing here is scheduled — that's the point. When a phase opens, we pull from this list.

## Parking lot (unscheduled)
- Bluetooth OBD-II dongle reading (ELM327 via browser Web Bluetooth) — roadmap Phase 5
- Real-time parts availability via store APIs / affiliate programs — roadmap Phase 4 upgrade
- Verified part numbers in the parts section (store interchange search, affiliate/part-catalog feeds, or owner-verified additions to `CAUSE_PARTS`) — Phase 4 follow-up; v1 ships named part lines only (docs/PARTS_DESIGN.md §1.2)
- Parts section on the assistant conversation page, not just the report — Phase 4 follow-up
- Per-user store preference (remember which store they like first) — Phase 4 follow-up
- Affiliate/referral params appended in one place (`buildStoreLinks`) once there is traffic to monetize
- Maintenance reminders and service tracking per vehicle
- Repair cost estimates per diagnosis
- Guided assistant handoff: user feedback (2026-11-03) — the report's "First checks" section is the natural entry point for the Phase 3 conversational assistant; Phase 3 design must make that section the bridge into follow-up Q&A
- Open-ended assistant chat beyond the per-round note — Phase 3 follow-up
- Persist draft answers (localStorage keyed by turn id)
- Lock `diagnostic_sessions.result` writes to RPC-only before any sharing feature
- Backport 'floor replaces steps at ≥ drive_to_shop_only' to the first-pass engine
- Fix SYSTEM_PROMPT tail ('non-mechanic') to match the DIY voice
- Pre-signup diagnosis: let visitors run one diagnosis before creating an account; attach to the account when they join (parked Nov 10, 2026 — owner liked it, deferred)
- Light-mode theme toggle (dark is the only theme for now; research says offer a choice eventually)
- (add more as they come — just ask)

## Rules
1. One roadmap phase at a time; a phase is done before the next starts.
2. New ideas get parked here, never started mid-phase.
