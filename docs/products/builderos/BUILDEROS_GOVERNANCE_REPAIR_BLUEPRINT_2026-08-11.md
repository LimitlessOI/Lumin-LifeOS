<!-- SYNOPSIS: BuilderOS governance repair blueprint — no-invention, typed gates, durable jobs, Sentry taxonomy, office coordination. -->

# BuilderOS Governance Repair Blueprint (2026-08-11)

| Field | Value |
|---|---|
| **Product** | `builderos` |
| **SSOT** | `docs/products/builderos/PRODUCT_HOME.md` |
| **Version** | **v1.3.0** (2026-08-11) — adds §21 lifecycle truth audit + `M0` |
| **Status** | **SCOPED FREEZE** — M1–M5 + C1 + C2 design-freeze ready; **`M0` added and ordered first**; end-to-end lifecycle **NOT** freeze-ready (C3/C4 unspecified). Manufacturing blocked on §20 founder/Conductor answers (now OPEN-1…OPEN-7) + design-freeze receipt |
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

**Superseded by §20** — these three questions are restated there as OPEN-1, OPEN-2/OPEN-3 (Q2 resolved: `internal_factory_only` is abolished, not allowlisted — §18.8), and OPEN-5, alongside two new founder-only items. §20 is the live list.

---

## 16. Change control

| Version | Date | Note |
|---|---|---|
| 1.0.0 | 2026-08-11 | Initial governance repair blueprint; analysis stop; fixture frozen; no code |
| 1.1.0 | 2026-08-11 | Chair/GPT concurrence: no Railway redeploy; fixture immutability; full receipted loop + no-fifth-defect; verbatim acceptance criterion; independent triple audit (§17); manufacturing missions blocked until closures |
| 1.2.0 | 2026-08-11 | **B1–B8 closed in-document (§18)** against direct repository inspection: reuse ledger for 11 existing governance mechanisms; six repo-vs-blueprint corrections (R1–R6); closed completeness by `mission_class` + `contract_kind`; citation-only Class A / Class B jurisdiction contract with identifier-containment test; omit-not-flag; `builder_mission_pack_v1` + named mission/target-file table; `RATIFIED_TERMINOLOGY_BRIDGE.json`; overlap algorithm incl. shared registration surfaces; registry-exact autofix; `internal_factory_only` abolished in favor of computed `consequence_class` (this repair is C4); `canonical_json_v1`; named constants; receipt-integrity rule; fixture registered into the existing required harness. Second triple audit (§19) adds A11–A23. Founder-only blockers isolated in §20. **Still no code.** |

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
| Builder-view clean (no residual Builder decisions) | **FAIL at v1.1.0** → **closed in §18 (see §19.1 for the re-audit)** |
| Deterministic feasibility | **PASS with conditions** (AI fidelity advisory-only; structured persistence_disposition) |
| Adversarial counters specified | **PASS as design** once A1–A10 are treated as normative requirements (they are, via this section) |
| Fixture frozen + sha256 pinned | **PASS** (do not redeploy; do not sanitize) |
| M1–M5 manufacturing missions authorized | **NO** |

**Next step (still not code):** close B1–B8 in-document (explicit checklists, write-back allowlist, mission pack table, terminology bridge path, constants). Then Conductor/founder design-freeze receipt. Only then cut missions.

→ **Closures are §18. Second triple audit is §19. Remaining founder-only blockers are §20.**

---

## 18. B1–B8 closures (normative — Builder implements exactly this)

### 18.0 Reuse ledger — mechanisms that already exist (do NOT build parallel systems)

Grounded by direct file inspection 2026-08-11. Every closure below binds to these, per the ARC asset-reuse discipline and the MOVE-DON'T-RENAME rule in `CLAUDE.md`.

| Existing artifact | Schema | What it already owns | How the repair uses it |
|---|---|---|---|
| `docs/products/PRODUCT_REGISTRY.json` | `product_registry_v1` (CANONICAL) | `products[].product_id` + `canonical_home` for 48 products incl. `universal-overlay` → `docs/products/universal-overlay/PRODUCT_HOME.md` | **Sole** identity-binding source for M4/B7. Intake currently never reads it. |
| `builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json` | `gate_enforcement_matrix_v1` | `gates[]` with `gate_id`, `blocker`, `enforcement: HARD\|SOFT\|MANUAL`, `requires[]`, `runtime_module`, `authority_doc` | M2 typed gates are **registered here**, not in a new file. |
| `builderos-reboot/governance/TYPED_BLOCKER_SSOT.json` | `typed_blocker_ssot_v1` — **status LOCKED**, sealed 2026-07-08 | 5 blocker classes + `owner` + `retryable` + `park_default` + `signal_map` | Defect codes must **map onto** these; adding a class requires the sealing authority (§20 OPEN-4). |
| `builderos-reboot/governance/ARTIFACT_ALIAS_REGISTRY.json` | `artifact_alias_registry_v1` | `canonical` / `legacy_aliases` / `owner` / `schema_v1` / `machine_path` per artifact + `naming_migration` map (`BPB→ARC`, `SDO→Studio`) | Precedent + host registration for the terminology bridge (B5); artifact-name aliases stay here. |
| `builderos-reboot/governance/DEPARTMENT_ROLE_CONTRACT.json` | `department_role_contract_v1` | Seats `SNT / CHAIR / CFO / WISDOM / ARC / Builder / Studio / Hist`, each with `role`, `receipts[]`, `required_fields[]`. CFO is **already** titled "Office of Efficiency (Efficiency Officer)" with `legacy_name: "CFO"` | Sole jurisdiction lookup for B2 routing. Seat ids are the machine values; "Conductor" is the ratified display term for seat `CHAIR`. |
| `builderos-reboot/governance/MISSION_PHASE_ARTIFACTS.json` | `mission_phase_artifacts_v1` | Required artifact list per phase + `invariants[]` | Mission Pack completeness (B4) extends this, does not replace it. |
| `builderos-reboot/governance/schemas/INTENT_COVERAGE_MAP.schema.json` | `intent_coverage_map_v1` | `coverage_level` enum `MISSING\|MENTIONED\|PARTIAL\|SUFFICIENT\|LOCKED\|PARKED` + `load_bearing` | Reused verbatim as the completeness vocabulary in B1. No new enum. |
| `builderos-reboot/governance/BUILDEROS_INTAKE_REGRESSION_HARNESS.json` + `scripts/builderos-intake-regression-harness.mjs` + `services/builderos-intake-regression-harness.js` | `builderos_intake_regression_harness_v1` | Registered, **tier: required, status: wired** harness; `npm run builderos:intake:regression:acceptance`; gate `PBG-07` in `scripts/builderos-pre-build-gate.mjs`; also run by `scripts/lifeos-builder-supervisor.mjs` and the builder daemon | The frozen fixture **must be registered here** (§18.9.5). Today it is docs-only and therefore invisible to CI. |
| `config/builder-safe-scope.js` | — | `SAFE_WRITE_PATHS`, `BLOCKED_WRITE_PATHS`, `ROUTE_REGISTRATION_FILE`, `normalizeTargetPath()` | Path normalizer for B6; input to the `consequence_class` table in B8. |
| `scripts/lib/file-placement-gate.mjs` | — | `PROTECTED_SOURCE_PREFIXES`, product-registry-backed `@ssot` enforcement | Second input to the B8 consequence table; already enforces registry-bound ownership on commit. |
| `builderos-reboot/BP_PRIORITY.json` | queue `BP-PRIORITY-0001` | `items[]` with `rank, mission_id, product_id, product_home, product_ssot, founder_packet, blueprint_path, blueprint_status, acceptance_command, receipt_path, verdict` | Mission Pack identity fields (B4) reuse **these field names**. |

**Reuse law for this repair:** a mission that creates a new governance JSON where a row above already has jurisdiction is a **DRIFT VIOLATION** and must be blocked by the Architect, not merged.

### 18.0.1 Repository-vs-blueprint corrections found while closing B1–B8 (blueprint was wrong)

| # | Blueprint said | Repository reality (KNOW) | Correction now normative |
|---|---|---|---|
| R1 | New session statuses (`spec_incomplete`, `architect_intent_review`, `sentry_prebuild`, `execution_authorized`, `stale_failed`) | `db/migrations/20260625_blueprint_intake.sql` has a `CHECK (status IN ('scanning','extracting','generating','arc_review','gap_collection','ready','executing','complete','failed'))`. Every proposed status **violates the live constraint**. Also note live terminal status is `complete`, not `completed` as §5.2 wrote. | M2 mission must ship the named migration in §18.4.3 first; §5.2's `completed` is a typo — canonical is `complete`. |
| R2 | A3: "reuse ⊆ live `information_schema`" | `services/blueprint-codebase-scanner.js` derives `existing_tables` by regexing `CREATE TABLE` out of `db/migrations/*.sql` — **no DB introspection at intake**. `information_schema` querying is proven elsewhere (`scripts/run-lifere-pg-verify.mjs`, `services/lane-intel-service.js`), and `createBlueprintIntakeService(pool, …)` does hold a pool. | Reuse verification uses live `information_schema.columns` when `pool` is present, else the migration-file index, and records which one in `evidence_source`. Never model memory. §18.2.4. |
| R3 | Generator "knows" existing tables | `services/blueprint-intake.js:78-80` truncates the generator's grounding context to `existing_tables.slice(0, 15)`, `existing_services.slice(0, 15)`, `existing_routes.slice(0, 10)` against a repo with 200+ tables. **A generator that cannot see a table will invent it.** | Truncation removed for tables/services/routes in the M1 mission (§18.4.3 step M1-S04); constant `SCAN_CONTEXT_TRUNCATION = none`. |
| R4 | Executor gates on session `ready` + `ready_to_execute` | True **only when the blueprint is loaded from the session**. `services/intake-blueprint-executor.js:486-497` — `if (!resolvedBlueprint) { …status check… }`. Passing `blueprint` inline **skips every gate**, and `services/builderos-intake-regression-harness.js` does exactly that. | Authorization is enforced at the **mutation boundary**, not the load boundary (§18.9.3, attack A12). |
| R5 | `DO_NOT_INVENT.json` implies no-invention is governed | It exists in 12+ mission folders (`do_not_invent_v1`) but is **prose written into a file** by `factory-staging/factory-core/arc/foundation/pre-arc-enrichment.js:53`, and `factory-staging/factory-core/builder/execute-step.js:18` passes `'do_not_invent_patch_plan'` as a *string in a context summary handed to a model*. Nothing reads it as an assertion. | The no-invention rule becomes deterministic code (§18.1/§18.2); `DO_NOT_INVENT.json` is demoted to a human-readable mirror that must be **generated from** the machine contract, never the authority. |
| R6 | "sha256 over canonical JSON bytes" | Undefined — two implementations would disagree and every freshness check would be unreliable. | `canonical_json_v1` defined in §18.9.1. |

---

### 18.1 B1 CLOSED — closed typed completeness by mission class and contract kind

**Unresolved decision being closed:** §4.2 was an "at minimum" list, so Builder decided whether a novel blank field counted as incomplete.
**Jurisdiction:** Architect (mechanical contract shape) — inside this blueprint's authorized scope.
**Decision:** completeness is a **closed set membership test**, evaluated by code, in two layers.

#### 18.1.1 `mission_class` (closed enum — exactly five)

| `mission_class` | Means | Completeness profile |
|---|---|---|
| `product_feature` | Changes what a user/founder can do | `PROFILE_FULL` |
| `internal_factory_mechanism` | Changes how the factory builds/gates | `PROFILE_FULL` (see B8 — no discount) |
| `governance_artifact` | Adds/edits governance JSON, schemas, registries | `PROFILE_GOVERNANCE` |
| `doc_only` | `docs/**` and `*.md` only, no executable target | `PROFILE_DOC` |
| `repair_one_shot` | Single scripted data/state repair, no new capability | `PROFILE_REPAIR` |

`mission_class` is **not** author-declared as authority: it is asserted in the Mission Pack and **cross-checked** against `consequence_class` (§18.8). Mismatch → `MISSION_CLASS_MISCLASSIFIED`, fail closed.

#### 18.1.2 `contract_kind` required/allowed field checklists (closed)

For every step, `contract_kind` is derived from `step.type` + target path (never free choice). A contract is **complete** iff every `required` key is present and non-empty; it is **clean** iff it contains **no key outside `allowed`**. Extra keys are not merely ignored — they are invention evidence.

| `contract_kind` | Derivation | `required` (all must be present) | `allowed` (closed superset) |
|---|---|---|---|
| `sql_migration` | `type=sql` + `db/migrations/**` | `tables[]`, each `{ name, columns[] }` with ≥1 column; every column string matching `^[a-z_][a-z0-9_]*\s+[A-Z]` ; `idempotent: true` | `tables`, `indexes`, `idempotent`, `evidence_source`, `persistence_disposition` |
| `esm_service` | `type=esm` + `services/**` | `factory_signature`, `exports[]` (≥1), `test_assertions[]` (≥1), `consumer_wiring{ file, symbol }` | + `ai_calls`, `env_vars`, `tables_read`, `tables_written` |
| `esm_route` | `type=esm` + `routes/**` | `factory_signature`, `exports[]`, `endpoints[]` each `{ method, path, auth, body[], returns }`, `mount_path` | + `test_assertions`, `env_vars` |
| `esm_script` | `type=esm_script` | `exit_contract{ pass: 0, fail: 1 }`, `assertions[]` (≥1) | + `probes`, `env_vars` |
| `html_overlay` | `type=html` + `public/overlay/**` | `page_title`, `mounted_route`, `interactive_elements[]`, `calls_endpoints[]` | + `design_packet_ref` |
| `json_governance` | target in `builderos-reboot/governance/**` or `docs/products/*/*.json` | `schema_id`, `owner_seat`, `required_keys[]`, `authority_ref` | + `superseded_by`, `legacy_aliases` |
| `md_doc` | `*.md` | `ssot_tag`, `synopsis` | + `sections` |

`consumer_wiring` is required on `esm_service` because of the confirmed 2026-08-08 failure in `CLAUDE.md` (five Communication System missions shipped unit-green services with **zero real callers**). Reachability is part of completeness, not a later opinion.

#### 18.1.3 Completeness of the *intent*, using the existing coverage vocabulary

Intake must emit an `INTENT_COVERAGE_MAP` (existing schema `intent_coverage_map_v1`) for the intake session. Authorization requires: **every dimension with `load_bearing: true` is at `SUFFICIENT` or `LOCKED`.** `MISSING`/`MENTIONED`/`PARTIAL` on a load-bearing dimension ⇒ `BLUEPRINT_SPEC_INCOMPLETE`. `PARKED` requires `parked_reason` **and** a founder/Conductor receipt id.

#### 18.1.4 Failure behavior

Any incomplete-required → `BLUEPRINT_SPEC_INCOMPLETE`. Any key outside `allowed` → `ARCHITECTURE_INVENTION_DETECTED`. Both are HARD, fail closed, session cannot leave the gate, **and the offending step is not emitted** (§18.3). No partial authorization of "the clean steps" in a blueprint that contains a dirty step (see A4 — whole-blueprint scope).

#### 18.1.5 Acceptance tests (B1)

1. `sql_migration` with `tables[0].columns = []` → `BLUEPRINT_SPEC_INCOMPLETE`; no step emitted.
2. `sql_migration` with a `partition_by` key (not in `allowed`) → `ARCHITECTURE_INVENTION_DETECTED`.
3. `esm_service` complete except `consumer_wiring` → `BLUEPRINT_SPEC_INCOMPLETE` (proves the 2026-08-08 class is caught).
4. Coverage map with `load_bearing` dimension at `PARTIAL` → cannot mint `EXECUTION_AUTHORIZED`.
5. Frozen fixture → fires (1) for all 7 Overlay stores **without** a human reading nested JSON.

---

### 18.2 B2 CLOSED — jurisdiction + write-back contract (anti invention-laundering)

**Unresolved decision being closed:** "Architect proposes write-back" allowed the Architect to author the missing schema, which relocates invention rather than preventing it.
**Jurisdiction:** this blueprint may define the *contract*; it may not grant itself new product authority.
**Decision:** Architect resolutions are **citation-only**. Architect may never author new architectural bytes.

#### 18.2.1 The bright line

> **Class A (Architect may resolve):** the answer already exists in a committed artifact and the resolution is a *citation plus a mechanical transformation of it*.
> **Class B (must route to the office/person with authority):** the answer does not exist yet and would have to be **authored**.

Deterministic discriminator — not a judgment call:

```
resolution is CLASS_A  iff  resolve_action ∈ CLASS_A_VERBS
                       AND  evidence_ref resolves to a committed path
                       AND  evidence_sha256 matches that path's current bytes
                       AND  every literal the resolution introduces appears verbatim
                            inside the cited bytes (identifier-level containment check)
otherwise → CLASS_B
```

The containment check is the anti-laundering primitive: if the Architect's proposed text contains a column name, endpoint, term, or path that is **not present in the cited evidence**, it is authored, and the resolution is automatically Class B.

#### 18.2.2 `CLASS_A_VERBS` (closed — exactly seven)

| Verb | Legal use | Required evidence |
|---|---|---|
| `reuse_existing_cite` | Point a store/route/service at an already-existing table/export/route | `information_schema` snapshot row or `db/migrations/**` line, or `services/**` export |
| `bind_ssot_to_session` | Set identity fields to registry values | `docs/products/PRODUCT_REGISTRY.json` entry |
| `terminology_bridge_apply` | Replace a superseded term with its canonical term | `RATIFIED_TERMINOLOGY_BRIDGE.json` entry |
| `excise_invented_contract` | Delete invented specificity (removal only, never replacement) | the artifact diff itself |
| `mark_deferred_non_goal` | Move a slice out of phase — **only when the authoritative doc already names it a non-goal / later phase** | the exact line in the authoritative doc |
| `apply_founder_gap_answer` | Insert a founder answer already written into the authoritative spec | amendment path + sha256 + founder receipt id |
| `order_dependencies` | Reorder or add `deps` between steps that already exist | the steps themselves |

**Forbidden verbs (never valid, from any office except via a founder/Conductor authority receipt):** `invent_schema`, `invent_ssot`, `invent_endpoint`, `rename_term`, `author_acceptance_criteria`, `expand_scope`, `auto_approve`, `waive_gate`.

#### 18.2.3 Class B routing table (jurisdiction — seats are `department_role_contract_v1` ids)

| Class B question | Routes to seat | Cannot be resolved by |
|---|---|---|
| New table/column/type; new persistent data | `CHAIR` (Conductor) proposes → **founder ratifies** if it stores personal/user data; else `CHAIR` + `ARC` consensus | ARC alone |
| New endpoint/method/auth surface | `CHAIR` + `ARC` consensus | ARC alone |
| Any user-visible behavior/UX | `Studio` + `CHAIR`; founder if it changes the product promise | ARC, Builder |
| Naming / renaming anything | **founder** (terminology is founder-ratified; see B5) | any office |
| Acceptance criteria / definition of done | `CHAIR` + `SNT` | ARC, Builder |
| Business policy, pricing, privacy, safety | **founder only** | all offices |
| Scope expansion beyond authoritative doc | **founder only** | all offices |
| Parallelism / spend / multi-factory | `CFO` (Efficiency Officer) + `CHAIR` | ARC, Queue |
| Product "done" claim | `Sentry Product Completion` + `CHAIR` | Builder self-report |

#### 18.2.4 Write-back order (no side channels)

1. Resolution is recorded as a `resolve` receipt naming defect id, verb, evidence, class, and seat.
2. **The authoritative document is amended and committed first** (product home / blueprint `.md` / governance JSON under its owner's jurisdiction).
3. Downstream receipts are invalidated (§6.2), artifacts regenerated from the amended authoritative bytes.
4. Only then may a Mission Pack be minted; it carries `authoritative_refs[]` with paths **and** sha256.

**Side-channel prohibition (deterministic):** Builder's authority surface is **exactly** the Mission Pack manifest. Any instruction reaching Builder that is not (a) a Mission Pack field or (b) a file listed in `authoritative_refs[]` with a matching sha256 **is not authority**, and a step whose dispatch body contains architectural literals absent from those bytes is `ARCHITECTURE_INVENTION_DETECTED` at dispatch time. Chat messages, ARC prose, prompt text, and model suggestions are never authority.

#### 18.2.5 Receipts / invalidation / acceptance (B2)

- Receipts: `resolve` receipt (§17.4) extended with `resolution_class: A|B`, `evidence_ref`, `evidence_sha256`, `seat`, `founder_receipt_id`.
- Invalidation: a Class B resolution without a matching authority receipt invalidates **every** downstream gate for that session and marks the amendment `UNAUTHORIZED_AMENDMENT`.
- Tests: (1) Architect proposes `columns: [user_id UUID]` citing a migration that lacks `user_id` → containment check fails → Class B, blocked. (2) Architect cites the real `blueprint_intake_sessions` migration for an existing column → Class A passes. (3) `mark_deferred_non_goal` where the authoritative doc does **not** name it a non-goal → blocked. (4) Founder answer applied but authoritative doc not yet amended → mint refused.

---

### 18.3 B3 CLOSED — omit, never flag-and-fill

**Decision:** a step that cannot be fully specified **does not exist**.

- Generators emit **no** executable step for incomplete specificity. The gap is recorded only in `gaps_json` / the coverage map / the defect list.
- The token `GAP_FLAG` (or any equivalent placeholder: `TODO`, `TBD`, `UNKNOWN`, `PLACEHOLDER`, `FIXME`, `XXX`) is **forbidden anywhere inside `blueprint_json.steps[]`**, including `purpose`, `task`, `contract.*`, and `test_assertions`. Deterministic regex assertion, case-insensitive.
- A blueprint may be `partial` (fewer steps than the document implies) — that is the correct, honest output. `partial` blueprints may be authorized **only** for the steps present, and the session carries `unbuilt_scope[]` listing what was withheld and why.
- Test: fixture-style intent with 7 under-specified stores → 0 SQL steps emitted, 7 defects, `unbuilt_scope.length === 7`, and no `GAP_FLAG` string anywhere in the artifact.

---

### 18.4 B4 CLOSED — canonical Builder Mission Pack + the actual mission table

#### 18.4.1 `builder_mission_pack_v1` (closed schema — all keys required)

Stored at `builderos-reboot/MISSIONS/<mission_id>/MISSION_PACK.json`. Field names reuse `BP_PRIORITY.items[]` where they overlap.

```json
{
  "schema": "builder_mission_pack_v1",
  "mission_id": "FACTORY-BUILDEROS-GOVERNANCE-REPAIR-M1-0001",
  "mission_class": "internal_factory_mechanism",
  "consequence_class": "C4_AUTHORITY_OR_SAFETY",
  "product_id": "builderos",
  "product_home": "docs/products/builderos/PRODUCT_HOME.md",
  "authoritative_refs": [
    { "path": "docs/products/builderos/BUILDEROS_GOVERNANCE_REPAIR_BLUEPRINT_2026-08-11.md", "sha256": "…", "role": "primary_spec" }
  ],
  "terminology_bridge": { "path": "builderos-reboot/governance/RATIFIED_TERMINOLOGY_BRIDGE.json", "bridge_version": "1.0.0", "sha256": "…" },
  "permitted_scope": { "target_files": ["…"], "allowed_action_types": ["author_then_write"], "sandbox_boundary": ["services/**", "db/migrations/**"] },
  "prohibited_scope": { "target_files": ["server.js", "startup/**", "core/**"], "forbidden_actions": ["delete_file", "modify_auth", "rename_term", "invent_schema"] },
  "dependencies": { "mission_ids": [], "step_order": ["M1-S01", "M1-S02"] },
  "contracts": { "M1-S01": { "contract_kind": "esm_service", "required": {}, "allowed": [] } },
  "required_behavior": [ "…assertion-shaped statements only…" ],
  "governance_receipts": { "design_freeze_receipt_id": "…", "resolve_receipt_ids": [], "consensus_receipt_ids": [] },
  "acceptance_criteria": [ "…" ],
  "acceptance_command": "node scripts/verify-builderos-governance-repair-m1.mjs",
  "verification_requirements": { "sentry_scopes_required": ["structural", "behavioral"], "self_verification_forbidden": true, "verifier_authored_by": "not_builder" },
  "persistence_disposition": "net_new_spec_complete",
  "rollback": { "on_step_fail": "BLOCKED_RETURN_TO_ARC", "revert_strategy": "revert_commit_range", "partial_ship_allowed": false },
  "unresolved_decisions": [],
  "minted_at": "ISO-8601",
  "minted_by": "system:mission-pack-mint",
  "pack_sha256": "…"
}
```

**Hard mint rule (deterministic):** `unresolved_decisions.length === 0` **and** every field above non-empty (except the two arrays legitimately empty: `dependencies.mission_ids`, `unresolved_decisions`) **and** every `authoritative_refs[].sha256` matching current bytes, or the mint is refused with `MISSION_PACK_INCOMPLETE`. A Mission Pack with `unresolved_decisions.length > 0` is a **question**, not a mission, and may not be dispatched.

`persistence_disposition` (closed enum, closes §17.2's condition): `reuse_existing` | `net_new_spec_complete` | `deferred_non_goal` | `none`. `reuse_existing` requires an `evidence_source` naming `information_schema` or the exact migration file; `net_new_spec_complete` requires a complete `sql_migration` contract; `deferred_non_goal` requires the authoritative-doc line; `none` requires zero `tables_written`.

#### 18.4.2 Mission table for this repair (Builder does not choose the slicing)

| Mission id | Mechanism | `consequence_class` | Depends |
|---|---|---|---|
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-M4-0001` | Identity binding (M4/B7) | `C4` | — |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-M1-0001` | No-invention enforcement (M1/B1/B2/B3) | `C4` | M4 |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-M2-0001` | Typed gates + status migration (M2) | `C4` | M1 |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-M3-0001` | Execution authorization records (M3) | `C4` | M2 |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-M5-0001` | Durable governance jobs (M5) | `C2` | M1 |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-C1-0001` | Sentry scope typing (C1) | `C4` | M2 |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-C2-0001` | Coordination receipts, fail-closed (C2) | `C4` | M2 |
| `FACTORY-BUILDEROS-GOVERNANCE-REPAIR-P6-0001` | Regression harness + fixture registration | `C1` | M1–M5, C1, C2 |

`rank` in `BP_PRIORITY.json` is **deliberately unset here** — queue rank is Conductor + Efficiency Officer jurisdiction (§10.1), and Builder may not self-rank. Mint blocks until rank exists.

#### 18.4.3 Exact `target_file` sets (so slicing is mechanical)

| Mission | `target_files` |
|---|---|
| M4 | `db/migrations/20260811_intake_identity_binding.sql`, `services/blueprint-intake-identity.js`, `scripts/verify-builderos-governance-repair-m4.mjs` |
| M1 | `services/blueprint-spec-completeness.js` (closed checklists, §18.1), `services/blueprint-invention-detector.js` (`assertNoInvention`, whole-blueprint), `services/blueprint-intake.js` (prompt rewrite + **M1-S04: remove the `slice(0,15)`/`slice(0,10)` scan-context truncation at lines 78-80**), `scripts/verify-builderos-governance-repair-m1.mjs` |
| M2 | `db/migrations/20260811_intake_governance_status.sql` (widen the `status` CHECK — see R1), `services/governance-gate-registry.js`, `builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json` (register new gates), `scripts/verify-builderos-governance-repair-m2.mjs` |
| M3 | `db/migrations/20260811_execution_authorizations.sql`, `db/migrations/20260811_governance_transition_receipts.sql`, `services/execution-authorization.js`, `services/intake-blueprint-executor.js` (mutation-boundary check, R4), `scripts/verify-builderos-governance-repair-m3.mjs` |
| M5 | `db/migrations/20260811_governance_job_leases.sql`, `services/governance-job-lease.js`, `startup/register-schedulers.js` (watchdog registration), `scripts/verify-builderos-governance-repair-m5.mjs` |
| C1 | `services/sentry-scope-typing.js`, `builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json`, `scripts/verify-builderos-governance-repair-c1.mjs` |
| C2 | `services/office-coordination-consensus.js`, `builderos-reboot/governance/OFFICE_COORDINATION_CONTRACT.json`, `scripts/verify-builderos-governance-repair-c2.mjs` |
| P6 | `builderos-reboot/governance/BUILDEROS_INTAKE_REGRESSION_HARNESS.json` (register negative fixture), `services/builderos-intake-regression-harness.js` (negative-fixture mode), `scripts/verify-builderos-governance-repair-regression.mjs` |

New governance JSON is created only where the reuse ledger shows no existing owner: `RATIFIED_TERMINOLOGY_BRIDGE.json` (B5) and `OFFICE_COORDINATION_CONTRACT.json` (C2). Everything else edits the existing owner.

#### 18.4.4 Acceptance tests (B4)

Mint refused when: any field empty; `unresolved_decisions` non-empty; `authoritative_refs[].sha256` stale; `rank` missing from BP_PRIORITY; `verification_requirements.verifier_authored_by == "builder"`; `mission_class` inconsistent with computed `consequence_class`.

---

### 18.5 B5 CLOSED — deterministic machine terminology bridge

**Path (normative):** `builderos-reboot/governance/RATIFIED_TERMINOLOGY_BRIDGE.json`, schema `ratified_terminology_bridge_v1`, registered as a canonical artifact in `ARTIFACT_ALIAS_REGISTRY.json` in the same mission so two registries never compete. The existing `ARTIFACT_ALIAS_REGISTRY.naming_migration` entries (`BPB→ARC`, `SDO→Studio`, `Vision Discovery→IDC`) are **imported** into the bridge with a `superseded_by` pointer left behind (MOVE-DON'T-RENAME). Artifact *filename* aliases remain in `ARTIFACT_ALIAS_REGISTRY.artifacts[]` — the bridge covers offices, products, and concepts.

#### 18.5.1 Entry shape (all keys required)

```json
{
  "term_id": "office.conductor",
  "canonical_term": "Conductor",
  "former_terms": ["Chair", "Council Chair", "Presiding Steward"],
  "term_scope": "office",
  "machine_seat_id": "CHAIR",
  "ratified_at": "2026-08-11",
  "ratified_by": "founder",
  "evidence_ref": "docs/products/lifeos/conversations/2026-08-11-taloa-blueprint-consensus-and-live-intake-test.md",
  "migration_state": "RATIFIED_NOT_PROPAGATED",
  "code_as_is_identifiers": ["services/lumin-chair-orchestrator.js", "chair", "CHAIR"],
  "compatibility": "dual_accepted",
  "prohibited_in": ["new_founder_facing_text", "new_acceptance_criteria", "new_receipts"],
  "bridge_phrase": "Conductor (formerly Chair)"
}
```

`term_scope` ∈ `office | product | concept | artifact`. `migration_state` ∈ `RATIFIED_NOT_PROPAGATED | PROPAGATING | PROPAGATED`. `compatibility` ∈ `dual_accepted | lookup_only | forbidden`.

Critical distinction that makes this deterministic rather than interpretive: **`code_as_is_identifiers` are exempt** (renaming code is explicitly a non-goal, §14), while `prohibited_in` scopes are enforced. A `former_term` with `compatibility: "forbidden"` may not appear in any *new* artifact of a prohibited scope, ever.

#### 18.5.2 Seed entries (already founder-ratified — evidence in repo, not invented here)

| `term_id` | canonical | former terms | `compatibility` | Note |
|---|---|---|---|---|
| `office.conductor` | Conductor | Chair, Council Chair, **Presiding Steward** | `dual_accepted` for `Chair`; **`forbidden` for `Presiding Steward`** | "Presiding Steward" was a superseded intermediate proposal — this is exactly what makes the fixture's stale terminology machine-detectable |
| `office.efficiency_officer` | Efficiency Officer | CFO, Office of Efficiency | `dual_accepted` | Already half-landed: `DEPARTMENT_ROLE_CONTRACT.json` seat `CFO` carries `legacy_name: "CFO"` and the Efficiency Officer title |
| `concept.digital_imprint` | Digital Imprint | Digital Twin | `dual_accepted` | ~685 live code references; code exempt via `code_as_is_identifiers`; `docs/products/legacy-imprint` already documents the naming architecture |
| `concept.operational_capsule` | Operational Capsule | (none — disambiguating subtype) | `dual_accepted` | Parent term "Capsule" stays; Memory Capsule and REP Capsule are unrelated live meanings |

#### 18.5.3 Detection, freshness, failure

- `TERMINOLOGY_STALE` = case-insensitive whole-phrase match of a `former_terms[]` entry with `compatibility: "forbidden"` inside an artifact whose scope is in `prohibited_in`. Pure string matching — no model.
- The bridge's `bridge_version` + `content_sha256` are carried on every authorization record (§6.1 `ratified_terminology_sha256` = the bridge's canonical hash) and on every Mission Pack. **Bridge change ⇒ all authorizations minted under the prior hash are invalidated** and must revalidate.
- Only the founder may add or change an entry (naming is founder jurisdiction per §18.2.3). An entry added by any office without a founder receipt is `UNAUTHORIZED_AMENDMENT`.
- Tests: (1) fixture acceptance criteria containing "Presiding Steward" → `TERMINOLOGY_STALE`. (2) Bumping the bridge invalidates a previously valid authorization. (3) `services/lumin-chair-orchestrator.js` containing "Chair" does **not** fire (code exemption works). (4) A model-invented synonym not in the bridge is never used by any check.

---

### 18.6 B6 CLOSED — file-set overlap algorithm

Overlap between two concurrently-authorized slices exists iff **any** of:

1. `normalizeTargetPath(a) === normalizeTargetPath(b)` for any pair drawn from `target_file` ∪ `target_files[]` (reuse the normalizer already in `config/builder-safe-scope.js`; it already rejects `..` and leading slashes).
2. Both slices touch a **shared mutable registration surface**. Closed list, repo-grounded: `startup/register-runtime-routes.js` (the single `ROUTE_REGISTRATION_FILE`), `startup/register-founder-runtime-routes.js`, `core/two-tier-system-init.js`, `package.json`, `builderos-reboot/BP_PRIORITY.json`, `builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json`, `docs/products/PRODUCT_REGISTRY.json`, and any single `docs/products/<id>/PRODUCT_HOME.md` — because two parallel slices both appending a Change Receipt row to the same product home is the same git-lock collision as two slices editing one service.
3. Both slices declare a `db/migrations/**` target (migration ordering is globally serial).

Globs are **forbidden** in `target_files`. `sandbox_boundary` may use globs (it is a *restriction*, not a work list); a slice whose work list is empty or glob-only cannot be authorized. Concurrency default is **1** until a Conductor+Architect consensus receipt names the disjoint sets explicitly (§10.1).

Test: two slices both listing `services/blueprint-intake.js` → blocked; two slices editing different services but both auto-wiring a route → blocked by rule 2; two genuinely disjoint slices with a consensus receipt → allowed.

---

### 18.7 B7 CLOSED — autofix identity exactness

Autofix may write **only** these three fields, and only to values read from `docs/products/PRODUCT_REGISTRY.json`:

| Field | Exact value |
|---|---|
| `_meta.product` | `products[].product_id` for the session binding |
| `_meta.parent_ssot`, `_meta.ssot_tag`, every `steps[].ssot_tag` | `products[].canonical_home` verbatim |

Prohibited: deriving any identity string from a document title; slug transformations (title-case, space-stripping, `productFileSlug`-style munging); creating `docs/products/<anything>/` not already in the registry; rewriting *away* from the binding; "helpfully" inventing a sub-product home. An unregistered `product_name` at session create is a **hard refusal** (`PRODUCT_NOT_REGISTERED`) — registering a product is a Conductor/founder act, not an intake side effect.

Tests: fixture's `docs/products/TALOA Universal Overlay & Fluid UI/…` → `SSOT_IDENTITY_MISMATCH` + autofix rewrites to `docs/products/universal-overlay/PRODUCT_HOME.md`; session created with `product_name: "taloa-overlay"` (unregistered) → refused, no session row.

---

### 18.8 B8 CLOSED — `internal_factory_only` abolished; `consequence_class` is computed

**Decision:** the label `internal_factory_only` is **removed as a governance modifier**. It may exist only as a *derived* display label meaning `consequence_class === C1_INTERNAL_TOOLING`. Nothing may declare it. Consequences are computed from where the bytes land and what they touch.

#### 18.8.1 `consequence_class` (closed, computed, highest-match-wins)

| Class | Computed when any target matches | Required gates (in addition to §5.1) |
|---|---|---|
| `C0_DOC_ONLY` | `docs/**`, `*.md` only | Structural only |
| `C1_INTERNAL_TOOLING` | `scripts/**`, `tests/**`, `factory-staging/**` and no runtime import path | + `SENTRY_PREBUILD_PASS` (structural) |
| `C2_RUNTIME_SERVER_CODE` | `services/**`, `routes/**`, `config/**`, `db/migrations/**` | + behavioral scope + `consumer_wiring` proof |
| `C3_CLIENT_FACING_SURFACE` | `public/**` (esp. `public/overlay/**`), any `routes/**` endpoint reachable without `requireKey`, anything altering founder-visible text | + **Sentry Product Completion registration for `product_id`** (C1 scope 4); unregistered ⇒ `PRODUCT_SENTRY_UNAUTHORIZED` |
| `C4_AUTHORITY_OR_SAFETY` | `middleware/**`, `core/**`, `startup/**`, `src/server/auth/**`, `config/builder-safe-scope.js`, `builderos-reboot/governance/**`, `docs/products/PRODUCT_REGISTRY.json`, **anything implementing or altering a gate, authorization, receipt, or defect-detection path**, `.github/**`, secrets/env plumbing | + explicit **founder or Conductor authority receipt** naming the mission id; self-verification forbidden; `partial_ship_allowed: false` |

Path inputs are taken from the already-live lists (`BLOCKED_WRITE_PATHS`, `PROTECTED_SOURCE_PREFIXES`) so there is one classification story, not two.

#### 18.8.2 The punchline (deliberate, and it applies to this repair)

M1–M4, C1, C2 all implement or alter gates → they are **`C4_AUTHORITY_OR_SAFETY`**. The factory repairing its own governance gets the **strictest** lane, not an internal fast lane. `internal_factory_mechanism` as a `mission_class` therefore buys **zero** governance discount; it only changes which completeness profile applies. Any future artifact asserting "internal, so no Sentry" is a governance defect by definition.

Tests: a step targeting `public/overlay/**` labeled internal → `C3`, blocked without product registration (fixture: `universal-overlay` is absent from `SENTRY_PRODUCT_REGISTRY.json` → correctly blocked); a step editing `builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json` → `C4`, blocked without founder/Conductor receipt; a step touching only `scripts/**` → `C1`, allowed with structural Sentry.

---

### 18.9 Cross-cutting closures (created by the above; closed here, not left to Builder)

#### 18.9.1 `canonical_json_v1` (closes R6)

Hash input = UTF-8 bytes of JSON serialized with: object keys sorted lexicographically by code unit; no insignificant whitespace; numbers in shortest round-trip form; `undefined` keys omitted; arrays order-preserved. Hash = `sha256`, lowercase hex. Volatile fields excluded from artifact hashing by name: `scanned_at`, `updated_at`, `generated_at`, `minted_at`, `created_at`, `assembled_at`, `heartbeat_at`, `lease_expires_at`. Markdown/`.md` authoritative refs are hashed as **raw file bytes**, not canonicalized.

#### 18.9.2 Named constants (Builder may not choose these)

| Constant | Value |
|---|---|
| `GOVERNANCE_JOB_HEARTBEAT_MS` | `30000` |
| `GOVERNANCE_JOB_LEASE_MS` | `120000` |
| `GOVERNANCE_JOB_STALE_MS` | `600000` (the §17.2 N = 10 min) |
| `GOVERNANCE_JOB_RECOVERY_POLICY` | `fail_closed_with_restart_token` (§15 Q1 default) |
| `AUTHORIZATION_TTL_MS` | `3600000` |
| `AUTHORIZATION_MAX_SLICES` | `25` |
| `INTAKE_CONCURRENCY_DEFAULT` | `1` |
| `SCAN_CONTEXT_TRUNCATION` | `none` (closes R3) |
| `TERM_MATCH_MODE` | `case_insensitive_whole_phrase` |
| `GATE_FAILURE_MODE` | `fail_closed` (no gate may be skipped on internal error; error ⇒ block) |

#### 18.9.3 Enforcement is at the mutation boundary (closes R4 / attack A12)

Authorization is checked **inside the dispatch/commit path** — the function that actually writes bytes or calls `commitToGitHub`/`/lifeos/builder/build` — and keyed on `(session_id, step_id, artifact_sha256)`. Callers may not opt out by supplying artifacts inline. `dryRun: true` may inspect and must not write; the existing esm_script path in `services/intake-blueprint-executor.js` that calls `commitToGitHubDirect` is a **mutation** and requires authorization even though it is "deterministic."

#### 18.9.4 Receipt integrity — Builder may not write its own receipts (attack A11)

Confirmed exposure: `config/builder-safe-scope.js` lists `products/receipts/` and `builderos-reboot/MISSIONS/` in `SAFE_WRITE_PATHS`, so a Builder step can today author the very receipts that prove it passed. Normative:

- Governance receipts (`governance_transition_receipt_v1`, authorization records, consensus receipts, Sentry PASS receipts) are written **only** by the governance runtime, carry `written_by` = process identity, and land in an append-only ledger (`db` table + `data/governance-transition-receipts.jsonl`).
- A receipt whose `written_by` resolves to a Builder step dispatch, or which appears in a Builder step's `target_files`, is **invalid on read** and raises `RECEIPT_FORGERY_SUSPECTED`.
- M3's mission includes removing `products/receipts/` and `builderos-reboot/MISSIONS/` from Builder's authorable set for these artifact types (narrowing, not widening).

#### 18.9.5 Fixture registration (the exam must actually run in CI)

The frozen fixture is currently docs-only and therefore not executed by anything. P6 registers it in the **existing** `BUILDEROS_INTAKE_REGRESSION_HARNESS.json` with a new closed field `kind: "negative_fixture"` (existing entries are implicitly `kind: "golden_path"`), `expect: "typed_halt"`, `fixture_dir`, `expected_defects_path`, `session_sha256`. Harness semantics: a negative fixture **passes when the system fails closed** and fails when the system authorizes, when a required defect id is missing, or when the session bytes no longer match the pinned sha256 (fixture-sanitization tripwire, §0.3/A7). Registration does not modify the fixture bytes.

#### 18.9.6 Defect codes ↔ LOCKED typed blockers (honest mapping)

`TYPED_BLOCKER_SSOT.json` is `status: LOCKED`, sealed 2026-07-08 under `BRAINSTORM_AND_CONSENSUS.md LOCKED_WAVE_0_1 item 8`, and has **no class for governance-integrity defects**. This blueprint does **not** unseal it. Interim binding, additive and fail-closed:

| Governance defect | `blocker_class` (existing) | Owner | Park |
|---|---|---|---|
| `BLUEPRINT_SPEC_INCOMPLETE` | `BLOCKED_FOUNDER_INPUT` if the gap needs an answer; else `BLOCKED_STRATEGIC` | founder | yes |
| `ARCHITECTURE_INVENTION_DETECTED` | `BLOCKED_STRATEGIC` | founder | yes |
| `SSOT_IDENTITY_MISMATCH` | `BLOCKED_STRATEGIC` | founder | yes |
| `TERMINOLOGY_STALE` | `BLOCKED_STRATEGIC` | founder | yes |
| `GATE_SEMANTIC_OVERCLAIM` | `BLOCKED_TOOLING` | system | no |
| `PRODUCT_SENTRY_UNAUTHORIZED` | `BLOCKED_STRATEGIC` | founder | yes |
| `GOVERNANCE_JOB_STALE` | `BLOCKED_TOOLING` | system | no |
| `MISSION_PACK_INCOMPLETE`, `UNAUTHORIZED_AMENDMENT`, `RECEIPT_FORGERY_SUSPECTED`, `MISSION_CLASS_MISCLASSIFIED`, `PRODUCT_NOT_REGISTERED` | `BLOCKED_STRATEGIC` | founder | yes |

A dedicated `BLOCKED_GOVERNANCE_INTEGRITY` class is the right long-term answer and is filed as §20 OPEN-4 for the sealing authority. Mapping to `BLOCKED_STRATEGIC` is deliberately conservative: `retryable: false`, `park_default: true`, `owner: founder` — it cannot auto-retry its way past a governance defect.

### 18.10 New unstated decisions these closures create (surfaced, not hidden)

Per instruction 11, each closure was re-checked for downstream ambiguity. Five new decisions were created and are closed here: `canonical_json_v1` (§18.9.1), authorization TTL and slice cap (§18.9.2), shared-registration-surface list (§18.6 rule 2), negative-fixture harness semantics (§18.9.5), and the blocker-class mapping (§18.9.6). Three could **not** be closed inside this blueprint's authority and are escalated in §20: unsealing the typed-blocker SSOT, narrowing Builder's write scope for receipts (touches `config/builder-safe-scope.js`, a C4 authority file), and whether `universal-overlay` gets registered for Sentry product completion before Overlay re-entry (a product decision, and deliberately *not* pre-cleaned per §0.2).

---

## 19. Second triple audit — run against §18-closed document (2026-08-11)

Run after the closures, deliberately looking for what is still wrong rather than confirming the first audit.

### 19.1 Builder-view audit — decisions still forced on Builder

| # | Candidate residual decision | Resolved by | Verdict |
|---|---|---|---|
| 1 | Which files to touch per mission | §18.4.3 exact `target_files` | Mechanical |
| 2 | Whether a blank field is "incomplete" | §18.1.2 closed required/allowed per `contract_kind` | Mechanical |
| 3 | How to resolve an incompleteness | §18.2.2 seven closed Class A verbs + containment test | Mechanical (or routed) |
| 4 | `GAP_FLAG` vs omit | §18.3 omit; placeholder tokens banned by regex | Mechanical |
| 5 | Terminology synonyms | §18.5 bridge is the only source; code exempt list explicit | Mechanical |
| 6 | Overlap algorithm | §18.6 three closed rules, existing normalizer | Mechanical |
| 7 | Autofix breadth | §18.7 three fields, registry-exact | Mechanical |
| 8 | Internal-work discount | §18.8 computed `consequence_class`; no discount | Mechanical |
| 9 | Hash canonicalization | §18.9.1 | Mechanical |
| 10 | Timeouts/TTL/concurrency | §18.9.2 | Mechanical |
| 11 | Where new statuses live | §18.4.3 M2 named migration; R1 correction | Mechanical |
| 12 | Which blocker class a governance defect maps to | §18.9.6 table | Mechanical |
| **R-1** | **Content of the `required_behavior[]` assertion statements for each M-mission's own service** | Not enumerated per step | **RESIDUAL — assertion-level, and by SO-001 the assertions themselves must be authored by the Architect in the mission `BLUEPRINT.json` derived from §18, not chosen by Builder. Blueprint authorizes only what §18 states; anything else is scope expansion.** |
| **R-2** | **Verifier script internals** (`scripts/verify-…-m*.mjs`) | Acceptance criteria named, script bodies not | **RESIDUAL — bounded: §18.1.5/18.2.5/18.5.3/18.6/18.7/18.8 enumerate the exact assertions each verifier must make. Builder writes mechanics, not criteria. Verifier may not be authored by the same lane that authored the mechanism (§18.4.1 `verifier_authored_by`).** |

**Verdict: PASS with two bounded residuals.** Neither R-1 nor R-2 is an architectural, product, or governance decision — both are "write the code that asserts the stated criterion." No unauthorized decision remains.

### 19.2 Deterministic feasibility audit — three honest buckets

**Deterministic enforcement (implementable exactly as written):**

| Requirement | Why deterministic |
|---|---|
| Completeness checklists (§18.1.2) | Key presence + closed-set membership on JSON |
| Extra-key = invention (§18.1.4) | Set difference |
| Class A/B discrimination (§18.2.1) | Verb enum + path existence + sha256 + substring containment |
| Placeholder-token ban (§18.3) | Regex over serialized steps |
| Mission Pack mint rule (§18.4.1) | Field presence + hash compare |
| Identity binding (§18.7) | String equality vs `PRODUCT_REGISTRY.json` |
| Terminology staleness (§18.5.3) | Case-insensitive phrase match with an exemption list |
| Overlap (§18.6) | Normalized string equality + closed shared-surface list |
| `consequence_class` (§18.8.1) | Path prefix classification |
| Status machine (§5.2 + R1 migration) | DB CHECK constraint |
| Authorization freshness (§6, §18.9.1) | sha256 over canonical bytes |
| Lease/stale (§8, §18.9.2) | Timestamps + watchdog |
| `sentry_scope` presence (C1) | Schema validation |
| Receipt-writer identity (§18.9.4) | Process identity + path exclusion |
| Reuse verification (R2) | `information_schema.columns` query or migration index — both real |

**AI judgment, advisory only (may never mint a gate):** intent extraction quality; ARC prose review; Sentry Layer B UX critique; proposing *candidate* Class A citations (each still mechanically verified); drafting founder gap questions. `ARCHITECT_INTENT_VALIDATED` is minted by the **deterministic** fidelity checks only; an AI fidelity opinion is attached as evidence and cannot substitute (§17.2 condition, now normative).

**Currently unproven / needs one real measurement before P6 is claimed:**

| Item | Why unproven | Named next experiment |
|---|---|---|
| Live `information_schema` at intake time | Pool exists in the service, but no intake code queries it today | One-shot probe in M1's verifier; fall back to migration index and record `evidence_source` |
| Watchdog actually fires on Railway | `startup/register-schedulers.js` scheduler reliability under redeploy is the exact thing that broke | M5 acceptance must kill a worker and observe `stale_failed` — not assert the code path in isolation |
| Containment check false-positive rate | Legitimate Class A resolutions could trip it on formatting differences | M1 verifier includes a positive-control case (real citation must pass) |
| Negative-fixture mode in a harness built for golden paths | Existing harness assumes `ok` = acceptance exit 0 | P6 explicitly inverts semantics for `kind: "negative_fixture"` |

**Verdict: PASS with conditions** — conditions are named experiments with owners, not aspirations. No AI fidelity claim is doing enforcement work.

### 19.3 Adversarial governance audit — comply literally, violate intent

A1–A10 remain normative. New attacks found against the **closed** document:

| # | Attack | Countermeasure (normative) |
|---|---|---|
| A11 | **Receipt forgery / self-verification** — Builder writes its own PASS receipt because `products/receipts/` and `builderos-reboot/MISSIONS/` are in `SAFE_WRITE_PATHS` today | §18.9.4: governance receipts written only by governance runtime; `written_by` recorded; receipt in a Builder `target_files` ⇒ `RECEIPT_FORGERY_SUSPECTED`; M3 narrows the write scope |
| A12 | **Gate bypass by inlining the artifact** — call `executeIntakeBlueprint({ blueprint })` and skip every session/ARC check (live today, R4) | §18.9.3: authorization enforced at the mutation boundary keyed on `(session_id, step_id, artifact_sha256)` |
| A13 | **Starve the grounding, then "legitimately" invent** — keep the 15-table truncation so the generator cannot see a table and must create one | §18.4.3 M1-S04 removes truncation; `SCAN_CONTEXT_TRUNCATION = none`; reuse verification independent of prompt context |
| A14 | **Non-goal laundering** — resolve every gap with `mark_deferred_non_goal` until the mission is empty but "authorized" | `mark_deferred_non_goal` requires the exact authoritative-doc line (§18.2.2); plus a mission whose `permitted_scope.target_files` is empty cannot be minted (§18.4.1) |
| A15 | **Prose-only mirror drift** — update `DO_NOT_INVENT.json` text and claim the rule changed | R5: that file is a generated mirror, never authority; changing it changes nothing |
| A16 | **Parallel-registry drift** — create a second terminology or gate registry so the deterministic checks read a friendlier file | §18.0 reuse law: new governance JSON where an owner exists is a DRIFT VIOLATION; bridge registered in `ARTIFACT_ALIAS_REGISTRY.json`; only two new files are authorized by name |
| A17 | **Mission-class downgrade** — declare `doc_only` or `internal_factory_mechanism` to dodge gates | `consequence_class` is computed from paths and cross-checked; mismatch ⇒ `MISSION_CLASS_MISCLASSIFIED` (§18.1.1/§18.8) |
| A18 | **Terminology exemption abuse** — dump forbidden terms into a file and call it `code_as_is_identifiers` | Exemption applies to identifiers in code paths, not to `prohibited_in` scopes; bridge edits are founder-only |
| A19 | **Split resolution across sessions** — resolve invention in session A, re-intake into session B, cite session A's artifact as "existing" | Evidence must resolve to a **committed authoritative** path (product home / blueprint / governance JSON), never to another session's generated artifact |
| A20 | **Fail-open on internal error** — wrap a gate in try/catch and treat an exception as pass | `GATE_FAILURE_MODE = fail_closed` (§18.9.2); a gate that throws blocks |
| A21 | **Freshness laundering via volatile fields** — change meaning while keeping the hash stable by parking content in an excluded field | Exclusion list is closed to timestamp-only fields (§18.9.1); no content field may be excluded |
| A22 | **Design-freeze self-authorization** — the repair mission mints its own design-freeze receipt | Design freeze is a founder/Conductor act (§0.5); C4 requires an authority receipt naming the mission id; §18.9.4 forbids self-written receipts |
| A23 | **Fixture registration as sanitization** — "register" the fixture while normalizing its bytes to fit the harness | §18.9.5: registration adds metadata only; `session_sha256` mismatch fails the harness (§0.3, A7) |

**Verdict: PASS as design** — A1–A23 are normative requirements, and each has a deterministic countermeasure rather than an instruction to behave well.

### 19.4 Gate to manufacturing missions (updated)

| Check | Status |
|---|---|
| Builder-view clean | **PASS** (two bounded implementation-only residuals, §19.1 R-1/R-2) |
| Deterministic feasibility | **PASS with named conditions** (§19.2 bucket 3 experiments) |
| Adversarial counters specified | **PASS** (A1–A23 normative) |
| Repo-vs-blueprint corrections absorbed | **PASS** (R1–R6, §18.0.1) |
| Reuse discipline (no parallel systems) | **PASS** (§18.0 ledger; exactly two new governance files authorized) |
| Fixture frozen + pinned + now CI-registered by spec | **PASS** (bytes untouched) |
| Founder-only blockers resolved | **NO** (§20 OPEN-1…OPEN-4) |
| M1–M5 manufacturing missions authorized | **NO — awaiting founder/Conductor design-freeze receipt** |

**Recommendation: DESIGN FREEZE READY, blocked only on §20 founder answers.** The mechanism design is closed; what remains is authority Builder cannot supply.

---

## 20. Founder / Conductor decisions still required (Builder cannot proceed past these)

| # | Decision | Default written into this document | Why it needs you |
|---|---|---|---|
| OPEN-1 | Intake recovery policy | `fail_closed_with_restart_token` (§18.9.2) | Cheaper-but-riskier checkpoint-resume mid-model-call is a spend/risk tradeoff (Efficiency Officer + founder) |
| OPEN-2 | Narrow Builder's write scope so it cannot author governance receipts (`products/receipts/`, `builderos-reboot/MISSIONS/`) | Specified as required in §18.9.4 | Edits `config/builder-safe-scope.js` — a `C4` authority file; needs your receipt |
| OPEN-3 | Register `universal-overlay` in `SENTRY_PRODUCT_REGISTRY.json` | **Deliberately NOT done** (§0.2 forbids pre-cleaning the exam) | Product decision; and the fixture must stay unfair until after the repair proves itself |
| OPEN-4 | Add `BLOCKED_GOVERNANCE_INTEGRITY` to the LOCKED `TYPED_BLOCKER_SSOT.json` | Interim conservative mapping to `BLOCKED_STRATEGIC` (§18.9.6) | The file is sealed under `LOCKED_WAVE_0_1 item 8`; unsealing is not this blueprint's authority |
| OPEN-5 | Efficiency Officer interim | `efficiency_officer_deferred` + single factory (`INTAKE_CONCURRENCY_DEFAULT = 1`) | Confirm mapping to the existing `CFO` seat's hooks vs staying deferred |
| OPEN-6 | **"Conductor" collides with existing Level-2 law.** §2.11b/§2.11c/§2.13 already use *Conductor* for the **session supervisor** role (dated 2026-04-25), while §2.0K names **Chair** as the runtime entry gate | **Bridge entry `office.conductor` is now BLOCKED** — not authored until resolved (§21.3) | Naming is founder jurisdiction (§18.2.3), and one option amends non-derogable Level-2 law via Article VII |
| OPEN-7 | Disposition of the unwired, self-sealing `runChairConsensusGate` (zero callers; claimed `enforced` in a constitutional mapping doc) | **New mission `M0`, ordered first** (§21.2) | `C4_AUTHORITY_OR_SAFETY`. Choice between *wire it with real sealing* and *delete it + retract the enforcement claim* is authority-level, not mechanical |

Until each is answered, implementers use the default and label it `DEFAULT_PENDING_FOUNDER` in receipts. **No manufacturing mission may be cut until a design-freeze receipt naming this document's version exists (§0.5).**

---

## 21. Lifecycle truth audit — consequences (2026-08-11, v1.3.0)

Full evidence: **`docs/products/builderos/FACTORY_LIFECYCLE_TRUTH_AUDIT_2026-08-11.md`**. The founder/Conductor channel specified a 14-stage manufacturing lifecycle and directed inspection rather than further design. Result: **2 of 14 stages fully exist; the enforcement layer this blueprint builds upon is partly fictional.**

### 21.1 What the audit changes about this document

| Finding | Effect here |
|---|---|
| `runChairConsensusGate` has **zero callers** while §2.0K declares the Chair seal mandatory and a constitutional mapping doc says `enforced` | New **M0**, ordered before M1 (§21.2). M2/M3 typed gates would otherwise sit on top of a gate that never runs |
| That gate **self-generates the plan, mints its own seal, fabricates `propagated_confidence = 0.75`, and fills the `unknowns`/`assumptions`/`risks` arrays it then validates** | Confirms attack **A6** (stub authority auto-approves) is *already live*, not hypothetical. Countermeasures in §18/§19 stay normative |
| `run-step.js:136` honors caller-supplied `skip_intake_gate: true` | Same pattern as **R4**. §18.9.3 (enforce at the mutation boundary) is reinforced and now applies to `dispatchExecuteStep`, added to §13 touch targets |
| `FACTORY_READY` is not a typed state anywhere | The M2 status migration (R1) must also carry the readiness state, or C3 cannot be built later |
| Builder/Factory is **not** a consensus party (`pre-arc-enrichment.js:68` seats = `SNT/CHAIR/CFO/WISDOM`) | This blueprint treats Builder as a *recipient* of a Mission Pack. The founder requires Builder as a *consenting reviewer* before Factory Ready. Recorded as **C3**, deliberately unspecified here |
| Trust ledger is real, ranked, and role-keyed (`services/model-capability-ledger.js`), but closes at dispatch and has no factory axis | Recorded as **C4**. Reinforces §18.8: `consequence_class`, not actor labels |

### 21.2 M0 — resolve the self-sealing consensus gate (new, ordered first)

**Not authorized to code.** Specified so it cannot be quietly skipped:

1. **Detect:** a mechanical sweep asserting that every gate described as `enforced` in `docs/constitution/proposals/2026-08-02-CONSTITUTION-DIGITAL-TWIN-PLAN.md` and `builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json` has **at least one real caller** on a live path. Finding 1 was found by grepping for callers — cheap, mechanical, repeatable, and it belongs in `builder:preflight`. **The sweep must be repo-wide, not scoped to this one gate:** independent inspection already found a second fully dormant subsystem (`services/self-repair-target-reputation.js` + `self-repair-quarantine.js`, no caller outside themselves) and two more governance JSONs that no code reads (`OB_EXECUTION_LADDER.json`; `DO_NOT_INVENT.json` per R5). Include a **config-with-no-reader** arm: `trust_adjustment.delta` and `REALITY_CHECK_RECEIPT` are named in `DEPARTMENT_ROLE_CONTRACT.json` and have no writer or reader at all.
2. **Decide (founder, OPEN-7):** either wire the gate with sealing that is *not* self-minted, or delete it and retract the `enforced` claim. A third option — leave it — is a standing §2.6 exposure.
3. **Forbidden in either case:** `autoGenerate` defaulting to `true`; a seal validated by string prefix; a confidence value written and then checked by the same function; `CHAIR_GATE_STRICT` that is read but does not change behavior.
4. **Receipt:** `GOVERNANCE_ENFORCEMENT_TRUTH_RECEIPT` listing every claimed-enforced gate, its callers, and its verdict.

### 21.3 C3 and C4 — named, deliberately unspecified

Both are **one day old and contain founder-only decisions**; specifying them now would be the exact invention this blueprint exists to prevent.

- **C3 — Manufacturing Plan stage + three-party Factory Readiness Review.** Covers stages 4-8 and 11 (repair loop, `FACTORY_READY` state, decomposition/assignment plan, Architect review of the plan, integration gate). Reuse candidates found: `services/goal-decomposition.js` (already computes `ready_sub_goals`/`blocked_sub_goals`; currently fed verification labels rather than build slices), `sortStepsByDependencies()`/`sortIntakeSteps()`, `BP_PRIORITY.json`, and the proven `claimed_at`-null claim pattern. **Three hard prerequisites, all found by inspection:** (i) factory identity does not exist (`factory_id` appears nowhere in the build path); (ii) one concept has three dependency vocabularies — `deps` (intake), `dependencies` (missions), `depends_on` (BUILD_QUEUE) — which must be reconciled or a graph will silently mis-order work; (iii) "what happens if one slice fails" currently has three different answers (mission fails fast, governed ship halts with `resume_from`, **intake continues past the failure**) and no full-mission rollback exists anywhere.
- **C4 — Factory identity + trust/incentive architecture.** Extends the existing ledger rather than replacing it — `services/model-capability-ledger.js` already ranks per `(model_tier, role)` by trust-earned rate with a `theater_detected_count`, exposed at `GET /factory/model-rankings`, with 8 of 10 roles wired. Three prerequisites before any new dimension: (a) factories become addressable entities; (b) **one missing writer** — Reality is already scored on three lanes (`reality-score.js` → `PREDICTION_RECEIPT.post_build`/`TWIN_DRIFT_REPORT`; ADF ledger + its live scheduler; legacy `prediction-loop.jsonl`) but `trust_adjustment.delta` has no writer, so no reality outcome reaches the ledger; (c) the ranking must actually steer selection — `getBestModelForLens` computes the winner and has no production import. Constraints already ratified by the founder: no single gameable score; self-caught defects must score *higher* than concealment; concealment is a trust event, not a capability event; repeated identical failure across independent factories indicts the system, not the factory. Note the ADF corpus is presently unscored (all 36 sampled 2026-06 predictions `status: open`), so calibration has no history to learn from yet.

### 21.4 Revised recommendation

- **M1–M5 + C1 + C2 remain DESIGN FREEZE READY as scoped** — nothing found weakens them; the audit strengthens R4 and A6.
- **M0 is added and ordered first.**
- **The end-to-end lifecycle is NOT design-freeze ready** (C3/C4 unspecified, OPEN-6/OPEN-7 unanswered).
- **Still no code.**

## 22. M6 — Decision compression and the Founder Escalation Threshold (2026-08-11, built)

Chair-directed and founder-ratified the same evening, after the repaired loop produced ten founder questions and put two of them to him directly: pick one of four dependency-cycle repairs, and define seven database schemas.

> "Right now it's effectively using you as its missing reasoning layer. That's exactly what the Conductor/Architect/Builder/Sentry structure is supposed to eliminate."
>
> "What you want is not 'fewer questions.' You want decision compression: the organization handles 100 internal uncertainties and brings you one question only when your unique authority is actually required."

### 22.1 Why this was a governance defect, not a UX complaint

Every earlier mechanism in this blueprint pushes in one direction: refuse to invent, refuse to proceed, route upward. That was the right correction for a system that had been fabricating architecture — but applied without a counterweight it produces a machine that escalates everything, because escalation is free for the office that escalates and costly only for the person receiving it. Asking is always defensible. So the ten questions were not a failure of any single mechanism; they were the predictable equilibrium of mechanisms that only ever say "stop."

The counterweight has to be mechanical for the same reason the no-invention rule had to be: a cultural norm that "we shouldn't bother the founder" loses every argument against "but what if we're wrong."

### 22.2 The threshold (closed set — `config/founder-escalation-threshold.js`)

A question may reach the founder only when it: changes founder intent or mission; creates or changes constitutional policy; materially changes user rights, privacy, ownership, safety or consent; commits money or time beyond delegated authority; creates a major irreversible architectural commitment; deadlocks the required Offices; or presents multiple valid outcomes with materially different human or business consequences that existing principles cannot settle.

**Inverse rule, equally binding:** uncertainty is not sufficient reason to escalate. Reducing uncertainty is the system's job.

The gate (`scripts/escalation-gate.mjs`) requires a named criterion *and* its evidence, refuses invented criteria, and will not accept a deadlock claim without each office's recorded position — otherwise "we couldn't agree" becomes the universal bypass. Refused questions are routed back to the office that owes the answer; a refusal with no owner is just a question nobody answers.

### 22.3 The delegation this required (narrowing of M1)

M1's no-invention rule was written against a builder fabricating schemas mid-build, which remains forbidden. But read literally it also forbade any office from specifying a column the source left blank, which is what turned the founder into the reasoning layer. `IMPLEMENTATION_DELEGATION` now lets the **Architect** specify implementation detail — schemas, signatures, ordering, naming, and reuse of an existing canonical asset — with **Builder, Sentry and Conductor consensus**, and never anything policy-bearing: who owns data and whether it can be exported, retention and deletion, consent and sharing, prices or costs to a user, or an irreversible architectural commitment. Those escalate as a policy question in plain language, never as a column list.

The detector enforces the boundary rather than trusting it: a delegated resolution authorizes exactly the columns it names, an extra column still reports as invention, and a resolution missing any of the three seals is not an authority at all.

### 22.4 Proven on the frozen fixture

| | before | after |
|---|---|---|
| questions put to the founder | 10 | **0** |
| dependency cycle | unresolved, offered as four options | repaired from injection evidence |
| store contracts | 7 unspecified | 5 reuse an existing table, 2 Architect-specified, 7/7 sealed by three Offices |
| blueprint defects | 13 detected | 0 remaining after application |
| gate state | execution refused | **MANUFACTURING_AUTHORIZED**, 16 slices |

The cycle repair is a proof rather than a preference, which is the part that matters: every step in the knot declares its collaborators by injection, `TALOA-P1-015` injects only `pool, logger` while declaring a dependency on verification, and `TALOA-P1-012` never injects verification or receipt-ledger at all. Three edges were therefore unsupported by the dependent steps' own contracts and were removed; both genuine injected collaborations were preserved. Where no edge in a knot is removable, the resolver escalates — that path is tested.

### 22.5 What this cost, recorded honestly

Two bugs in the first implementation are worth keeping in the record because both failed in the safe direction and both were found by running it rather than reading it. Sentry refused `DeviceRegistry` because the column `platform` contains the substring `lat`; and the policy classifier read Sentry's own note that "reuse inherits the handling already ratified for it" as evidence that the answer was policy-bearing, demanding founder ratification for a question already settled. A checker that cries wolf gets switched off, which is why neither was left in.

One consequence is structural and now permanent doctrine: the Conductor lawfully registering `universal-overlay` for its SO-002 gates **deleted a required detection from the frozen regression exam**, because the exam read live governance state. A frozen exam judged against live state teaches the system that improving governance breaks its own tests. Fixed by `GOVERNANCE_SNAPSHOT_AT_CAPTURE.json` in the fixture directory — the exam is judged against the governance state that existed at capture, and the fixture bytes remain untouched.

### 22.6 Where the founder still gets asked

Unchanged and deliberately so: ownership and export rights over personal data, retention and deletion, consent and third-party sharing, anything with a price, irreversible architecture, and genuine Office deadlock. The Chair's own example is a test case in `tests/founder-escalation-threshold.test.js` and it passes the gate: *"Option A means users own and can export this data; Option B means we retain it as proprietary intelligence."*
