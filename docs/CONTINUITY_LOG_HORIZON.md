# Continuity Log — Horizon (competitive / AI landscape)

> Sessions that change `services/lane-intel-service.js` (horizon path), `LANE_INTEL_*` env defaults, or Horizon-specific queries.

**Most recent first.**

---

## [BUILD] Update 2026-04-19 #2 — Execution dormant

- **`LANE_INTEL_ENABLED=1` required** for any Horizon run (manual or scheduled). Leave unset until post-launch / budget approval.

## [BUILD] Update 2026-04-19 #1 — MVP shipped

- Tables `lane_intel_runs` / `lane_intel_findings`; API `GET/POST /api/v1/lifeos/intel/horizon/*`; scheduler via `bootLaneIntel` + `LANE_INTEL_ENABLE_SCHEDULED=1`.
- Default queries + council synthesis — see `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` → Configuration.

### Next agent (horizon lane)

1. Tune `LANE_INTEL_HORIZON_QUERIES` for your real competitor set.
2. Phase 2: wire “suggested backlog lines” into Amendment 21 / INDEX without silent merges.

---
