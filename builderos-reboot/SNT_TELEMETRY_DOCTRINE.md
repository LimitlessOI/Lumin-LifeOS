# SNT Telemetry Doctrine — BuilderOS Alpha

**Signed by:** SNT  
**Status:** Locked principle for Alpha  
**Companion:** `SNT_EPISTEMIC_LANGUAGE.md`, `ALPHA_MISSION_TELEMETRY_CONTRACT.json`

---

## The third option

Many engineering organizations believe there are only two options:

1. Measure almost nothing.
2. Measure absolutely everything.

**BuilderOS Alpha chooses a third option:**

> **Measure everything that materially affects truth, quality, cost, speed, or safety.**

Do not track every nail. Track every structural beam.

For a founder with limited budget, exhaustive per-nail telemetry burns money and drowns the signal. Alpha targets **80–90% of forensic value at 5–10% of the cost** by measuring beams, not nails — unless investigation mode is explicitly activated.

---

## Measurement doctrine

| Category | Default |
|----------|---------|
| **Always measure** | Truth, quality, cost, time, safety |
| **Sometimes measure** | Detailed execution traces, internal AI reasoning, every state transition |
| **Never measure by default** | Everything forever |

**Why:** Permanent full-fidelity logging is how you burn money and lose the ability to see what matters.

---

## Tier 1 — Mandatory (never skip)

These fields can cause **fake-green**, **drift**, **wasted money**, or **bad decisions** if missing.

**Required on every mission:**

| Field | Question it answers |
|-------|---------------------|
| `mission_id` | Which mission? |
| `blueprint_version` | Which frozen plan? |
| `actor` | Who performed work? (Builder, SENTRY, BPB, CDR, Conductor, …) |
| `model_used` | Which model? |
| `commit_sha` | What code state? |
| `files_changed` | What was touched? |
| `tests_added` | What proof was added? |
| `tests_passed` | What ran green? |
| `tests_failed` | What ran red? |
| `deployment_sha` | What is live? |
| `acceptance_status` | Did acceptance criteria pass? |
| `sentry_verdict` | What did inspection say? |
| `cost_estimate` | What did it cost ($)? |
| `token_estimate` | What did it cost (tokens)? |
| `time_spent_ms` | How long did it take? |

**Analogy:** Which beam was installed, by whom, and did inspection pass?

This tier is the **Alpha telemetry contract**. It must exist on every mission before chasing Mission Forensics or TelemetryOS.

Machine-readable schema: `ALPHA_MISSION_TELEMETRY_CONTRACT.json`.

---

## Tier 2 — Required for production features

Once building **actual products** (not factory spine / harness missions), add **outcome** telemetry — not every API call.

**Example — Conversation Commitments v1:**

| Outcome metric | Why |
|----------------|-----|
| Commitments created | Usage |
| Commitments completed | Value delivered |
| Commitments missed | Quality / reliability |
| Reminder success rate | Feature health |
| Storage cost | Operate cost |
| AI extraction accuracy | Truth / quality |

**Rule:** Track outcomes. Do not track every API call by default.

---

## Tier 3 — Investigation mode (temporary only)

Enable when something looks wrong — e.g. SENTRY finds a load-bearing downgrade, fake-green suspicion, or unexplained drift.

**Forensic mode may include:**

- Every query
- Every validator invocation
- Every state transition
- Every deployment event

This is **track every nail** mode.

**Constraints:**

- Time-bounded (mission-scoped or incident-scoped)
- Explicitly activated (not default)
- Must produce a receipt explaining why full fidelity was needed
- Must deactivate when root cause is identified

---

## The nine questions (Alpha exit bar)

Every mission must answer these consistently. If all nine are answered with evidence, Alpha has captured most of the value of exhaustive tracking.

| # | Question | Maps to |
|---|----------|---------|
| 1 | What was requested? | Founder packet / intake |
| 2 | What was built? | Files changed, commit SHA |
| 3 | Who built it? | Actor + model |
| 4 | What did it cost? | Cost + token estimates |
| 5 | How long did it take? | Time spent |
| 6 | What evidence proves it works? | Tests passed, mechanical receipts |
| 7 | What evidence proves it is safe? | SENTRY verdict, governance gates |
| 8 | What remains unknown? | Honest gaps, THINK/GUESS labeled |
| 9 | Should we do it again? | Repeatability / determinism receipt |

**Artifact:** Missions should emit or update `MISSION_TELEMETRY_RECEIPT.json` (see contract JSON) at phase boundaries — BPB freeze, SENTRY audit, CDR complete, deploy verify.

---

## Relationship to epistemic language

Telemetry and verdict language serve the same goal: **truth, not green status.**

| Telemetry principle | Epistemic principle |
|--------------------|---------------------|
| Tier 1 never skipped | No fake-green without beam-level receipt |
| Tier 3 temporary only | Forensics is investigation, not default |
| `tests_failed` recorded honestly | FAIL is feedback, not defeat |
| `what_remains_unknown` required | Evidence gap identified > unsupported PASS |
| Outcomes over API calls (Tier 2) | Measure structural beams, not every nail |

See `SNT_EPISTEMIC_LANGUAGE.md`.

---

## What BuilderOS is missing (not more logs)

**A telemetry doctrine** — the system must know *what* to measure *when*, not *everything* all the time.

**Alpha priority order:**

1. **Tier 1 contract on every mission** ← current gap (e.g. `SENTRY_CHECK_RESULT.json` for BP audit)
2. Tier 2 when shipping product features
3. Tier 3 only on SENTRY escalation or incident
4. Full Mission Forensics / TelemetryOS — **after** Tier 1 is habitual

---

## Current state assessment (SNT observation)

Based on deliberation SENTRY regression mission and platform work to date:

| Signal | Assessment |
|--------|------------|
| Governance rejecting bad runners | Tier 1 **safety** partially proven |
| No mechanical `SENTRY_CHECK_RESULT.json` | Tier 1 **truth** gap — evidence not yet established |
| Builder audit emits token estimates | Tier 1 **cost** partially wired (platform) |
| Nine questions answerable from mission pack | **Partial** — intake strong, mechanical receipt weak |
| Per-nail forensic logging | **Not needed yet** — would distract from beam contract |

**Conclusion:** BuilderOS Alpha is **closer to needing the Tier 1 / nine-questions contract** than it is to needing exhaustive per-nail tracking. Ship trustworthy beam-level receipts first.

---

## Enforcement (locked 2026-06-10)

Tier 1 is **mechanically enforced** for missions flagged in `MISSION_QUEUE.json` (`telemetry_enforcement: true`) or in an active debug/BP audit status.

| Mechanism | Behavior |
|-----------|----------|
| `npm run factory:tier1:verify` | Fail-closed (exit 1) if Tier 1 incomplete |
| `npm run factory:tier1:report` | Report only — writes `TIER1_CHECK_RESULT.json` |
| `factory-ci.mjs` | Includes `tier1_telemetry_enforced` step |
| `run-mission-observe.mjs` | Regression mission observe fails if Tier 1 incomplete |

**Loop rule:** If Tier 1 fails → mission stays in loop until `MISSION_TELEMETRY_RECEIPT.json` satisfies all beams + nine questions. Then SENTRY mechanical receipt must exist. Honest FAIL routes to BPB.

**Spend visibility:** `npm run factory:spend:snapshot` → `builderos-reboot/MISSION_SPEND_SNAPSHOT.json`

Scripts: `builderos-reboot/scripts/tier1-telemetry-lib.mjs`, `verify-tier1-telemetry.mjs`, `emit-mission-spend-snapshot.mjs`

---

## Spend buckets (never conflate volume with value)

Raw token totals **must not** be reported as learning or ROI. Split into:

| Bucket | Meaning |
|--------|---------|
| `idle_churn_tokens` | Queue idle, verify-gap churn, low `useful_work_score` — standing activity, not mission value |
| `mission_attributed_useful_tokens` | Matched mission keywords + `useful_work_score` ≥ 0.5 + success or honest fail receipt |
| `paid_railway_tokens` | Non-free-tier model usage on Railway (when routed to paid) |
| `unknown_external_tokens` | Cursor, Claude/OpenAI direct, human supervision — **explicitly unknown** until wired |

**Free-tier routing:** Free-tier models (e.g. gemini_flash) are **first priority daily** for tasks they fit. That is cost discipline, not “we only use free.” Paid when task class requires it.

**Q8 — What remains unknown (standing list):**

- Cursor / Conductor usage
- Claude / OpenAI outside BuilderOS
- Human supervision time
- Opportunity cost
- Idle churn vs useful split on full DB (API sample undercounts)

See `MISSION_SPEND_SNAPSHOT.json` → `spend_buckets`.

---

## Related doctrines (Alpha governance stack)

- `SNT_LOOP_ESCALATION_DOCTRINE.md` — signature-weighted 3/5/8, failure packet
- `SNT_CAPSULE_HAT_DOCTRINE.md` — model vs hat vs REP vs workbench
- `SNT_GOLD_MINING_DOCTRINE.md` — 25+ diverge, weekly slot + skip gate


---

## For Cursor / Conductor

When reporting mission status, include Tier 1 gaps explicitly:

```text
Telemetry: Tier 1 incomplete — missing sentry_verdict receipt (SENTRY_CHECK_RESULT.json)
Doctrine: Measure beams not nails; FAIL with evidence satisfies truth requirement
Next: Emit MISSION_TELEMETRY_RECEIPT.json at BP audit exit
```

Do not propose full Mission Forensics until Tier 1 is satisfied on consecutive missions.
