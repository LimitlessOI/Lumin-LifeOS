<!-- SYNOPSIS: Truth audit — does BuilderOS actually enforce the constitutional manufacturing lifecycle end-to-end? Repository evidence per stage. -->

# Factory lifecycle truth audit — what exists vs what we just designed (2026-08-11)

| Field | Value |
|---|---|
| **Product** | `builderos` |
| **SSOT** | `docs/products/builderos/PRODUCT_HOME.md` |
| **Companion** | `BUILDEROS_GOVERNANCE_REPAIR_BLUEPRINT_2026-08-11.md` (v1.2.0) |
| **Mandate** | Founder + Conductor-channel review: *"the immediate job isn't to design this process. It's to inspect the real implementation and prove whether BuilderOS actually enforces the constitutional process end-to-end."* |
| **Method** | Direct file inspection. Every claim carries file:line. Labels: **KNOW** = read the bytes; **THINK** = inference from read bytes; **DON'T KNOW** = not established. |
| **Terminology** | **Conductor**, not Chair, in all new text. Machine seat id remains `CHAIR` (see §6 — real collision found). |

---

## 0. Verdict

**The constitutional lifecycle is not enforced end-to-end. Three of the stages that matter most are either unwired, self-approving, or bypassable by the caller.**

The single most important finding:

> **`runChairConsensusGate` — the function implementing the constitutional requirement that "no mission proceeds to build without a validated reasoning plan and a Chair seal" (§2.0K) — has zero callers.** It is imported by nothing. The mission that was supposed to wire it is marked `status: "complete"` with `receipt_verdict: "PASS"`, and a constitutional mapping document lists the law as `enforced`.

That is the same defect class the Overlay incident exposed, found one layer higher: not an invented schema, but an **invented enforcement claim**. It is also precisely why inspecting was the right instruction and designing more would have been the wrong one.

Second finding: even if it were wired, that gate **manufactures its own approval** — it generates the plan when none is supplied, mints its own seal, fabricates the confidence value it then checks, and fills the `unknowns`/`assumptions`/`risks` arrays it then validates.

Third finding: the gate that *is* wired on the build path (`runBpbIntakeGate`) honors a caller-supplied `skip_intake_gate: true`.

---

## 1. The lifecycle as specified (founder + Conductor channel, 2026-08-11)

```text
Intent
  → Conductor + Architect + Factory/Builder consensus
  → Blueprint
  → FULL Factory Readiness Review (entire blueprint; every unauthorized decision, not the first)
  → repair loop (Factory → Conductor → Architect → consensus → amend → re-review entire blueprint)
  → FACTORY READY (zero unauthorized manufacturing decisions)
  → Conductor Manufacturing Plan (slices, deps, sequence, parallelism, integration points, assignment)
  → Architect independent review of the plan
  → Conductor + Architect + Factory consensus
  → authorized dependency graph
  → Queue (mechanical scheduler only)
  → parallel peer Factories
  → integration gate
  → Sentry
  → Reality
  → learning / trust scoring
```

## 2. Stage-by-stage truth table

| # | Stage | Status | Load-bearing evidence |
|---|---|---|---|
| 1 | Intent → multi-party consensus **before** blueprint | **PARTIAL** | Real artifacts + gate exist: `IDC_CONSENSUS_RECEIPT` (`idc_consensus_receipt_v1`, written by `factory-staging/factory-core/arc/foundation/pre-arc-enrichment.js:66-93`), gate `IDC_EXIT` HARD in `GATE_ENFORCEMENT_MATRIX.json:45-57`. But the consensus seats are `SNT/CHAIR/CFO/WISDOM` (`pre-arc-enrichment.js:68`) — **Builder/Factory is not a party** |
| 2 | Architect → Blueprint | **EXISTS** | `BLUEPRINT.json` per mission (`artifact_alias_registry_v1` `machine_path`), ARC receipts, `scripts/verify-blueprint-authority.mjs` wired into `builder:preflight` |
| 3 | **Full Factory Readiness Review** (whole blueprint, all defects) | **PARTIAL — shape exists, completeness unproven** | Real: `BUILDER_ENTRY` gate HARD requires `BUILDER_SIMULATION_REPORT zero blocking gaps` + `PRE_BUILD_VALIDATION_PACKET` (`GATE_ENFORCEMENT_MATRIX.json:124-133`); `npm run builderos:builder:pre-build` → `builderos-reboot/scripts/builder-pre-build-simulate.mjs`. Constitutional basis is **permissive**, not mandatory: §2.0K says the Builder *"may refuse"* a blueprint (`NORTH_STAR_SSOT.md:340`) |
| 4 | Repair loop back through Conductor + Architect with amendment | **MISSING as a mechanism** | `on_block: "BLOCKED_RETURN_TO_ARC"` exists as a *label* in mission blueprints (e.g. `SYSTEM-NOTIFY-EMAIL-0001/BLUEPRINT.json:32`), and `BLOCKED_RETURN_TO_ARC_OR_IDC` is the `BUILDER_ENTRY` blocker. **DON'T KNOW** of any code that routes a block into an amendment + re-review cycle; no amendment/re-review receipt type exists in `ARTIFACT_ALIAS_REGISTRY.json` |
| 5 | `FACTORY_READY` as a typed state | **MISSING** | No such status in `db/migrations/20260625_blueprint_intake.sql` CHECK list, no `FACTORY_READY` gate in `GATE_ENFORCEMENT_MATRIX.json`, no completion level in `COMPLETION_VOCABULARY_SSOT.json` ladder |
| 6 | **Conductor Manufacturing Plan** (the stage under discussion) | **MISSING — primitive exists, misapplied** | `services/goal-decomposition.js` is real and computes exactly the right shape (`ready_sub_goals` vs `blocked_sub_goals` from `depends_on`, lines 23-24; `nextReadySubGoal` line 28). Its only production caller feeds it **verification labels, not build slices**: `reasoning-plan.mjs:199-205` passes `steps: reality_measures.map(m => ({ title: 'verify ' + m }))` and never sets `depends_on`, so every sub-goal is "ready" and nothing is ever blocked. No persistence, no file-overlap check, no factory assignment, no authorization |
| 7 | Architect independent review **of the plan** | **MISSING** | No plan artifact exists to review (see #6) |
| 8 | Authorized dependency graph handed to Queue | **MISSING** | Dependency resolution happens **at execute time inside the executor**, not as pre-authorized input: `sortIntakeSteps()` topologically sorts `step.deps` at dispatch (`services/intake-blueprint-executor.js:21-42`) |
| 9 | Queue is mechanical only | **PARTIAL / inverted** | `QUEUE_AUTHORITY` gate names `builderos-reboot/BP_PRIORITY.json` canonical (`GATE_ENFORCEMENT_MATRIX.json:160-164`) and `CANONICAL_EXECUTION_SPINE.json` fixes entrypoints. But because #6-#8 are missing, **the executor is currently the thing that decides order** — the queue does compute part of the plan |
| 10 | Parallel peer factories | **MISSING** | No factory identity anywhere in the gate/queue path. `INTAKE_CONCURRENCY_DEFAULT` does not exist in code; intake has a **single in-process boolean** guard `let _backfillRunning = false` (`services/blueprint-intake.js:504`), which is per-process, not a lease |
| 11 | Integration gate | **MISSING as a distinct gate** | Verification is per-step (`behavior_assertions`) plus per-product acceptance (`acceptance_command`). No integration/assembly gate in `GATE_ENFORCEMENT_MATRIX.json` or `MISSION_PHASE_ARTIFACTS.json` |
| 12 | Sentry | **EXISTS (two different things)** | Documented in the governance-repair blueprint §9; `sentry_product_registry_v1` + `scripts/sentry-prealpha-gate.mjs` (product) vs factory step Sentry |
| 13 | Reality | **EXISTS on the factory lane** | Real scorer: `factory-staging/factory-core/arc/foundation/reality-score.js` → `scoreRealityAgainstSimulations()` writes `PREDICTION_RECEIPT.post_build` + `receipts/TWIN_DRIFT_REPORT.json`, called from `arc/run-foundation.js:211` and `builderos-reboot/scripts/execute-mission.mjs:400`; merged into `RESULT_SCOREBOARD.json` (`result-scoreboard.js:18`, field `simulation_vs_reality`). **Correction:** `REALITY_CHECK_RECEIPT` — which I cited in an earlier draft — **does not exist**: named in `DEPARTMENT_ROLE_CONTRACT.json:103` and product docs, zero files, no writer |
| 14 | Learning / trust scoring | **PARTIAL — strongest area** | Real ranked per-`(model_tier, role)` trust ledger with a deception counter, exposed at `GET /factory/model-rankings`. See §7 |

**Score: 2 of 14 stages fully exist. The four stages the founder just specified (4, 5, 6, 7) are the ones with the least real machinery — plus 10 and 11.**

### 2.1 Corroborating findings from two independent sweeps

Two parallel inspections were run specifically to try to disprove the `MISSING` verdicts above. They confirmed them and added the following, all of which matter for C3/C4:

| Finding | Why it matters |
|---|---|
| **`OB_EXECUTION_LADDER.json` has no `.js`/`.mjs` reader** | Another governance JSON that describes "continue to next ready slice" and enforces nothing. Continuity actually lives in `selectNextStep` / `reviveStaleBlockedSteps`. Same class as `DO_NOT_INVENT.json` (R5) |
| **`scripts/builder-readiness-audit.mjs:145-152` contains a hardcoded array literally named `manufacturingPlan`** | Written into an audit JSON, consumed by no execute path. The *word* exists in the repo; the *stage* does not |
| **Field-name divergence: intake steps use `deps`, mission blueprints use `dependencies`, BUILD_QUEUE uses `depends_on`** | Three dependency vocabularies for one concept. Any C3 dependency graph must reconcile these or it will silently mis-order work |
| **`maxStepsPerProduct` defaults to `1`** (`governed-autonomous-shipping-loop.js:954`) | Serial by default, and the concurrency knob that exists (`BUILDER_MAX_CONCURRENT=3` in `scripts/autonomy/builder-supervisor.js:57`) belongs to a **separate** subsystem not wired into `/factory/ship-queue` |
| **Three divergent partial-failure semantics** | Mission path fails fast (`run-mission.js`); governed ship halts with `resume_from`; **intake `continue`s past a failed step** (`intake-blueprint-executor.js:645-647`) and still runs later steps. There is no full-mission rollback anywhere. C3's "what happens if one slice fails" has no single answer today |
| **`services/self-repair-target-reputation.js` + `self-repair-quarantine.js` are fully dormant** — no caller outside themselves | A **second** independent zero-caller instance. Strengthens the case that M0's caller sweep should be mechanical and repo-wide, not a one-off check of a single gate |
| **Reality scoring is real on the factory lane** (`reality-score.js`, called from `run-foundation.js:211`) | Corrects any impression that Reality is unmeasured. It is measured — and then not connected to trust (§7) |

---

## 3. Finding 1 (critical) — the constitutional Conductor gate is unwired

**KNOW.** §2.0K of `docs/constitution/NORTH_STAR_SSOT.md:339` states:

> "The Chair is the runtime entry gate: no mission proceeds to build without a validated reasoning plan and a Chair seal."

The implementation exists: `factory-staging/factory-core/builder/chair-consensus-gate.mjs:46` exports `runChairConsensusGate`.

Repo-wide search for callers (excluding `.jsonl` logs and the generated synopsis index) returns **three** hits, none of them a call site:

1. `factory-staging/factory-core/builder/chair-consensus-gate.mjs:46` — the definition itself.
2. `builderos-reboot/MISSIONS/FACTORY-REPAIR-AND-AUTONOMY-0001/BLUEPRINT.json` — step `FRA-010`, whose `required_edits` say *"Integrate the gate into dispatchExecuteStep so no step proceeds without a validated plan and Chair seal."* The step is recorded `"status": "complete"`, the mission `"receipt_verdict": "PASS"`, `receipt_path: products/receipts/REPAIR_AND_AUTONOMY_V1_ACCEPTANCE.json`.
3. `docs/constitution/proposals/2026-08-02-CONSTITUTION-DIGITAL-TWIN-PLAN.md:115,119,131` — maps §2.12 and §2.0K to `chair-consensus-gate.mjs` with status **`enforced`**.

The actual gate chain in `dispatchExecuteStep` (`factory-staging/factory-core/builder/run-step.js:132-169`) is: structural field check → `runBpbIntakeGate` → authoring → write → assertions. **There is no consensus/seal gate.**

**Why this matters more than a missing feature:** the system asserted a constitutional law was enforced, passed its own acceptance, and wrote a PASS receipt — while the enforcing function was never called. This is the 2026-08-08 "zero real callers" class already named in `CLAUDE.md`, now sitting on the constitutional gate layer. It also means the governance-repair blueprint's M2/M3 typed gates would be stacked on top of a gate that does not run.

## 4. Finding 2 (critical) — the gate self-approves by construction

**KNOW.** Even wired, `runChairConsensusGate` cannot fail for the reasons that matter. Reading `chair-consensus-gate.mjs`:

| Line | Behavior | Consequence |
|---|---|---|
| 52 | `autoGenerate = true` default | No plan supplied → gate creates one |
| 69-70 | `plan = createReasoningPlan({ mission: step?.title … })` | The reviewed artifact is authored by the reviewer |
| 75-77 | `plan.unknowns ??= []; plan.assumptions ??= []; plan.risks ??= []` | Then lines 102-104 check `Array.isArray(...)` — always true |
| 78-80 | `plan.propagated_confidence = 0.75` when absent | Then line 105 checks `>= 0.5` — always true |
| 92-95 | `if (!plan.chair_seal) plan.chair_seal = createChairSeal(plan)` | Mints its own seal |
| 97 | `sealOk = seal.startsWith('chair-seal-')` | Validates the string it just wrote |
| 13-26 | `createChairSeal` uses a 32-bit `((hash << 5) - hash + charCode)` string hash | Not a signature; forgeable and non-cryptographic. The file's own comment admits it: *"replaced when live council signing is available"* |
| 11, 66 | `CHAIR_GATE_STRICT` is read but only **reported** in the failure body; it never forces `autoGenerate = false` | The strict switch does not make the gate strict |

**THINK:** this is an honest bootstrap shim ("keep existing queues moving") that was then recorded as constitutional enforcement. The shim is not the violation; the claim is.

## 5. Finding 3 — caller-controlled bypass on the gate that does run

**KNOW.** `run-step.js:136` reads `const skipIntake = body?.skip_intake_gate === true;` and line 156 wraps the only upstream gate in `if (!skipIntake)`. Any caller that can POST the step body can skip the BPB intake gate. Similarly `strict_upstream_gates` defaults to false (line 157), so the strict PD check is opt-in. This is the same shape as R4 in the governance-repair blueprint (executor gate skipped when the blueprint is passed inline) — a pattern, not a one-off.

---

## 6. The constitutional claim, checked honestly

The founder stated the three-way consensus is *"already in the constitution."* Verified result: **partially true, and weaker than described.**

| Claim | Reality | Evidence |
|---|---|---|
| Consensus before build is constitutional | **TRUE** | §2.0K flow includes `Independent Reasoning → Consensus`; §2.12a makes consensus quality non-derogable (`NORTH_STAR_SSOT.md:535-551`) |
| Builder/Factory participates before Factory Ready | **WEAKLY TRUE** | §2.0K:340 — the Builder **"may refuse"** a blueprint with unresolved contradictions, missing dependencies, or missing acceptance criteria. Permissive. It is **not** "must review the entire blueprint and enumerate every unauthorized decision." The mandatory version lives in the `BUILDER_ENTRY` gate's `BUILDER_SIMULATION_REPORT zero blocking gaps` requirement, not in the constitution |
| A three-party (Conductor + Architect + Factory) consensus gate exists | **NOT FOUND** | Consensus seats in code are `SNT/CHAIR/CFO/WISDOM` (`pre-arc-enrichment.js:68`); Builder is not a consensus party in any receipt |
| A Manufacturing Plan / decomposition stage is constitutional | **FALSE** | §2.0K's required flow goes `Blueprint → Blueprint Validation → Builder`. There is no decomposition/assignment stage between them (`NORTH_STAR_SSOT.md:308-334`) |
| Prediction → Reality → Calibration incl. **model ranking** is constitutional | **TRUE** | §2.0L requires prediction, reality, and calibration that updates "confidence, **model ranking**, capsule trust, and future blueprints" (`NORTH_STAR_SSOT.md:343-360`). The leaderboard instinct is already law |

### 6.1 A real terminology collision — "Conductor" already means something else in Level-2 law

**KNOW, and this contradicts the terminology bridge I wrote yesterday.** The constitution already uses **Conductor** — for the *session supervisor* role (the IDE/chat agent), not the orchestration office:

- §2.11c *"**Conductor as supervisor** — system codes at scale; you audit, debate, and improve the platform"* (`NORTH_STAR_SSOT.md:502`)
- §2.11b *"**Conductor → operator**: evaluation, debate, and plain-language reporting"* (line 490)
- §2.13 ¶2 *"**The Conductor is the sheriff**"* (line 558)
- Dated **2026-04-25** in the version header (line 60), i.e. months before the Chair→Conductor rename

Meanwhile §2.0K names **Chair** as the runtime entry gate (line 339). So renaming Chair → Conductor makes one word mean both *the office that seals missions* and *the agent supervising the session and reporting to Adam* — inside non-derogable Level-2 law.

My `office.conductor` bridge entry in the governance-repair blueprint §18.5.2 would therefore make the deterministic terminology check ambiguous rather than precise. **This is a founder-only naming decision** (naming is founder jurisdiction per §18.2.3), and it is now blocker **OPEN-6**. Two clean options exist; I have no authority to pick:

- **(a)** Office = `Conductor`; rename the §2.11b/c session role to something distinct (e.g. `Session Supervisor`), amending Level-2 law under Article VII.
- **(b)** Office = a distinct term (e.g. `Conductor of the Council` / keep `Chair` in machine seats), leaving §2.11c untouched.

---

## 7. Trust, scoring, and incentives — much more exists than expected

**This is the one area where the repository is ahead of the design conversation.** A real, ranked, role-aware, deception-aware trust ledger is already live. Correcting my own earlier assumption: the leaderboard is not missing, it is built and exposed.

### 7.1 What is real and running

**KNOW.** `services/model-capability-ledger.js`:

- Table `model_capability_ledger`, primary key **`(model_tier, role)`** — trust is already **per-role, not one global score** (lines 45-57).
- Columns: `attempts`, `shipped_ok`, `trust_earned_count`, **`theater_detected_count`**, `escalated_count`, `last_effective_grade` (lines 48-53).
- `getModelRankings()` (line 105) is a genuine leaderboard, ordered **trust-earned rate first, then raw success rate, then attempt volume** (lines 118-121) — deliberately *not* ordered by volume or speed.
- It is **read**, not write-only: `GET /factory/model-rankings` (`routes/factory-mount-routes.js:23,352`) and `services/governance-law-review.js:63`.
- Recording is placed at a **chokepoint**, not left to callers to opt into: per the `docs/products/ai-council/PRODUCT_HOME.md:483` receipt, it hooks `runGovernedAutonomousShipOnce`'s per-step result processing in `services/governed-autonomous-shipping-loop.js`, so "recording cannot be silently skipped by a caller forgetting to opt in." Additional real call sites: `services/blueprint-intake.js:495` (`bpb_blueprinting`), `services/chair-findings-review.js:144,147,157` (`oil_review`, including `theater_detected: true`), `services/chair-lumin-unified.js:63-95` (`aic_debate`).
- `trust_earned` is documented as "the strict self/peer/compare honesty grade, not just `ok:true`" — closer to the founder's "correspondence with reality" than a completion counter.

**Constitutional basis already exists for the multi-dimensional requirement:** §2.0J Model Benchmarking Law (`NORTH_STAR_SSOT.md:274`) — *"Models must be benchmarked by role, not generic intelligence"* — and names ~9 roles. `KNOWN_ROLES` (lines 29-41) enumerates them and deliberately keeps unwired ones visible rather than hiding the gap. **8 of 10 roles now have real callers** — adding `verifier` (`routes/site-builder-prealpha-routes.js:292,295`), `security_review` (`scripts/ai-security-review.mjs:123,142,155`), `founder_intent_modeling` (`routes/factory-mount-routes.js:470,482,487`), `external_research` (`services/web-search-service.js:146-152`), and the `builderos_execution` chokepoint (`services/governed-autonomous-shipping-loop.js:1068`). Only `historian` and `summarizer` remain unwired. The file header still says 2 of 9 — stale comment, not a defect. **Caveat:** two of those call sites only record when a `pool` is threaded through (`chair-findings-review.js`, `web-search-service.js`), so recording silently no-ops when it is absent.

### 7.2 Requirement-by-requirement

| Requirement (founder) | Status | Evidence |
|---|---|---|
| Reality is the top-line score | **CONSTITUTIONAL, PARTIALLY BUILT** | §2.0L (`NORTH_STAR_SSOT.md:343-360`); §2.12a line 546 |
| Don't reward volume/speed | **ALREADY HONORED** | Ranking ignores volume except as a tiebreaker (`model-capability-ledger.js:118-121`) |
| One number is dangerous → per-dimension profile | **PARTIALLY BUILT + CONSTITUTIONAL** | Per-`role` composite key; §2.0J. Missing: the founder's specific dimensions (simplicity, reuse, integration quality, calibration) |
| Deception ≠ mistake | **BUILT AT THE COUNTER LEVEL** | `theater_detected_count` column; `services/truth-ladder.js`; `scripts/audit-false-done-steps.mjs` in `builder:preflight`; `BUILD_PASS_CLAIM` blocker literally named `false_success`. **But** Finding 1 is exactly what these exist to catch, and they did not catch it — a `theater_detected` counter cannot see an enforcement claim that was never called |
| Trust feeds work allocation | **DELIBERATELY NOT YET** | Self-labeled Tier-0 in `ai-council/PRODUCT_HOME.md:483`: real capture, "**not yet a hard gate on model SELECTION** — `TRUSTED_FALLBACK_MODELS`' order isn't auto-adjusted by this data yet," pending real attempt volume. Honest, and the loop the founder wants closed |
| Prediction → reality delta per mission | **EXISTS AND RUNS — three separate lanes** | (a) Factory: `reality-score.js` → `PREDICTION_RECEIPT.post_build` + `TWIN_DRIFT_REPORT` + `RESULT_SCOREBOARD.simulation_vs_reality`. (b) ADF ledger: `services/adf-prediction-ledger.js` (`filePrediction`/`recordActual`/`scorePrediction`/`appendLesson`) with a real auto-scorer `services/chair-prediction-score-scheduler.js:118` registered in `startup/boot-domains.js:237`, plus `/api/v1/adf/*`. (c) Legacy queue: `scripts/lib/prediction-loop.mjs` → `data/prediction-loop.jsonl`, validated **warn-only** (`scripts/validate-predictions.mjs` never exits non-zero) |
| **Reality outcome feeding the trust ledger** | **MISSING — this is the key gap, and it is one missing wire** | All three lanes above score prediction vs reality, and the ledger ranks models — **but nothing connects them.** `trust_adjustment.delta` is named only in `DEPARTMENT_ROLE_CONTRACT.json:105` with **no writer and no reader**. So the leaderboard measures "passed its gates at dispatch" while Reality is scored elsewhere and discarded for trust purposes. §2.0L requires the two to meet |
| Trust data actually steering model choice | **EXISTS-BUT-UNWIRED** | `getBestModelForLens` (`services/model-performance.js:122`) has **no production import** — the winner is computed and never consumed by routing |
| Prediction corpus actually closed in practice | **INFRASTRUCTURE LIVE, DATA OPEN** | All 36 sampled files in `data/adf-predictions/2026-06/` are `"status": "open"` with `score.scored_at: null`. The scorer exists and is scheduled; the corpus is unscored — so calibration has no history to learn from yet |
| Per-**factory** trust profile | **MISSING** | Scoring attaches to `model_tier` and council seat. There is no factory identity to attach a profile to (§2 #10) |
| Peer challenge earning trust | **MISSING as a trust mechanism** | Adversarial review is real (`SNT_INTENT_ATTACK_RECEIPT`, `SNT_TRANSLATION_ATTACK_REPORT`, `scripts/ai-security-review.mjs`) but SNT is a seat in the same council, not a peer factory, and a correct challenge updates no one's profile |
| Credit for self-caught defects | **MISSING** | **DON'T KNOW** of any metric crediting self-reporting. `services/builderos-improvement-loop.js` + `SENTRY_FINDINGS_QUEUE.json` consume findings; no actor earns trust for surfacing its own |
| "Blueprint was wrong, not the code" classification | **MISSING — and already asked for** | `ai-council/PRODUCT_HOME.md:483` records this as the unbuilt half of an earlier founder ask: *"a distinct SENTRY finding classification for 'code correctly matches the blueprint but the blueprint itself was wrong,' routed to architect-level review, which does not exist anywhere yet."* That is the same routing the Factory Readiness Review needs |
| Same-problem redundancy (independent solve, then compare) | **PRECEDENT, NOT MECHANISM** | Founder ran it manually today (two independent Overlay drafts). `run-greenfield-determinism-3x.mjs` proves determinism of one lane, not independent-solver comparison |
| Systemic-vs-individual diagnosis | **SEED EXISTS** | `scripts/builderos-gap-families.mjs` aggregates failure families; nothing yet distinguishes "this lane is weak" from "the blueprint/incentive is wrong" |

### 7.3 The structural conclusion

Two gaps, and neither is "build a scoreboard":

1. **Every scoring mechanism attaches to a `model_tier` or a council seat. The founder's design attaches trust to a *factory*** — an actor that does not exist as an addressable entity. **Factory identity is a prerequisite for the incentive design, not a later detail.**
2. **Reality is scored and trust is ranked, but the two are never connected.** This is better news than "nothing exists" and worse news than "it works": both halves of §2.0L are built on separate lanes, and the wire between them is a single missing writer (`trust_adjustment.delta` has none). Until that wire exists the leaderboard rewards "passed its gates," not "worked in Reality" — the exact distinction the founder drew between activity and correspondence with reality.

**THINK:** the cheapest honest first move is not new dimensions — it is (a) give factories identity, (b) write one existing reality artifact (`RESULT_SCOREBOARD` / `PREDICTION_RECEIPT.post_build`) back onto the ledger row it corresponds to, and (c) let the ranking actually steer selection, since `getBestModelForLens` already computes the answer and nothing reads it. Everything else the founder described composes on top of those three, and none of them requires a new scoreboard.

---

## 8. Consequences for the governance-repair blueprint (v1.2.0)

1. **M1–M5 remain valid and still come first.** No-invention, identity binding, typed gates, positive authorization, and durable jobs are prerequisites for any lifecycle; nothing found here weakens them.
2. **A new mission is required *inside* this repair: M0 — resolve the unwired self-sealing consensus gate.** Leaving it in place while adding typed gates above it would mean building authorization on a gate that never runs. Per §18.8 it is `C4_AUTHORITY_OR_SAFETY`. Only two honest outcomes: wire it with real (non-self-minted) sealing, or delete it and remove the `enforced` claim from the constitutional mapping doc. **Silently leaving it is not an option** — it is a live §2.6 exposure.
3. **Two new companion specs are needed (design only, not authorized to code):** `C3` Manufacturing Plan stage (stages 4-8, 11) and `C4` Factory identity + trust/incentive architecture (§7). Both are added to the blueprint as specs, both blocked behind founder decisions.
4. **The `internal_factory_only` abolition holds and is reinforced:** Finding 1 is exactly what happens when factory-internal work is trusted without independent verification.
5. **Design freeze scope must be stated precisely.** v1.2.0 is freeze-ready **for M1–M5 + C1 + C2 as scoped**. The end-to-end lifecycle is **NOT** freeze-ready, because C3/C4 are one day old and contain founder-only decisions.
6. **`OPEN-6` (Conductor naming collision) now gates the terminology bridge** — the bridge cannot be authored deterministically until the word means one thing.

## 9. Recommendation

- **Do not code.** Nothing here authorizes manufacturing.
- **Treat Finding 1 as the highest-priority item in the repair**, above the Overlay regression, because it proves the failure class is already inside the constitutional gate layer and the existing honesty harnesses did not catch it.
- **Answer OPEN-1…OPEN-6** (§20 of the governance-repair blueprint) before any design freeze.
- **THINK:** the sharpest cheap next experiment is a "claimed-enforced vs actually-called" sweep across every gate named `enforced` in `docs/constitution/proposals/2026-08-02-CONSTITUTION-DIGITAL-TWIN-PLAN.md` and `GATE_ENFORCEMENT_MATRIX.json` — Finding 1 was found by grepping for callers, which is mechanical, cheap, and repeatable. If one constitutional gate is unwired, the prior that others are should be high, not low.
