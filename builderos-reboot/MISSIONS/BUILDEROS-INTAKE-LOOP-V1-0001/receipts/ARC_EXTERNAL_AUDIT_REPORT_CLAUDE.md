<!-- SYNOPSIS: ARC External Audit Report -->

# ARC External Audit Report

**Auditor:** Claude Code (Sonnet 4.6)
**Date:** 2026-06-16
**Mission:** BUILDEROS-INTAKE-LOOP-V1-0001

## Executive verdict

**PASS WITH LIMITS.**

Every one of Composer's numerical claims independently reproduced exactly (`architect_pass: true`, `decision_gaps: 0`, `handoff_to_builder: true`, `translate.status: PASS`, freeze `FROZEN`, 14/14 `write_file_exact` steps). The mechanical pipeline is real, not theater — `simulate-blueprint-steps.js` and `builder-cold-walk.js` perform genuine structural checks (action_type support, CONTENT existence, phantom acceptance-test detection, freeze invariants) and I confirmed they actually execute that logic, not stub it.

The limits: (1) the "SNT attack" and "council translate" subsystems are confirmed stubs that report success without doing the work their names imply, (2) the self-grading loop has no independent second seat, only a deterministic second script in the same pipeline, (3) this PASS proves the mechanical-compile path works for a **snapshot/dogfood** mission only — it has not been shown to work for greenfield intent or for any mission without a hand-written compiler.

## Independent command results

| # | Command | Exit | Key result |
|---|---------|------|------------|
| 1 | `npm run builderos:arc:translate -- BUILDEROS-INTAKE-LOOP-V1-0001` | **0** | `status: ARC_TRANSLATE_PASS`, `compile.steps_count: 14`, `cold_walk.architect_pass: true`, `receipt.system_produced: true` |
| 2 | `npm run builderos:arc:simulate -- BUILDEROS-INTAKE-LOOP-V1-0001` | **0** | `summary: {total_gaps:0, blocking_gaps:0, clear_to_build:true}`. `steps:[]`/`all_gaps:[]` are **by design** — the simulator only appends entries for steps that fail a check (verified in source, `simulate-blueprint-steps.js:188-212`); it is not a record of "all steps passed," it's an absence-of-failure list. A genuinely empty `blueprint.steps` array is independently guarded at line 61-68 and would itself register as a blocking gap, so this run is not silently skipping the loop. |
| 3 | `blueprintFreezeCheck(BLUEPRINT.json)` one-liner | **0** | `blueprint_status: FROZEN`, `pass: true`, checks: `deterministic_step_set`, `authority_lock`, `exact_output_contract_present`, `non_goals_present` |
| 4 | `node builderos-reboot/scripts/execute-mission.mjs BUILDEROS-INTAKE-LOOP-V1-0001 --dry-run` | **0** | 14/14 steps printed `would write <target> <= CONTENT/<step>/<file>`, zero prompts, zero decisions. **Caveat:** dry-run does not check `exact_output_contract.sha256` (confirmed by reading `execute-mission.mjs` — no `sha256` reference in the dry-run branch). Hash verification only happens on a real (non-dry) run, in `run-step.js:102-114`. |
| 5 | `node --test tests/builderos-arc-simulation.test.js` | **0** | 4/4 pass. These are **unit tests of the simulator's detection logic against synthetic fixtures** (prose-only step, shell_command, inline exact_content, factory-shaped step) — they do not exercise this mission's actual 14-step blueprint. They prove the gap-detector works, not that this blueprint is gap-free (the live `arc:simulate` run is what proves that). |
| 6 | `npm run builderos:intake-loop:v1-acceptance` | **0** | `verdict: PASS`, 6/6 checks (`IL-ACC-01` schemas → `IL-ACC-06` founder-defect-service), `git_sha` pinned in output |

Independently re-verified blueprint shape with a standalone script (not the simulator): `BLUEPRINT.json` has exactly 14 steps, `action_types: ['write_file_exact']` — single value, no other type present. Matches the claim verbatim.

## Decision gap table

All 14 steps walked cold against `execute-mission.mjs` dry-run output + `BLUEPRINT.json` `exact_inputs`/`exact_output_contract`. Builder's action in every case: copy bytes from a fixed `CONTENT/<step_id>/<file>` path to a fixed `target_file`, then (on real run) hash-check against `exact_output_contract.sha256`. No step requires Builder to choose a path, name, format, or interpret prose.

| step_id | decision_gap | severity | required_owner |
|---|---|---|---|
| IL-S01 | null | — | — |
| IL-S02 | null | — | — |
| IL-S03 | null | — | — |
| IL-S04 | null | — | — |
| IL-S05 | null | — | — |
| IL-S06 | null | — | — |
| IL-S07 | null | — | — |
| IL-S08 | null | — | — |
| IL-S09 | null | — | — |
| IL-S10 | null | — | — |
| IL-S11 | null | — | — |
| IL-S12 | null | — | — |
| IL-S13 | null | — | — |
| IL-S14 | null (mechanically) — see Red-team Q3 for a *non-mechanical* staleness risk this table cannot capture | advisory | ARC |

0 blocking gaps, 0 advisory gaps in the mechanical sense. IL-S14 carries a flagged but non-blocking process risk, not a decision gap.

## Red-team answers

**1. Snapshot tool vs. greenfield Architect?**
Snapshot tool, confirmed. `snapshotRepoFile()` in `validate-arc-intake.js` copies bytes that Builder already wrote into the live repo into `CONTENT/`; if the source doesn't exist, compile fails closed (`BLOCKED_RETURN_TO_ARC`). This run proves ARC can mechanically **codify and freeze** intent that already has working code behind it (dogfooding its own intake loop). It proves nothing about ARC's ability to translate intent for a feature that doesn't exist yet in the repo — there is exactly one compiler registered system-wide (`compile-blueprint.js`'s `COMPILERS` map has one entry), and it is hand-written per-mission. Calling this "Architect" is aspirational; what's proven is "mechanical blueprint freezer for already-built work."

**2. Self-grading loop — what breaks circular trust?**
Partially broken, not fully. `runArcTranslate()` calls `compileBlueprint` (writer) and `simulateBlueprintSteps`/`coldBuilderWalk` (grader) in the same function, same process, same commit, same author. The grader is a separate deterministic script checking objective mechanical properties (action_type whitelist, file existence, sha presence, phantom-test-ID lookup against a real file) — it is not an LLM rubber-stamping its own prose, and a hostile blueprint (e.g., shell_command, missing CONTENT) was confirmed by unit test to actually fail it. But there is no independent process boundary, no second agent, and no adversarial run from outside this pipeline. The one component literally named for this job — `SNT_TRANSLATION_ATTACK_REPORT.json` — is a confirmed stub (see "What Composer got wrong" below). Circular trust is reduced by code, not broken by independence.

**3. IL-S14 — honest twin or stale-manifest risk?**
Real risk, confirmed mechanically. `PRE_ARC_INPUT_PACKET.json` is regenerated (with a fresh `assembled_at` timestamp) by `assemble-pre-arc-packet.mjs`, spawned mid-compile, then snapshotted into `CONTENT/IL-S14/`. I diffed `BLUEPRINT.PREV.json` against the current `BLUEPRINT.json`: the **only** difference between consecutive translate runs is IL-S14's `exact_output_contract.sha256`, churning every run purely from the timestamp — not from any real intake change. Within a single compile, blueprint and CONTENT snapshot are written together so they match. But `execute-mission.mjs --dry-run` does not check hashes at all, and even a real (non-dry) run only checks that the target byte-matches its own frozen CONTENT copy — it cannot detect that the frozen copy is semantically stale relative to intake artifacts that changed *after* compile and *before* execution. This is "honest at the instant of compile, blind afterward," not "honest machine twin" unconditionally.

**4. Missing V2 Pre-ARC receipts — still PASS?**
Yes, confirmed, and this is the most significant doctrine gap. Per-mission receipts exist for SNT (`SNT_TRANSLATION_ATTACK_REPORT.json/.md`) and a "Twin" simulation (`ARC_TWIN_SIMULATION_RECEIPT.json/.md`), but **no Chair forecast and no CFO resource-cost receipt exist anywhere in this mission folder**, and the SNT receipt that does exist is a stub (`attacks_run: 0`, see below). `entry-gate.js`'s `tier1CoveragePass()` treats `SUFFICIENT`/`LOCKED`/`PARTIAL` as passing and only blocks on `MISSING`/`MENTIONED` — it has no concept of "did SNT/Chair/CFO actually run." `requireArcReceipt` in the entry gate defaults to `false` (soft). So: yes, the v1 entry gate allows `architect_pass: true` with zero Chair/CFO involvement and a zero-attack SNT stub. The PASS is honest about what it checks (mechanical executability); it is not honest about satisfying full V2 doctrine, and nothing in the receipt JSON says "Chair/CFO skipped" — that omission is silent.

**5. Council translate path — usable, or stubbed?**
**Confirmed stub.** Read `services/builderos-arc-service.js` end to end. `callCouncilMember` is accepted as a constructor parameter but is **never invoked anywhere in the file** — not once. For a mission without a registered mechanical compiler, the function tries a mechanical dry-run preview; if that fails (which it always will, by definition, for an uncompiled mission), it returns `{ok:false, status:'ARC_COUNCIL_NOT_IMPLEMENTED_FOR_MISSION'}` and stops. There is no code path in this file that calls an LLM to translate intent. "Council mode" is a documented intention with a dead parameter, not a working fallback.

**6. AGENT_BYPASS history — does current BLUEPRINT trace to a system-produced receipt?**
Yes, with one correction to the prompt's premise: there is no `AGENT_BYPASS` mechanism anywhere in this codebase (repo-wide grep, zero hits outside this audit prompt itself). `BLUEPRINT.PREV.json` is not bypass evidence — it's a plain pre-overwrite backup written by `translate-mission.js:133` (`copyFileSync`) on every translate run. The current `BLUEPRINT.json` traces cleanly to `ARC_RUN_RECEIPT.json` (`system_produced: true`, `runner: factory-core/arc/translate-mission.js`), and I independently regenerated an identical receipt by re-running the command myself. One honesty note: `system_produced: true` is a hardcoded literal at the two call sites that write it (`translate-mission.js:110`, `run-pipeline.js:61`), not a derived/verified value — it is true by construction of "this code path ran," which is a fair use here, but it means the field can never independently catch a hand-edited blueprint being fed back through these functions.

**7. Two Builders, same result?**
Yes, by construction, with a caveat. Because every step is `write_file_exact` with a fixed source path and a sha256 contract checked on real execution (`run-step.js:102-114`), any conformant executor reading the same `BLUEPRINT.json` + `CONTENT/` will either produce byte-identical output or fail loudly on hash mismatch — there is no interpretation surface for a second Builder to diverge on. The caveat: this was verified by reading the contract-enforcement code and by my own dry-run reproduction, not by literally running two independent Builder implementations side by side, which the prompt's "interchangeability test" language implies. Given the contract design, that stronger test would almost certainly also pass, but I did not execute it.

## What Composer got right

- All headline numbers (`decision_gaps: 0`, `architect_pass: true`, `handoff_to_builder: true`, 14 steps, freeze `FROZEN`) reproduced exactly on independent re-run, same process, same code.
- The mechanical checks are real, not decorative: phantom-acceptance-test detection, action_type whitelist enforcement, CONTENT-existence checks, and freeze invariants are all genuine logic I read and partially exercised via unit tests — confirmed they reject bad input (shell_command, prose-only steps) in the test suite.
- `OBJECTIVE_VERDICT.json`'s `technical_pass: true` / `founder_usability_pass: false` split (read earlier this session) is an appropriately hedged claim, not overclaimed.
- `ASSET_REUSE_DECISION.json` correctly avoided introducing a second execution queue alongside `BP_PRIORITY.json` — a real prior critique, correctly resolved.
- The blueprint's step shape is structurally identical to the canonical `FACTORY-REBOOT-0004/BLUEPRINT.json` reference (same 16 keys per step), plus added provenance fields (`authored_by`, `compiled_by`, `compile_mode`) the canonical reference lacks — a net improvement, not a regression.

## What Composer got wrong or overstated

- **"SNT attack" is not an attack.** `SNT_TRANSLATION_ATTACK_REPORT.json` literally contains `"attacks_run": 0` while still returning `"verdict": "builder_clearance_yes"`. Naming a zero-effort stub "attack report" with a pass verdict is the single most misleading artifact in this mission folder.
- **"Council translate" is not a fallback**, it's dead code with an unused parameter (`callCouncilMember` is never called). If a mission without a mechanical compiler is attempted, ARC cannot translate it at all today — there is no AI-assisted path, only `ARC_COUNCIL_NOT_IMPLEMENTED_FOR_MISSION`.
- **No claim was made about Chair/CFO sim coverage, but none was disclaimed either.** The receipt is silent on the fact that two of the four V2 departments (Chair, CFO) have zero artifacts in this mission, while two others (SNT, Twin) have artifacts that don't do what their names say.
- Implicit framing of this as proof of "Architect" capability overstates scope: this is proof of a **blueprint freezer for one pre-existing, hand-compiled mission** (dogfooding the intake loop itself), not proof of greenfield intent-to-blueprint translation, which is the harder claim the "Architect" name implies.

## Top 3 fixes before trusting Architect on a real product mission

1. **Make `SNT_TRANSLATION_ATTACK_REPORT` either real or honestly named.** `factory-staging/factory-core/arc/translate-mission.js` (`writePostArcReceipts`, where this file is written) currently sets `attacks_run` from `simulation.summary.blocking_gaps`, not from any actual adversarial probing. Either wire real attacks (e.g., reuse the 5 attack patterns from `docs/constitution/PRE_ARC_FOUNDER_PACKET_V2/SNT_INTENT_ATTACK_RECEIPT.md`, run mechanically against `INTENT_COVERAGE_MAP.json`) or rename the artifact and field so `0` can't be read as "0 attacks found a problem" when it means "0 attacks were attempted."
2. **Implement or remove the council path in `services/builderos-arc-service.js`.** Either call `callCouncilMember` with the intake packet + ARC_JOB contract when no mechanical compiler is registered, or delete the dead parameter and the `mode: 'auto'`/`'council'` branches so the code stops implying a capability that doesn't exist. Today, any mission without a hand-written file in `factory-staging/factory-core/arc/compilers/` is a hard stop, full sentence.
3. **Close the IL-S14 staleness gap or document it as a known limitation in `ARC_JOB.json`'s `must_not` list.** Either add a check (e.g., recompute `PRE_ARC_INPUT_PACKET.json`'s sha at execution time, not just compile time, and compare to the live intake files) or add an explicit `must_not: "execute a blueprint whose compile timestamp predates a later intake artifact change"` rule plus a receipt field recording compile-to-execute time delta, so a future "stale blueprint executed against changed intent" failure is traceable instead of silent.

## Would you hand this BLUEPRINT.json to Builder?

**Yes, for this specific mission, right now** — every step is mechanically verified `write_file_exact` with existing CONTENT and a sha256 contract Builder will enforce on real execution, so there is no decision surface left for Builder to fill in. **No, as a general endorsement of "Architect is ready for arbitrary product missions"** — outside this one dogfooded, pre-compiled mission, ARC has exactly one registered compiler and a non-functional council fallback, so the next real product mission will hit `ARC_COMPILER_MISSING` and stop, not translate.

## Score: Architect readiness — 4/10

Be harsh, as asked. The mechanical core (compile → freeze → simulate → cold-walk) is genuinely solid engineering and earns real credit — it isn't agent theater, the gap-detection logic actually rejects bad blueprints in tests, and the byte-exact contract design eliminates Builder discretion by construction. But "Architect" implies translating arbitrary founder intent into a buildable blueprint, and today that only works for one mission whose compiler was hand-written by someone who already knew the answer (the files being snapshotted already existed in the repo). The two components specifically meant to provide adversarial/independent assurance — SNT attacks and council fallback — are both confirmed non-functional stubs wearing real names. A system that mechanically freezes known-good work while two of its named safety nets do nothing is a capable blueprint compiler, not yet a trustworthy Architect.
