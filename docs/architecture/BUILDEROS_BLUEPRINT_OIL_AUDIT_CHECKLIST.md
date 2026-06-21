<!-- SYNOPSIS: BUILDEROS BLUEPRINT OIL AUDIT CHECKLIST -->

# BUILDEROS BLUEPRINT OIL AUDIT CHECKLIST

**Status:** `LIVE — run against each phase before commit`
**Owner:** OIL / CAI
**Verifier:** BuilderOS runtime truth
**Last Updated:** 2026-05-25
**Purpose:** Verify every BuilderOS blueprint artifact and each build phase output before accepting as complete. Run before marking any phase PROVEN or ACTIVE.

---

## How to Use This Checklist

Before completing any BuilderOS build phase:

1. Run the checklist against the output of that phase
2. Every ✅ must be confirmed with runtime evidence or file inspection
3. Every ❌ is a blocker — do not proceed to next phase
4. Document the checklist run result in the phase's Change Receipt

---

## Section 1 — LifeOS / TSOS Product Drift

Verify the phase output does not contaminate BuilderOS with product concerns.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| No LifeOS user feature code | Phase output contains only BuilderOS-internal components | Route/service added for TC, coaching, family, wellness, or consumer UX |
| No TSOS customer-facing code | Any TSOS reference is BuilderOS-internal token efficiency only | Phase output touches gateway, proxy, decoder packets, savings ledger, or customer-facing TSOS UI |
| No product scoring | Alpha score change is from BuilderOS runtime proof only | Alpha % increased due to LifeOS feature shipping or TSOS product work |
| No LifeOS feature as proof source | `GET /api/v1/lifeos/command-center/system-alpha-readiness` proof sources unchanged or only BuilderOS sources added | New proof source is a LifeOS product route |

---

## Section 2 — Fake Alpha Inflation

Verify the phase does not falsely increase Alpha score.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| No hardcoded scores | All numeric values in scoring functions computed from live runtime queries | Literal number substituted for computed metric (e.g., `const x = 0.321`) |
| No stub code counted as PROVEN | A component earns PROVEN only from runtime receipts or logs | File exists and imports correctly → classified PROVEN with no execution evidence |
| No docs raising maturity | Blueprint or amendment files do not change component status in readiness service | SSOT doc update causes component to appear more mature in `system-alpha-readiness` response |
| No route existence = health | Component is LIVE only if its canonical endpoint responds 200 with non-empty data | Component marked LIVE because its route file exists in routes/ directory |
| Useful-work score from live data | `useful_work_score_live` from `system-alpha-readiness` comes from `autonomous_telemetry_events` query | Score is defaulted, mocked, or sourced from JSONL instead of Neon DB |

---

## Section 3 — Runtime Proof Sources Defined

Verify that any newly created capability has a defined proof source.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| Approved proof source exists | New component has at least one entry in the approved proof source list | New component is LIVE but has no listed proof source |
| Proof source is a real runtime query | Proof source is an API endpoint or file that can be verified by calling it now | Proof source is a doc reference, SSOT text, or manifest entry |
| Proof source is accessible | `curl -s <proof_source> -H "x-command-key: $KEY"` returns 200 with expected shape | Proof source returns 401, 404, 500, or malformed JSON |
| No local-only proof | Proof source returns real data from Railway's Neon DB | Proof source returns data from local DB that doesn't match Railway production |

---

## Section 4 — Scoring Formula Integrity

Verify the Alpha scoring formula is honest.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| Loop integrity score is 40% weight | `loop_integrity_weight_pct: 40` in response | Weight changed without documented reason |
| Component maturity score is 60% weight | `component_maturity_weight_pct: 60` in response | Weight changed without documented reason |
| Maturity scale is NOT_WIRED/WIRED/LIVE/PROVEN/ACTIVE | `component_scale: {NOT_WIRED: 0, WIRED: 0.25, LIVE: 0.5, PROVEN: 0.75, ACTIVE: 1}` in response | Scale values changed |
| Useful-work bonus requires > 0.50 avg | Bonus only applied when `avg_useful_work_score > 0.50` over rolling 7-day window | Bonus applied with less evidence or fixed amount |
| Docs cannot raise maturity | `docs_do_not_raise_runtime_maturity: true` in scoring_method response | Field missing or false |
| NO_DATA is honest | When no scored events exist, useful_work_score_live is null and source is "NO_DATA" | Default value or fallback score substituted |

---

## Section 5 — Classification States Defined

Verify all status vocabulary is used correctly in any new or modified component.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| WIRED means code connected | Component is WIRED only when code exists, is imported, and is reachable | WIRED applied to a file that exists but is not imported |
| LIVE means endpoint responds | Component is LIVE only when its canonical endpoint returns 200 | LIVE applied because route file exists in routes/ |
| PROVEN means receipts exist | Component is PROVEN only when builder_audit_receipts, security_receipts, or telemetry events show real execution | PROVEN applied because documentation says it works |
| ACTIVE means operating in cycles | Component is ACTIVE only when it executes in scheduled/live cycles and this is visible in logs or state files | ACTIVE applied to a component that was invoked once manually |
| Multi-status is accurate | A component may hold multiple statuses (e.g., WIRED+LIVE+PROVEN) only when each is independently verified | Status bundle claimed without verifying each level |

---

## Section 6 — Legacy Quarantine

Verify the phase does not break legacy quarantine rules.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| No deletion before classification | Phase output does not delete any route, service, or endpoint | Phase removes a file or route without it being classified in BUILDEROS_CLASSIFICATION_LOCK.md |
| No deletion before canonical replacement | If a legacy route is retired, its canonical replacement is LIVE before deletion | Legacy route deleted while callers would receive 404 |
| Legacy surfaces still inventoried | `routes/command-center-routes.js` header still contains 27-route inventory if file is touched | Legacy route inventory removed or moved without replacement |
| Legacy gate is intact | `services/autonomy-scheduler.js` still requires `LEGACY_SCHEDULER_ENABLED=true` opt-in | Gate condition changed or removed |

---

## Section 7 — Useful-Work-Guard Coverage

Verify new scheduled or background AI calls are guarded.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| All new scheduled AI calls use guard | Every new `setInterval` or cron wrapping a council call goes through `createUsefulWorkGuard()` | Scheduled AI call added without guard |
| Guard has non-empty prereqs | `prerequisites` array checks at least one env var or credential | Guard created with empty prerequisites |
| Guard has real workCheck | `workCheck` executes a DB query to confirm real work exists | Guard workCheck always returns true or is omitted |
| Guard has meaningful purpose | `purpose` string describes what actionable output the call produces | Purpose is generic ("run the thing") |

---

## Section 8 — Memory Authority

Verify memory write and read paths are canonical.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| Memory writes go through canonical writer | All new memory writes use `writeRepairMemoryFromExecution()` from `services/self-repair-memory.js` | Memory written directly to epistemic_facts or other table |
| Memory reads use priority order | Read path tries self_repair_memory_events first, then JSONL, then epistemic_facts | Read path skips canonical table or uses hardcoded fallback |
| No memory fabrication | Lessons written only after real execution with real outcome | Memory lesson written for a dry-run or hypothetical without evidence |

---

## Section 9 — Telemetry Authority

Verify telemetry is written and read through canonical paths.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| Telemetry writes go to canonical store | All new telemetry writes go through `emitAutonomousTelemetry()` from `services/autonomous-telemetry-service.js` → `autonomous_telemetry_events` table | Telemetry written to separate table or file outside canonical system |
| No duplicate rows for same cycle | Each session cycle produces at most one telemetry row | Inner emitter AND outer session emitter both fire for same cycle (duplicate row) |
| session_id and cycle_id are linked | Telemetry rows from the same session share `session_id`; rows from the same cycle share `cycle_id` | Rows missing session/cycle linkage (cannot trace execution chain) |
| Useful-work-score is computed | `useful_work_score` field populated with computed value, not null, for all productive cycles | Score is null for cycles that produced verifiable outcomes |

---

## Section 10 — Rollback / Rewind Path

Verify rollback capability is preserved.

| Check | Pass Condition | Fail Condition |
|---|---|---|
| No irreversible changes | Phase output can be reverted with `git revert` | Phase deletes data, drops tables, or removes canonical routes with no replacement |
| Component rewind is targeted | Phase documents which component it affects and what a rewind would look like | Phase affects multiple components with no rewind isolation plan |
| Last known good commit is recorded | Phase Change Receipt includes the commit SHA that represents the last known good state of affected components | No commit SHA recorded — cannot rewind to known good state |
| Receipts exist after phase | After phase completion, `builder_audit_receipts` or `security_receipts` contains a new receipt for the phase work | Phase completed with no receipt written |

---

## Section 11 — Structural Integrity (Full Checklist)

Run after any phase that touches routes, services, or startup files.

```bash
# Syntax check all changed JS files
node --check <changed_file_1>
node --check <changed_file_2>

# Verify builder preflight still passes
npm run builder:preflight

# Verify proof freshness is still CURRENT after deploy
curl -s "$PUBLIC_BASE_URL/api/v1/lifeos/command-center/proof-freshness" \
  -H "x-command-key: $COMMAND_CENTER_KEY" | grep -q '"overall":"CURRENT"'

# Verify readiness still true
curl -s "$PUBLIC_BASE_URL/api/v1/lifeos/command-center/supervised-autonomy/readiness" \
  -H "x-command-key: $COMMAND_CENTER_KEY" | grep -q '"ready_for_supervised":true'

# Verify repair queue still 0
curl -s "$PUBLIC_BASE_URL/api/v1/lifeos/command-center/supervised-autonomy/readiness" \
  -H "x-command-key: $COMMAND_CENTER_KEY" | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(j.repair_queue_open === 0 ? 0 : 1)"

# Verify system-alpha-readiness still responds
curl -s -o /dev/null -w "%{http_code}" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/command-center/system-alpha-readiness" \
  -H "x-command-key: $COMMAND_CENTER_KEY"
# Expected: 200
```

---

## Phase Audit Summary Template

Use this template in every Change Receipt:

```
OIL AUDIT — Phase <X> — <Date>
Section 1 (LifeOS/TSOS drift): PASS / FAIL — <evidence>
Section 2 (Fake Alpha inflation): PASS / FAIL — <evidence>
Section 3 (Proof sources defined): PASS / FAIL — <evidence>
Section 4 (Scoring formula): PASS / FAIL — <evidence>
Section 5 (Classification states): PASS / FAIL — <evidence>
Section 6 (Legacy quarantine): PASS / FAIL — <evidence>
Section 7 (Useful-work-guard): PASS / FAIL — <evidence>
Section 8 (Memory authority): PASS / FAIL — <evidence>
Section 9 (Telemetry authority): PASS / FAIL — <evidence>
Section 10 (Rollback path): PASS / FAIL — <evidence>
Section 11 (Structural integrity): PASS / FAIL — node --check PASS, proof CURRENT, readiness true, repair_queue 0, alpha-readiness 200
Overall: PASS / FAIL
Blockers found: <list or none>
```

---

## Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-05-25 | File created | OIL Audit Checklist established for BuilderOS blueprint governance. 11 sections covering: LifeOS/TSOS drift, fake Alpha, proof sources, scoring, classification, legacy quarantine, useful-work-guard, memory, telemetry, rollback, structural integrity. GAP-FILL: builder safe-scope blocks docs/ directory. |
