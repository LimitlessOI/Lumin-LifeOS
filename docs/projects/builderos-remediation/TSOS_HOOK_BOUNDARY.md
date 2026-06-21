<!-- SYNOPSIS: BuilderOS TSOS Internal Hook Boundary Contract -->

# BuilderOS TSOS Internal Hook Boundary Contract

**Closes:** BR-05 (TSOS Boundary Overclaim) from `BLUEPRINT.md`  
**Status:** RATIFIED  
**Created:** 2026-05-27

---

## 1. Purpose

This contract closes BR-05 from the remediation queue. BuilderOS currently scores `tsos_internal_hooks` maturity from `autonomous_telemetry_events WHERE total_token_estimate > 0`. This is generic token telemetry — it proves the telemetry pipeline ran and emitted events with token estimates. It does not prove that a dedicated BuilderOS-internal TSOS hook exists, is called by the governed loop, and returns structured efficiency data to BuilderOS decision surfaces.

Without this contract, `tsos_internal_hooks` can reach LIVE maturity from data that has no causal relationship to whether a dedicated internal hook is wired.

---

## 2. What Counts as a Real Internal TSOS Hook

A **real BuilderOS-internal TSOS hook** must meet all of the following:

1. **Named interface** — a named function or route explicitly dedicated to BuilderOS-internal efficiency measurement (e.g., `GET /api/v1/lifeos/builderos/tsos-efficiency` or a `getTSOSHookReading()` call in the governed loop executor)
2. **Called by BuilderOS governed loop** — the hook must be invoked by `builderos-governed-loop-executor.js` or a registered BuilderOS scheduler, not just a route that happens to count telemetry rows
3. **Returns structured BuilderOS data** — response must include fields directly actionable by BuilderOS: token savings, routing efficiency, model substitution rate, or cost-per-build metric
4. **Persisted per-cycle** — each invocation writes a row to a dedicated table (e.g., `builderos_tsos_hook_readings`) or to `autonomous_telemetry_events` with `task_type = 'tsos_internal_hook'`

---

## 3. What Generic Token Telemetry Proves

`autonomous_telemetry_events WHERE total_token_estimate > 0` proves:

- The telemetry pipeline captured council events with token estimates
- Token estimation math ran without error
- At least one AI call was instrumented

It does NOT prove:
- A dedicated TSOS hook was called
- Any efficiency routing decision was made by BuilderOS using TSOS data
- The governed loop reads TSOS data before dispatching a build

---

## 4. Scoring Rule

The alpha readiness service MUST apply this rule:

| Condition | Status | Score |
|-----------|--------|-------|
| No dedicated TSOS hook route or function exists | NOT_WIRED | 0.0 |
| Route exists, not called by governed loop | WIRED | 0.25 |
| Route exists AND called by governed loop at least once | LIVE | 0.5 |
| LIVE + structured efficiency data persisted per-cycle | PROVEN | 0.75 |
| PROVEN + efficiency decisions demonstrably changed routing | ACTIVE | 1.0 |

**Generic token telemetry alone (`total_token_estimate > 0`) cannot elevate status above NOT_WIRED.**

Until a dedicated hook proof source exists, `tsos_internal_hooks` MUST remain NOT_WIRED.

---

## 5. Pass/Fail Checks

- **CHECK-T1:** `GET /api/v1/lifeos/command-center/system-alpha-readiness` — `tsos_internal_hooks.statuses` does NOT include LIVE when only generic telemetry is present
- **CHECK-T2:** `tsos_internal_hooks.runtime_proof[0].source` must cite a dedicated hook endpoint or task_type, not `autonomous_telemetry_events.total_token_estimate`
- **CHECK-T3:** `TSOS_INTERNAL_HOOKS_NOT_WIRED` blocker must be present when no dedicated hook is wired — even if `tsosTokenCount > 0`
- **CHECK-T4:** ALPHA_READY is not possible while TSOS_INTERNAL_HOOKS_NOT_WIRED blocker is present

---

## 6. Required Code Change (BR-09)

In `services/builderos-system-alpha-readiness.js`:

**Phase B.2 block (around lines 139–143):** Replace the `autonomous_telemetry_events WHERE total_token_estimate > 0` query with a check for a dedicated TSOS hook proof.

The simplest honest implementation until a dedicated hook exists:

```
// Dedicated TSOS-internal hook: check for task_type='tsos_internal_hook' events
let tsosHookCount = 0;
try {
  const r = await pool.query("SELECT COUNT(*) FROM autonomous_telemetry_events WHERE task_type = 'tsos_internal_hook'");
  tsosHookCount = parseInt(r.rows[0].count, 10);
} catch {}
```

- If `tsosHookCount = 0` → status = NOT_WIRED, blocker present
- If `tsosHookCount > 0` → status = WIRED (a dedicated hook has fired)
- Token telemetry row count is NOT used as the maturity signal

The `TSOS_INTERNAL_HOOKS_NOT_WIRED` blocker condition must be `tsosHookCount === 0`, not `tsosTokenCount === 0`.

---

## 7. Path to WIRED

To advance `tsos_internal_hooks` from NOT_WIRED to WIRED:

1. Create a dedicated task_type `tsos_internal_hook` that BuilderOS emits when it queries efficiency data before a build dispatch
2. Emit at least one `autonomous_telemetry_events` row with `task_type = 'tsos_internal_hook'`

This is the minimum viable proof surface. No product UI required. No customer-facing TSOS feature required.

---

## 8. TSOS-G3 routing decision log (cross-reference)

**G3.1–G3.2 (shadow):** `builderos_tsos_routing_decisions` table + `GET /api/v1/lifeos/builderos/tsos-routing-decisions`.

- **ACTIVE proof** requires rows with `mode='active'` AND `decision_changed=true` — shadow rows do **not** count.
- **Hook count alone** cannot elevate to ACTIVE (§4 scoring rule unchanged).
- G3.2 comparator captures baseline policy path inputs for future routing delta proof — see `docs/projects/TSOS_PROVEN_ADVANCEMENT_PLAN.md` §9.
- **G3.3 (shadow):** `hypothetical_*` fields in `comparator_snapshot_json` record what TSOS **would** change; `decision_changed` on actual dispatch remains `false` until G3.4+ active mode with ACTIVE gate proof.
