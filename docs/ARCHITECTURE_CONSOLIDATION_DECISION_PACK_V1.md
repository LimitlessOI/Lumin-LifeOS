<!-- SYNOPSIS: Architecture Consolidation Decision Pack V1 -->

# Architecture Consolidation Decision Pack V1

**Status:** `GOVERNANCE DECISION` — authoritative for consolidation scope; not an implementation plan  
**Date:** 2026-06-14  
**Agent:** Composer (Cursor)  
**Environment:** `/Users/adamhopkins/Projects/Lumin-LifeOS`  
**Mission role:** Architecture Governance Authority Audit  
**Mode:** Governance decisions only  
**Runtime code modified:** **NO**

**Governance inputs (discovery complete — no re-audit):**
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`
- `docs/THREE_ROOT_CONSOLIDATION_DEEP_AUDIT_V1.md`
- `docs/FUTURE_STATE_ARCHITECTURE_REVIEW_V1.md`
- `docs/BUILD_EXECUTION_BLOCKER_SEQUENCE_PLAN_V1.md`
- `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md`
- `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md`
- `docs/BUILDER_EXECUTION_DUPLICATION_AUDIT.md`
- `docs/SYSTEM_CAPABILITY_TRUTH_AUDIT.md`

**Governance rule:** Findings below are **accepted**, **unproven**, or **rejected** as official architecture truth. This document does not prescribe how to implement decisions.

---

## 1. Findings accepted as architectural truth

These are **binding** for all future consolidation work unless superseded by a later governance pack with founder receipt.

| ID | Finding | Source |
|----|---------|--------|
| **T-01** | Production Railway runs **three composition roots** on one Express app: ROOT A (`register-runtime-routes.js`), ROOT B (`server-routes.js`), ROOT C (`two-tier-system-init.js`), plus minor inline routes in `server.js`. | Three-root audit §1 |
| **T-02** | **ROOT A** is the canonical modern product surface; ROOT B is adjunct; ROOT C is legacy/shadow bundle. | Reconciliation §2, Three-root §1 |
| **T-03** | **Six builder execution paths** exist; **five** can commit or imply success without full outcome verification. | Duplication audit §1–3 |
| **T-04** | **One SAFE completion path** today: `executeCommandControlJob()` with both technical and outcome verification. | PASS/DONE audit Path 1 |
| **T-05** | **24 distinct completion authorities** exist; **8 FAIL_OPEN**, **12 PARTIAL**, **1 SAFE**. | PASS/DONE audit |
| **T-06** | Canonical git commit actuator **by policy** is `POST /api/v1/lifeos/builder/build`; orchestration intake is command-control execute. | Duplication audit §8, NSSOT §2.11 |
| **T-07** | `builderos-reboot/BP_PRIORITY.json` is the **Machine product queue**; Hist-owned mission queue artifacts are **not** product orchestration authority. | BP law, Reconciliation |
| **T-08** | `factory-staging/` is a **separate runtime process**, not the Railway production spine, until an explicit cutover receipt exists. | Reconciliation §2, Authority layers |
| **T-09** | `builderos-reboot/` mission tree is **Hist domain** (read/salvage); not live production orchestration. | Hist boundary law |
| **T-10** | Capability inventory **over-claims**: 317 inventoried; **63 ACTIVE**, 219 PARTIAL, 14 BUILT BUT DISCONNECTED. | Truth audit |
| **T-11** | Infrastructure (providers, Neon, Railway/GitHub deploy sync, Voice Rail routing, `/builder/build` availability) is **CONNECTED** on production as of 2026-06-14. | Live connection truth check |
| **T-12** | Governed build **does not complete end-to-end** on typical proof targets: **ZONE3_PATCH_REQUIRED** pre-build; **BUILDEROS_DONE_BLOCKED** post-commit when measurement ledger incomplete. | Blocker sequence plan |
| **T-13** | TSOS Platform Kernel Phase 0 **wraps** `/builder/build` and council calls on production (`platformKernel.wrapBuild`). | `server.js`, TSOS kernel doc |
| **T-14** | Shadow queue, auto-builder commit API, and public `/builder/execute` are **shadow execution authorities** contradicting single-path doctrine. | Reconciliation §4, Duplication audit |
| **T-15** | Old `command-center-routes.js` (ROOT C) and `lifeos-command-center-routes.js` (ROOT A) are **duplicate C2 surfaces**; ROOT A aggregate is canonical. | Three-root §5–6 |
| **T-16** | `builderos-completion-authority.js` exists; consolidation toward **single terminal writer** is **accepted target state**. | Completion plan, partial ship |
| **T-17** | Pre-commit hooks (builder-first, SSOT atomic, BP priority guardrails, INTENT DRIFT) are **production-enforced** governance. | Reconciliation §10 |
| **T-18** | Voice Rail **founder build commands** route to **command-control jobs**, not direct silent `/build`. | Capability proof, execution truth |
| **T-19** | Zone 3 policy (>150 lines) **blocks** governed jobs at OIL boundary before `/build` unless patch-mode/extract-helper plan satisfies policy. | Blocker plan, patch-mode policy |
| **T-20** | Useful-work guard is **law** for scheduled AI; zero-waste rule is accepted platform doctrine. | CLAUDE.md, inventory |

---

## 2. Findings that remain unproven

These may be true but **lack sufficient runtime proof** to be governance-binding today.

| ID | Claim | Why unproven |
|----|-------|--------------|
| **U-01** | `factory-staging/` will replace production spine on a known date | No cutover receipt; separate process only |
| **U-02** | Completion authority fully closes FAIL_OPEN on direct `/build` | Step 1 partial; DONE gate ordering still blocks some paths |
| **U-03** | Kernel wrap always satisfies DONE gate measurement on every `/build` | Live builds hit `missing_proof: token_receipt, build_end_time, oil_receipt` |
| **U-04** | All 78 ROOT A route files have live consumers and acceptance proof | Truth audit: many PARTIAL |
| **U-05** | Historian contract (NSSOT §2.0I) enforced on production memory spine | Factory historian live; production boundary partial |
| **U-06** | Product development gate ("BPB may begin now") machine-enforced on production | Factory intake slice only |
| **U-07** | Deliberation v2.7 seven-department roster **globally** enforced on every load-bearing build | Deliberation routes exist; not proven on all build paths |
| **U-08** | `deploy_commit_sha` in receipts always matches intended git outcome for autonomous runs | Receipts sometimes null or stale |
| **U-09** | Sleep, conflict-interrupt, marketing routes are dead — vs unmounted regression | Truth audit: disconnected, not retired |
| **U-10** | Autonomous overnight runner completes BP items without human intervention | Backlog state shows high failure rate historically |
| **U-11** | CCL meaning transport ready for production M2M | Am 45 paper phase |
| **U-12** | Single composition root **already achieved** | Three roots still active |

---

## 3. Findings that should be rejected

These are **not** official architecture truth. Agents must not treat them as law or design intent.

| ID | Rejected assumption | Correct truth |
|----|---------------------|---------------|
| **R-01** | "We already have one composition root" | **T-01**: three roots + inline |
| **R-02** | "Any PASS receipt = delivered outcome" | **T-04, T-05**: only governed loop SAFE; acceptance scripts often PARTIAL |
| **R-03** | "Auto-builder is a canonical build path" | **T-14**: shadow; retire commit surface |
| **R-04** | "Shadow queue is acceptable when `BUILDER_QUEUE_ENABLED=1`" | **T-14, T-07**: contradicts BP law; quarantine ≠ authority |
| **R-05** | "`builderos-reboot/MISSION_QUEUE.json` is the active product queue" | **T-07, T-09**: Hist; BP_PRIORITY is queue |
| **R-06** | "Factory execute-step commits to production git today" | Duplication audit: no `commitToGitHub` in factory |
| **R-07** | "317 PRESENT capabilities = operational system" | **T-10**: 63 ACTIVE |
| **R-08** | "Direct `/builder/execute` is equivalent to `/build`" | Duplication audit: bypasses DONE/precommit full path |
| **R-09** | "DONE gate passed = mission delivered" | PASS/DONE audit: measurement only, no outcome parity |
| **R-10** | "Docs-only mount claims equal runtime truth" | **T-10**: inventory drift |
| **R-11** | "Infrastructure connected ⇒ autonomous build ready" | **T-11 vs T-12**: connected but blocked |
| **R-12** | "TSOS is a separate department seat equal to ChC/BPB/CDR" | Founder v2.7 doctrine: TSOS metabolism **under CFO**, not eighth seat |

---

## 4. Canonical authority chain (governance decision)

**Official authority stack** for resolving conflicts and ownership:

```
1. docs/SSOT_NORTH_STAR.md                    [SUPREME — constitutional]
2. docs/SSOT_COMPANION.md                     [Operational law]
3. CLAUDE.md + docs/AGENT_RULES.compact.md    [Agent operating law]
4. prompts/00-HIST-LEGACY-BOUNDARY.md         [STOP gate — Hist vs Machine]
5. prompts/00-SYSTEM-AUTHORITY-LAYERS.md      [Layer map: spine vs factory vs Hist]
6. docs/projects/AMENDMENT_*.md               [Product/domain law — lane-scoped]
7. builderos-reboot/BP_PRIORITY.json        [Machine product work queue — NOT Hist]
8. Runtime spine: register-runtime-routes.js  [Production mount truth — ROOT A]
9. factory-staging/                           [Factory runtime — fenced until cutover receipt]
10. builderos-reboot/ (Hist registry)        [Archive/salvage only]
```

**Execution authority (Machine build domain):** Command-control job execute → governed loop → kernel-wrapped `/builder/build` only.

**Terminal success authority (target, consolidating):** `builderos-completion-authority.js` → `grantBuildCompletion()` → `completion_receipt_id`.

**Not canonical authority:** auto-builder success, shadow queue iteration, raw `committed: true`, acceptance script `verdict: PASS` alone, factory step `DONE` on production spine.

---

## 5. Canonical PASS chain (governance decision)

**PASS** means **founder-requested outcome delivered and evidenced** — not tests alone, not commit alone.

**Canonical PASS chain (target state — partially implemented):**

```
Founder request + required_outcome (instruction / BP / founder packet)
        │
        ▼
Technical evidence (precommit, OIL 4-gate, acceptance probes, sentry)
        │
        ▼
Outcome evidence (verifyGovernedOutcomeBeforePass / git show parity)
        │
        ▼
grantBuildCompletion() → granted: true
        │
        ▼
completion_receipt_id issued
        │
        ▼
Product receipt may record verdict: PASS (linked to completion_receipt_id)
        │
        ▼
BP sync may mark receipt_verdict / blueprint_status (only with completion link)
```

**Interim accepted PASS (today only):** Governed command-control job ending `status: 'committed'` **after** `verifyGovernedOutcomeBeforePass` OK — **SAFE** per PASS/DONE audit.

**Not canonical PASS:** HTTP `ok: true`, `done_gate_passed: true`, acceptance script PASS without outcome link, mission recovery `objective_score: PASS` without build completion receipt.

---

## 6. Canonical DONE chain (governance decision)

**DONE** is **measurement completeness**, not delivery proof.

**Canonical DONE chain (evidence-only — demoted from terminal):**

```
build_task_id assigned
        │
        ▼
recordBuildStart (build_task_ledger)
        │
        ▼
AI/build work executes (token_usage_log or unmetered exception)
        │
        ▼
OIL/security receipt linked to task_id
        │
        ▼
recordBuildComplete → end_time set
        │
        ▼
canMarkBuildDone() → measurement_complete: true (evidence_only)
        │
        ▼
Fed into grantBuildCompletion() — NEVER alone grants terminal PASS
```

**Rejected as canonical DONE:** `done_gate_passed: true` without completion authority grant.

---

## 7. Canonical completion chain (governance decision)

**Completion** is the **only legal terminal transition** for build/product delivery.

```
CompletionRequest {
  founder_request, required_outcome, technical evidence, commit.sha
}
        │
        ▼
evaluateBuildCompletion()
        │
        ├── technical.ok === false → FAIL_INCOMPLETE_TECHNICAL
        ├── missing SHA or founder_request → FAIL_MISSING_EVIDENCE
        ├── outcome mismatch → FAIL_WRONG_OUTCOME
        └── both gates pass → grantBuildCompletion()
                │
                ▼
        completion_receipt_id + terminal_status (COMMITTED / PASS per lane)
```

**Governance decision:** All legacy writers (`canMarkBuildDone`, acceptance scripts, BP sync, mission recovery PASS) become **evidence producers** subordinate to this chain.

**Known gap (unproven U-02):** `/build` may return 409 after commit with `committed_but_not_complete` until ordering and measurement wiring align with this chain.

---

## 8. Canonical BuilderOS execution chain (governance decision)

```
BP_PRIORITY item OR founder command (scoped)
        │
        ▼
POST /api/v1/lifeos/builderos/command-control/jobs
        │
        ▼
POST .../jobs/:id/execute
        │
        ▼
builderos-governed-loop-executor.executeCommandControlJob()
        ├── OIL boundary audit (zone, safe scope, instruction)
        ├── PBB plan (target_file, task, required_outcome)
        ├── POST /api/v1/lifeos/builder/build  [kernel-wrapped]
        │       ├── precommit governance
        │       ├── commitToGitHub (single commit actuator)
        │       ├── measurement evidence (kernel ledger)
        │       └── completion authority (terminal)
        ├── verifyBuilderOutput (technical)
        └── verifyGovernedOutcomeBeforePass (outcome)
        │
        ▼
job status: committed | blocked | failed | FAIL_WRONG_OUTCOME
```

**Rejected from this chain:** `/builder/execute`, auto-builder, shadow queue direct `/build`, governed-loop `/execute` fallback.

**Autonomous scheduler (only accepted):** `governed-overnight-backlog-run.mjs` → command-control (not shadow queue).

---

## 9. Canonical C2 execution chain (governance decision)

```
Founder / operator / Voice Rail / C2 UI
        │
        ▼
routes/lifeos-command-center-routes.js  [ROOT A canonical C2 aggregate]
        │
        ├── Observability: proof-freshness, phase14, supervised-autonomy, telemetry
        ├── Communication → command-control job create (build intents)
        └── Deliberation / gate-change (governance sessions — not git commit)
        │
        ▼
POST /api/v1/lifeos/builderos/command-control/jobs
POST .../jobs/:id/execute
        │
        ▼
[Canonical BuilderOS execution chain §8]
```

**Rejected C2 paths:** `routes/command-center-routes.js` (ROOT C) for new work; `POST /api/build/run`; old CC autopilot build-now endpoints.

**C2 role:** Orchestration, observability, founder comms — **not** independent commit authority.

---

## 10. Canonical Voice Rail execution chain (governance decision)

```
Founder utterance (Voice Rail UI / API)
        │
        ▼
lifeos-voice-rail-routes.js → voice-rail-v1 / intent-router
        │
        ├── Conversation / brainstorm / emotional → department reply (ChC default)
        ├── Provider proof ("Talk to GPT/Claude/Gemini") → founder-direct-provider
        ├── System knowledge query → system-agent (read-only repo evidence)
        ├── Provider tool proof → provider-tool-proof → system-proof-event (DB)
        └── Build / execute command intent
                │
                ▼
        voice-rail-command-executor → command-control job
                │
                ▼
        [Canonical BuilderOS execution chain §8]
                │
                ▼
        voice-rail-execution-truth (honest receipt — no background-work lies)
```

**Governance decisions:**
- Voice Rail **must not** silently call `/builder/build` or `/builder/execute` outside command-control for founder build commands.
- `fail_closed_founder_comms` and execution truth manifest are **protected** behaviors.
- Department routing (ChC, Hist, SNT, CFO, BPB, SDO, CDR) applies to **reply engine**, not to bypass build governance.

---

## 11. Systems that MUST survive consolidation

| System | Reason |
|--------|--------|
| Governed loop executor | Only SAFE outcome path |
| Command-control jobs API | Single orchestration intake |
| Council `/builder/build` (kernel-wrapped) | Single commit actuator |
| Completion authority module | Terminal writer target |
| Outcome verifier | Wrong-outcome guard |
| BP_PRIORITY.json + guardrails verify | Machine queue SSOT |
| TSOS platform kernel wrap | Receipt choke |
| Token accounting + useful-work guard | Cost/zero-waste law |
| OIL security receipts + proof freshness | Verification division |
| Voice Rail + execution truth | Founder interface honesty |
| Pre-commit constitutional hooks | Last git barrier |
| register-runtime-routes.js (ROOT A) | Canonical mount surface |
| railway-managed-env + deployment spine | Self-deploy |
| Neon + migration runner | State persistence |
| Hist boundary + registry | Prevents legacy reactivation |
| Zone / patch-mode policy | Prevents stub commits |
| Product acceptance receipts (when linked) | Technical evidence |
| factory-staging (fenced) | Canonical factory runtime pre-cutover |
| TC/Revenue product routes (business lane) | Revenue phase 1 mission |

---

## 12. Systems that MAY be consolidated

| System | Consolidation action allowed |
|--------|------------------------------|
| ROOT B (`server-routes.js`) | Merge into ROOT A after audit |
| ROOT C (`two-tier-system-init.js`) | Migrate routes to ROOT A; delete bundle |
| Legacy memory mount (`memory-routes.js`) | Consolidate to memory-intelligence path |
| Duplicate enhanced-council / api-cost-savings mounts | Remove ROOT C duplicates |
| Old command-center-routes.js | Retire after path migration |
| Multiple builder npm scripts | Single canonical runner helper |
| TSOS task ledger orphan route | Archive or wire — one ledger concept |
| `lumin-factory/` duplicate tree | Collapse after verify |
| Acceptance scripts | Unify finish helper through completion authority |
| DONE gate helper | Demote to evidence-only |
| server.js inline tombstones/duplicates | Remove after ROOT A covers |
| Deliberation + gate-change surfaces | May merge observability under C2 aggregate (API only) |

---

## 13. Systems that MUST be retired

| System | Governance reason |
|--------|---------------------|
| Shadow queue + daemon queue phase | Parallel queue; violates BP law |
| Auto-builder commit endpoints (`/api/v1/system/build`, `/api/build/run`) | Parallel git authority |
| Public `/builder/execute` | Commit bypass |
| Governed-loop `tryExecuteFallback` → `/execute` | Hidden bypass |
| Old CC `command-center-routes.js` bundle | Shadow C2 |
| Hist mission queue as product orchestration | Wrong domain |
| Self-improvement-loop / self-programming as execution | Superseded |
| Dev commit/replace-file on production profile | Ungated high risk |

---

## 14. Systems that MUST NOT be retired

| System | Reason |
|--------|--------|
| NSSOT + amendment chain | Constitutional law |
| BP_PRIORITY.json | Active product queue |
| Governed loop + command-control | Core orchestration |
| `/builder/build` (not `/execute`) | Canonical actuator |
| Voice Rail v1 stack | Primary founder interface (BP rank 1) |
| Action Inbox | Shipped product (BP rank 3) |
| factory-staging/ (until cutover decision) | Canonical factory runtime |
| builderos-reboot/ Hist artifacts | Salvage/history — retire **authority**, not archive |
| TC / MLS / ClientCare revenue spine | Business mission |
| Pre-commit hooks | Enforcement |
| Useful-work guard | Zero-waste law |
| OIL + token accounting | Proof and cost |
| Execution truth / fail-closed Voice Rail | Founder trust |
| Zone 3 policy (policy itself) | Safety — retire bypasses, not policy |
| Migration runner + env validator | Boot safety |
| Site builder / outreach (revenue path) | Phase 1 income — migrate mount, do not delete product |

---

## 15. Department concepts that survived all audits

Founder **seven-department separation of powers** (deliberation v2.7 / Voice Rail vocabulary) **survived** as governance doctrine:

| Dept | Role (accepted) |
|------|-----------------|
| **ChC** | Council Chair — founder comms, orchestration |
| **Hist** | Historian — ledger, lessons, evidence (Hist **domain** for legacy artifacts) |
| **SNT** | Sentinel — adversarial review, drift, proposed fixes |
| **CFO** | ROI, routing, spend stewardship; **TSOS metabolism under CFO** |
| **BPB** | Blueprint translation — SSOT → living blueprint, no solo code authority |
| **SDO** | Design — UX/visual when in scope |
| **CDR** | Code execution — receipts and blockers up, not solo terminal PASS |

**Also survived:** **Cncl** (full council) as escalation path for load-bearing items — not a daily Voice Rail department seat.

**Rejected department concept:** **TSOS as eighth equal department seat** (R-12).

---

## 16. Department concepts currently implemented

| Concept | Implementation evidence |
|---------|-------------------------|
| ChC, Hist, SNT, CFO, BPB, SDO, CDR | `config/voice-rail-departments.js`; Voice Rail health `departments[]`; reply_engine `lifeos/department` |
| Deliberation governance roster | `routes/deliberation-governance-routes.js`, `config/deliberation-governance.js` |
| Gate-change council | `routes/lifeos-gate-change-routes.js` |
| Hist domain (legacy) | `HIST_DOMAIN_REGISTRY.json`, `00-HIST-LEGACY-BOUNDARY.md` |
| BPB as blueprint phase | Mission `BLUEPRINT.json` files, factory intake gate slice |
| CDR as build execution | BuilderOS governed loop + `/build` (not a separate HTTP dept) |
| CFO routing in Voice Rail | `founder_auto`, provider list, token accounting |
| Execution truth (ChC honesty) | `voice-rail-execution-truth.js` |

---

## 17. Department concepts that exist only in documentation

| Concept | Status |
|---------|--------|
| TSOS as standalone department seat | Doctrine says **under CFO**; not in `VOICE_RAIL_DEPARTMENTS` as separate id |
| Full Cncl session on every build | Documented escalation; not proven on all builds (U-07) |
| BPB ↔ CDR "two AIs same window" session law | Documented; not machine-enforced globally |
| Historian as production runtime enforcer | Factory historian; production Hist boundary partial (U-05) |
| Decision ledger as kernel authority driver | Am 46 planned; not implemented |
| CCL semantic capsules | Am 45 paper |
| Product development gate on production `/build` | Factory slice only (U-06) |
| Eight-department including standalone TokenSaver product dept | Not in canonical dept roster |

---

## 18. Has the project drifted from the original Founder architecture?

**Verdict: PARTIAL DRIFT — vision intact, execution architecture diverged.**

| Founder architecture element | Status |
|------------------------------|--------|
| LifeOS as whole-life consumer product | **Preserved** — routes, Voice Rail, phases |
| BuilderOS builds the system (not hand-authoring spine) | **Preserved as doctrine**; **violated in practice** by multi-path commits |
| TSOS / token efficiency / zero waste | **Preserved** — kernel, accounting, useful-work guard |
| AI Council / departments / separation of powers | **Preserved** in Voice Rail + deliberation |
| Financial independence phase 1 | **Preserved** — TC, site builder, revenue routes |
| Single truthful autonomous machine | **Drifted** — three roots, six build paths, 24 PASS writers |
| Fail-closed proof culture | **Preserved in design**; **drifted in execution** (FAIL_OPEN paths) |
| Factory reboot as active queue | **Drifted** — Hist archive; BP_PRIORITY is queue |
| Voice Rail as primary interface | **Preserved and advancing** (BP rank 1) |
| Ethics / constitution unalterable | **Preserved** in NSSOT chain |

**Governance summary:** Drift is **structural** (authority duplication, mount sprawl), not **missional** (LifeOS purpose, founder interface, builder-first intent). Consolidation is **realignment**, not reboot.

---

## FOUNDER ARCHITECTURE PRESERVATION TEST

*If every **accepted** consolidation from the audits were executed:*

### What survives?

- LifeOS product surface (Voice Rail, commitments, inbox, personal OS phases)
- BuilderOS as the **only** machine that commits product code
- TSOS kernel, token accounting, zero-waste schedulers
- Seven-department founder vocabulary and Voice Rail honesty layer
- NSSOT, amendments, BP priority queue, pre-commit law
- Command-control + governed loop + outcome verification
- OIL proof culture and receipt trails
- TC / revenue business lane
- Factory runtime (fenced or cut over with receipt)
- Hist as archive — lessons salvageable, not executing product queue

### What disappears?

- Shadow queue and overnight JSON queue authority
- Auto-builder as commit path
- Public `/builder/execute` and execute fallback
- Duplicate ROOT C C2 and duplicate route mounts
- False confidence from 317-row PRESENT inventory
- Independent PASS from acceptance scripts without completion link
- Hist mission queue as competing product orchestrator
- Legacy self-programming / self-improvement execution loops as authorities

### What becomes stronger?

- **Truth:** one mount registry, one commit door, one completion writer
- **Founder trust:** Voice Rail receipts match actual execution
- **Autonomous operation safety:** overnight runs cannot silently false-PASS
- **Agent clarity:** one chain to read; no "which PASS counts"
- **Constitutional alignment:** builder-first and outcome verification become runtime facts
- **Cost discipline:** token/OIL receipts required before terminal success

### What becomes weaker?

- **Short-term velocity:** fewer bypass paths for "quick commits"
- **Legacy script compatibility:** supervisor, retry-plan, queue npm commands need rewiring
- **Permissive DONE semantics:** ledger-complete no longer implies mission done
- **Two-tier bundle convenience:** some site-builder mounts require migration work before delete
- **Exploratory hacking:** dev commit endpoints on production (correctly removed)

### What must be explicitly protected from accidental removal?

1. **Voice Rail execution truth** (`fail_closed_founder_comms`, lie detector)
2. **Governed loop + outcome verifier** (only proven SAFE path)
3. **BP_PRIORITY.json** and `lifeos:bp-priority:verify`
4. **Pre-commit hooks** (builder-first, SSOT, INTENT DRIFT)
5. **Hist boundary law** (salvage yes; active queue no)
6. **Zone 3 / patch-mode policy** (do not delete — satisfy with extract-helper)
7. **Useful-work guard** on all scheduled AI
8. **Product acceptance artifacts** (relink to completion, do not discard)
9. **Revenue spine** (TC, site builder, billing) during ROOT consolidation
10. **factory-staging/** until explicit cutover — protect from production git bleed, not from existence
11. **Founder department vocabulary** in Voice Rail (ChC–CDR)
12. **NSSOT supremacy chain** — consolidation docs subordinate to NSSOT, not replace it

---

## Governance sign-off metadata

| Field | Value |
|-------|-------|
| Document type | Decision pack (not migration plan) |
| Supersedes | Ad hoc agent interpretations of audit findings |
| Subordinate to | NSSOT, Hist boundary, founder explicit hold directives |
| Next governance artifact | Implementation missions reference decision IDs (T-/U-/R-) |

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-14 | `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md` | V1 governance decisions from completed audit corpus |
