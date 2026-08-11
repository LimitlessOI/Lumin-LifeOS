<!-- SYNOPSIS: BuilderOS governance repair blueprint — no-invention, typed gates, durable jobs, Sentry taxonomy, office coordination. -->

# BuilderOS Governance Repair Blueprint (2026-08-11)

| Field | Value |
|---|---|
| **Product** | `builderos` |
| **SSOT** | `docs/products/builderos/PRODUCT_HOME.md` |
| **Status** | DESIGN CONSENSUS — **not authorized for partial coding** |
| **Incident source** | Overlay intake session `000146ae-7ed9-4e23-9477-5139603e32f7` + causal audit 2026-08-11 |
| **Regression fixture** | `docs/products/builderos/fixtures/intake-regression-2026-08-11/` |
| **Authority** | Founder-directed stop on analysis → blueprint before code; ChatGPT/Chair concurrence on scope |

---

## 0. Non-negotiable process rules for this blueprint

1. **No narrow patch.** Do not ship only a `columns: []` guard. The defect class is broader than SQL.
2. **No pre-cleaning Overlay to make the factory look good.** The Overlay blueprint and frozen intake remain ambiguous on purpose until the repaired factory fails closed on them.
3. **No Builder invention of office interaction.** Conductor / Architect / Efficiency Officer / Sentry / Queue relationships are specified here. Builder executes slices only after this document authorizes them.
4. **Code only after this document reaches typed `EXECUTION_AUTHORIZED` under its own rules** (or an explicit founder override naming this file).
5. **Milestone definition (GPT/Chair, adopted):**

> Can the system receive a mature blueprint, preserve product identity and ratified terminology, refuse to invent unspecified architecture, decompose only under authorized governance, pass correctly typed Architect and Sentry gates, produce no unauthorized decisions, and reach executable slices without Adam having to notice or repair governance drift?

---

## 1. Incident summary (why this blueprint exists)

### What happened

Overlay consensus blueprint was submitted via real backfill intake. Intent extraction left store columns empty (honest). Blueprint generation filled invented SQL contracts. `_meta` invented a competing product home from the document title. ARC set `ready_to_execute: true` via structural validation only. Real execute was held after dry-run inspection. A prior session stuck forever at `generating` after redeploy killed the in-memory worker.

### Constitutional contradiction found in live code

| Stage | File / prompt | Instruction |
|---|---|---|
| Intent extract | `INTENT_EXTRACT_SYSTEM` in `services/blueprint-intake.js` | Do not invent; use UNKNOWN if missing |
| Blueprint gen | `BLUEPRINT_GEN_SYSTEM` in same file | Contracts must be complete / mechanical — **forces invention when upstream is incomplete** |
| ARC | `runArcReview` prompt + `_validateBlueprintStructure` | Graph shape only; still emits `ready_to_execute` |
| Executor | `services/intake-blueprint-executor.js` | Gates on session `ready` + `ready_to_execute` |

### Offices that did not get a veto

Conductor did not review generated architecture. Architect ran a mis-scoped structural pass labeled as execute readiness. Efficiency Officer was irrelevant (no parallel attempt). Product Sentry was never in the path (`universal-overlay` absent from `SENTRY_PRODUCT_REGISTRY.json`). Queue would have mechanically executed invented SQL if execute had been allowed.

---

## 2. Constitutional law this repair encodes

> **The queue may decompose, schedule, and execute explicit blueprint instructions. It may not complete missing architecture by invention. Missing specification is a blueprint defect, not permission to improvise.**

### Upward-routing law (generalized — not SQL-only)

When architectural specificity is unresolved:

1. **Detect** the incompleteness deterministically (prefer) or with a typed AI finding that cites the blank field.
2. **Stop** that slice — emit a typed defect code (see §4).
3. **Route upward** to the office with jurisdiction (see §8).
4. **Resolve** by that office (or founder when jurisdiction requires it).
5. **Write back** into the authoritative blueprint / intent record.
6. **Only then** allow the slice downstream.

Builder never fills the blank. Autofix never invents domain schema, SSOT identity, naming, ownership, or acceptance criteria.

---

## 3. Scope of this blueprint — five mechanisms + two companion specs

### Mechanism pack (must be fully specified before any of them is coded)

| ID | Mechanism | One-line job |
|---|---|---|
| M1 | Generalized no-invention enforcement | Incomplete specificity → typed halt + upward route |
| M2 | Typed gate authority | Replace overloaded green lights with scoped statuses |
| M3 | Positive current execution authorization | Execute only with fresh, typed `EXECUTION_AUTHORIZED` |
| M4 | Immutable canonical identity / SSOT binding | Session product id owns `_meta` and all `ssot_tag`s |
| M5 | Durable governance jobs | Checkpoint, lease, stale→failed, recover across redeploy |

### Companion specs (specified here; may ship as separate missions after M1–M5 design freeze)

| ID | Spec | One-line job |
|---|---|---|
| C1 | Sentry authority taxonomy | One hierarchy; every PASS has typed scope |
| C2 | Conductor–Architect–Efficiency coordination | Decomposition vs resource allocation; queue is mechanical |

**Explicitly out of scope for this repair’s first execute:** manufacturing Taloa Universal Overlay features, renaming Chair→Conductor across the whole repo, implementing Efficiency Officer service body, registering Overlay in Sentry for “done” claims. Those wait for post-regression Overlay re-entry.

---

## 4. M1 — Generalized no-invention enforcement

### 4.1 Defect codes (machine vocabulary)

| Code | Meaning | Default jurisdiction |
|---|---|---|
| `BLUEPRINT_SPEC_INCOMPLETE` | Required architectural field blank / UNKNOWN / empty array where contract would need content | Architect proposes write-back; Conductor confirms intent fidelity |
| `ARCHITECTURE_INVENTION_DETECTED` | Downstream artifact contains specificity absent from authoritative intent/blueprint | Conductor (intent fidelity veto); Architect confirms excision |
| `SSOT_IDENTITY_MISMATCH` | Generated product/SSOT ≠ session canonical product id / home | Conductor |
| `TERMINOLOGY_STALE` | Artifact uses superseded ratified name (As-Is/Target table violated) | Conductor |
| `GATE_SEMANTIC_OVERCLAIM` | A narrow gate set a broader authorization flag | Architect (gate machinery) |
| `PRODUCT_SENTRY_UNAUTHORIZED` | Product completion gate required but product not registered / not passed | Sentry Product Verification Office |
| `GOVERNANCE_JOB_STALE` | Worker dead / lease expired while status non-terminal | Orchestration (system); Conductor notified |

### 4.2 What counts as “unresolved architectural specificity”

At minimum (fail closed — this list is normative for intake + any later generator):

- `db_tables_needed[].columns` empty / missing / `"UNKNOWN"` while a SQL step emits column lists
- Store named by purpose only (Overlay §44a pattern) without explicit “reuse existing table X” or column contract
- Routes/services/endpoints with method/path/`auth` missing while step claims endpoints
- `ssot_tag` / `parent_ssot` / `_meta.product` not equal to session-bound canonical values
- Acceptance criteria that rename offices/products differently from the As-Is / Ratified Target / Migration Bridge table in force
- Ownership / authority fields blank while step claims authority behavior
- Any generator prompt instruction that says “complete the contract so the coder decides nothing” **without** a prior completeness proof

### 4.3 Required behavior

1. After intent extract and after blueprint gen, run `assertNoInvention(intent, blueprint, sessionBinding)`.
2. On failure: set session status to `spec_incomplete` (new) or `gap_collection` with typed defects; **never** `ready`.
3. Do not autofix by inventing columns, paths, names, or ownership.
4. Prompt rewrite: `BLUEPRINT_GEN_SYSTEM` must say: if intent lacks contract detail, emit `GAP_FLAG` / omit the step and surface `BLUEPRINT_SPEC_INCOMPLETE` — **never invent**.
5. Delete or neutralize the contradictory rule “no design decisions left for the coder” when upstream is incomplete. Correct rule: **no design decisions left for the coder *because the blueprint already made them*, or the slice does not exist yet.**

### 4.4 Acceptance tests (M1)

- Fixture `EXPECTED_DEFECTS.json` → `INVENTED_SQL_SCHEMA` and `SSOT_IDENTITY_MISMATCH` detected without human JSON spelunking.
- Unit: empty columns + SQL contract columns → `ARCHITECTURE_INVENTION_DETECTED`.
- Unit: complete columns in intent matching blueprint → pass.
- Prompt contract test: `BLUEPRINT_GEN_SYSTEM` text must not contain an instruction that requires filling unspecified schemas.

---

## 5. M2 — Typed gate authority

### 5.1 Forbid overloaded `ready_to_execute` as sole clearance

Replace (or wrap with hard aliases) the single boolean with scoped statuses. Human-readable names:

| Status | Who sets it | Means | Does **not** mean |
|---|---|---|---|
| `ARC_STRUCTURALLY_VALID` | Architect structural checker | Graph IDs/deps/types/path shape OK | Intent fidelity, no invention, product Sentry, execute OK |
| `ARCHITECT_INTENT_VALIDATED` | Architect + Conductor fidelity pass | Blueprint matches authoritative intent; no invention | Product done; execute OK |
| `SENTRY_PREBUILD_PASS` | Typed Sentry structural/behavioral prebuild (C1) | Prebuild verification for this slice/product scope | Product completion; execute OK alone |
| `EXECUTION_AUTHORIZED` | Positive authorization record (M3) | This session/revision may mutate repo under listed slices | Forever clearance; survives stale rename |

Legacy field `ready_to_execute` may remain only as a **computed alias that is true iff `EXECUTION_AUTHORIZED` is present and current** — never as the raw structural bit.

### 5.2 Session status machine (intake)

`extracting` → `generating` → `arc_review` → `spec_incomplete` | `gap_collection` | `architect_intent_review` → `sentry_prebuild` → `execution_authorized` → `executing` → `completed` | `failed` | `stale_failed`

Forbidden transitions:

- `arc_review` → `ready` based only on structural validity
- Any path to `executing` without `EXECUTION_AUTHORIZED`

### 5.3 Acceptance tests (M2)

- Structural-only pass produces `ARC_STRUCTURALLY_VALID` and does **not** set `EXECUTION_AUTHORIZED`.
- Executor rejects sessions that only have structural validity.
- API/docs never return a lone `ready_to_execute: true` without accompanying typed statuses.

---

## 6. M3 — Positive, current execution authorization

### 6.1 Authorization record shape

```json
{
  "authorization_id": "uuid",
  "session_id": "uuid",
  "product_id": "universal-overlay",
  "blueprint_content_sha256": "...",
  "intent_content_sha256": "...",
  "ratified_terminology_sha256": "...",
  "gates_present": [
    "ARC_STRUCTURALLY_VALID",
    "ARCHITECT_INTENT_VALIDATED",
    "SENTRY_PREBUILD_PASS"
  ],
  "authorized_slice_ids": ["..."] ,
  "authorized_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "authorized_by": "system:execution-authority",
  "invalidated_at": null,
  "invalidate_reason": null
}
```

### 6.2 Freshness / invalidation rules

Invalidate (or refuse to mint) when any of:

- Blueprint or intent bytes change
- Ratified terminology bridge changes (e.g. Steward → Conductor)
- Product id / SSOT binding changes
- Required gate revoked
- Lease expired / job stale
- Founder or Conductor explicit revoke

### 6.3 Executor rule

`intake-blueprint-executor` (and any ship path using intake blueprints) requires:

1. Session status `execution_authorized` (or equivalent)
2. Valid, unexpired authorization record whose hashes match current session artifacts
3. Step id ∈ `authorized_slice_ids`

Dry-run may inspect without authorization; **mutation requires it**.

### 6.4 Acceptance tests (M3)

- Fixture session cannot mint `EXECUTION_AUTHORIZED`.
- Hash change after authorize → execute fails closed.
- Terminology bridge update → prior authorization invalid.

---

## 7. M4 — Immutable canonical identity / SSOT binding

### 7.1 Binding source of truth

At session create (`startBackfill` / greenfield):

- `product_id` = request `product_name` resolved against product registry / `docs/products/<id>/PRODUCT_HOME.md`
- `canonical_ssot` = that product home path
- Persist both on the session row; treat as immutable for the session lifetime (adjustment flow = new session or explicit rebind mission)

### 7.2 Enforcement

- Intent extract may propose a display title, but **must not** override `product_id`
- Blueprint `_meta.product`, `_meta.parent_ssot`, `_meta.ssot_tag`, and every step `ssot_tag` **must equal** session binding
- Autofix may rewrite *toward* the binding; never away
- Spaces-in-path / title-derived homes are defects (`SSOT_IDENTITY_MISMATCH`)

### 7.3 Acceptance tests (M4)

- Fixture’s invented TALOA path → `SSOT_IDENTITY_MISMATCH`
- Generation with bound `universal-overlay` cannot emit a different product home

---

## 8. M5 — Durable governance jobs

### 8.1 Problem

Backfill/ARC AI work runs in-process. Redeploy kills the worker; status can remain `generating` forever (`b8daa098-5837-4688-b0f0-d5481450f24a`).

### 8.2 Required design

| Primitive | Spec |
|---|---|
| Checkpoint | Persist stage + partial artifacts after each stage (scan, intent, blueprint, arc, fidelity, sentry, authorize) |
| Lease | `worker_id`, `lease_expires_at`, heartbeat interval |
| Stale detection | Scheduler/watchdog: non-terminal + expired lease → `stale_failed` + `GOVERNANCE_JOB_STALE` |
| Recovery | New worker may resume from last checkpoint **or** fail closed and require restart — choose one policy per job type; default for intake: fail closed with restart token (safer than silent resume mid-AI) |
| Visibility | List/API surfaces stale jobs; Chair/Conductor can see them without Railway log diving |

### 8.3 Acceptance tests (M5)

- Simulate dead worker → status becomes `stale_failed` within N minutes (named constant, e.g. 10)
- No session remains `generating` with frozen `updated_at` beyond lease
- Stuck fixture session class is cleaned or migrated by a one-shot repair script authorized by this blueprint

---

## 9. C1 — Sentry authority taxonomy (companion)

### 9.1 Naming drift today (KNOW)

| Colloquial “Sentry” | Real mechanism | Authority |
|---|---|---|
| Factory `SENTRY_FAILED` / behavior_proof | `factory-staging/.../sentry/*` during ship-queue | Step artifact matched step contract |
| SO-002 pre-alpha gate | `scripts/sentry-prealpha-gate.mjs` + `SENTRY_PRODUCT_REGISTRY.json` | Product may be called client-ready / done |

### 9.2 Required hierarchy (names normative)

**Sentry / Product Verification Office**

1. **Sentry Structural Check** — artifact/graph/contract shape  
2. **Sentry Behavioral Proof** — declared behavior assertions  
3. **Sentry Runtime Verification** — live endpoint/deploy truth where required  
4. **Sentry Product Completion Gate** — SO-002 Layer A + Layer B for registered products  

Every PASS receipt must include `sentry_scope` enum matching one of the above. Untyped “Sentry PASS” is forbidden in new receipts.

### 9.3 Intake coupling

- `SENTRY_PREBUILD_PASS` (M2) maps to scopes 1–2 (and 3 when the slice claims runtime).
- `EXECUTION_AUTHORIZED` for client-facing “done” claims additionally requires scope 4 for that product id.
- Unregistered product → `PRODUCT_SENTRY_UNAUTHORIZED` when completion authority is requested; may still get limited internal-scaffold authorization if explicitly scoped as `internal_factory_only` (must be named on the authorization record).

### 9.4 Acceptance tests (C1)

- Registry list does not include `universal-overlay` → fixture cannot claim product completion authorization.
- New receipt schema rejects missing `sentry_scope`.

---

## 10. C2 — Conductor–Architect–Efficiency coordination (companion)

### 10.1 Separation of powers (normative)

| Decision | Offices | Queue role |
|---|---|---|
| What the parts are; deps; file-set non-overlap; recombine point | **Conductor proposes → Architect confirms** | None until consensus receipt exists |
| Whether to spend parallel capacity / multi-factory | **Conductor + Efficiency Officer** | None until consensus receipt exists |
| Dispatch, track, retry mechanical slices | — | **Queue only** |

Queue must not invent splits. Queue must not decide “we have spare compute, parallelize.”

### 10.2 As-Is / Ratified Target / Migration Bridge (offices)

| As-is | Ratified target | Bridge |
|---|---|---|
| Chair (`lumin-chair-orchestrator.js`, etc.) | **Conductor** | “Conductor (formerly Chair)” in docs/UI until rename propagates |
| Architect / ARC structural tools | **Architect** (typed gates per M2) | Structural vs intent validation split |
| CFO / Office of Efficiency (doctrine; Voice Rail seat language) | **Efficiency Officer** | Same role, expanded scope; **no `.js` service required to ratify the coordination law** — interim may map to existing CFO deliberation hooks if present, else Conductor holds resource decisions with explicit `efficiency_officer_deferred` flag until implementation |
| Factory Sentry + Product Sentry | Typed Sentry hierarchy (C1) | Dual name banned in new receipts |

### 10.3 Upward-routing jurisdiction matrix (ties to M1)

| Defect class | First office | Second (confirm) |
|---|---|---|
| Missing schema / contract detail | Architect (spec write-back draft) | Conductor (intent fidelity) |
| Invention detected | Conductor | Architect |
| Identity / SSOT / terminology | Conductor | Architect (path shape) |
| Parallelism / cost / multi-factory | Efficiency Officer | Conductor |
| Product “done” claims | Sentry Product Completion | Conductor |
| Durable job / orchestration failure | System watchdog | Conductor notify |

### 10.4 What must exist before parallel Overlay build

- M1–M5 live enough that invention cannot reach execute
- C2 consensus receipts for any multi-slice parallel plan
- File-overlap check is hard-fail (Architect)
- Efficiency Officer decision recorded (or explicit deferred-single-factory)

### 10.5 Acceptance tests (C2)

- Attempted parallel dispatch without Conductor–Architect consensus receipt → blocked
- Attempted multi-factory without Conductor–Efficiency consensus (or deferred-single) → blocked
- Documented mechanism is a real service/route or an explicit “not built; fail closed” stub — **no silent skip**

---

## 11. Regression fixture protocol (mandatory)

### 11.1 Fixture

`docs/products/builderos/fixtures/intake-regression-2026-08-11/`

- Frozen session that already invented architecture
- `EXPECTED_DEFECTS.json` required detections
- `do_not_execute: true`

### 11.2 Rules

1. Do **not** fix Overlay §44a columns / terminology / Sentry registration **for the purpose of** making this regression pass.
2. After M1–M5 (+ minimum C1 typing) ship, run:

   - Static analysis of the frozen session → must raise required defect ids  
   - Optional: re-submit the **same amendment file** and same `product_name: universal-overlay` through repaired intake → must end in `spec_incomplete` / typed halt, **not** `execution_authorized`

3. Only after regression PASS may Overlay be hardened and re-entered for real manufacture.

### 11.3 Milestone after Overlay re-entry

If Overlay reaches execution without human rescue on nested invention — **that is the BuilderOS factory milestone.**

---

## 12. Implementation order (when coding is later authorized)

| Phase | Work | Depends |
|---|---|---|
| P0 | Land this blueprint + fixture (docs only) | — |
| P1 | M1 + M4 (no-invention + identity bind) — still no Overlay execute | P0 |
| P2 | M2 + M3 (typed gates + authorization records) | P1 |
| P3 | M5 (durable jobs + stale cleanup) | P1 |
| P4 | C1 receipt typing + registry coupling | P2 |
| P5 | C2 coordination receipts (fail-closed stubs OK) | P2 |
| P6 | Regression suite green on fixture + live re-intake halt | P1–P5 |
| P7 | Overlay re-entry through repaired factory | P6 |

**Forbidden:** shipping P1 as “columns empty → stop” without the generalized upward-routing law and identity bind.

---

## 13. Primary code touch targets (for later missions — not to invent beyond this)

| Area | Paths |
|---|---|
| Intake prompts + pipeline | `services/blueprint-intake.js` |
| Execute gate | `services/intake-blueprint-executor.js` |
| Routes | `routes/blueprint-intake-routes.js` |
| Factory step Sentry | `factory-staging/factory-core/sentry/*`, `factory-staging/factory-core/builder/run-step.js` |
| Product Sentry | `builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json`, `scripts/sentry-prealpha-gate.mjs` |
| Conductor | `services/lumin-chair-orchestrator.js` / Chair paths (rename bridge) |
| Tests | `tests/builderos-governance-repair-*.test.js` + fixture-driven suite |

Exact step files belong in a later mission `BLUEPRINT.json` derived from **this** document — Builder must not invent the mission structure beyond slicing what is specified here.

---

## 14. Explicit non-goals

- Do not execute Overlay intake session `000146ae-…`
- Do not implement Efficiency Officer full service in this repair unless C2 cannot fail-closed without a stub
- Do not mass-rename Chair→Conductor across the repo as part of P1–P5
- Do not treat ARC structural green as founder clearance
- Do not score “we didn’t ship the bad artifact” as full factory success

---

## 15. Open questions requiring founder/Chair (not Builder)

1. Default recovery policy for interrupted intake: **fail closed + restart** (recommended here) vs checkpoint resume mid-model-call.
2. Whether internal scaffold slices may receive `EXECUTION_AUTHORIZED` with `internal_factory_only` without product Sentry registration.
3. Interim Efficiency Officer: map to existing CFO deliberation hooks vs Conductor-held `efficiency_officer_deferred` until a service exists.

Until answered, implementers must use the defaults marked in this document and label them `DEFAULT_PENDING_FOUNDER` in receipts.

---

## 16. Change control

| Version | Date | Note |
|---|---|---|
| 1.0.0 | 2026-08-11 | Initial governance repair blueprint; analysis stop; fixture frozen; no code |

Independent draft partners (Cursor causal audit + ChatGPT/Chair concurrence) agree: **blueprint the repair before coding; keep the broken Overlay intake as the exam.**
