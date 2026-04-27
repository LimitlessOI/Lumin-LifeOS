# Continuity Log — Security / Red-team

> Sessions that change red-team automation, `npm audit` integration, or **future** active pentest harness.

**Most recent first.**

---

## [BUILD] Update 2026-04-19 #2 — Execution dormant

- **`LANE_INTEL_ENABLED=1` required** for any Red-team run. Leave unset until post-launch / budget approval.

## [BUILD] Update 2026-04-19 #1 — MVP (supply chain only)

- `runRedTeamScan()` runs `npm audit --json` and records critical/high findings + informational “scope note” (active pentest **not** enabled).

### Next agent (security lane)

1. Document staging URLs + allowlisted routes in Amendment 36 before Phase 2 probes.
2. Add alerting (SMS/webhook) for `severity=critical` findings if Adam wants interrupt-on-P0.

---
