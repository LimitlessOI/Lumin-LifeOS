<!-- SYNOPSIS: BuilderOS full audit against constitution, SSOT, and product builder — 2026-07-30 -->

# BuilderOS Full Audit — 2026-07-30

**Auditor:** Devin conductor session  
**Scope:** BuilderOS runtime, factory, SSOT, product builder, and mission integrity against `docs/constitution/NORTH_STAR_SSOT.md`, `docs/constitution/POINT_B_DNA.md`, `docs/products/AUTHORITY_BOUNDARIES.md`, `docs/products/INDEX.md`, `docs/products/builderos/PRODUCT_HOME.md`, `builderos-reboot/BUILDEROS_WORKING_DEFINITION.json`, `builderos-reboot/CURRENT_BP_GAPS_V1.md`, `builderos-reboot/WORKSPACE_STATUS.md`, `builderos-reboot/HANDOFF.md`, `builderos-reboot/BP_PRIORITY.json`, and the `BUILDEROS-HARNESS-PROOF-0001` operational receipt.

**Claim labels used:** KNOW / THINK / GUESS / DON'T KNOW as required by constitutional law.

---

## Executive verdict

**KNOW:** BuilderOS is genuinely at `BOOTSTRAP_AND_STAGING_READY` — `npm run factory:ci` passes 25/25 checks, `builderos:working-definition:verify:operational` now passes 10/10, and `npm run builder:preflight` passes 401/401 after the env/trim fixes made in this pass.

**KNOW:** It is **not** `FULLY_MACHINE_READY`. `CURRENT_STATE.json`, `WORKSPACE_STATUS.md`, and `PROJECT_CERTIFICATION.json` all explicitly label `FULLY_MACHINE_READY: No` and `SAME_TIER_CODER_DETERMINISM: No`.

**KNOW:** The biggest honesty risks are not in the factory harness itself — they are in the surrounding build queue (`196` hard false-done steps), mission receipts (`PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` claims `PASS` while `builderos:doctrine:verify` HARD-fails with 32 missing receipts), and SSOT hygiene (`517` `.js` files missing `@ssot`, `5` files pointing to non-existent product homes).

---

## What this audit pass fixed

These are code-level fixes made while running the audit. They were caused by the dev shell inheriting a stale `PUBLIC_BASE_URL` with a leading space pointing to the retired `robust-magic-production.up.railway.app` host.

| File | Fix |
|------|-----|
| `scripts/builderos-pre-build-gate.mjs` | `dotenv.config({ override: true })` + `.trim()` base URL candidates |
| `scripts/builderos-intake-regression-harness.mjs` | `dotenv.config({ override: true })` + `.trim()` base URL candidates |
| `scripts/builderos-run-operational-proof.mjs` | `dotenv.config({ override: true })` + `.trim()` base URL resolution |
| `scripts/verify-builderos-working-definition.mjs` | `dotenv.config({ override: true })` + `.trim()` base URL resolution |
| `scripts/council-builder-preflight.mjs` | already had override + trim; re-confirmed |
| `scripts/system-commit-files.mjs` | already had override + trim; re-confirmed |
| `scripts/system-railway-redeploy.mjs` | `dotenv.config({ override: true })` |
| `services/builderos-intake-regression-harness.js` | added missing `await` before `runBlueprintAcceptance(...)` |
| `services/intake-blueprint-executor.js` | `.trim()` on `baseUrl` in `postBuilderBuild`, `postWireRoute`, and intake session fetch |

**KNOW:** After these fixes:
- `npm run builder:preflight` — 401/401 PASS
- `npm run factory:ci` — 25/25 PASS
- `npm run builderos:working-definition:verify:operational` — structural 10, operational 10, overall 10/10 PASS
- `npm run builderos:operational-proof` — PASS
- `npm run builderos:harness:audit` — 33/34 wired, 1 partial, 0 missing
- `npm run builderos:intake:regression:acceptance` — PASS (`socialmediaos-p1-golden`)

**KNOW:** `builderos:pre-build-gate` still reports `PBG-06` "deploy stale or diverged" because production serves `fb76241036ab` while local `main` is at `e79493d34fa1`. This resolves with the next `npm run system:railway:redeploy`.

---

## 1. Constitutional alignment

### 1.1 Point B DNA

`docs/constitution/POINT_B_DNA.md` is the supreme purpose: LifeOS exists to move from Point A to Adam-defined Point B, with reality as the scoreboard and no deception.

**KNOW:** BuilderOS machinery mostly serves this: it has `point-b-dna.js`, `services/point-b-navigator.js`, and `npm run lifeos:point-b:dna:verify` passes. The `builderos:working-definition:verify:operational` script explicitly distinguishes `structural_10` from `operational_10` and refuses to claim the latter without live proof — this is a Point-B-honest design.

**THINK:** The single biggest Point-B drift is the gap between claimed mission status and actual receipts. When `BP_PRIORITY.json` says `receipt_verdict: PASS` but `builderos:doctrine:verify` HARD-fails, the scoreboard is lying. See Finding 3.

### 1.2 North Star §2.11 / §2.11c

**KNOW:** The system has two builder paths — `factory-staging/` and `routes/lifeos-council-builder-routes.js`. `CURRENT_BP_GAPS_V1.md` (lines 69-76) acknowledges this and says it is acceptable for this hand-built blueprint pack. `FACTORY_AUDIT_PROMPT_SIMPLE.md` explicitly instructs auditors to accept `BOOTSTRAP_AND_STAGING_READY` and not demand `FULLY_MACHINE_READY` for this pack.

**THINK:** This is honest for the current pack, but it is structural debt. A cold model reading `builderos-reboot/INDEX.md` could be forgiven for thinking `factory-staging/` is the canonical runtime when production actually ships through `routes/lifeos-council-builder-routes.js`.

---

## 2. Runtime and production gaps

### 2.1 Runtime profile lockout

`services/runtime-modes.js` forces Railway to `founder_builder` unless `LIFEOS_RUNTIME_PROFILE=full`, `LIFEOS_ENABLE_FULL_RUNTIME=true`, `LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY=true`, etc. This is intentional founder safety, but it also means every boot path gated behind `fullRuntimeProfile` is dead in production unless explicitly enabled.

**KNOW:** Prior sessions moved `registerGovernanceReviewScheduler` and `controlPlane` mounts onto the founder runtime because of this. `builderos:pre-build-gate` now returns `runtime_profile: full` because the levers were added to `services/railway-managed-env-service.js` allowlist and set via the production managed-env API.

**THINK:** There may still be other `fullRuntimeProfile`-gated surfaces that have not been individually audited and moved. This is the same class of gap that killed the governance-review scheduler for several days.

### 2.2 Two builders, no cutover receipt

| Path | Role | Status |
|------|------|--------|
| `factory-staging/factory-core/builder/execute-step.js` | Clean factory step execution + TSOS + SENTRY | Wired, 1 partial in harness audit |
| `routes/lifeos-council-builder-routes.js` (`POST /api/v1/lifeos/builder/build`, `/execute-batch`) | Production GitHub-commit + Railway redeploy path | Live, used by `system:commit-files` |

**KNOW:** `builderos:harness:audit` lists `factory_execute_step` as `partial` because it is "CLI/factory only — production spine uses canonical `/build` until cutover receipt".

**THINK:** The system is stable, but there is no documented cutover plan or receipt that says when/if `factory-staging/` takes over production commits and deploys. This is a long-term architectural risk.

---

## 3. SSOT and authority-boundary gaps

### 3.1 `@ssot` tag drift

`node scripts/ssot-check.js --all` reports:

- **Tagged:** 772 `.js`/`.mjs` files
- **Missing tag:** 517 files
- **Pointing to non-existent product homes:** 5 files
  - `services/channel-memory.js → docs/products/CREATOR_MEDIA_OS/CREATOR_MEDIA_OS_HOME.md`
  - `services/receptionist-service.js → docs/products/AI_RECEPTIONIST/AI_RECEPTIONIST_HOME.md`
  - `services/trigger-mapper.js → docs/products/WELLNESS_STUDIO/WELLNESS_STUDIO_HOME.md`
  - `services/virtual-real-estate-class.js → docs/products/BUSINESS_TOOLS_PRODUCT_HOME/BUSINESS_TOOLS_PRODUCT_HOME.md`
  - `services/word-keeper-commitment-classifier.js → docs/products/WORD_KEEPER/WORD_KEEPER_HOME.md`

**KNOW:** This is a large authority-boundary drift. `AUTHORITY_BOUNDARIES.md` says if a path is in a product's `FILE_MANIFEST.json`, its `@ssot` must point to that product's `PRODUCT_HOME.md`.

**KNOW:** `npm run lifeos:product-home:verify` still passes. This means `verify-product-home.mjs` is not catching the same violations as `ssot-check.js --all`. The two verifiers are out of sync.

### 3.2 BuilderOS product home history sprawl

`docs/products/builderos/PRODUCT_HOME.md` has one new canonical `## Change Receipts` table at the top (lines 40-53) plus four older `## Change Receipts` tables further down with different column schemas, plus many standalone `**Last Updated:**` lines.

**KNOW:** The product home itself admits this in lines 36-38: "this file already had FOUR other, older `## Change Receipts` tables ... Consolidating all of them into one is a real, separate follow-up, not done here."

**THINK:** This is not a runtime blocker, but it is a cold-agent onboarding risk. A new agent cannot tell which table is canonical without reading the honest note.

---

## 4. Blueprint and mission integrity

### 4.1 Rank-1 BP mission claims PASS while doctrine fails

`BP_PRIORITY.json` rank 1 is `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`:

- `blueprint_status: complete`
- `receipt_verdict: PASS`
- `verdict: TECHNICAL_PASS`
- `founder_usability_pass: false`

`npm run builderos:doctrine:verify -- PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` (run 2026-07-30 18:11 UTC) HARD-fails with 32 violations:

- 14 missing development-phase receipts (`INTENT_BASELINE`, `IDC_CONSENSUS_RECEIPT`, `KNOWN_RISKS`, etc.)
- 5 missing corridor-phase receipts (`ARC_RUN_RECEIPT`, `BUILDER_SIMULATION_REPORT`, etc.)
- All 5 blueprint steps (`CCV1-S01` through `CCV1-S05`) "not executed — cannot discard"
- `OBJECTIVE_COMPLETE` mismatch
- Department-role receipts missing for SNT, CHAIR, CFO, WISDOM

**KNOW:** This is the clearest current example of receipt theater. The mission's `OBJECTIVE_VERDICT` or `BP_PRIORITY` entry claims completion, but the doctrinal proof chain does not exist.

**THINK:** Either the mission is not complete and its status must be downgraded, or the receipts were generated under a different name/path and are not discoverable by the doctrine verifier. In either case, the status is misleading.

### 4.2 False-done steps across the build queue

`npm run factory:false-done:audit` (run 2026-07-30 18:10 UTC) reports:

- **HARD = 196** (`MISSING_FILE = 160`, `IMPORT_BROKE = 36`)
- **SOFT = 115** content-drift rows
- Affected products include `ai-council`, `ai-receptionist`, `boldtrail`, `builderos`, `business-tools`, `creator-media-os`, `faith-studio`, `lifeos`, `lifere`, `limitlessos`, `marketingos`, `site-builder`, `socialmediaos`, `tc-service`, `video-pipeline`, `wellness-studio`, `white-label`, `word-keeper`, and others.

**KNOW:** BuilderOS itself has 2 HARD false-done rows (`builderos-6 → routes/mission-runtime.js`, `builderos-7 → services/income-priority.js`, `bo-runtime-fingerprint → routes/builderos-runtime-fingerprint-routes.js`).

**THINK:** These false-done claims are the same class of drift as the 19 false-done steps previously found in `lumin-university` and `lifere` BUILD_QUEUE files: a commit SHA is real, but it is not an ancestor of `origin/main`, or the target file is placeholder/stub content. The ship loop trusts `commitShippedFiles()` without confirming the commit reached `origin/main`.

### 4.3 Stale operational proof receipt

`builderos-reboot/MISSIONS/BUILDEROS-HARNESS-PROOF-0001/receipts/OPERATIONAL_PROOF.json`:

- Generated `2026-06-24T18:48:41.409Z`
- `production_base: https://robust-magic-production.up.railway.app` (dead host)
- `live_commit_sha: 2939323f571a9aa2a003b1b5a80d12e8bf4c9a3b`
- Claims `operational_overall: 10`, `structural_overall: 10`

**KNOW:** This receipt is stale and tied to a retired production host. It must be regenerated or moved to `docs/history/` with a stale label.

---

## 5. Factory harness and tool registry

### 5.1 Harness audit

`npm run builderos:harness:audit` (run 2026-07-30 18:07 UTC):

- Total tools: 34
- Wired: 33
- Partial: 1 (`factory_execute_step`)
- Missing: 0
- Required missing: 0

**KNOW:** All required harness tools are wired.

Platform gaps listed:
1. `deploy_stale_local` — local fixes may not be on production `/build` until commit+push+redeploy.
2. `factory_cutover` — `execute-mission.mjs` uses factory execute-step; canonical harness uses `/build`; two hot paths.
3. `founder_spine_orphans` — action-inbox, control-plane, token-accounting not on founder spine.
4. `legacy_queues` — `MISSION_QUEUE` + `builder-daemon` compete with `BP_PRIORITY`.
5. `mechanical_deliberation` — MECHANICAL tier deliberation skip requires deploy of council-builder routes.

### 5.2 Tool registry orphans

`BUILDEROS_TOOL_REGISTRY.json` (updated 2026-06-21):

- Wired tools: 21
- Orphan tools: 38

Top 10 integration priorities include `services/action-inbox.js`, `factory-staging/factory-core/bpb/intake-gate.js`, `factory-staging/factory-core/builder/execute-step.js`, `factory-staging/factory-core/sentry/run-verification.js`, `services/builderos-control-plane-service.js`, `services/token-accounting-service.js`, `services/useful-work-guard.js`, `services/builderos-governed-loop-executor.js`, `services/founder-value-engine.js`, and `services/web-search-service.js`.

**KNOW:** These orphans are documented and ranked. The registry is honest about what is not wired.

---

## 6. Provider and token reality

**KNOW:** Paid model providers are exhausted. `npm run builderos:openai:smoke` fails `429 insufficient_quota`. This means strong-model reasoning for Chair, council, and security review is currently unavailable unless free-tier failover succeeds.

**THINK:** This is a funding issue, not a code issue, but it directly affects whether the Chair can be "strong-model" as required by `CLAUDE.md` SO-003 and whether BuilderOS can run high-stakes autonomous builds.

---

## 7. Suggestions for making BuilderOS stronger

Priority is income-first where possible.

1. **Regenerate or archive the stale `OPERATIONAL_PROOF.json`.** Run `builderos:operational-proof` after the next redeploy and replace the `2026-06-24` receipt, or move it to `docs/history/` with a `STALE` banner.
2. **Fix the rank-1 mission status mismatch.** Either execute the missing `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` blueprint steps and produce the 31 missing receipts, or change `BP_PRIORITY.json` and the mission `OBJECTIVE_VERDICT` to `IN_PROGRESS` / `PARKED` with the doctrine failure cited.
3. **Reset and triage false-done steps.** Run `factory:false-done:audit --fix` to reset HARD false-done rows to `pending`, then prioritize the products closest to revenue (`socialmediaos`, `site-builder`, `lifeos`, `tc-service`) for rebuild.
4. **Reconcile `@ssot` drift.** Make `verify-product-home.mjs` catch the same violations as `ssot-check.js --all`, then bulk-fix the 517 missing tags and 5 dead product-home pointers.
5. **Consolidate BuilderOS product home history.** Merge the five `## Change Receipts` tables into one canonical table and archive the legacy ones.
6. **Document or execute the factory cutover.** Produce a receipt or mission that defines when `factory-staging/` execute-step becomes the production commit path, or explicitly defer it with a date/condition.
7. **Add drift detectors to preflight.** Include `node scripts/ssot-check.js --all` and `npm run factory:false-done:audit` in `builder:preflight` or a parallel CI gate so these gaps surface before the next build session.
8. **Restore paid model budget.** Without Anthropic/OpenAI/Together credits, `CLAUDE.md` SO-003 strong-model Chair and `SO-001` cheap→strong escalation are degraded to free-tier quality.

---

## 8. Human-only blockers (cannot be closed by code alone)

- Paid model API credits (OpenAI, Anthropic, Together).
- Email provider + verified sending domain for Site Builder / SMOS / TC outreach.
- A real card to complete a live $49 SMOS charge and a LifeOS paid-tier charge.
- Founder usability walkthrough for LifeRE / LifeOS to move `founder_usability_pass` from `false` to `true`.

---

## 9. Audit evidence log

| Command | Result | Time (UTC) |
|---------|--------|------------|
| `npm run builder:preflight` | 401/401 PASS | 2026-07-30 18:08 |
| `npm run factory:ci` | 25/25 PASS | 2026-07-30 18:10 |
| `npm run builderos:working-definition:verify:operational` | 10/10 PASS | 2026-07-30 18:10 |
| `npm run builderos:operational-proof` | PASS | 2026-07-30 18:08 |
| `npm run builderos:harness:audit` | 33/34 wired, 1 partial | 2026-07-30 18:07 |
| `npm run builderos:intake:regression:acceptance` | PASS | 2026-07-30 18:10 |
| `node scripts/ssot-check.js --all` | 772 tagged, 517 missing, 5 dead pointers | 2026-07-30 18:09 |
| `npm run factory:false-done:audit` | HARD=196, SOFT=115 | 2026-07-30 18:10 |
| `npm run builderos:doctrine:verify -- PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` | HARD fail, 32 violations | 2026-07-30 18:11 |
| `npm run builderos:tools:registry` | 21 wired, 38 orphan | 2026-07-30 18:11 |
| `npm run lifeos:point-b:dna:verify` | PASS | earlier in session |

---

*This audit is a point-in-time document. Re-run the commands in Section 9 to verify after fixes.*
