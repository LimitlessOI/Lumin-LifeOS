<!-- SYNOPSIS: BuilderOS governance repair blueprint — no-invention, typed gates, durable jobs, Sentry taxonomy, office coordination. -->

# BuilderOS Governance Repair Blueprint (2026-08-11)

| Field | Value |
|---|---|
| **Product** | `builderos` |
| **SSOT** | `docs/products/builderos/PRODUCT_HOME.md` |
| **Status** | DESIGN CONSENSUS — triple-audited; **manufacturing missions blocked until §17 closures** |
| **Incident source** | Overlay intake session `000146ae-7ed9-4e23-9477-5139603e32f7` + causal audit 2026-08-11 |
| **Regression fixture** | `docs/products/builderos/fixtures/intake-regression-2026-08-11/` (**immutable exam — do not sanitize**) |
| **Authority** | Founder-directed stop on analysis → blueprint before code; ChatGPT/Chair concurrence on scope + pre-implementation triple audit |
| **Redeploy** | **Do not redeploy Railway for docs/fixture-only commits** (runtime unchanged; redeploy adds risk without testing the repair) |

---

## 0. Non-negotiable process rules for this blueprint

1. **No narrow patch.** Do not ship only a `columns: []` guard. The defect class is broader than SQL.
2. **No pre-cleaning Overlay to make the factory look good.** The Overlay blueprint and frozen intake remain ambiguous on purpose until the repaired factory fails closed on them.
3. **Fixture immutability.** Do not gradually sanitize `000146ae-…` (or its on-disk freeze) as fixes land. It must stay unfair in the ways the real world is unfair: missing specificity, stale terminology, identity mismatch opportunities, and misleading-but-structurally-valid material. Updates to the fixture directory are forbidden except (a) adding *additional* expected-defect ids without altering the session bytes, or (b) explicit founder+Conductor written exception naming this section.
4. **No Builder invention of office interaction.** Conductor / Architect / Efficiency Officer / Sentry / Queue relationships are specified here. Builder executes slices only after this document authorizes them.
5. **No manufacturing missions until §17 audit closures are written into this document** and a Conductor (or founder) receipt marks the design freeze. Unit-green without that freeze is not authority.
6. **Code only after this document reaches typed `EXECUTION_AUTHORIZED` under its own rules** (or an explicit founder override naming this file).
7. **Primary acceptance criterion (preserve verbatim — hard to game):**

> **Overlay reaches execution without human nested-JSON rescue.**

8. **Supporting milestone (system capability framing):**

> Can the system receive a mature blueprint, preserve product identity and ratified terminology, refuse to invent unspecified architecture, decompose only under authorized governance, pass correctly typed Architect and Sentry gates, produce no unauthorized decisions, and reach executable slices without Adam having to notice or repair governance drift?

### Architectural transition (do not lose)

**The Overlay is no longer the thing we are trying to get through BuilderOS. The broken Overlay intake is the instrument we use to prove BuilderOS deserves to build the Overlay.**

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
6. **Invalidate** every affected downstream receipt (generated blueprint hashes, ARC statuses, Sentry prebuild, `EXECUTION_AUTHORIZED`).
7. **Revalidate** from the amended authoritative spec (no carrying forward stale greens).
8. **Authorize** only if typed gates are present and current (M2/M3).
9. **Execute** only authorized slices.

Builder never fills the blank. Autofix never invents domain schema, SSOT identity, naming, ownership, or acceptance criteria.

### Full governed manufacturing loop (normative)

Regression / repair harness **passing** means more than detecting the known fixture defects. It must demonstrate the loop — and that resolving known defects does **not** manufacture a fifth (or Nth) unauthorized architectural decision:

> **Detect → classify → route → resolve under proper authority → amend authoritative specification → invalidate affected downstream receipts → revalidate → authorize → execute.**

Every transition leaves a typed receipt (`governance_transition_receipt_v1` — see §17.4). A harness that only asserts `EXPECTED_DEFECTS` fired is **incomplete**.

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

- Frozen session that already invented architecture (`SESSION_000146ae_ready_invented_architecture.json` bytes are the exam)
- `EXPECTED_DEFECTS.json` required detections
- `do_not_execute: true`
- `sha256` in `EXPECTED_DEFECTS.json` must continue to match the session file; CI/harness fails if someone “helps” by editing the session

### 11.2 Rules

1. Do **not** fix Overlay §44a columns / terminology / Sentry registration **for the purpose of** making this regression pass.
2. Do **not** sanitize the fixture as mechanisms land (§0.3).
3. After M1–M5 (+ minimum C1 typing) ship, run:

   - Static analysis of the frozen session → must raise required defect ids  
   - Re-submit the **same amendment file** and same `product_name: universal-overlay` through repaired intake → must end in `spec_incomplete` / typed halt, **not** `execution_authorized`
   - Prove the full loop (§2) on at least one controlled resolve path that **does not invent** a replacement schema (e.g. resolve by writing an explicit non-goal / “reuse existing table X only” amendment — not by generating columns)
   - Assert **no fifth defect**: after resolve+amend+invalidate+revalidate, artifact diff against allowlisted amendment fields must be empty of new architectural specificity (schemas, SSOT paths, office renames, endpoints) except what the authoritative amendment explicitly added

4. Only after regression PASS may Overlay be hardened and re-entered for real manufacture.

### 11.3 Acceptance criterion after Overlay re-entry (verbatim)

> **Overlay reaches execution without human nested-JSON rescue.**

That is the BuilderOS governance-repair acceptance criterion. Individual unit greens are evidence, not the criterion.

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
2. Whether internal scaffold slices may receive `EXECUTION_AUTHORIZED` with `internal_factory_only` without product Sentry registration. **Triple audit recommendation: default NO** — forbid `internal_factory_only` until founder explicitly ratifies a allowlist of file path prefixes; otherwise it is a Sentry bypass.
3. Interim Efficiency Officer: map to existing CFO deliberation hooks vs Conductor-held `efficiency_officer_deferred` until a service exists. **Triple audit recommendation: `efficiency_officer_deferred` + single-factory only** until a real service or explicit founder map exists.

Until answered, implementers must use the defaults marked in this document and label them `DEFAULT_PENDING_FOUNDER` in receipts. Manufacturing missions remain blocked on §17 regardless.

---

## 16. Change control

| Version | Date | Note |
|---|---|---|
| 1.0.0 | 2026-08-11 | Initial governance repair blueprint; analysis stop; fixture frozen; no code |
| 1.1.0 | 2026-08-11 | Chair/GPT concurrence: no Railway redeploy; fixture immutability; full receipted loop + no-fifth-defect; verbatim acceptance criterion; independent triple audit (§17); manufacturing missions blocked until closures |

Independent draft partners agree: **freeze the exam, don't redeploy, attack the blueprint before implementation; broken Overlay intake is the exam; no code until mechanisms exist and §17 is closed.**

---

## 17. Independent triple audit (pre-implementation) — 2026-08-11

Performed against this document before any M1–M5 manufacturing mission. **Verdict: NOT YET CLEAN for manufacturing.** Closures below must be written into this blueprint (this section’s “Closure required” rows) and acknowledged by Conductor/founder before missions are cut.

### 17.1 Builder-view audit — *Where would Builder still have to decide something?*

| # | Decision still forced on Builder / codegen | Severity | Closure required (must be specified here before coding) |
|---|---|---|---|
| B1 | §4.2 list is “at minimum” — Builder decides whether a novel blank field is incomplete | High | Replace with **closed completeness schema**: every contract kind (sql/esm/route/html/script) has a required-field checklist; anything outside the checklist that appears in a generated contract is `ARCHITECTURE_INVENTION_DETECTED` |
| B2 | “Architect proposes write-back” for missing columns can become **invention laundering** (resolve incomplete by drafting schema) | Critical | Write-back allowlist only: (a) cite existing table/columns already in repo scan, (b) mark phase non-goal, (c) ask founder structured gap question. **Forbidden write-back:** inventing new columns/types |
| B3 | `GAP_FLAG` vs omit step — two options | Med | Normative: **omit executable step** + emit defect; `GAP_FLAG` only inside gap records, never inside a step that still carries a filled contract |
| B4 | Mission slicing of M1–M5 (which files, order, how many steps) | High | This blueprint must grow an explicit **mission pack table** (one mission per mechanism or named pairing) with `target_file` list — no “slice as you go” |
| B5 | Terminology stale detection without a machine bridge file | High | Require `docs/products/builderos/RATIFIED_TERMINOLOGY_BRIDGE.json` (or path named here) as the only synonym source; no model-invented synonym lists |
| B6 | File-set overlap algorithm undefined | Med | Overlap = exact `target_file` string equality across concurrent authorized slices; globs forbidden unless expanded to concrete paths in the consensus receipt |
| B7 | Autofix “toward” SSOT binding — how much rewrite | Med | Autofix may only set `ssot_tag`/`parent_ssot`/`_meta.product` to the **exact** session `canonical_ssot` / `product_id` strings; no slug invention |
| B8 | `internal_factory_only` (open Q2) | Critical | Default **forbidden** until founder allowlist exists (§15) |

### 17.2 Technical feasibility — *Can every mechanism be implemented deterministically?*

| Mechanism | Deterministic core? | Notes |
|---|---|---|
| M1 invent detect (empty columns vs filled contract) | **Yes** | Pure JSON compare |
| M1 purpose-only stores | **Only if structured** | Require intent field `persistence_disposition: reuse_existing \| net_new_spec_complete \| deferred_non_goal`; free prose insufficient |
| M4 identity bind | **Yes** | Session columns + equality checks |
| M2 status enum | **Yes** | DB check constraints / app enum |
| M3 hash authorization | **Yes** | sha256 over canonical JSON bytes |
| M5 lease/stale | **Yes** | Timestamps + watchdog; **N = 10 minutes** named constant `GOVERNANCE_JOB_LEASE_STALE_MS = 600000` unless founder changes |
| `ARCHITECT_INTENT_VALIDATED` | **Partial today** | Must split: deterministic fidelity gates are mandatory; any AI fidelity review is advisory and **cannot alone** mint the status |
| C1 `sentry_scope` on receipts | **Yes** | Schema validation |
| C2 office consensus | **Yes if receipt-shaped** | Fail-closed stub returns `coordination_not_built` without auto-approve |

**Feasibility verdict:** M1/M4/M2/M3/M5 cores are implementable deterministically once B1–B8 closures exist. Do not depend on model judgment for authorization.

### 17.3 Adversarial governance audit — *How to comply while smuggling architecture?*

| # | Smuggle path | Required countermeasure |
|---|---|---|
| A1 | Put schema in `purpose`, comments, or `test_assertions` strings | Scan step text fields for SQL-ish column patterns when intent columns empty → `ARCHITECTURE_INVENTION_DETECTED` |
| A2 | `GAP_FLAG` + still-filled `contract.tables` | Any non-empty invented contract with incomplete intent → defect; GAP cannot coexist with filled architectural contract |
| A3 | “Reuse table X” then migration invents new columns under alter | Reuse disposition requires column list ⊆ live `information_schema` / scan snapshot; extras = invention |
| A4 | Split invention across many tiny steps | `assertNoInvention` runs on **whole blueprint**, not per-step isolation |
| A5 | `internal_factory_only` then ship UI under overlay paths | Path allowlist; `public/overlay/**` never internal_factory_only |
| A6 | Stub Conductor auto-approves every route-up | Conductor resolve receipt must cite defect id + allowlisted resolve action; auto-approve stub **forbidden** |
| A7 | Sanitize fixture / weaken EXPECTED_DEFECTS | sha256 pin + §0.3; harness fails on session byte drift |
| A8 | Resolve incomplete by Architect-authored schema (“fifth defect”) | B2 allowlist; harness asserts no new architectural specificity beyond amendment |
| A9 | Keep legacy `ready_to_execute` true from structural path | Alias computed only from `EXECUTION_AUTHORIZED`; structural path cannot write the legacy field |
| A10 | Re-authorize after invalidate without revalidate | M3 mint requires re-running fidelity+sentry gates in-process; no “reissue with same hashes after amend” |

### 17.4 Receipt schema (minimum) — `governance_transition_receipt_v1`

Every loop transition persists:

```json
{
  "receipt_type": "governance_transition_receipt_v1",
  "transition": "detect|classify|route|resolve|amend|invalidate|revalidate|authorize|execute",
  "session_id": "uuid",
  "defect_ids": ["ARCHITECTURE_INVENTION_DETECTED"],
  "jurisdiction": "conductor|architect|efficiency_officer|sentry|system",
  "resolve_action": null,
  "amendment_ref": null,
  "invalidated_receipt_ids": [],
  "artifact_sha256_before": "...",
  "artifact_sha256_after": "...",
  "sentry_scope": null,
  "created_at": "ISO-8601"
}
```

`resolve_action` when present must be one of: `reuse_existing_cite`, `mark_deferred_non_goal`, `founder_gap_answer_applied`, `excise_invented_contract`, `bind_ssot_to_session`, `terminology_bridge_apply`. **Not permitted:** `invent_schema`, `invent_ssot`, `auto_approve`.

### 17.5 Gate to manufacturing missions

| Check | Status after this audit |
|---|---|
| Builder-view clean (no residual Builder decisions) | **FAIL** until B1–B8 closures are edited into §§4–10 |
| Deterministic feasibility | **PASS with conditions** (AI fidelity advisory-only; structured persistence_disposition) |
| Adversarial counters specified | **PASS as design** once A1–A10 are treated as normative requirements (they are, via this section) |
| Fixture frozen + sha256 pinned | **PASS** (do not redeploy; do not sanitize) |
| M1–M5 manufacturing missions authorized | **NO** |

**Next step (still not code):** close B1–B8 in-document (explicit checklists, write-back allowlist, mission pack table, terminology bridge path, constants). Then Conductor/founder design-freeze receipt. Only then cut missions.
