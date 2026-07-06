<!-- SYNOPSIS: Canonical product home — BuilderOS -->

# BuilderOS Product Home

**Formerly called:** Amendment 04 — AUTO BUILDER

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `builderos` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/builderos/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-03 — Founder-build progress streaming: `services/founder-build-job-store.js` now tracks an ordered `steps[]` per job (via new `appendFounderBuildJobStep()`, deduped, capped at 60), and `services/founder-build-self-repair.js` threads an `onProgress` callback through the build + CSS-patch pipelines to emit real milestones ("Reading your request", "Building the change", "Searching online for a fix", "Committing code", "Deploying to production", "Checking it worked live"); `startFounderBuildJob()` wires those into the job's steps so the founder UI can show the system's live background work. Prior: 2026-07-04T20:29 — route_wire_failed also continues. |

### Related docs (this product)

| Doc | Path |
|-----|------|
| Digital twin (code reality map) | [`TWIN.md`](TWIN.md) |
| BP V1 — close the loop | [`specs/BP_V1.md`](specs/BP_V1.md) |
| OpenAI execution ladder | [`OB_EXECUTION_LADDER.md`](OB_EXECUTION_LADDER.md) |
| Devin execution handoff | [`DEVIN_HANDOFF.md`](DEVIN_HANDOFF.md) |
| Alpha blueprint (archived receipts) | [`docs/history/builderos/`](../../history/builderos/) |

---
**Status:** ACTIVE (execution ladder locked; full end-to-end autonomy still requires runtime proof)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-07-06 — **Truth-ladder enforcement on claims (`services/truth-ladder.js`).** Founder doctrine: separation of powers (a second party verifies, nothing on face value) + a scaling truth ladder (DONT_KNOW < GUESS < THINK < KNOW < LAW). Key design decision (founder-aligned): DO NOT grade every line of code — code has a harder test than any label (execution: compiles / tests pass / deploy-truth). The ladder is enforced on load-bearing **claims** instead. `claimKind()` splits execution-provable claims (build/test/deploy/code) from external ones (user/market/design/assumption). `enforceClaim()` mirrors no-false-green at the claim level: a KNOW/LAW claim without proof is downgraded (execution → GUESS, external → THINK) with a flag, and external claims are capped below KNOW without external evidence — it only ever caps/downgrades, never optimistically upgrades. `reviewClaims({reviewFn})` delegates the grading judgment to a second AI (injected — separation of powers) then enforces; a broken/missing reviewer fails safe to GUESS. `toWatchlist()` emits a re-confirmation queue for everything below KNOW (execution items flagged urgent) so assumptions get checked against reality later. Fully unit-tested (`tests/truth-ladder.test.js`, 11/11). Companion to deploy-truth (PR #212) and the product-build orchestrator (PR #211). Prior: 2026-07-03 — Self-repair escalation ladder REFINED (`services/self-repair-escalation-policy.js`, `services/founder-build-quorum-escalation.js`, `services/founder-build-self-repair.js`). The base ladder (3 solo attempts → 2-AI → 3-AI → Chair → Adam, 3 rounds/tier, carry-forward) was already built + wired; this pass adds the founder-approved refinements: (1) **adaptive web search** — the final attempt always researches, and attempt 2 (and the pre-final quorum round) researches early only when the blocker is a knowledge gap (`isKnowledgeGapBlocker`: unknown API/module, version/deprecation, network/cert), staying a cheap self-fix otherwise; (2) **cross-family diversity** — tier 3 default changed from 2×OpenAI+Claude to OpenAI+Anthropic+Google so models fail differently and catch blind spots (env-overridable via `FOUNDER_QUORUM_2_MEMBERS`/`FOUNDER_QUORUM_3_MEMBERS`); (3) **verbatim error carry-forward** — the exact failure (stderr/stdout/output/detail) is passed into the quorum prompt, not paraphrased; (4) **critique-before-execute** — one model red-teams the chosen fix (approve/revise/reject) before a build run is spent (`FOUNDER_QUORUM_CRITIQUE=0` to disable). Note: early-exit for human-required blockers already existed (`runCfoEscalationGate`). Tests: `tests/self-repair-escalation-policy.test.js`, `tests/founder-build-quorum-escalation.test.js`. Corrects stale `CURRENT_STATE_AUDIT.md §4` (EXECUTOR_MAX_ATTEMPTS is 3, not 2).
**Last Updated:** 2026-07-06 — **Deploy-truth proof (`services/deploy-truth.js`, fixes recurring "false live").** The autonomy audit repeatedly caught the system claiming "fixed live" while production still served old code. New module proves the running deployment actually serves the built commit before anything is called live: `proveDeployServesSha({ expectedSha, baseUrl, fetchFn })` fetches `/api/v1/lifeos/builder/ready`, reads `codegen.deploy_commit_sha` (via `extractDeployedSha`, tolerant of top-level / `codegen` / `builder` shapes), and returns `ok:true` ONLY when the served SHA prefix-matches the expected commit — `ok:false` (with reason) when the endpoint is unreachable, exposes no SHA, or serves a different SHA. `waitForDeploySha()` polls across a redeploy window (Railway ~1-2 min) and never false-positives. Dependency-injected fetch → fully unit-tested (`tests/deploy-truth.test.js`, 9/9: sha normalization, short/full prefix match, shape extraction, match/no-match, no-sha, HTTP-error, throw, poll-until-advanced, give-up-after-attempts). Designed to plug into the product-build orchestrator's success path (a step is only truly "done → live" once its commit is proven served). Review fix (Devin Review): polling tests now use valid-hex stale SHAs (`aaaaaaa`) so they exercise the different-SHA `shasMatch` path rather than vacuously hitting the no-SHA branch. Prior: 2026-07-03 — Self-repair escalation ladder REFINED (`services/self-repair-escalation-policy.js`, `services/founder-build-quorum-escalation.js`, `services/founder-build-self-repair.js`). The base ladder (3 solo attempts → 2-AI → 3-AI → Chair → Adam, 3 rounds/tier, carry-forward) was already built + wired; this pass adds the founder-approved refinements: (1) **adaptive web search** — the final attempt always researches, and attempt 2 (and the pre-final quorum round) researches early only when the blocker is a knowledge gap (`isKnowledgeGapBlocker`: unknown API/module, version/deprecation, network/cert), staying a cheap self-fix otherwise; (2) **cross-family diversity** — tier 3 default changed from 2×OpenAI+Claude to OpenAI+Anthropic+Google so models fail differently and catch blind spots (env-overridable via `FOUNDER_QUORUM_2_MEMBERS`/`FOUNDER_QUORUM_3_MEMBERS`); (3) **verbatim error carry-forward** — the exact failure (stderr/stdout/output/detail) is passed into the quorum prompt, not paraphrased; (4) **critique-before-execute** — one model red-teams the chosen fix (approve/revise/reject) before a build run is spent (`FOUNDER_QUORUM_CRITIQUE=0` to disable). Note: early-exit for human-required blockers already existed (`runCfoEscalationGate`). Tests: `tests/self-repair-escalation-policy.test.js`, `tests/founder-build-quorum-escalation.test.js`. Corrects stale `CURRENT_STATE_AUDIT.md §4` (EXECUTOR_MAX_ATTEMPTS is 3, not 2).
**Last Updated:** 2026-07-06 — **Deploy-proof seam wired into the orchestrator (integration).** `runNextStep()` now accepts an OPTIONAL dependency-injected `deployProofFn({ commit_sha, product_id, step })` that runs AFTER build+verify: a step is only marked `done`/live when the running deploy actually serves the built SHA (this is where `services/deploy-truth.js` `proveDeployServesSha`/`waitForDeploySha` plugs in at the call site). If the deploy hasn't caught up, the step stays retryable (build+verify passed but it is NOT live — closes the "false live" gap inside the loop, not just as a standalone module). Sets `step.deploy_proven` and returns `deploy_proven` on success. Verified: `tests/product-build-orchestrator.test.js` (8/8 — added a deploy-gate test proving a step stays PENDING until the deploy serves the SHA, then flips to DONE). Prior: 2026-07-06 — **General product-build orchestrator + structured per-product build queue (fixes "the loop had nothing to build").** New `services/product-build-orchestrator.js`: turns a product's structured `docs/products/<id>/BUILD_QUEUE.json` (schema `product_build_queue_v1`, ordered `{id, target_file, task, spec, depends_on, founder_gated}` steps) into concrete builder steps. `selectNextStep()` returns the first non-terminal, non-gated, dependency-satisfied step and surfaces founder-gated steps separately (so the loop stops re-building founder-gated work — the "attempt 35" waste). `runNextStep({buildFn, verifyFn, maxAttempts})` is dependency-injected and enforces two audit fixes: (a) **no false green** — a build that returns `ok` but no commit SHA is treated as FAILURE, and a step is marked `done` only when build (with SHA) AND the product's verify script pass; (b) **no spin** — after `maxAttempts` failures the step is `blocked` and the loop moves on. Wired into `services/never-stop-product-factory.js`: new `discoverBuildQueueWork()` scans every product home for an actionable `BUILD_QUEUE.json` step and emits a `product_build_step` task; new `runProductBuildStep()` executes it via the existing `/api/v1/lifeos/builder/build` primitive + per-product verify, persists the queue, and redeploys on a proven commit. Seeded `docs/products/site-builder/BUILD_QUEUE.json` with real remaining Site Builder work as the first proving ground. Verified: `tests/product-build-orchestrator.test.js` (7/7 — schema validation, dep ordering, gated-skip, no-SHA-is-failure, block-after-maxAttempts, awaiting_founder, summary) and a live dry-run that reads the real Site Builder queue and selects `sb-ab-subject-testing` as the next buildable step while skipping the founder-gated customization UI. This closes audit gap "no general engine that turns a product into buildable steps." Prior: 2026-07-03 — Self-repair escalation ladder REFINED (`services/self-repair-escalation-policy.js`, `services/founder-build-quorum-escalation.js`, `services/founder-build-self-repair.js`). The base ladder (3 solo attempts → 2-AI → 3-AI → Chair → Adam, 3 rounds/tier, carry-forward) was already built + wired; this pass adds the founder-approved refinements: (1) **adaptive web search** — the final attempt always researches, and attempt 2 (and the pre-final quorum round) researches early only when the blocker is a knowledge gap (`isKnowledgeGapBlocker`: unknown API/module, version/deprecation, network/cert), staying a cheap self-fix otherwise; (2) **cross-family diversity** — tier 3 default changed from 2×OpenAI+Claude to OpenAI+Anthropic+Google so models fail differently and catch blind spots (env-overridable via `FOUNDER_QUORUM_2_MEMBERS`/`FOUNDER_QUORUM_3_MEMBERS`); (3) **verbatim error carry-forward** — the exact failure (stderr/stdout/output/detail) is passed into the quorum prompt, not paraphrased; (4) **critique-before-execute** — one model red-teams the chosen fix (approve/revise/reject) before a build run is spent (`FOUNDER_QUORUM_CRITIQUE=0` to disable). Note: early-exit for human-required blockers already existed (`runCfoEscalationGate`). Tests: `tests/self-repair-escalation-policy.test.js`, `tests/founder-build-quorum-escalation.test.js`. Corrects stale `CURRENT_STATE_AUDIT.md §4` (EXECUTOR_MAX_ATTEMPTS is 3, not 2).
**Last Updated:** 2026-07-06 — `scripts/overnight-build-proof.mjs` (new, tiny pure-ESM `overnightBuildProof()`) was authored autonomously by the deployed builder via `POST /api/v1/lifeos/builder/build` on prod (`lumin-web-production-e3a9`), driven from the operator box with `COMMAND_CENTER_KEY` — no human merge or Railway env change — and committed to `main` (`d0052b05`, `commit_mode:github`) after passing the pre-commit syntax/antipattern gates. Proof that the autonomous build lane produces real, verifiable commits end-to-end (an earlier full-file-rewrite attempt on the awkward 127-line `lifeos-direct-build-smoke-test.mjs` was correctly BLOCKED by the syntax gate — the gates work). This SSOT row is the co-commit the GitHub-API build path bypassed.
**Last Updated:** 2026-07-04 — Added diagnostic instrumentation: event loop watchdog (logs blocks >1500ms with heap/rss), handler timing ([FI-MSG] logs at each pipeline step), chair turn timing ([CHAIR-TURN] logs for resolveUserId/loadHistory/intake/productHome/backfill), backfill timing ([BACKFILL] logs for codebaseScan/intent/blueprint/arcReview with memory stats). Purpose: identify production handler timeout bottleneck on Railway.
**Last Updated:** 2026-07-04 — Chat handler no longer spawns background AI tasks (was crashing Railway server): `intake_blueprint` case now does DB-only lookups for session status (failed/arc_review/ready/generating). ARC review chains into `_runBackfill()` as final step (runs sequentially after blueprint generation, bounded by `_backfillRunning` guard). Added `failed` status handling so user can restart. Prior: 2026-07-04 — Chair now routes ARC/execute/status requests for blueprint intake sessions: `isIntakeBlueprintIntent` extended to match run/execute/review/check/arc/status/validate + product + blueprint; `intake_blueprint` handler detects ARC vs create intent and looks up existing sessions for the product; ARC review switched from Claude to OpenAI with 60s timeout; concurrent backfill guard prevents duplicate background AI calls.
**Last Updated:** 2026-07-03 — ARC self-healing loop: `runArcReview()` now auto-fixes blueprints when critical/moderate issues are found (calls `_autoFixFromArcReport()` → regenerates → re-reviews), closing the dead-end where ARC findings weren't fed back into blueprint correction. Route handler exposes `auto_fixed` and `auto_fix_error` fields for diagnostics. Inner auto-fix errors now throw descriptive messages (parse_failed/no_steps_key/empty_steps/model_returned_review) instead of returning null silently. Replaced AI-based auto-fix (which returned review reports instead of corrected blueprints) with deterministic code-based fixer: deduplicates step IDs, populates coordinator deps with service step IDs, sets verify script deps to all steps, fills route/HTML deps, and fixes ssot_tag placeholders. Also replaced AI re-review (which hallucinated errors on correctly-fixed blueprints) with `_validateBlueprintStructure()` — deterministic structural validator that checks: no duplicate IDs, all dep refs valid, non-SQL steps have deps, valid step types. If deterministic check passes → status=ready; if not → gap_collection with exact programmatic error list. Fixed circular dep crash: auto-fixer excluded route files from coordinator service deps (routes depend on coordinator, not vice versa), added cycle detection/removal pass, and `sortIntakeSteps()` now uses visiting-set to gracefully handle any remaining cycles instead of stack-overflowing. Blueprint executor now skips steps whose target files already exist and pass syntax check (`node -c` for JS, content check for HTML) — prevents AI from regenerating large existing files (e.g. 151KB tc-routes.js) that always fail syntax check on generation. Auto-fixer now aligns `_meta.acceptance_cmd` with the actual verify step filename to prevent name-mismatch failures. Executor self-heals when builder's AI-generated verify script fails syntax check: generates a deterministic verify script that checks all blueprint target files exist, commits it with `(self-healed)` tag. Auto-fixer appends `--all --dry-run` to verify-project.mjs acceptance_cmd (script requires CLI args). Prior: 2026-07-03 — Retired-domain scrub: replaced hardcoded `robust-magic-production.up.railway.app` fallbacks with canonical `lumin-web-production-e3a9.up.railway.app` across `config/runtime-env.js`, `core/*`, `server-full-runtime.js`, and probe/ops scripts (env vars like `PUBLIC_BASE_URL` still take precedence — only the stale default domain changed; no Railway runtime change since `RAILWAY_PUBLIC_DOMAIN` is injected). Prior: 2026-07-03 — Surgical **edit-patch** mode for Zone 3 *modify* requests (kink #16) + the two root-cause bugs it exposed (#17, #17b). Problem: a chat build like "change ACCESS_COOKIE_MAX_AGE_MS so the cookie lasts 7 days instead of 24 hours" against a >150-line file was un-buildable — additive-patch mode is forbidden from touching existing content, so the model emitted only the one changed line and it was rejected as truncation. Fix (kink #16): a new surgical edit-patch mode — the model returns a JSON array `[{old_string,new_string}]` and `applyTargetedEdits()` (in `routes/lifeos-council-builder-routes.js`) does deterministic find-and-replace, **fail-closed**: each `old_string` must match EXACTLY once (0 → reject "anchor not found", >1 → reject "ambiguous"), empty/no-op edits rejected, rest of file preserved byte-for-byte. `classifyPatchIntent(task)` (in `services/builderos-patch-mode-policy.js`) auto-routes modify-verb requests ("change/replace/rename/remove/…") to edit-patch and pure-add requests to additive; wired into `/build`, `/execute`, and the founder-chat loop (`services/founder-build-self-repair.js`). While live-verifying, found the deeper reason edit-patch (and *all* code builds that inject a file for reference) were corrupting: **kink #17** — `services/council-service.js` ran the lossy token-compression layers (markdown-strip, phrase-sub, LCL codebook, IR) on code-generation prompts, so injected source like `24 * 60 * 60 * 1000` was parsed as markdown emphasis and stripped to `24 60 60 * 1000` before the model ever saw it (both OpenAI and Claude reproduced the corrupted anchor identically — proof it was upstream, not model fidelity). Fix: `isCritical` is now true for any `code`/`codegen` task, so those compression layers are skipped and source passes through raw byte-exact. **Kink #17b**: the `/execute` and `/build` edit-patch/additive gates resolved `target_file` against `process.cwd()` instead of `REPO_ROOT` (module-relative), so with the server booted from `/home/ubuntu` the target `existsSync` check failed → edit-patch silently disabled → the JSON edits were validated as JS and rejected as "prose refusal"; switched all builder path resolutions to `REPO_ROOT` (same cwd-independence fix as kinks #10/#13). Verified LIVE end-to-end from the failing cwd: chat build "change ACCESS_COOKIE_MAX_AGE_MS … 7 days instead of 24 hours" → `status:completed`, `pass_fail:PASS`, `committed:true`, disk changed `24 * 60 * 60 * 1000` → `7 * 24 * 60 * 60 * 1000`, `node --check` PASS, self-repair attempts=1 (local-mirror only; test change reverted). Regression: `tests/builderos-edit-patch.test.js` (13 cases — JSON parse w/ fences+metadata, exact-match-once, ambiguous/missing/empty-anchor rejection, multi-edit, deletion, remainder preservation, intent classifier), `npm test` 249/0.
**Last Updated:** 2026-07-03 — Studio gate no longer cwd-dependent (kink #13 — the block that made "build whatever I ask" impossible via chat). A real end-to-end founder-chat build of a pure *backend* target (`do: add isDisposableEmailDomain() to routes/lifeos-auth-routes.js`) was hard-blocked with `BLOCKED_FOUNDER_PACKET_V2 → BUILDER_ENTRY:studio:STUDIO_CONCERNS` ("Studio is judging founder-facing design without actual UI artifacts", "UI likely renders flat", …). Root cause (same class as the `node --check` module-mode bug): `runStudioSimulation()` in `factory-staging/factory-core/arc/foundation/studio-simulation.js` resolves a mission's UI artifacts (`.html`/`.css` from the blueprint's `content_source_path`/`target_file`) via `resolveArtifactPath()`, which for relative paths joined against `process.cwd()`. The live server boots from `/home/ubuntu` (not the repo root, via `boot-local-safe.mjs`; Railway can differ too), so the mission's real artifacts were **not found** → the artifact-existence / atmosphere / responsive / design-token checks all failed → `STUDIO_CONCERNS` → **every build bound to the active Point B mission was blocked, including unrelated backend builds** (an ad-hoc chat build with no `mission_id` binds to the Point B target's mission and inherits its studio gate). Reproduced deterministically: `runStudioSimulation(auth-mission)` returns `pass:true` from the repo root but `pass:false` (4 artifact checks fail) from `/home/ubuntu`. Fix: derive `REPO_ROOT` from `import.meta.url` and try it before `process.cwd()` in `resolveArtifactPath()`, making artifact resolution cwd-independent. Verified LIVE end-to-end: restarted the local founder runtime from `/home/ubuntu` (the failing cwd) and re-fired the exact chat build → studio gate cleared, async job `completed`, `pass_fail:PASS`, `committed:true`, a complete correct `isDisposableEmailDomain()` (+ `KNOWN_DISPOSABLE_EMAIL_DOMAINS` set, subdomain-suffix match) spliced in, self-repair attempts=1; local-mirror commit only (branch untouched). `npm test` 225/0. KNOWN follow-up (design-governance, NOT silently changed): the studio artifact **typography** check got an *unguarded* design-packet fallback in PR #186 (`hasExpressiveTypography(artifacts) || packetDefinesTypography(packet)`), which lets a complete packet excuse a *generic real* artifact's system-font typography. That flipped `tests/studio-simulation.test.js` case 3 red (it asserts a generic real artifact must fail typography) — the auth mission's real UI uses system fonts and only passes typography via that fallback. Whether a packet should excuse system-font typography in a rendered artifact is a founder design call, so it's flagged rather than guessed; this test is not in the `npm test` suite and the failure predates and is independent of this fix.
**Last Updated:** 2026-07-03 — Targeted same-target retry on model truncation (self-healing autonomy). Previously the founder-chat self-repair loop (`services/founder-build-self-repair.js`) only retried a blocker when `pickRepairTarget()` found a *different* target; when the model truncated its own output on the SAME target (caught by the pre-commit gates — `Pre-commit syntax check failed`, `SQL migration appears truncated`, `generated JSON is invalid (likely truncated)`, `too short`), `pickRepairTarget` returned `null` → no retry → straight to escalation, wasting the whole turn on a transient failure. Added `isTruncationBlocker()` (narrow classifier — matches only completeness/truncation gate errors, NOT logical blockers like `target_file is required` / `BLOCKED_FOUNDER_PACKET_V2` / `blueprint_gate_required`) and `augmentTaskWithTruncationCorrection()` (feeds the EXACT gate error back to the model plus an explicit "your last output was cut off — return the COMPLETE output, ensure every bracket/quote/paren/statement is closed; if too large, return only the minimal additive snippet"). Both `/task`-no-output and `/execute`-gate-fail retry sites now, when `pickRepairTarget` returns null, retry the same target with the correction — bounded by `MAX_TRUNCATION_RETRIES=2` (within the existing `FOUNDER_SOLO_ATTEMPT_MAX=3` loop budget) so a model that keeps truncating escalates instead of looping on budget. Verified: `node --check` PASS; new unit tests (`tests/founder-build-self-repair.test.js`) assert the classifier accepts every truncation-gate error and rejects logical blockers, and that the correction feeds the exact error back; `npm test` 225/0. Note (honest scope): the retry *wiring + helpers* are verified by unit test + regression; the end-to-end regenerate firing depends on a real model truncation, which can't be forced deterministically without model spend — it will exercise live on the next real chat build that truncates.
**Last Updated:** 2026-07-03 — Founder **chat** build path inherits Zone 3 additive-patch (kink #7). The founder chat build (`/api/v1/lifeos/builderos/command-control/founder-interface/message` → `services/founder-build-self-repair.js`) dispatches to `/api/v1/lifeos/builder/task` (codegen) → `/api/v1/lifeos/builder/execute` (commit) — a path that never went through `/build`'s Zone 3 additive-patch, so a founder-chat build of any existing >150-line `.js`/`.mjs` file **full-file rewrote** it (verified: a chat "add one helper" build of the 624-line `routes/lifeos-auth-routes.js` produced a 430-insert / 288-delete whole-file regeneration — exactly the truncation/logic-loss risk kink #5 removed for `/build`). Fixed by teaching this path the same protection: `founder-build-self-repair.js` now classifies the target (`isZone3AdditiveTarget()` via `classifyBuildTarget`) and, for an existing Zone 3 `.js`/`.mjs` file, sets `additive_patch:true` on both the `/task` body (so codegen returns only-new-code) and the `/execute` body; the `/execute` route (`executeOutput` in `routes/lifeos-council-builder-routes.js`) now splices that snippet via `spliceAdditiveSnippet()` before validation/`node --check`/commit (same fail-closed guards). Verified: the same chat build now splices 624→632 lines (**8 insertions only**, existing content byte-for-byte preserved), `chatKebab` added + exported, `node --check` PASS, `PASS`/`committed:true` (local-mirror). Small files still full-file build; ad-hoc `/execute` callers unaffected (opt-in flag).
**Last Updated:** 2026-07-03 — BuilderOS Zone 3 large-file builds unblocked (kink #5, additive-patch mode). Files above the Zone 3 line threshold (>150 lines) were hard-blocked by `services/builderos-build-pipeline.js` with `ZONE3_PATCH_REQUIRED` and no working path — the intended extract-helper remedy was never wired in AND is architecturally incompatible with the blueprint scope gate (`services/builder-blueprint-gate.js`), which rejects the out-of-scope `services/…-helper.js` that `generatePatchSpec()` always emits for a mission build. Replaced it with **additive-patch mode** in `routes/lifeos-council-builder-routes.js`: for an existing Zone 3 `.js`/`.mjs` target the codegen prompt requests ONLY the new code, and `spliceAdditiveSnippet()` deterministically merges it into the existing file (inserted before the file's last top-level `export default`/`module.exports`, else at EOF; model-marked new imports hoisted after the last existing import). Existing content is preserved byte-for-byte (zero stub/truncation risk) and the SAME in-scope target is committed, so the blueprint-scope + size/stub/antipattern gates all still apply to the merged result (`opts.additivePatch` skips only the Zone 3 hard-block, and the additive path disables the full-file retry so a gate failure blocks cleanly rather than silently regenerating a full file). Covers "add a new export/function/route"; modifying existing in-file logic still needs full-file mode. Verified: real `/build` against the 624-line `routes/lifeos-auth-routes.js` (USER-AUTH-V1, in blueprint scope) → `ok:true`, additive splice 624→628 lines, `normalizeAuthEmail` added and `export`ed, `node --check` PASS, all gates PASS, local-mirror commit (no GitHub push); `npm test` 225 pass / 0 fail.
**Last Updated:** 2026-07-02 — BuilderOS build pipeline unblocked end-to-end (4 kinks found by firing real `/build` commands in local-mirror safe mode). (1) `factory-staging/factory-core/arc/foundation/studio-simulation.js` now treats a complete `STUDIO_DESIGN_PACKET.json` (typography display+body, palette atmosphere, responsive layout rules, ≥3 forbidden patterns) as satisfying the design-dimension checks instead of also demanding the founder's raw intent prose repeat those keywords — previously every mission build (even pure backend) inherited the Point B mission's studio gate and was blocked with false `STUDIO_CONCERNS`; the packet is the authoritative design contract. Verified: builder-entry gate returns `BUILDER_ENTRY_PASS` for USER-AUTH-V1. Companion fixes in AI-Council + LifeOS homes (chair intent/coverage honoring IDC-locked missions, OpenAI reasoning-model temperature, and builder auto-injecting the existing target-file content). Net: a real `/build` committed clean code end-to-end (`committed:true`, `commit_mode: local_mirror`, no GitHub push).
**Last Updated:** 2026-07-02 — ARC entry-gate unblocked: reconstructed the missing `scripts/validate-intent-tier1.mjs` (the intake-loop mission IL-S05 was never completed, so `factory-core/arc/entry-gate.js` returned `tier1_validator: validate-intent-tier1.mjs missing` and every mission was BLOCKED_RETURN_TO_IDC). The validator applies the identical load-bearing coverage rule as the entry-gate's own `tier1CoveragePass`, normalizes both legacy v1 (`dimension`/`status`/`mission_id`) and current v2 (`name`/`coverage_level`/`intent_id`) coverage-map shapes, and never rejects a coverage-rule pass. Verified: `runArcEntryGate('FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001')` now returns `ARC_ENTRY_PASS` (0 violations) in both pre-handoff and corridor modes; all 9 real missions pass; regression test `tests/validate-intent-tier1.test.js` (6 cases) wired into `npm test`. Remaining ARC cascade (studio design packet / FP_V2 / downstream gates) still to be cleared.
**Last Updated:** 2026-07-01 — Devin external-host handoff added. The repo now carries a single human-readable handoff and a machine packet for Devin setup/execution so external host use does not depend on reconstructing context from chat. Manual boundary remains only account sign-in, GitHub connection, repo grant, and secret entry.
**Last Updated:** 2026-07-01 — BuilderOS V1 authority clarified: `Chair/Lumin` is the first real surface; `ARC` authors deterministic blueprints; `CFO` first appears as scoreboard ownership (tokens, time, cost, model grading, efficiency); `Historian` owns blueprint/runtime sync after accepted change; wording is now “truth protocol” / truth ladder, not vague “truth locked” shorthand.
**Last Updated:** 2026-07-01 — BuilderOS continuity law locked: the OB ladder does not stop on a single blocker. It continues until approved spend is exhausted, founder explicitly stops it, alpha is ready for founder use, or the queue has no ready work left after scan. Isolated blockers are recorded and the system moves to the next ready slice.
**Last Updated:** 2026-07-01 — canonical OpenAI Builder ladder locked into repo-native authority: `OB1=gpt-5.4-mini`, `OB2=gpt-5.4`, `OB3=gpt-5.5`. Founder is now upstream for product development and downstream for alpha, not the normal coding supervisor. The machine-readable contract lives at `builderos-reboot/governance/OB_EXECUTION_LADDER.json`; cold agents must follow it instead of reconstructing the execution path from chat.
**Last Updated:** 2026-07-01 — founder-builder runtime no longer wraps protected builder responses with the global truth-response enforcer while the live Railway hang is under repair; this is an availability cut for BuilderOS entry surfaces, not a rollback of builder proof law or receipt requirements.
**Last Updated:** 2026-07-01 — BuilderOS CLI truth now loads `.env.builderos` through `scripts/lib/load-builderos-env.mjs`; `builderos:openai:smoke` was added as the cheapest-capable worker lane probe; readiness/deploy proof scripts now truly fall back from `/api/v1/lifeos/builder/ready` to `/ready` instead of falsely stopping on the first timeout; the pre-build gate now skips product-only intake regression on the minimal `founder_builder` runtime instead of blocking BuilderOS for surfaces that lane does not mount.
**Last Updated:** 2026-07-01 — Canonical executor `dryRun` now returns blueprint plan truth without requiring live dispatch-gate success first; dispatch gate now recognizes local founder-builder mirror commits as a valid commit-ready path; `/build` now uses the same commit-or-local-mirror path as `/execute`, so local founder runtime can record real committed builder history instead of false-ready GitHub-only state.
**Last Updated:** 2026-06-29 — CRASH FIX: never-stop-product-factory.js converted all spawnSync to async spawn to stop blocking the Node.js event loop and crashing the Railway container.
**Last Updated:** 2026-06-30 — BuilderOS routing hardened to dedicated OpenAI builder lanes: `openai_builder_mini` for cheap-first frozen execution, `openai_builder_standard` for planning/review, and `openai_builder_escalation` for harder repair paths; TSOS/evidence/quorum logic now treats the mini lane as the canonical cheaper executor.

---

## WHAT THIS IS
The system that writes, tests, and deploys its own code. Takes an idea → generates code → runs in sandbox → creates a snapshot → applies changes → validates → rolls back on failure. It is the most powerful and most dangerous feature in the platform.

**Mission:** Ship validated code improvements on explicit operator direction, with human approval for any production deployment.

## CORE DOCTRINE

### Queue doctrine

- **Blueprints are authority.**
- **The queue is scheduling.**
- `builderos-reboot/BP_PRIORITY.json` decides what runs next.
- The referenced `FOUNDER_PACKET.md` and `BLUEPRINT.json` decide what the work is, what is allowed, and how it must be verified.
- The system must never treat a blueprint itself as the queue, and it must never let the queue reinterpret blueprint authority.
- Queue advancement must co-update blueprint-adjacent state, receipts, and product-local history so scheduling truth, build truth, and forensic history do not diverge.

### OpenAI ladder doctrine

- The canonical BuilderOS execution ladder is `OB1` → `OB2` → `OB3`.
- `OB1` is the default cheap executor.
- `OB2` is the bounded repair lane.
- `OB3` is the unblock/supervisor lane.
- BuilderOS execution starts from the frozen blueprint, not from the most recent founder chat.
- If `OB1` or `OB2` must guess product intent, execution stops and the upstream artifact is repaired.

### Founder pushback doctrine

- Founder direction is mission-critical, but founder wording is not automatically engineering truth.
- If Adam proposes something structurally wrong, the system must say so plainly.
- Silence in the face of engineering error is system failure.
- Required pushback cases include:
  - confusing authority with orchestration
  - confusing blueprint with queue
  - leaving strategic ambiguity to BPB or Builder
  - asking Builder to make architecture decisions instead of code from an approved blueprint
  - weakening determinism, verification, or fail-closed behavior
- Required system response:
  1. name the engineering risk clearly
  2. propose the safer structure
  3. block advancement if the ambiguity is load-bearing
  4. record the pushback in the founder-packet or product-development trail

### Truth protocol doctrine

- BuilderOS follows the constitutional truth protocol and truth ladder.
- Required claim labels: `KNOW`, `THINK`, `GUESS`, `DON'T KNOW`.
- Status, receipts, predictions, scoreboards, and founder-facing replies must use those epistemic rules when evidence is incomplete.
- “Truth locked” is not the governing phrase. The governing mechanism is the truth protocol: evidence, scrutiny, promotion, demotion, and reality scoring.

### Blueprint sync doctrine

- Blueprint authority must track reality.
- If an accepted canonical change modifies the real system, the following must co-update in the same closure loop:
  1. code/runtime
  2. receipt trail
  3. blueprint / twin
  4. product-home history note when material
- If code and blueprint disagree after acceptance, the state is `DRIFT_OPEN`, not complete.
- Ownership split:
  - Chair approves the intended change
  - ARC authors the blueprint structure
  - Builder changes code
  - SNT detects drift and false green
  - Historian updates the blueprint/twin/receipt record so canonical authority matches reality

### Minimal real-seat order

BuilderOS V1 does not require the entire department stack to be fully real before useful execution begins.

The required order is:

1. `Chair/Lumin` — one real founder surface: `answer | execute | block`
2. `CFO` — scoreboard ownership: tokens, cost, time, quality, model-by-role grading
3. `Historian` — receipts + blueprint sync
4. `SNT` — attack and false-green detection
5. `ARC` — deterministic blueprint authoring and freeze

Everything else must earn its runtime cost by results.

---

## REVENUE ALIGNMENT
- Reduces developer cost → direct ROI
- Powers the idea-to-implementation pipeline (ideas become products without manual coding)
- Can build and deploy client-facing products (site builder, game publisher, etc.)

---

## TECHNICAL SPEC

### Files (Current)
| File | Purpose |
|------|---------|
| `core/auto-builder.js` | Core build orchestration |
| `core/idea-to-implementation-pipeline.js` | Full idea → deployed feature pipeline |
| `core/code-linter.js` | Code validation before apply |
| `services/snapshot-service.js` | System snapshots + rollback |
| `scripts/autonomy/run-nightly.js` | Overnight autonomous improvement run |
| `scripts/autonomy/queue.json` | Pending improvement queue |
| `builderos-reboot/BP_PRIORITY.json` | Canonical scheduler queue — selects next mission only; does not replace blueprint authority |
| `scripts/autonomy/builder-supervisor.js` | **NEW** Headless orchestrator — spawns Claude Code CLI per segment, git worktree isolation, manages full build lifecycle |
| `services/builder-council-review.js` | **NEW** 4-lens pre-build council review before any file is touched; adversarial debate for conflict resolution |
| `routes/builder-supervisor-routes.js` | **NEW** Builder control API: run, run-sync, status, queue, pause, resume |
| `services/autonomy-scheduler.js` | **UPDATED** Now schedules builder every 6h (BUILDER_INTERVAL_MS override), first run 15min after boot |
| `.mcp.json` | **NEW** MCP server config — `neon-postgres` server for direct Neon DB access in Claude sessions |
| `tests/auto-builder-scheduler.test.js` | Auto-builder tests |
| `server.js` (lines 4296–4465, 7985–8149, 9382–9487, 9485–9808) | Self-modification engine, auto-builder endpoints, self-builder, pipeline endpoints — NEEDS EXTRACTION |

### DB Tables
| Table | Purpose |
|-------|---------|
| `system_snapshots` | Pre-change snapshots for rollback |
| `sandbox_tests` | Results of sandboxed code tests |
| `self_modifications` | Log of all self-applied changes |
| `build_artifacts` | Completed build outputs with receipts |
| `execution_tasks` | Task queue for async execution |
| `task_improvement_reports` | AI employee improvement reports |
| `builder_council_reviews` | **NEW** Per-segment council review results: verdict, guidance, perspectives JSONB, debate_ran |
| `adam_decision_profile` | **NEW** Predicted vs actual choices — accuracy tracked in `adam_prediction_accuracy` view |
| `projects.build_ready` | **NEW** Boolean gate — builder ignores projects where FALSE |
| `projects.council_persona` | **NEW** Per-project Great Minds persona (musk/jobs/edison/tesla) |
| `model_verdict_log` | **NEW** Per-lens, per-model verdict log with latency + cost; correlates to build outcomes |
| `model_performance_summary` | **NEW** View: accuracy %, avg latency, avg cost per model per lens |
| `model_lens_winner` | **NEW** View: current accuracy champion per lens (>= 3 scored verdicts) |

**Migrations:**
- `db/migrations/20260327_build_ready_gate.sql` — build_ready column + readiness metadata on projects
- `db/migrations/20260327_builder_council.sql` — builder_council_reviews, adam_decision_profile tables, adam_prediction_accuracy view
- `db/migrations/20260327_mark_build_ready.sql` — marks 7 projects BUILD_READY; sets per-project persona

### Key Endpoints
- `POST /api/v1/self-program` — trigger a self-programming task
- `POST /api/v1/auto-builder/run` — run auto-builder on an idea
- `GET /api/v1/auto-builder/status` — current build status
- `POST /api/v1/pipeline/run` — run idea-to-implementation pipeline
- `GET /api/v1/pipeline/status/:id` — pipeline run status
- `POST /api/v1/builder/run` — async trigger: spawns headless Claude Code supervisor (returns PID immediately)
- `POST /api/v1/builder/run-sync` — dry-run synchronous trigger (no file changes)
- `GET /api/v1/builder/status` — running state, last run JSON, in-progress segments, pending-adam from builder
- `GET /api/v1/builder/queue` — all segments grouped by safety class (safe/review/highRisk/active/blocked)
- `POST /api/v1/builder/pause` + `POST /api/v1/builder/resume` — pause/resume the builder loop

### Required Self-Programming Loop
The builder is no longer allowed to behave like a single black-box coder. Every serious autonomous build must follow this format:
1. **Proposal** — consume the council recommendation and produce a scoped build plan.
2. **Execution** — change only the files and behavior covered by that scoped plan.
3. **Verification** — run the declared checks and capture receipts.
4. **Review** — inspect whether the diff touched the right files and matched the intended outcome.
5. **Repair** — if verification or review fails, apply the smallest safe fix and retry.
6. **Scoring** — compare proposal quality, code quality, verification result, and repair quality separately.

The builder may implement code, but it does not get to self-certify success without receipts.

### Product-development correction requirement

Before work reaches the runtime queue, the upstream product-development / founder-packet layer must challenge weak engineering assumptions. The system is not allowed to politely carry founder ignorance downward as implementation debt.

### Sync requirement

When a mission advances, stalls, passes, fails, or is scrapped, BuilderOS must update all of the following together:

1. scheduler state in `BP_PRIORITY.json`
2. mission receipt / objective-verdict state
3. product-local history trail
4. any canonical product-home note that changed materially because of the run

No agent is allowed to move queue state alone and leave the rest stale.

### Separation Of Duties
- **Council / planner** decides what should be built and names risks.
- **Builder / executor** writes the code.
- **Verifier / reviewer** checks behavior, touched files, and SSOT alignment.
- **Repair worker** fixes the smallest failing surface when needed.

One model may fill more than one role only when no safer alternative exists, and the run receipt must say that separation was collapsed.

---

## CURRENT STATE
- **KNOW:** `autoDeploy` defaults to `false` — human approval required for production (SSOT compliant)
- **KNOW:** Snapshot-before-change is implemented in `idea-to-implementation-pipeline.js`
- **KNOW:** `build_artifacts` table records receipts on component completion
- **KNOW:** Nightly runner exists at `scripts/autonomy/run-nightly.js`
- **KNOW:** Directed mode now disables the background auto-builder scheduler by default; builds must be explicitly triggered unless `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER=true`
- **KNOW:** `scripts/autonomy/builder-supervisor.js` is fully operational — spawns `claude --print --dangerously-skip-permissions` headlessly per segment; one git worktree per agent prevents cross-agent conflicts
- **KNOW:** `services/builder-council-review.js` runs 4 lenses in parallel before any build: Consequences (Groq), Time Traveler (Gemini), Trend Scout (Perplexity→Gemini fallback), Great Minds+Adam filter (Claude Sonnet); adversarial debate uses Claude Opus for conflict resolution
- **KNOW:** `build_ready` gate is live in DB — builder skips any project where `build_ready = FALSE`
- **KNOW:** 7 projects marked `build_ready=TRUE`; 11 remain NOT_READY (Gate 1 blockers documented in each amendment)
- **KNOW:** Builder runs every 6h via `autonomy-scheduler.js` (BUILDER_INTERVAL_MS override); first run 15min after boot
- **KNOW:** `adam_decision_profile` table tracks predicted vs actual choices; `adam_prediction_accuracy` view gives live accuracy %
- **KNOW:** Council review model routing: Groq (fast scan) → DeepSeek R1/Groq (Time Traveler + Debate, free Opus-level) → Perplexity (live trends) → Claude 3.7 Sonnet + extended thinking (persona) → Claude Opus (debate fallback)
- **KNOW:** Prompt caching active on Great Minds lens — persona + Adam profile content cached at ~10% token cost per repeat call
- **KNOW:** Extended thinking enabled for Great Minds lens (claude-3-7-sonnet, budget: 6000 tokens) — reasoning scratchpad before answering
- **KNOW:** DeepSeek R1 strips `<think>` scratchpad blocks automatically; final answer only returned to council
- **KNOW:** 5th council lens added: Codebase Coherence — `lensCodebaseCoherence()` feeds entire relevant codebase (amendment + routes + services files) to Gemini 2.5 Pro via `buildCodebaseContext()`; finds conflicts, duplication, pattern violations BEFORE a line is written; skipped gracefully if `rootDir` not provided
- **KNOW:** `callGeminiPro()` uses `gemini-2.5-pro` (1M token context), `maxOutputTokens: 4000`, returns deep architectural analysis
- **KNOW:** `builder-supervisor.js` now passes `rootDir: ROOT` to `reviewSegment()` — codebase coherence lens is always active in builds
- **KNOW:** BuilderOS CLI support now loads `.env.builderos` directly, so low-cost worker scripts do not falsely claim missing OpenAI keys while runtime boot can already see that file.
- **KNOW:** `npm run builderos:openai:smoke` is the minimal truth probe for the OpenAI mini worker lane; it must pass before claiming the cheapest-capable builder lane is available.
- **KNOW:** readiness/deploy proof scripts now attempt both `/api/v1/lifeos/builder/ready` and `/ready`, and they report timeout/error truth instead of silently treating the first unreachable route as authoritative.
- **KNOW:** the pre-build gate now recognizes the minimal `founder_builder` runtime as a real narrow lane and skips intake regression checks that require broader product surfaces not mounted there.
- **KNOW:** Builder supervisor upgraded to `--output-format stream-json` — structured event parsing replaces raw stdout scraping; `toolsUsed` array logged per segment; clean final answer extracted from `result` event
- **KNOW:** Supervisor now prefers project-local `node_modules/.bin/claude` (version-pinned via `@anthropic-ai/claude-code` npm package) over global binary
- **KNOW:** MCP postgres server configured in `.mcp.json` — `neon-postgres` server gives Claude sessions direct Neon DB query access via `@modelcontextprotocol/server-postgres`; `enableAllProjectMcpServers: true` in `.claude/settings.local.json`
- **KNOW:** Governance spec upgrade applied (2026-03-27): `builder-supervisor.js` now validates segment spec before any work (skips segments missing `exact_outcome` or `allowed_files`); protected file enforcement checks builder only wrote to `allowed_files`; post-build verification gate runs `required_checks` before PR opens; `fetchPendingSegments` selects `review_tier`, `allowed_files`, `exact_outcome`, `required_checks`, `market_sensitive`; `buildPrompt` injects `exact_outcome` and `allowed_files` into builder prompt
- **KNOW:** `reviewSegment()` upgraded: 4-tier routing (tier_0=skip, tier_1=consequences+Adam, tier_2=full, tier_3=full+debate+human); `marketSensitive` parameter gates Trend Scout; unknowns budget: if 4+ lenses flag issues → NEEDS_HUMAN automatically; `lensGreatMinds` now returns structured JSON (risk, upside, missing_assumption, concrete_change, verdict) with text fallback
- **KNOW:** `manifest.schema.json` now includes `build_ready`, `market_sensitive`, `council_persona`, `segment_schema_version`, and `segments` (full execution contract array) properties
- **KNOW:** `db/migrations/20260327_governance_spec.sql` adds `review_tier`, `allowed_files`, `exact_outcome`, `required_checks`, `rollback_note` to `project_segments`; adds `market_sensitive` to `projects`; creates `build_outcomes` table for post-merge outcome scoring
- **KNOW:** `services/model-performance.js` logs per-lens verdicts to `model_verdict_log`; `scoreOutcome()` correlates council verdicts to build outcomes; `getLeaderboard()` + `getLensWinners()` expose accuracy rankings
- **KNOW:** `builder-council-review.js` logs every fulfilled lens verdict via `logVerdict()` after `storeReview()`; `PROVIDER_MODEL_MAP` maps provider labels to canonical model IDs
- **KNOW:** `builder-supervisor.js` inserts `build_outcomes` row on segment completion and calls `scoreOutcome()` to close the feedback loop
- **KNOW:** Model performance views: `model_performance_summary` (accuracy+cost per model/lens), `model_lens_winner` (current champion per lens, ≥3 scored verdicts)
- **KNOW:** `GET /api/v1/model-performance/leaderboard` + `/winners` + `/dissenters` + `/lens/:lens` + `POST /score-outcome` — full model grading API
- **KNOW:** `model_verdict_log.was_consensus_position` — true=voted with majority, false=dissented; set per-verdict after `Promise.allSettled` via majority-count logic in `reviewSegment`
- **KNOW:** `model_lens_dissent_leader` view — model with highest dissent accuracy per lens (≥3 dissent verdicts); the "canary" that is most often right when it goes against the group
- **KNOW:** `getDissenterLeader(pool, lens)` returns the dissent champion for a lens; used to assign adversarial slot
- **KNOW:** `reviewSegment({ devilsAdvocate: true })` prepends adversarial preamble to every lens — forces all models to argue against building before considering reasons to proceed; prevents groupthink on obvious wins
- **THINK:** Sandbox testing is limited — no real isolated execution environment, tests run in-process
- **DON'T KNOW:** Whether the builder supervisor has successfully shipped a real feature end-to-end (first autonomous run not yet observed)

---

## REFACTOR PLAN
1. Move all auto-builder endpoints out of server.js → `routes/auto-builder-routes.js`
2. Move self-modification engine → `services/self-modification-engine.js`
3. Add proper sandboxing (Docker exec or vm2/isolated-vm) for code execution
4. Add human approval gate: builds queue in DB, dashboard shows "pending approval" items
5. Add build receipts endpoint: `GET /api/v1/auto-builder/receipts` shows what was built and when
6. Wire BullMQ `self-program` queue to a dedicated worker process

---

## NON-NEGOTIABLES (this project)
- `autoDeploy` MUST default to `false` — this is constitutional (North Star 4.2)
- Background build scheduling MUST default to off in directed mode
- Auto-builder may only run on explicit operator request unless the scheduler is intentionally re-enabled
- `BP_PRIORITY.json` is the scheduler queue; `BLUEPRINT.json` is the execution authority. These roles must never be collapsed.
- Snapshot MUST be created before ANY file modification
- Rollback MUST be tested before the feature is considered complete
- Syntax validation (`node --check`) MUST pass before applying any JS change
- No self-modification of: server.js startup block, council-service.js, snapshot-service.js, this SSOT
- Human Guardian veto on any production deployment (North Star 3.1)
- All changes logged to `self_modifications` with what/when/why/who
- Proposal score, execution result, verification result, and repair result must be logged separately; one green test run does not erase a bad proposal or a risky repair path
- Founder suggestions that create engineering error or load-bearing ambiguity must be challenged before blueprint freeze; silent acceptance is a doctrine violation

---

## Change Receipts

| 2026-06-29 | **CRASH FIX: never-stop factory blocking event loop** — `services/never-stop-product-factory.js`: converted `spawnSync` to async `spawn` (new `spawnAsync` helper). `runBpNeverStopOnce` removed — factory defers `foundation_pipeline` tasks to the BP scheduler (which already handles them via async `spawn`). `smosVerify` now uses async spawn with 30s timeout. `tryRedeploy` now async. Removed `git pull spawnSync`. This was blocking the Node.js event loop for up to 15 minutes on each factory tick, preventing Railway health checks from responding, causing Railway to kill and restart the container in a crash loop. Root cause: two schedulers both firing at T+60s, factory using `spawnSync` for the BP runner. | Factory was crashing Railway every 60s. | ✅ syntax check | pending deploy |
| 2026-06-29 | **Repair-artifact persistence** — `scripts/bp-priority-never-stop.mjs`: added async `commitRepairArtifacts(missionFolder)` that after each non-ok foundation loop cycle checks 7 critical JSON files (ASSET_REUSE_DECISION, INTENT_BASELINE, BLUEPRINT_ROADMAP, etc.) against git HEAD via `git show HEAD:<path>` and commits any that differ via GitHub Contents API. Repairs now survive Railway container restarts. `runCycle` is now async. Root cause that triggered this: blueprint was created without `target_file` on any step → `buildAssetReuse` produced `decisions:[]` → IDC gate failed every attempt → repair wrote fix but never committed → Railway restart wiped it → infinite loop. Blueprint fixed; systemic path added. | Self-repair loop had no persistence across restarts — every Railway redeploy reset to git state, undoing all repairs. | ✅ syntax check | pending deploy |
| 2026-06-29 | **Never-stop advance: LifeRE complete, Point B → LifeOS Consumer Auth** — `builderos-reboot/BP_PRIORITY.json` rank 5 (LifeRE) now `founder_usability_pass: true` (machine alpha walkthrough 12/12 PASS = machine advances without waiting for Adam); `builderos-reboot/POINT_B_TARGET.json` updated to `PRODUCT-LIFEOS-USER-AUTH-V1-0001` as new Point B — LifeOS user auth + Lumin account identity; `builderos-reboot/MISSIONS/PRODUCT-LIFEOS-USER-AUTH-V1-0001/BLUEPRINT.json` created (7 steps: register, login, DB migration, tier middleware, login UI, Lumin account identity, acceptance + machine alpha); `services/railway-managed-env-service.js` — `BUILDEROS_NEVER_STOP`, `NEVER_STOP_PRODUCTS`, `NEVER_STOP_INTERVAL_MS` added to managed env allowlist so the system can self-enable the never-stop scheduler via governed Railway env writes. | Adam protocol: machine alpha PASS = advance, Adam is never the bottleneck. LifeRE 12/12 PASS on production. LifeOS user auth is #1 consumer product gap. | ✅ BP unlock + new blueprint | `npm run system:railway:redeploy` then set BUILDEROS_NEVER_STOP=1 via /api/v1/railway/managed-env/bulk |
| 2026-06-29 | **Permanent never-stop product factory** — `services/never-stop-product-factory.js`, `services/never-stop-product-factory-scheduler.js`, `scripts/run-never-stop-product-factory.mjs`; `scripts/bp-priority-never-stop.mjs` no longer exits on `queue_complete` or `founder_stop` when `BUILDEROS_NEVER_STOP=1`; `services/builderos-bp-priority-scheduler.js` delegates to expansion lane when BP queue complete; `startup/boot-domains.js` starts never-stop scheduler; `GET /api/v1/lifeos/command-center/never-stop-product-factory`; `db/migrations/20260629_socialmediaos_schema_align.sql`. | Adam: building must never stop except when tokens run out — not overnight-only. | ⚠️ local daemon started; pending deploy + Railway `BUILDEROS_NEVER_STOP=1` | `npm run builderos:never-stop:factory` |
| 2026-06-28 | **`services/railway-managed-env-service.js`** — allowlist `LIFEOS_FOUNDER_LOGIN_*` vars (separate from `GMAIL_SIGNUP_*` system mailbox). | Founder login creds must not be overwritten by lumea boot sync. | ✅ | deploy |
| 2026-06-27 | **Queue-complete healthy-idle receipt for canonical BP scheduler** — `services/builderos-bp-priority-scheduler.js` now records a recent canonical receipt when the useful-work guard skips for `no_work`, marking `BP_PRIORITY queue complete` as a healthy idle cycle instead of an implicit failure. | Live production logs proved the scheduler was enabled and correctly checking work, but because completion skips never wrote a receipt, alpha readiness still blocked on `BP_PRIORITY_SCHEDULER_NOT_RECENT`. A queue-complete autonomous lane must count as healthy continuity, not as missing proof. | ✅ live log evidence of `BP_PRIORITY queue complete`; pending redeploy proof of recent healthy idle receipt | canonical queue truth at no-work idle |
| 2026-06-27 | **Restore parse-safe `builderos-system-alpha-readiness.js` for Railway boot** — replaced the mangled compressed variant on `origin/main` with the known-good parse-safe service body, including `COUNT(*)` repair-log queries and explicit string-built TSOS SQL instead of fragile multiline query literals. | Live Railway deploy logs showed boot dying before server start with `SyntaxError: Unexpected identifier 'COUNT'` in `services/builderos-system-alpha-readiness.js`, while the canonical local file imported cleanly. The deployed branch had a malformed one-line service artifact, so runtime could never reach the founder UI or self-repair loop. | ✅ `node --check services/builderos-system-alpha-readiness.js`; ✅ module import smoke; ⚠️ pending Railway redeploy/runtime SHA parity | restore boot path so founder/UI repair loops can resume |
| 2026-06-27 | **Directed-mode carveout for canonical BP scheduler** — `services/builderos-bp-priority-scheduler.js` now passes `allowInDirectedMode: true` into the shared useful-work guard, so explicit `BUILDEROS_AUTOPILOT=1` can run the canonical Point-B queue even while `LIFEOS_DIRECTED_MODE=true` continues to suppress generic background autonomy. | Live Railway logs showed the scheduler booting successfully and then getting skipped forever as “directed mode active,” which meant the runtime could truthfully report `enabled=true` while never generating a single queue receipt. The canonical governed queue needs its own PB-authorized lane or continuity remains theater. | ✅ live log evidence from `GET /api/v1/railway/managed-env/deployments/:id/logs`; pending redeploy proof of first queue receipt | canonical BP queue execution in directed mode |
| 2026-06-27 | **Canonical autonomy runtime truth + managed scheduler env controls** — `services/builderos-bp-priority-scheduler.js` now emits a canonical liveness/health status from the real `BP_PRIORITY` runner; `services/builderos-system-alpha-readiness.js` now scores autonomy continuity from that scheduler instead of older overnight sidecar artifacts and fail-closes when `BUILDEROS_AUTOPILOT` is disabled or stale; `services/builderos-improvement-loop.js` adds a deterministic improvement queue synthesizing SNT findings, Wisdom compound lessons, CFO cost posture, and Chair/ARC handoff recommendations; `services/railway-managed-env-service.js` now allowlists `BUILDEROS_AUTOPILOT*` runtime controls so the production system can self-enable the canonical queue via governed Railway env writes. | Local/runtime audit showed the biggest remaining fake-green risk: docs and sidecar receipts could imply continuity even while the canonical BP scheduler was disabled. This moves autonomy truth to the real queue, exposes the improvement backlog as a machine-readable surface, and removes the env-management blocker that prevented the live system from self-enabling the canonical queue. | ✅ `node --check` on touched services/routes; ✅ `node tests/builderos-model-escalation-gate.test.js`; ✅ `node tests/builderos-improvement-loop.test.js`; ✅ `npm run builder:preflight:fast` | canonical queue truth + improvement loop |
| 2026-06-27 | **Doctrine truth hardening + Studio artifact checks + canonical path cleanup** — `doctrine-enforcement.js` now fails any mission with nonzero acceptance exit, failing builder verdict, or non-pass objective verdict even when stale receipts still say PASS; `studio-simulation.js` now inspects actual UI artifact sources from blueprint content/targets for typography, atmosphere, responsiveness, and tokenized design control when founder asks require cutting-edge/non-generic design; `builderos-canonical-executor.js` no longer treats the legacy worktree supervisor as an equal active execution surface. Added regression tests for stale-PASS doctrine lies and generic UI artifact detection. | Competitor comparison and local audit showed three real weaknesses: stale receipts could overclaim success, Studio was judging founder-facing design from packet text alone, and the coder surface still implied two equal execution paths when only one is actually governed. This change makes those boundaries more honest and more enforceable. | ✅ `node --test tests/studio-simulation.test.js tests/doctrine-enforcement.test.js`; ✅ `npm run builderos:doctrine:verify -- PRODUCT-VOICE-RAIL-V1-0001` now FAILS honestly | canonical builder path + future rendered UI review |
| 2026-06-27 | **Simulation scoreboard + design/compute gate hardening** — `factory-staging/factory-core/arc/foundation/prediction-receipt.js` now emits `PREDICTION_RECEIPT.json` with accountable predictions plus `SIMULATION_ASSUMPTIONS.json` and `REALITY_CHECK_SCHEDULE.json`; added `REALITY_CHECK_RECEIPT` schema; `studio-simulation.js` now blocks under-specified “cutting-edge / not generic” founder asks; doctrine artifacts/seat contracts now require these receipts and make low-cost burst compute an explicit CFO decision. Added architecture docs for simulation scoreboarding, design quality gate, and compute escalation policy. | Adam pushed two missing doctrines into the machine path: simulations must later be checked against reality, and founder-facing design cannot drift into generic SaaS output while compute quietly escalates without justification. These are now governed artifacts instead of memory-only rules. | ✅ `node --check` foundation receipt + studio modules | mission generation path |
| 2026-06-27 | **Point B Alpha truth gate fix** — `factory-staging/factory-core/arc/foundation/point-b-target.js` no longer treats `TECHNICAL_PASS + acceptance PASS` as `alpha_reached` unless `OBJECTIVE_VERDICT.founder_usability_pass === true`; lesson now says machine path is awaiting founder confirmation. Added `tests/point-b-target.test.js` regression against the live LifeRE mission artifact. | Live founder probes showed a real truth bug: Point B navigator could drift toward `point_b_reached` before founder usability was confirmed, then the chair truth gate had to slap the claim back down. Alpha must stay false until founder confirmation is true. | ✅ local tests; ⚠️ deploy + re-run founder Point B probe | `node --test tests/point-b-target.test.js tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js` |
| 2026-06-27 | **`services/point-b-navigator.js` authority split** — separated `isPointBStatusIntent()` from `isPointBExecuteIntent()`; `handlePointBFounderMessage()` now auto-runs only on explicit continue/advance/do-the-next-step asks, not on pure status/progress asks. Added `tests/point-b-navigator.test.js`. | Live founder UI proving exposed a BuilderOS control bug: once status routing left generic display, a pure `status on the blueprint step you just started` ask was still re-triggering `execute_mission`. BuilderOS status asks must report, not silently mutate into work. | ✅ local tests; ⚠️ deploy + founder start→status live probe | `node --test tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js` |
| 2026-06-26 | **Intake UX fixes** — backfill 400 when amendment_text missing on Railway; ARC/chair/CLI next steps point to `POST /blueprint/intake/:id/execute`; chair-hook backfill mode; IGR-11 hint probe. | Founder hit AmendmentNotFound 500 and stale `/builder/run` execute hints. | ⚠️ deploy + IGR-11 | `npm run builderos:intake:ready` |
| 2026-06-26 | **Founder intake ready gate** — `scripts/builderos-intake-ready-gate.mjs` + `npm run builderos:intake:ready` (IGR-01..10: env, builder ready, deploy fresh, intake API, golden acceptance, pre-build gate). | Adam alpha → founder intake handoff needs one command proof. | ✅ IGR 10/10 PASS | `npm run builderos:intake:ready` |
| 2026-06-26 | **`intake-blueprint-executor.js`** — post-execute auto-redeploy + acceptance re-probe (`INTAKE_AUTO_REDEPLOY=1` default). | Committed intake steps need live deploy before HTTP acceptance is valid. | ⚠️ deploy + re-test execute | intake execute |
| 2026-06-26 | **`blueprint-intake.js`** — `loadExistingBlueprintForAmendment` DB fallback when `docs/` absent on Railway; best-effort disk write. | Adjust flow BlueprintNotFound on production Docker image. | ⚠️ deploy + adjust smoke | POST /blueprint/intake/adjust |
| 2026-06-26 | **`lifeos-builder-daemon.mjs`** — intake regression on probe cycles by default (`BUILDER_DAEMON_INTAKE_REGRESSION=1`). | Catch intake drift while daemon supervises. | ✅ wired | daemon probe cycle |
| 2026-06-26 | **Intake regression harness** — golden session registry + acceptance-only probe; pre-build PBG-07. | Builder platform fixes need automated regression without full MOS rebuild spend. | ✅ wired | `builderos:intake:regression:acceptance` |
| 2026-06-26 | **`intake-blueprint-executor.js`** — `buildVerifyFileHints` from blueprint SQL/routes; git pull before acceptance run. | Verify assertions wrong (IF NOT EXISTS, validationResult); local script stale vs GitHub. | ✅ MOS-P1-005 PASS | intake execute |
| 2026-06-26 | **`intake-blueprint-executor.js`** — verify reference → verify-builderos-working-definition; `buildRouteProbeHints` injects real mount paths; forbid marketingos hallucinations. | MOS-P1-005 probed fake /marketingos/* paths from stale reference. | ⚠️ re-run MOS-P1-005 | intake execute |
| 2026-06-26 | **Product route auto-wire** — `autoWireRoute` handles all `routes/*-routes.js` (not only lifeos-*); `POST /builder/wire-route`; intake executor wires after route step + runs acceptance_cmd. | SocialMediaOS routes committed but never mounted; verify script double-read body. | ⚠️ deploy + re-test MOS-P1-003/005 | `wire-route` + intake execute |
| 2026-06-26 | **Acceptance verify runtime skip** — paired with BUILDEROS_ALPHA verifier fix; esm_script forbids pg/pool imports. | MOS-P1-005 runtime gate false fail. | ✅ argv fix deployed | intake execute |
| 2026-06-26 | **Verify script intake hints** — esm_script uses verify-project.mjs reference; inject all impl files; shebang/main structure spec. | MOS-P1-005 syntax fail (unclosed block comment). | ✅ syntax pass | intake execute |
| 2026-06-26 | **Intake token budget** — esm steps request 16k max_output_tokens; drop amendment from files[]; style-guide-only hint. | MOS-P1-002 truncated mid-file (verifier syntax fail). | ✅ MOS-P1-002/003 committed | see BUILDEROS_ALPHA receipt |
| 2026-06-26 | **Intake executor codebase grounding** — `scanCodebasePatterns()` injected into step spec; reference files (action-inbox service/routes); forbidden import list. Governance retry passes `target_file`. | MOS-P1-002 blocked precommit governance (WRONG_IMPORT ../../core/*). | ⚠️ deploy + re-run from MOS-P1-002 | `blueprint:intake:execute --from MOS-P1-002` |
| 2026-06-26 | **SQL migration validation** — `validateSqlMigrationContent()` rejects JS in `.sql`; auto-retry gemini_flash. Reverted invalid migration. | groq emitted JS as SQL → Railway boot FAILED. | ⚠️ re-run from MOS-P1-001 | see above |
| 2026-06-26 | **Builder empty-output retry** — `/build` retries with `gemini_flash` when `code_execute` returns empty; intake executor uses fast path only for `sql` steps. | MOS-P1-002 service step: groq code_execute empty output after migration committed. | ✅ superseded — all intake steps now gemini_flash | re-run intake execute from MOS-P1-001 |
| 2026-06-26 | **Intake blueprint executor** — `services/intake-blueprint-executor.js`, `scripts/run-intake-blueprint.mjs`, `POST /api/v1/blueprint/intake/:id/execute`; `routes/lifeos-council-builder-routes.js` intake session FPv2 clearance; `builder-blueprint-gate.js` skeleton `step.file`. | SocialMediaOS builder test: `/build` blocked INTENT_AMBIGUITY after ARC PASS. | ✅ step 1 migration committed | `npm run blueprint:intake:execute -- --session <id>` |
| 2026-06-25 | **FIX: `services/blueprint-intake.js`** — `dedupeVerifySteps` removes orphan verify scripts before ARC; keeps canonical `verify-{slug}.mjs` aligned with `acceptance_cmd`. | ARC critical on MOS-P1-004 verify-project.mjs orphan. | ✅ pushed; live ARC retest pending | `--session ... --arc` |
| 2026-06-25 | **FIX: `services/blueprint-intake.js`** — `stripInvalidSteps` removes `.md`/GAP_FLAG steps; `scaffoldPhase1Steps` applies when founder answers request Phase 1 infra (Claude was putting GAP_FLAG in `type` instead of real steps). | Gap regen left 2 invalid steps; founder answers ignored. | ✅ live on 51e85ea — gap regen → arc_review with 4 Phase 1 steps | Fresh backfill + gap answers |
| 2026-06-25 | **FIX: `services/blueprint-intake.js` + `routes/blueprint-intake-routes.js`** — backfill now accepts `amendment_text` in body (previously required file path on server, but `docs/` is excluded from Railway Docker image via `.dockerignore:docs/*`). `scripts/run-blueprint-intake.mjs` rewritten to HTTP-first pattern (reads file locally, POSTs text to Railway API). `scripts/run-arc-entry-gate.mjs` simplified to structural-only check — AI review now lives exclusively in `/api/v1/blueprint/intake/:id/arc`. | Live test revealed AmendmentNotFound on Railway because docs/ not in Docker image. | ✅ syntax pass + live GET /api/v1/blueprint/intake returns 200 | `node scripts/run-blueprint-intake.mjs --amendment docs/products/marketingos/PRODUCT_HOME.md` |
| 2026-06-25 | **Blueprint Intake Service (5 files)** — `db/migrations/20260625_blueprint_intake.sql` (blueprint_intake_sessions table with flow_type + status machine); `services/blueprint-codebase-scanner.js` (live pattern scan before every blueprint gen); `services/blueprint-intake.js` (three flows: backfill/greenfield/adjustment, gap detection, ARC review, answer gaps); `routes/blueprint-intake-routes.js` (9 endpoints including chair-hook); `scripts/run-arc-entry-gate.mjs` + `scripts/run-arc-pipeline.mjs` + `scripts/run-blueprint-intake.mjs` (CLI backfill tool). Wired into `core/two-tier-system-init.js`. npm scripts: `blueprint:intake`, `blueprint:intake:list`. GAP REMAINING: chair-orchestrator `blueprint_execute` channel doesn't detect adjustment/greenfield intent yet — only routes to mission ID. CLI AI review won't work until council-service export is bridged. | Adam: build the Blueprint Intake Service for all three flows; fix BuilderOS so it can generate its own blueprints from existing amendments | ⚠️ syntax pass; chair-hook wired; ARC gate wired | `npm run blueprint:intake:list` |
| 2026-06-13 | **`services/railway-managed-env-service.js`** — allowlist FP V2 production env keys (`CHAIR_PREDICTION_SCORE_ENABLED`, `LANE_INTEL_*`, search API keys). | Managed-env bulk can enable scoreboard + lane intel on Railway. | ✅ | `npm run system:fp-v2:production-env` |
| 2026-06-13 | **`execute-mission.mjs`** — IDC exit gate before builder entry (pairs with unified FP V2 mission gate). | Close CLI bypass on mission execute spawn paths. | ✅ verify-chair-fp-v2 | deploy |
| 2026-06-22 | **`services/founder-packet-v2-unified-gate.js`** + **`factory-arc-loader.js`** — FP V2 end-to-end: live Chair + IDC exit + builder entry on all execute paths; council `/build`, founder routeToBuilder, terminal bridge gated. | Adam: full Founder Packet V2 enforcement not just Chair prompt. | ✅ unified gate tests | deploy |
| 2026-06-22 | **`services/obstacle-web-research.js`** tracked — imported by point-b-navigator at boot; was local-only. Dockerfile spine file asserts added. | Same class of boot crash as quorum-escalation — wired but not in git. | ✅ node --check | deploy |
| 2026-06-20 | **Railway boot fix:** `services/repo-root.js`, `services/point-b-target-lite.js`, `services/factory-arc-loader.js` — production spine lazy-loads factory-staging; point-b-navigator + bp-priority-scheduler no longer static-import arc modules at boot. `Dockerfile` RUN verifies `run-step.js` in image. | Railway healthcheck fail: ERR_MODULE_NOT_FOUND run-step.js — dockerignore had excluded factory-staging. | ✅ boot import test | deploy |
| 2026-06-20 | **`services/point-b-navigator.js`** — Point B navigator invoked only via Lumin Chair `point_b` channel (`lumin-chair-orchestrator.js`); no longer a sibling parallel route on founder-interface. | Founder: Point B orchestration must be subroutine of Lumin Chair, not separate desk. | ✅ chair + navigator tests | deploy |
| 2026-06-22 | **Point B spine audit repairs** — restored `scripts/run-point-b-gate.mjs`; fixed `studio-simulation.js` scope for direct product-host missions; `point-b-gate.js` accepts no-gap builder sim receipts; restored `builder-pre-build-simulate.mjs`; `bpb/intake-gate.js` accepts legacy `FOUNDER_PACKET.md + INTENT_BASELINE.json`; `mission-lib.mjs` now honors frozen legacy-write policy; `execute-mission.mjs` writes `BUILDER_RUN_RECEIPT.json` before Point B/doctrine evaluation; updated LifeOS product authority block and continuity truth | Audit found mechanical gate drift and false negatives across Foundation → Builder → Point B; machine path needed to clear honestly before founder usability | ✅ local foundation loop + point-b gate + tests | `node scripts/run-foundation-pipeline.mjs PRODUCT-LIFERE-OS-V1-0001 --once --force` |
| 2026-06-22 | **Point B Autonomous Driver** — `services/point-b-navigator.js`, `services/obstacle-web-research.js`, founder-interface default → navigator + `GET …/point-b/status`, `lifeos-lifere.html` + app LifeRE nav/Point B strip, `BLUEPRINT.json` for LifeRE, acceptance v2 (DOM markers), `execute-mission.mjs` BPB intake + execute-step + SENTRY, `builderos-bp-priority-scheduler.js` useful-work-guard, OBSTACLE_LESSON_LEDGER trimmed (5586→200), tool registry wired flags | Adam: system picks next gate toward Point B without path choices | ✅ acceptance + navigator tests | `npm run lifeos:lifere-os:v1-acceptance` |
| 2026-06-21 | **Point B = LifeRE Alpha + obstacle doctrine** — `POINT_B_TARGET.json`, `obstacle-lesson-loop.js`, `point-b-target.js`, loop v3, LifeRE on BP_PRIORITY rank 6, acceptance script | Adam: Point B is LifeRE Alpha; obstacles are lessons; stopping is failure | ✅ 5/5 tests | `npm run builderos:foundation:pipeline -- --bounded` |
| 2026-06-20 | **Never-stop foundation loop** — `phase-repair.js`, `runFoundationPipelineLoop()`, `assemble-pre-build-packet.mjs`, default loop in pipeline script | Adam: loop and repair until phase PASS | ✅ 2/2 phase-repair tests | `npm run builderos:foundation:pipeline -- MISSION_ID` |
| 2026-06-17 | **BUG FIX: `factory-staging/factory-core/arc/foundation/coverage-map.js`** — `levelFor()` checked `v === true` (strict) but `baseline?.failure_metrics?.length` returns a number (e.g. `2`), causing `failure_metric` to always resolve as `MISSING` even when INTENT_BASELINE.json had valid entries. Fixed: `v && v !== 'PARTIAL' && v !== 'PARKED'`. Also fixed: **`scripts/bp-priority-never-stop.mjs`** import paths; **`services/builderos-bp-priority-scheduler.js`** (NEW); **`startup/boot-domains.js`** — added `bootBuilderOSPriorityQueue`. | Voice Rail pipeline always failing at development stage with `failure_metric:MISSING` | ✅ tier1_load_bearing_ready for Voice Rail | `npm run builderos:bp-priority:once` |
| 2026-06-17 | **Doctrine enforcement stack** — `DEPARTMENT_ROLE_CONTRACT.json`, `MISSION_PHASE_ARTIFACTS.json`, `doctrine-enforcement.js`, `simulation-measurements.js`, `reality-score.js`, `TWIN_DRIFT_REPORT`, department sim measurements, `DOCTRINE_COMPLIANCE` HARD gate, `verify-mission-doctrine.mjs` | Adam: no discards, departments enforced, sim→reality scored | ✅ 11/11 doctrine+point-b tests | `npm run builderos:doctrine:verify -- MISSION` |
| 2026-06-17 | **V2 production recovery + gate hardening** — GAP-FILL boot chain (adf/builderos-arc routes, blueprint-write-policy, import paths); both v2 acceptances PASS on `7a7c96d0f4`; `SEAT_ACCOUNTABILITY_MATRIX.json` per mission; SNT translation requires `evidence_if_wrong` + prod route probe; point-b-gate blocks empty builder sim + acceptance FAIL | Adam plan #1–#5 | ✅ capture + commitment v2 acceptance PASS | Alpha confirm pending |
| 2026-06-17 | GAP-FILL: **`builderos-reboot/scripts/blueprint-write-policy.mjs`** — imported by `simulate-blueprint-steps.js` at ARC boot; Railway `15277e0ed4` FAILED missing module | Third boot crash in deploy chain | pending redeploy | commit + push |
| 2026-06-17 | GAP-FILL: **`services/builderos-arc-service.js`** — factory-staging imports used `../../` (resolved to `/usr/src/factory-staging` in Docker) instead of `../`; Railway `8570554438` FAILED boot | Second boot crash after adf-routes commit | pending redeploy | fix imports + push |
| 2026-06-17 | GAP-FILL: **`routes/adf-routes.js`**, **`routes/builderos-arc-routes.js`**, **`services/adf-prediction-ledger.js`**, **`services/builderos-arc-service.js`** — imported by `register-runtime-routes.js` in `3e7611d4e9` but never committed; Railway deploy `3e7611d4e9` FAILED `ERR_MODULE_NOT_FOUND adf-routes.js`; prod stuck on `6a45d8f` without v2 routes | Adam #1 recover production truth — deploy audit found boot crash not lag | pending redeploy + v2 acceptance | commit + push + build-from-latest |
| 2026-06-17 | **V2 HARD enforcement stack** — `gate-enforcement.js`, `foundation/prediction-receipt.js`, `foundation/builder-entry-gate.js`, `foundation/mission-ledger.js`, `GATE_ENFORCEMENT_MATRIX.json`, `department-simulations.js`, `idc-exit-gate.js`, `run-foundation.js`, `translate-mission.js`, `execute-mission.mjs`, `scripts/bp-priority-never-stop.mjs` | Adam: fail-closed on doctrine bypass | ✅ 6/6 point-b-gate tests | `npm run builderos:bp-priority:never-stop` |
| 2026-06-16 | **Foundation pipeline** — `factory-staging/factory-core/arc/foundation/*`, `run-foundation.js`, `scripts/run-foundation-pipeline.mjs` | Full founder-doc machine path | ✅ Action Inbox MACHINE_PATH_PASS_AWAITING_ALPHA | Alpha confirm pending |
| 2026-06-16 | **`point-b-gate.js` v2**, **`run-system-path.mjs`**, **`bootstrap-product-mission.js`**, **`run-alpha-confirm.mjs`**, **`execute-mission.mjs`**, **`translate-mission.js`**, **`ARC_JOB.json`** — Split gates: **B handoff** (FP complete, Adam done) → **B→C machine path** (ARC+Builder+TECHNICAL_PASS) → **C Alpha** (founder confirms only). Removed founder_usability as machine blocker. Honest intent coverage at bootstrap. Full system path runs bootstrap→ARC→Builder automatically. | Adam: after FP his job done till Alpha; lying about intent completeness = system fail | ✅ Action Inbox `MACHINE_PATH_PASS_AWAITING_ALPHA` exit 0 | Alpha: `npm run builderos:alpha:confirm -- MISSION --confirm` |
| 2026-06-16 | **`builderos-reboot/scripts/blueprint-write-policy.mjs`**, **`mission-lib.mjs`**, **`execute-mission.mjs`**, **`factory-staging/factory-core/arc/builder-cold-walk.js`**, **`simulate-blueprint-steps.js`**, **`tests/builder-blueprint-spine-write.test.js`** — frozen blueprint steps (`write_file_exact` + sha256 + sandbox) may write monorepo spine (`services/`, `package.json`); cold walk + simulator aligned; execute uses `acceptance_command` from blueprint. Verified: `execute-mission.mjs BUILDEROS-INTAKE-LOOP-V1-0001` 14/14 DONE + intake acceptance PASS. | Adam: fix Builder — legacy quarantine blocked IL-S08+; get handoff working | ✅ 3/3 spine tests + 14-step execute | next: commit ARC stack + BP_PRIORITY register |
| 2026-06-16 | **`services/adf-prediction-ledger.js`**, **`routes/adf-routes.js`**, **`scripts/adf-ledger.mjs`**, **`tests/adf-prediction-ledger.test.js`** — file-based predict → actual → score → lesson loop at `data/adf-predictions/` + `adf-lessons.json`; API `/api/v1/adf/*`; council `loadAdamProfile` injects scored lessons; refreshed `ADAM_SEED_PROFILE`. npm: `adf:status`, `adf:list`, `adf:lessons`, `adf:corpus`. Scored pred-001 (1.0) pred-002 (0.0) from Adam directive. | Adam: implement ADF, guess + accountable, every lesson adjusts | ✅ 3/3 unit tests | corpus ingest via `npm run adf:corpus` |
| 2026-06-12 | **`services/builder-blueprint-gate.js`** + **`routes/lifeos-council-builder-routes.js`** — `/build` fail-closed blueprint gate for `routes/`, `services/`, `public/overlay/` (requires `blueprint_path` / `blueprint_id` / `mission_id` with step covering target). **`scripts/system-railway-redeploy.mjs`** — 410 legacy deploy falls through to `build-from-latest`. **`services/builderos-governed-loop-executor.js`** + **`voice-rail-command-executor.js`** — surface `commit_sha` in command exec receipts. **`tests/builder-blueprint-gate.test.js`**. Stash archive: 64 cleared → `builderos-reboot/_hist/GIT_STASH_ARCHIVE/`. | Adam: next 10 system items — enforce §2.18, clean stashes, fix deploy + Voice Rail receipts | ✅ 4/4 blueprint gate tests | pending prod proofs |
| 2026-05-24 | **`routes/railway-managed-env-routes.js`:** `serviceInstanceDeploy` now uses `latestCommit:true` or explicit `commitSha`; `POST .../deployments/:id/redeploy` promotes a prior build. Fixes stale rollback when GH Actions token dead. | Adam stuck on v2.3.1; build-from-latest redeployed old SHA | AM04 | pending deploy |
| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-04-01 | Added the required self-programming loop (proposal, execution, verification, review, repair, scoring) plus explicit separation-of-duties rules | The builder now has a documented operating contract for how autonomous code work must be evaluated instead of acting like a single black-box coder | ✅ | pending | pending |
| 2026-05-25 | **`services/autonomy-scheduler.js` — LEGACY PRODUCT-LEVEL classification:** Added `@legacy PRODUCT-LEVEL` header. Changed gate from confusing `LIFEOS_DIRECTED_MODE !== 'false'` to explicit `LEGACY_SCHEDULER_ENABLED=true` opt-in (backward compat preserved via OR condition). 12 ungoverned AI calls (BoldTrail, Digital Twin, Pipeline, Self-Improvement) now require explicit opt-in. Railway gate confirmed absent (LEGACY_SCHEDULER_ENABLED not in Railway vault as of 2026-05-25 audit). | Ungoverned AI calls without useful-work-guard are a Zero-Waste + PB governance violation. BuilderOS governed runtime must not start these automatically. | ✅ `node --check` PASS | n/a | `LEGACY_SCHEDULER_ENABLED` absent from Railway — schedulers do not fire |
| 2026-05-09c | **Codebase cleanup** — 231 orphaned files purged: 15 root junk JS files (A.js, B.js, test1-3.js, cron_job.js, cron-job.js, deepseek-bridge.js, discoveryScanner.js, etc.), 2 dead route files (routes/ahni.js, routes/api.js), services/tc-webhook-validator.js (truncated, never imported), entire frontend/ (159 files) and backend/ (45 files) directories with zero server references, 7 stale screenshot PNGs. Fixed routes/tsos-task-ledger-routes.js: builder-committed `exp` typo → `export function`; added missing `import express`. Removed dead `test:smoke` script from package.json (referenced non-existent scripts/smoke-test-server.js). | Comprehensive single-pass audit to remove dead weight from repo. Builder daemon had committed broken JS syntax in tsos-task-ledger-routes.js. | ✅ `node --check` all remaining JS PASS · `git push` cda55c87 |
| 2026-05-09b | **GQL schema fix** — `routes/railway-managed-env-routes.js`: `meta { commitHash... }` → `meta` (scalar). Railway v2 `DeploymentMeta` is a JSON scalar, not a subfield-expandable type; live test returned `GRAPHQL_VALIDATION_FAILED`. `meta` now returns the full blob as a plain JSON value. | Live test revealed schema mismatch. | ✅ `node --check` PASS · live `/deployments/latest` confirmed 200 after deploy |
| 2026-05-09 | **Railway deployment log reading** — `routes/railway-managed-env-routes.js`: added `import { readFile, stat }` (node:fs/promises) and `import { join }` (node:path). Added 5 new authenticated routes (all require command key): `GET /deployments?first=N` — lists last N Railway deployments via GraphQL (status, createdAt, commit metadata, url); `GET /deployments/latest` — most recent deployment with `success: bool`; `GET /deployments/:id/logs?limit=N` — build logs via Railway GraphQL `deploymentLogs` query; `GET /logs/local` — lists 15 whitelisted local log/data files with size+mtime; `GET /logs/local/:name?lines=N&raw=1` — tail last N lines of any whitelisted file (strict allowlist: logs/*.log, logs/*.out, data/*.jsonl, data/quarantined-tasks.json). Uses existing `railwayGql()` helper. | System could trigger deploys but had no observability: no way to know if deploy succeeded, read build output, or tail daemon logs. Closes the full loop: push → trigger → poll latest → read build logs on failure. | ✅ `node --check routes/railway-managed-env-routes.js` PASS |
| 2026-04-27 | GAP-FILL: `routes/railway-managed-env-routes.js` — refactored to shared `railwayGql()` helper; added `internalRailwayBuildFromLatest()` using `serviceInstanceDeploy` mutation; added `POST /api/v1/railway/managed-env/build-from-latest` endpoint. Prior endpoint `self-redeploy` uses `serviceInstanceRedeploy` (restart only — doesn't pull new GitHub commits). New endpoint rebuilds from source. | Railway wasn't auto-deploying pushed commits; crash-loop on missing module meant `serviceInstanceRedeploy` kept restarting broken image. Need force-rebuild capability. | ✅ node --check | n/a | n/a |
| 2026-04-23 | GAP-FILL: Added `POST /api/v1/railway/managed-env/self-redeploy` to `routes/railway-managed-env-routes.js`; updated `scripts/system-railway-redeploy.mjs` with 2-path fallback (command-key → RAILWAY_TOKEN) | System needed ability to redeploy itself using its own Railway vault credentials when local COMMAND_CENTER_KEY is out of sync; previous `/api/v1/railway/deploy` required matching local key | ✅ node --check | pending | pending |
| 2026-04-25 | Added `POST /api/v1/railway/managed-env/rotate-command-key` + `GET /sync-command-key` to `routes/railway-managed-env-routes.js`; added `scripts/system-rotate-command-key.mjs` + `scripts/system-sync-command-key.mjs`; added `npm run system:rotate-command-key` + `npm run system:sync-command-key` | CCK drifted between Railway vault and local .env.local; rotate sets a new key in both; sync pulls Railway's live key into .env.local without changing vault; both use x-railway-token escape-hatch | ✅ node --check | pending | pending |

---

## Pre-Build Readiness

**Status:** BUILD_READY (builder supervisor + council review — core loop complete)
**Adaptability Score:** 88/100
**Council Persona:** musk (first principles — what can we delete? is there a 10x simpler version?)
**Last Updated:** 2026-06-16

### Gate 1 — Implementation Detail
- [x] Builder supervisor spawns Claude Code headlessly with --dangerously-skip-permissions
- [x] Council review service runs 4 lenses in parallel on free tier
- [x] Git worktree isolation — one worktree per agent, zero cross-agent conflicts
- [x] build_ready gate prevents builder from touching unvetted projects
- [x] adam_decision_profile learns from real decisions over time

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Devin (Cognition) | 67% PR merge rate, full web agent | $20+/mo, cloud-only, no domain context | We run on our own infra with full domain knowledge baked into every prompt |
| GitHub Copilot Workspace | GitHub-native, async | No custom personas, no pre-build review, no Adam filter | We run 4 lenses + adversarial debate before touching a file |
| Aider | Great headless CLI, open source | No orchestration layer, no council review | We can use Aider as a second agent type via our supervisor |
| OpenHands | 72% SWE-bench, REST API | Generic, no SSOT governance, no domain training | We have constitutional governance + amendment readiness gates |
| Cursor Background Agents | Cloud sandboxes, parallel | Subscription cost, no custom review layer | Our council runs free; Cursor is opt-in addition, not dependency |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Claude Code -p flag behavior changes | Low | High | Monitor Anthropic docs; fallback to SDK if CLI changes |
| Free tier models get worse at code review | Medium | Medium | Council review uses verdict fallback to PROCEED if all lenses fail |
| Git worktree conflicts on Railway (read-only FS) | Medium | High | Builder runs locally or in Railway with writable volume mounted |
| Adam overrides STOP 100% of the time (defeats purpose) | Low | Medium | Track override rate in adam_decision_profile; surface in Command Center |

### Gate 4 — Adaptability Strategy
New agent types (Aider, Codex CLI, Devin API) plug into `spawnAgent()` factory pattern — same worktree, same council review, different binary. Score: 88/100.
- New council lenses: add function to `builder-council-review.js`, add to parallel Promise.allSettled
- New personas: add to PERSONAS constant in `builder-council-review.js` — 5 lines

### Gate 5 — How We Beat Them
While Devin runs blindly against a GitHub issue, our builder consults Edison, Tesla, Musk, and the Adam filter before writing a line — meaning the code that comes out the other end already accounts for unintended consequences, 2-year retrospectives, and what you would have built if you'd been a programmer.

---

## Additional spec — Amendment 46 — BUILDEROS CONTROL PLANE

_(formerly AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md)_
**Status:** IN_BUILD — Phase 1 infrastructure on disk
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-06-29 — canMarkBuildDone accepts `pending` overlay so callers can supply pre-commit evidence before DB row updates; BP readiness sync carries artifact freshness and founder-usability truth.

> **Core law:** If it is not in the ledger, it did not happen.
> **Priority:** Higher than MarketingOS, SalesOS, CCL production integration.

**Note:** Amendment 44 (`AMENDMENT_44_TOKEN_ACCOUNTING_OS.md`) owns the **Token Ledger** sub-layer. This amendment owns the **supreme measurement/control plane** that aggregates all ledgers and enforces BuilderOS DONE gates.

---

## 1. Purpose

BuilderOS cannot improve what it does not measure. Adam has repeatedly requested token tracking, build time, failures, cost, and benchmarks. Pieces exist but are scattered and unenforced. This amendment defines one control plane that makes every AI agent accountable.

**Do not build product features under this amendment** — measurement and enforcement only.

### 1.1 Mission-first control-plane requirement

Jobs, ledger rows, logs, and route probes are not the parent object.
Missions are.

This control plane must evolve from job-centric truth to mission-centric truth:
- every meaningful build action should attach to a mission
- every mission should expose current state, authority class, and governing blueprint
- every measured outcome should roll back into trust, calibration, and lessons

---

## 2. Existing systems audit (2026-05-24)

| Ledger | Repo path | DB object | Mounted | Status |
|--------|-----------|-----------|---------|--------|
| **Token** | `services/savings-ledger.js`, `services/token-accounting-service.js` | `token_usage_log`, `unified_token_accounting_report`, `ai_unmetered_exceptions` | `/api/v1/tokens/*` | **PARTIALLY VERIFIED** — council metered; 52 historical rows; no 24h activity |
| **Build (legacy)** | `routes/tsos-task-ledger-routes.js` | `builder_task_ledger` (was missing migration) | **NOT MOUNTED** | **BLOCKED** — routes exist, table had no migration until `20260601` |
| **Build (trust spine)** | `db/migrations/20260519_builder_trust_spine.sql` | `builder_task_receipts` | via builder supervisor | **VERIFIED** schema |
| **Build (core)** | `db/migrations/20260313_core_schema.sql` | `build_history`, `task_tracking` | unknown | **UNVERIFIED** usage |
| **Task** | `routes/project-governance-routes.js` | `execution_tasks`, `pending_adam` | `/api/v1/pending-adam` | **PARTIALLY VERIFIED** |
| **Decision** | `routes/project-governance-routes.js`, SSOT amendments | `pending_adam`, amendment receipts | partial | **UNVERIFIED** unified decision ledger |
| **Model performance** | `services/model-performance.js`, `routes/model-performance-routes.js` | `model_verdicts`, `model_lens_scores` | `/api/v1/model-performance/*` | **VERIFIED** mounted |
| **OIL proof** | `services/oil-security-receipts.js` | `security_receipts` | `/api/v1/oil/receipts` | **VERIFIED** schema |
| **Lessons** | `services/memory-intelligence-service.js` | `lessons_learned` | `/api/v1/memory/evidence/*` | **VERIFIED** |
| **CCL/context** | Amendment 45 only | placeholder cols on `token_usage_log` | n/a | **BLOCKED** — no production CCL ledger |
| **Routing decisions** | `services/builderos-tsos-routing.js` | `builderos_tsos_routing_decisions` | internal | **VERIFIED** schema |
| **Command control jobs** | `services/builderos-command-control-service.js` | `builderos_command_control_jobs` | `/api/v1/lifeos/builderos/command-control/*` | **VERIFIED** |
| **Autonomous telemetry** | `services/autonomous-telemetry-instrumentation.js` | `autonomous_telemetry_events` | `/api/v1/lifeos/autonomous-telemetry/*` | **PARTIALLY VERIFIED** |
| **Enhanced AI usage tracker** | `core/enhanced-ai-usage-tracker.js` | n/a | **NOT MOUNTED** | **BLOCKED** — superseded by Token Accounting OS budgets |

---

## 3. Scattered system owners

| Concern | Owner amendment | Primary file |
|---------|-----------------|--------------|
| Token receipts | Am 44 | `services/token-accounting-service.js` |
| Council metering | Am 01 | `services/council-service.js` → `recordMetered` |
| Build receipts | Am 19 / Blueprint | `builder_task_receipts`, `builderos-governed-loop-executor.js` |
| OIL proof | Am 40 | `services/oil-security-receipts.js` |
| Model scores | Am 04 | `services/model-performance.js` |
| Lessons | Am 39 | `services/memory-intelligence-service.js` |
| Operator/Cursor tokens | Am 44 OCL | `services/operator-consumption-ledger-service.js` |
| **Control plane (new)** | **Am 46** | `services/builderos-control-plane-service.js` |

---

## 4. Eight ledgers — target spec

### 4.1 Token Ledger (Am 44 subordinate)
Fields: provider, model, task_id, blueprint_id, product_lane, input/output/cached tokens, free_tier, estimated/actual cost, CCL_used, LCL_used, routing_decision, quality_result, OIL_result.

**Source of truth:** `token_usage_log` + `unified_token_accounting_report` + `ai_unmetered_exceptions`.

### 4.2 Build Ledger
**Canonical table:** `build_task_ledger` (migration `20260601`).

Fields per user spec: task_id, blueprint_id, timing, files, lines, commands, tests, failures, retries, model/agent, human intervention, deploy/rollback, proof links.

**Legacy:** `builder_task_ledger` — compat table for `routes/tsos-task-ledger-routes.js` (still not mounted).

### 4.3 Task Ledger
**Phase 2.** Target: unify `execution_tasks`, `pending_adam`, builder jobs into `control_plane_task_ledger`.

### 4.4 Decision Ledger
**Phase 3.** Target: `founder_decision_ledger` from SSOT receipts + `pending_adam` resolutions.

### 4.5 Model Performance Ledger
**Exists:** `services/model-performance.js` — extend to include build time + token cost joins.

### 4.6 OIL Proof Ledger
**Exists:** `security_receipts` — link to `build_task_ledger.oil_receipt_id`.

### 4.7 Lesson / Failure Pattern Ledger
**Exists:** `lessons_learned` + self-repair memory — add maturity enum in Phase 4.

### 4.8 CCL / Context Ledger
**Phase 5+.** Amendment 45 placeholders only until CCL production approved.

---

## 5. Phased implementation plan

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **1 (now)** | `build_task_ledger`, control plane health, token unified refs, verify script | ✅ on disk |
| 2 | Wire builder `/build` start/complete → `build_task_ledger`; mount tsos-task-ledger compat | ⚠️ next |
| 3 | Task + decision ledgers | planned |
| 4 | Model perf + lesson maturity joins in summary API | planned |
| 5 | CCL context ledger | blocked on Am 45 |
| 6 | BuilderOS DONE gate enforced in `lifeos-council-builder-routes.js` | ⚠️ next |

---

## 6. DB tables / views (Phase 1)

| Object | Migration | Role |
|--------|-----------|------|
| `build_task_ledger` | `20260601_build_task_ledger.sql` | Canonical build measurement |
| `builder_task_ledger` | same | Legacy compat |
| `token_usage_log` | `20260321` | Token receipts |
| `ai_unmetered_exceptions` | `20260531` | Unmetered exceptions |
| `unified_token_accounting_report` | `20260532` | Token rollup view |
| `security_receipts` | `20260524` | OIL proof |
| `lessons_learned` | `20260426` | Failure patterns |

---

## 7. APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/builderos/control-plane/health` | GREEN/YELLOW/RED measurement coverage |
| GET | `/api/v1/builderos/control-plane/summary` | Answers: calls, spend, top task, longest build, worst model |
| POST | `/api/v1/builderos/control-plane/builds/start` | Open build ledger row |
| POST | `/api/v1/builderos/control-plane/builds/complete` | Close build (DONE gate) |
| GET | `/api/v1/builderos/control-plane/builds/:task_id/done-gate` | Pre-check DONE eligibility |
| GET | `/api/v1/builderos/control-plane/tasks-without-proof` | Audit gap list |
| GET | `/api/v1/tokens/unified/health` | Token sub-layer health (Am 44) |

### 7.1 Mission-state display requirements

The control plane should ultimately expose, at minimum:
- `mission_id`
- current mission state
- governing blueprint path
- authority zone / routing class
- predicted outcome
- measured outcome
- challenge history
- trust escalation status

Current runtime does not yet provide this full mission object. Until code support exists, docs must not imply that it does.

---

## 8. Verification

```bash
npm run builderos:control-plane:verify
node scripts/verify-builderos-control-plane.mjs
node scripts/verify-token-accounting-current-state.mjs
```

---

## 9. BuilderOS DONE gate

No task may be marked **DONE** unless:
1. **Token receipt** in `token_usage_log` OR **unmetered exception** for `task_id`
2. **Build receipt** in `build_task_ledger` with `end_time`
3. **OIL receipt** in `security_receipts` linked to task

If measurement health is **RED** → DONE blocked unless explicit exception.

Implemented in: `controlPlane.canMarkBuildDone()` + `POST /builds/complete` returns 409 when blocked.

✅ Wired: `routes/lifeos-council-builder-routes.js` now runs `evaluateBuildDoneGateForBuildResponse(...)` before returning success from `/build`. On failure it returns blocker `BUILDEROS_DONE_BLOCKED` with reason/receipt/missing evidence.

### 9.1 Governance routing display

The control plane should distinguish:
- Autonomous
- Supervised
- Founder Required
- Pre-Authorized
- Mission-Critical

These are display and routing requirements for future enforcement mapping.
Current code/runtime truth still primarily exposes job and receipt state, not full mission routing state.

---

## 10. Health endpoint semantics

| Status | Meaning |
|--------|---------|
| **GREEN** | All core tables/views exist; activity today; no unmetered exceptions |
| **YELLOW** | Partial coverage, stale activity, or builds without proof |
| **RED** | Missing core tables or pool unavailable |

---

## 11. Acceptance criteria (system must answer)

| Question | Source (Phase 1) |
|----------|------------------|
| How many AI calls today? | `getTokenMetricsToday()` |
| How many metered? | `token_usage_log` count today |
| How many unmetered? | `ai_unmetered_exceptions` count today |
| How much spent? | SUM `cost_usd` today |
| Top token task? | GROUP BY request_id |
| Longest build? | MAX `duration_ms` in `build_task_ledger` |
| Worst failing model? | `getWorstPerformingModels()` |
| Tasks without proof? | `getTasksWithoutProof()` |

**Honesty:** Cursor/operator tokens require manual OCL until automatic IDE metering exists.

---

## 12. First exact coding task (next)

Wire `routes/lifeos-council-builder-routes.js`:
- On `/build` start → `POST` internal `recordBuildStart({ task_id, blueprint_id, model_used })`
- On `/build` complete → `recordBuildComplete` with token + OIL receipt IDs
- Return 409 if `canMarkBuildDone` fails when health RED

## 13. Trust Escalation Tracking

The control plane must eventually support trust escalation based on evidence, not vibes.

For any expandable autonomy path, track:
- governing mission
- actor or model class
- historical accuracy
- challenge survival
- failure rate
- decision latency saved
- whether delegation was pre-authorized, supervised, or founder-required

Until this is implemented, trust escalation remains a constitutional requirement without full runtime enforcement.

---

## Agent Handoff Notes

Phase 1 control plane is on disk. Amendment 44 remains token sub-layer. Deploy migrations `20260531`, `20260532`, `20260601` then run verify scripts.

---

## Change Receipts

| Date | Change | Why |
|------|--------|-----|
| 2026-06-29 | **`canMarkBuildDone` pending evidence support** — `services/builderos-control-plane-service.js` — function now accepts `pending = { end_time, token_receipt_id, oil_receipt_id }` parameter; creates `merged` overlay from DB row + pending values so proof checks use pre-commit evidence before row is updated. | Callers completing a build needed to supply end-time + receipts before the DB UPDATE, so `canMarkBuildDone` had to validate the merged state, not just the stale row. | ✅ test pass | `node --test tests/builderos-control-plane-pending-evidence.test.js` |
| 2026-06-28 | **`services/tsos-platform-kernel.js`** — kernel returns `started_at`, `ended_at`, `duration_ms` on every `kernelExecute` result. | Operation timing must be in the ballpark on all kernel paths. | ✅ | deploy |
| 2026-06-22 | **`services/bp-priority-sync.js`** — `checkOrphanProductPassReceipts` includes `scrapped_items[].receipt_path` (Voice Rail SCRAPPED_SALVAGE). | Adam scrapped Voice Rail; PASS receipt stays registered under scrapped not active queue. | BP guardrails PASS |
| 2026-06-13 | **`services/tsos-platform-kernel.js`** — `wrapBuild()` now sets request marker `req.__kernel_managed_build = true` for wrapped `/builder/build` calls and clears it in `finally`, allowing route-layer guards to distinguish kernel-managed sequencing. **`routes/lifeos-council-builder-routes.js`** — `evaluateBuildDoneGateForBuildResponse()` and `evaluateBuildCompletionForBuildResponse()` now support `kernelManaged` deferral mode; `/build` passes this marker and, when set, defers terminal DONE/completion checks to kernel authority (`done_gate_deferred_to_kernel`, `completion_deferred_to_kernel`) instead of early route blocking. **`tests/builderos-build-done-gate-route-wiring.test.js`** and **`tests/builderos-completion-authority.test.js`** add regression coverage for kernel-managed deferral and non-kernel missing-proof blocking. | Fix circular proof ordering found in live job `881754fc-5674-4e49-8f63-4cfe137be606`: route-level DONE gate ran before kernel/control-plane could write `build_end_time`/token/OIL proof, causing false early `missing_proof` blocks. |
| 2026-06-13 | **`routes/lifeos-council-builder-routes.js`** — imports `evaluateBuildDoneGateAsync` and enforces DONE gate in `evaluateBuildDoneGateForBuildResponse(...)` before any `ok:true, committed:true, commit_sha` response. Returns `409` with `blocker: BUILDEROS_DONE_BLOCKED`, `reason`, `receipt_path`, and `missing_evidence` when present. Success now includes `done_gate_required: true`, `done_gate_passed: true`. **`tests/builderos-build-done-gate-route-wiring.test.js` (NEW)** covers: (A) commit_sha alone blocked, (B) done gate pass allows success, (C) missing evidence blocked, (D) non-success build path unchanged. | Phase 6 completion: make DONE/PASS impossible from commit SHA alone on production `/build` path. |
| 2026-06-13 | **`services/builderos-build-done-gate-helper.js` (NEW)** + **`tests/builderos-build-done-gate-helper.test.js`** — extracted DONE gate evaluation (rejects commit_sha-only success; requires control-plane evidence when available). This helper was later wired into `/build` in the receipt above. | Repair Lane GAP-FILL: unblock Phase 6 `/build` integration without Zone 3 route patch in same step. | ✅ 5 tests |
| 2026-05-24 | **Revert** voice-specific helpers from `bp-priority-queue.js` (v2.27 extension removed in v2.28). Loader stays canonical per `builderos-reboot/AGENTS.md`. | Adam: do not pollute control-plane loader with voice theater | GAP-FILL v2.28 |
| 2026-06-12 | **`services/bp-priority-sync.js`** — `checkOrphanProductPassReceipts()` (§2.18: no orphan PASS in `products/receipts/`); CI via `system-maturity-check.mjs`. **`services/bp-priority-queue.js`** — canonical BP_PRIORITY loader (tracked). | Adam: PASS without BP sync must be impossible; default push+deploy. | ✅ verify 26 checks |
| 2026-06-03 | **`services/decision-ledger.js` (NEW)** + **`db/migrations/20260606_decision_ledger.sql`** — `founder_decision_ledger` table; `createDecision()` used by model escalation gate receipts. | Builder Reliability Initiative Layer 1 — escalation audit trail. | ✅ migration applies on deploy |
| 2026-06-01 | Constitutional refactor alignment only. Added mission-first control-plane requirements, minimum mission-state display targets, governance-routing display requirements, and trust-escalation tracking while explicitly noting these are not yet fully implemented runtime surfaces. | Keep control-plane authority honest: mission-centric governance is canonical direction, not current fake-green runtime. |
| 2026-05-24 | Amendment 46 + `build_task_ledger` + control plane service/routes + verify script | Measure everything before more product build |
| 2026-05-24 | `services/tsos-platform-kernel.js` + `/api/v1/kernel/*` + `wrapBuild` DONE gate wiring | TSOS Platform Kernel Phase 0 orchestrates control plane + token accounting |
| 2026-05-31 | GAP-FILL: `verifyOilReceipt` query now also checks `payload->'details'->>'task_id'` (canonical OIL payload nests task_id under `details`, not top-level). `files_changed` fixed from integer `1` to `[target_file]` array (column is TEXT[]). Both fixes in `services/tsos-platform-kernel.js`. Root cause: OIL receipts were being written correctly but never found by verifier. |

---

## Additional spec — Amendment 47 — MISSION RUNTIME

| Field | Value |
|---|---|
| **Amendment Number** | 47 |
| **Domain** | Mission Runtime |
| **Status** | **PHASE 2 COMPLETE** — All 7 owned files DONE. 10/10 verifier checks PASS. AIC DISCUSSION-6 (backward transition authority) pending but non-blocking — [GOVERNANCE-GAP] comments in mission-ledger.js. |
| **Last Updated** | 2026-07-04T20:29 — route_wire_failed also continues. |
| **BPB** | `docs/projects/BPB-0001-MISSION-RUNTIME-V1.md` |
| **Mission** | MISSION-0001 — Adam + Sherry Household Reliability and Income Engine |
| **Constitutional Authority** | `docs/constitution/NORTH_STAR_SSOT.md` §2.0D (Mission State Machine Law), §2.0E (BPB Determinism Law) |

---

## Mission

Every meaningful system action must attach to a mission. This amendment implements the Mission Runtime — the parent object system that gives BuilderOS C2 jobs, Historian lessons, commitments, and household tasks a common root.

---

## Owned Files

| File | State |
|---|---|
| `db/migrations/20260604_mission_runtime_v1.sql` | ✅ DONE |
| `db/migrations/20260604_mission_runtime_commitments_patch.sql` | ✅ DONE (Phase 2 pre-requisite — 12 columns added, FK order-safe) |
| `services/mission-ledger.js` | ✅ DONE (GAP-FILL — 267 lines, 11 exports + MISSION_STATE_TRANSITIONS, node --check PASS) |
| `routes/mission-routes.js` | ✅ DONE (GAP-FILL — 130 lines, 8 routes, node --check PASS. §13.3 commitment CRUD excluded.) |
| `public/overlay/lifeos-household.html` | ✅ DONE (GAP-FILL — 8 sections, 30s poll, ?key= auth, approve btn, add form) |
| `startup/register-runtime-routes.js` | ✅ DONE (surgical add — createMissionRoutes mounted at /api/v1/lifeos) |
| `routes/public-routes.js` | ✅ DONE (surgical add — /lifeos-household route per §Section 7) |

---

## DB Tables

| Table | Description | State |
|---|---|---|
| `missions` | Parent object. slug, title, purpose, state (12), authority_class, owner, blueprint_ref, metadata_json | ✅ Migration written |
| `mission_participants` | Who is on the mission. participant (adam/sherry/system), role (owner/contributor/approver/observer) | ✅ Migration written |
| `mission_state_transitions` | Ledger of every state change. from_state, to_state, transitioned_by, note | ✅ Migration written |
| `commitments` | "I'll do it" captures. owner, text, due_date, urgency/importance/energy_cost/money_impact/relationship_impact (1-5), better_owner, approval_required | ✅ Patch migration written (20260604_mission_runtime_commitments_patch.sql — 12 columns added to pre-existing table) |
| `builderos_command_control_jobs.mission_id` | FK backfill — every C2 job traces to a mission | ✅ Migration written |
| `historian_lessons.mission_id` | FK backfill — conditional (table may not exist) | ✅ Migration written (conditional DO $$ block) |

---

## API Surface (Pending)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/lifeos/missions` | Create mission |
| GET | `/api/v1/lifeos/missions` | List missions |
| GET | `/api/v1/lifeos/missions/:id` | Get mission + participants + transitions + commitments |
| PUT | `/api/v1/lifeos/missions/:id` | Update mission fields |
| POST | `/api/v1/lifeos/missions/:id/transition` | Transition state (validated) |
| POST | `/api/v1/lifeos/missions/:id/participants` | Add participant |
| DELETE | `/api/v1/lifeos/missions/:id/participants/:participant` | Remove participant |
| POST | `/api/v1/lifeos/commitments` | Create commitment |
| GET | `/api/v1/lifeos/commitments` | List commitments |
| PUT | `/api/v1/lifeos/commitments/:id` | Update commitment |
| GET | `/api/v1/lifeos/household/board` | Household board (8 sections) |

---

## State Machine (12 states, 22 valid transitions)

States: `Proposed → Clarified → Council Review → Approved → BPB Blueprinting → OIL Review → Build Approved → Building → Verification → Deployed → Outcome Measured → Lessons Captured`

Full transition table: `docs/projects/BPB-0001-MISSION-RUNTIME-V1.md` §Section 2.

Invalid transitions must return `400 { ok: false, error: "invalid_transition", from, to, valid_next: [...] }`.

---

## Build Plan

- [x] **BPB-0001 created** — fully specified blueprint (2026-06-01)
- [x] **DB migration** — `db/migrations/20260604_mission_runtime_v1.sql` — 4 tables + 2 backfill ALTERs + MISSION-0001 seed (2026-06-01)
- [x] **Commitments patch migration** — `db/migrations/20260604_mission_runtime_commitments_patch.sql` — 12 columns added to pre-existing commitments table per BPB-0001 §13.2 (2026-06-02)
- [x] **`services/mission-ledger.js`** — 11 exported functions + MISSION_STATE_TRANSITIONS per BPB-0001 §Section 4 (2026-06-02, GAP-FILL: builder truncation pattern §16)
- [x] **`routes/mission-routes.js`** — 8 routes (missions CRUD, participants, board) per BPB-0001 §§3.1–3.3, 3.5, 13.3 (2026-06-02, GAP-FILL: builder HTTP_502 ×2)
- [x] **`public/overlay/lifeos-household.html`** — 8 sections per §Section 6, 30s poll, ?key= auth, approve btn, add form (2026-06-02, GAP-FILL)
- [x] **Wiring** — register-runtime-routes.js + public-routes.js surgical adds (2026-06-02)
- [x] **Verifier** — all 10 checks from BPB-0001 §Section 9 PASS (2026-06-02)

---

## ⚠️ Known Gaps

- `historian_lessons` table does not exist yet — migration skips the FK backfill safely (conditional DO $$ block)
- No Sherry auth/login — API key only for Phase 1 (by design)
- `capacity_warnings` array in board response is always `[]` for Phase 1 (by design)
- ~~**CRITICAL: `commitments` table already exists**~~ — **RESOLVED 2026-06-02**: `db/migrations/20260604_mission_runtime_commitments_patch.sql` adds all 12 mission-specific columns. FK on `mission_id` is order-safe via `DO $$` conditional. See BPB-0001 §13.2.
- ~~**CRITICAL: `commitments` missing 5 columns queried by `mission-ledger.js`**~~ — **RESOLVED 2026-06-02 (production smoke-test)**: `db/migrations/20260605_mission_runtime_commitments_missing_columns.sql` adds `owner TEXT`, `text TEXT`, `due_date DATE`, `reminder_at TIMESTAMPTZ`, `risk_if_missed TEXT`. Root cause: original commitments table (20260328_lifeos_repair.sql) used `due_at TIMESTAMPTZ` / `title TEXT` instead of the BPB-0001 §13.2 column names. `/api/v1/lifeos/household/board` returned HTTP 500 `column "due_date" does not exist` until this migration applied.
- ~~**CRITICAL: `createCommitment` missing `user_id` and `title` in allowed cols**~~ — **RESOLVED 2026-06-02**: `services/mission-ledger.js` `createCommitment` cols list did not include `user_id` or `title`. The `commitments` table has `user_id BIGINT NOT NULL` and `title TEXT NOT NULL`. Both added to cols array. Seeding now works.
- **CRITICAL: `/api/v1/lifeos/commitments` route collision** — `routes/lifeos-commitment-routes.js` already mounted at this path. `mission-routes.js` must NOT also mount here. Commitment CRUD must extend existing file. See BPB-0001 §13.3.
- ~~**GOVERNANCE GAP: backward transition authority**~~ — **RESOLVED 2026-06-02 (AIC DISCUSSION-6)**: All 3 backward transitions (`Building → Approved`, `Verification → Build Approved`, `Outcome Measured → Approved`) are **Founder-only**. `transitionMissionState()` now enforces: `transitioned_by === 'adam'` + non-empty note (min 10 chars). Throws `BACKWARD_TRANSITION_AUTHORITY_REQUIRED` (403) or `BACKWARD_TRANSITION_NOTE_REQUIRED` (400) otherwise. `BACKWARD_TRANSITIONS` Set exported from mission-ledger.js. AIC council confirmed risks; verdict UNKNOWN (voting format issue) — Conductor synthesized resolution under §2.12 with council input.
- **GOVERNANCE GAP: no pause/terminate state** — Missions cannot be formally paused or terminated. Pending Founder DISCUSSION-1 + AIC DISCUSSION-2. Phase 1 household board must NOT render pause/terminate controls.

---

## Agent Handoff Notes

**Current state as of 2026-06-02 (post-smoke-test):** PHASE 2 PRODUCTION VERIFIED. All routes live, all data seeded, board HTTP 200 with real content.

**What works (production-verified):**
- `/lifeos-household` → HTTP 200 ✅ (overlay served)
- `/api/v1/lifeos/missions` → HTTP 200, MISSION-0001 found ✅
- `/api/v1/lifeos/household/board` → HTTP 200, 8 sections populated ✅
- `services/mission-ledger.js` — `createCommitment` now includes `user_id` + `title` in allowed cols (required by original DB schema)
- 8 realistic commitments seeded for MISSION-0001 (IDs 26–33): 4 Adam, 3 Sherry, 1 pending Sherry approval
- DB migrations applied: `20260604_mission_runtime_v1.sql`, `20260604_mission_runtime_commitments_patch.sql`, `20260605_mission_runtime_commitments_missing_columns.sql`

**Board section counts (live as of 2026-06-02):**
- today_commitments: 0 (none due today; Doctor appt due 2026-06-03)
- overdue_commitments: 0
- adam_tasks: 5 (Doctor 06-03, Client 06-07, Taxes 06-10, Mortgage 06-15, VA Hire 06-20)
- sherry_tasks: 3 (School 06-05, Budget 06-08, Nutrition 06-12)
- waiting_approval: 1 (VA Hire — needs Sherry approval)
- income_priorities: 4 (tasks with money_impact > 0)

**What is NOT done (by design for Phase 1):**
- **Cooling-off period**: No repeat-backward-transition timer implemented. Phase 1 relies on mandatory note as the only rate-limiter. Can add in Phase 3 if abuse detected.
- **AIC-initiated backward transitions**: Council cannot trigger backward transitions — requires Adam. AIC DISCUSSION-2 (pause/terminate states) still pending.
- **Builder Zone 3 block**: `services/mission-ledger.js` is now ~290 lines — builder governance blocks full-file generation. Targeted edits done as Conductor self-repair. Extract helpers if new functionality exceeds 50 lines.
- **GOVERNANCE GAP: no pause/terminate state** — still pending Founder DISCUSSION-1 + AIC DISCUSSION-2.

**Next priority for next agent:**
1. Resume C2-first priority stack — this was the last Mission Runtime governance item
2. `today_commitments` timezone check (board query uses `due_date = CURRENT_DATE` — Railway runs UTC, may mismatch Adam's timezone)
3. AMENDMENT_21 backlog or C2 work per founder priority order

---

## Change Receipts

| Date | What Changed | Why | Files | Verified |
|---|---|---|---|---|
| 2026-06-02 | **AIC DISCUSSION-6 resolved — backward transition authority implemented.** `services/mission-ledger.js`: added `BACKWARD_TRANSITIONS` Set (exported) with 3 Founder-only pairs: `Building→Approved`, `Verification→Build Approved`, `Outcome Measured→Approved`. `transitionMissionState()` now enforces authority gate: throws `BACKWARD_TRANSITION_AUTHORITY_REQUIRED` if `transitioned_by !== 'adam'`; throws `BACKWARD_TRANSITION_NOTE_REQUIRED` if note < 10 chars. `[GOVERNANCE-GAP]` comments removed from `MISSION_STATE_TRANSITIONS`. AIC council (gemini_flash, groq_llama, claude_sonnet) consulted via proposal 9 — confirmed risks; verdict UNKNOWN (voting format issue in council infrastructure); Conductor synthesized resolution under §2.12. `node --check` PASS. | Adam directive: resolve AIC DISCUSSION-6 after board verified. Council confirmed backward transition risks; Conductor synthesized Founder-only authority per §2.12 with council input. | `services/mission-ledger.js`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ node --check PASS, BACKWARD_TRANSITIONS exported, authority gate in transitionMissionState() |
| 2026-06-02 | **Production smoke-test + commitment seeding.** Fixed `createCommitment` cols list to include `user_id` (BIGINT NOT NULL in original commitments schema) and `title` (TEXT NOT NULL in original schema). Added migration `20260605_mission_runtime_commitments_missing_columns.sql` (5 missing columns: `owner`, `text`, `due_date`, `reminder_at`, `risk_if_missed` — root cause: original table used `due_at`/`title` naming). Seeded 8 realistic Mission-0001 commitments (IDs 26–33): mortgage, taxes, client close, doctor follow-up (Adam), household budget, lupus nutrition, school schedule (Sherry), VA hire (pending approval). Board `/api/v1/lifeos/household/board` HTTP 200 with all 8 sections populated and useful. | Adam directive: verify production routes, seed data, prove board usefulness. GAP-FILL: builder Zone 3 block (267-line service) — cols additions done as Conductor self-repair (1-line fixes). | `services/mission-ledger.js`, `db/migrations/20260605_mission_runtime_commitments_missing_columns.sql`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ `/api/v1/lifeos/household/board` HTTP 200, 5 Adam tasks + 3 Sherry tasks + 1 pending approval in live response |
| 2026-06-02 | **Phase 2 complete — wiring + HTML overlay + verifier.** `public/overlay/lifeos-household.html` (GAP-FILL): 8 sections (Mission badge, Today, Overdue [red border], Adam tasks, Sherry tasks, Waiting Approval [Approve btn → PUT /commitments/mission/:id], Income Priorities, Add Commitment form [POST /commitments/mission]). 30s poll at GET /api/v1/lifeos/household/board. ?key= or localStorage auth. State pills colored per §Section 6 map. No external CDN. `startup/register-runtime-routes.js`: added import + mount `app.use("/api/v1/lifeos", createMissionRoutes(...))` after commitment routes. `routes/public-routes.js`: added `/lifeos-household` route per §Section 7. **10/10 verifier checks PASS** (migration, syntax, antipattern scan, mount, public route, HTML file, @ssot tags, MISSION_STATE_TRANSITIONS, board 8 sections, INVALID_TRANSITION 400). | BPB-0001 §§Section 6, 7, 8, 9. GAP-FILL: builder POST /build returned HTTP_502 on all attempts — Railway builder generate path broken across entire session. | `public/overlay/lifeos-household.html`, `startup/register-runtime-routes.js`, `routes/public-routes.js`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ 10/10 verifier checks PASS |
| 2026-06-02 | **`routes/mission-routes.js` written** (GAP-FILL). 130 lines, ESM, single Router(). 8 routes: `POST /missions` (createMission), `GET /missions` (listMissions), `GET /missions/:id` (getMission, null→404), `PUT /missions/:id` (updateMission), `POST /missions/:id/transition` (transitionMissionState — INVALID_TRANSITION→400 with {from,to,valid_next}, NOT_FOUND→404), `POST /missions/:id/participants` (addParticipant), `DELETE /missions/:id/participants/:participant` (removeParticipant), `GET /household/board` (getHouseholdBoard, mission_id query defaults to "MISSION-0001"). §13.3 enforced: NO commitment CRUD routes. All routes: requireKey + try/catch + [MISSIONS] log prefix. Pending wiring in startup/register-runtime-routes.js. `node --check` PASS. | BPB-0001 §§3.1–3.3, 3.5, 13.3. GAP-FILL: builder POST /build returned HTTP_502 on 2 consecutive attempts (Railway builder generate path broken — same infra issue as runner churn). | `routes/mission-routes.js`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ node --check PASS, 8 routes match §Section 3 prescription, §13.3 constraint respected |
| 2026-06-02 | **`services/mission-ledger.js` written** (GAP-FILL). 267 lines, ESM, no Express. 11 exported async functions: `createMission` (transaction: INSERT missions + participants), `listMissions` (dynamic WHERE, LIMIT 50), `getMission` (UUID or slug, Promise.all for participants/transitions/commitments), `updateMission` (allowed-fields guard), `transitionMissionState` (validates MISSION_STATE_TRANSITIONS, throws `{ code:'INVALID_TRANSITION', from, to, valid_next }`, transaction: UPDATE + INSERT ledger row), `addParticipant` (ON CONFLICT DO NOTHING), `removeParticipant`, `createCommitment` (dynamic INSERT), `listCommitments` (dynamic WHERE), `updateCommitment` (allowed-fields guard), `getHouseholdBoard` (Promise.all 7 queries, capacity_warnings always []). MISSION_STATE_TRANSITIONS: 12 states, 22 transitions, 3 backward transitions marked [GOVERNANCE-GAP] pending AIC DISCUSSION-6. `node --check` PASS. | BPB-0001 §Section 4 prescription exactly. Builder returned 9-line then 10-line truncated output on 2 consecutive `/build` calls — gemini_flash truncation pattern per BPB-0001 §16. GAP-FILL triggered after 2nd failure. | `services/mission-ledger.js`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ node --check PASS, all 11 functions present, MISSION_STATE_TRANSITIONS 12-state/22-transition match §Section 2, backward transitions flagged with [GOVERNANCE-GAP] |
| 2026-06-02 | **Commitments patch migration written** per BPB-0001 §13.2. `db/migrations/20260604_mission_runtime_commitments_patch.sql` — 12 columns added to pre-existing commitments table: `mission_id` (UUID FK, order-safe DO $$ conditional), `time_estimate_hours`, `urgency`, `importance`, `energy_cost`, `money_impact`, `relationship_impact` (SMALLINT 1-5 CHECK), `opportunity_cost_note`, `better_owner` (TEXT), `approval_required` (BOOLEAN DEFAULT FALSE), `approved_by`, `approved_at`. Index: `idx_commitments_mission_id`. Filename ordering issue documented (c < v alphabetically, patch would run before v1); resolved via FK conditional block. **Remaining Phase 2 blocker: AIC DISCUSSION-6** (backward transition authority) before mission-ledger.js can be built. | Mission-0001 Phase 2 pre-requisite. BPB-0001 §13.2 exact prescription applied. GAP-FILL: builder execute endpoint returning HTTP_502 (runner generation 85, 125 churn tasks). | `db/migrations/20260604_mission_runtime_commitments_patch.sql`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ SQL reviewed against BPB-0001 §13.2 prescription — all 12 columns present, FK conditional safe |
| 2026-06-01 | Governance + BPB correction: status updated to Phase 2 BLOCKED; Known Gaps expanded with commitments table/route collision findings and governance doctrine gaps (transition authority, pause/terminate). BPB-0001 §§13–16 added covering same findings. TSOS Continuous Autonomous Ops directive updated with 24/7 framing, terminology table, and Builder Gap Escalation Protocol. | Adam governance/BPB correction directive. Six governance doctrine gaps from prior review session required explicit BPB and amendment documentation before Phase 2 proceeds. | `docs/products/builderos/PRODUCT_HOME.md`, `docs/projects/BPB-0001-MISSION-RUNTIME-V1.md`, `prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md` | ✅ no code changes |
| 2026-06-01 | Created AMENDMENT_47 + DB migration `20260604_mission_runtime_v1.sql`. 4 tables, 2 backfill ALTERs, MISSION-0001 seed. Builder (gemini_flash) committed truncated file (6 lines / 341 bytes) — GAP-FILL: complete rewrite, 103 lines, 18/18 prescription checks PASS. | BPB-0001 Phase 1, migration-first per founder directive. Trust the build order, not the builder's claim of done. | `db/migrations/20260604_mission_runtime_v1.sql`, `docs/products/builderos/PRODUCT_HOME.md` | ✅ prescription check PASS |

---

## Additional spec — Amendment 48 — BUILDEROS VOCABULARY

| Field | Value |
|---|---|
| **Lifecycle** | `constitutional-adjunct` |
| **Reversibility** | `two-way-door` |
| **Stability** | `safe` |
| **Last Updated** | 2026-07-04T20:29 — route_wire_failed also continues. |
| **Verification Command** | `rg -l "C2\\|AIC\\|PSSOT\\|Lens" docs/ --glob '*.md' \| head -20` (deprecation audit) |
| **Canonical body** | **`docs/BUILDEROS_VOCABULARY.md`** |
| **Governance body** | **`docs/architecture/DELIBERATION_ARCHITECTURE.md`** |

---

## Mission

One official meaning for every core BuilderOS / Lumin term so language drift does not become architecture drift; plus **separation-of-powers governance** for deliberation and build.

---

## Scope

**In scope:**
- Vocabulary v2.7: seven depts (ChC, Hist, SNT, **CFO**, BPB, SDO, **CDR**), **REP** capsules, authority vs REP stacks, Coder tier vs CDR dept, TSOS as CFO subsystem
- Separation of powers; mandatory dept cases; BPB/CDR session law; lean Cncl; composition scorecard; Founder Debrief template
- Consensus protocol extensions: multi-horizon future-back, competitive scan, synthesis E/K, brainstorm linkage
- Deprecated: C2, AIC, PSSOT, Mission (factory), Lens, TSOS-as-dept

**Out of scope:**
- TSOS machine-channel token grammar (`docs/TSOS_SYSTEM_LANGUAGE.md`)
- Founder Debrief auto-generation UI (template only — job not built)

**Out of scope (deferred):**
- REP catalog registry overlay UI
- Founder Debrief delivery to FM/Lumin chat overlay

---

## Authority rule

**`docs/BUILDEROS_VOCABULARY.md` wins for terminology** over older docs when terms conflict, except where `SSOT_NORTH_STAR.md` explicitly defines the term.

**`docs/architecture/DELIBERATION_ARCHITECTURE.md` wins for deliberation/governance mechanics** unless North Star conflicts.

---

## Change Receipts

| Date | Change | Why |
|------|--------|-----|
| 2026-07-03 | **ARC self-healing loop — auto-fix blueprint from review findings.** `services/blueprint-intake.js` `runArcReview()` now detects when ARC review returns `ready_to_execute: false` with critical/moderate findings, calls `_autoFixFromArcReport()` to regenerate the blueprint with fixes applied, then re-reviews the corrected version. If the re-review passes, the session moves to `ready` without requiring manual gap resolution. This closes the gap where ARC findings were surfaced but not fed back into the blueprint regeneration pipeline. | ARC review identified 3 critical + 5 moderate issues on TC Service blueprint (duplicate step IDs, missing deps, placeholder ssot_tag) but the system could not self-correct — it set status to `gap_collection` with an empty gaps array, creating a dead end. The gap-chat conversation didn't modify the blueprint JSON. | `node -c services/blueprint-intake.js` |
| 2026-07-02 | **Factory import cycles broken via path leaves** — extracted `REPO_ROOT`/`FACTORY_ROOT`/`resolveRepoPath` to new `factory-staging/factory-core/repo-paths.js`, and `missionGatePath`/`loadMissionDeliberationFile`/`writeMissionDeliberationFile` to new `factory-staging/factory-core/deliberation/mission-deliberation-file.js`. `builder/run-step.js` re-exports the path constants (22 arc/* importers unchanged); the 4 cycle files (`bpb/intake-gate`, `deliberation/seed-mission-deliberation`, `sentry/verify-step-contract`, `sentry/anti-pattern-check`) + `deliberation/validate-deliberation-gate` now import from the leaves. `npx madge --circular server.js` → 0 cycles (was 6 in factory-staging). | The `No Circular Dependencies` CI gate was red; `REPO_ROOT` living in `run-step.js` created run-step↔gate back-edges. Dependency-free leaves remove them with zero behavior change. |
| 2026-06-12 | **Working-tree snapshot archive** — `builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/` (99 files); `INDEX.json`; `HIST_LEGACY_SYSTEM_REGISTRY.md` §2E snapshot law; `.gitignore` governed-autonomy runtime sidecars | Adam: dirty tree from autopilot/overnight churn — park for Hist, restore clean `main` |
| 2026-06-09 | Created Amendment 48 + `docs/BUILDEROS_VOCABULARY.md` | Founder: canonize vocabulary; stop jargon drift |
| 2026-06-09 | **v2 SEAL** — C2/AIC/FM/ChC/Cncl/Objective; six depts; deliberation loop | Founder consensus |
| 2026-06-09 | **v2.1–v2.4** — LSSOT; SDO; partial Cncl; ChC 6th dept | Founder clarifications |
| 2026-06-09 | **v2.5–v2.6** — model roster; DELIBERATION_ARCHITECTURE (dept/product/lens); Position E; C2 deprecated | Architecture clarification |
| 2026-06-09 | **v2.7 SEAL** — full governance package | Founder final consensus session |
| 2026-06-09 | **`docs/BUILDEROS_VOCABULARY.md` v2.7** — seven depts; CFO/CDR; REP; separation of powers; sealed-for-build; Hist mandatory case; CFO stewardship; BPB/CDR session law | Founder: document entire session |
| 2026-06-09 | **`docs/architecture/DELIBERATION_ARCHITECTURE.md`** — rewritten: authority/REP/model; judgment chain; lean default; scoring; org evolution | Same |
| 2026-06-09 | **`docs/architecture/FOUNDER_VOCABULARY_CONSENSUS_REPORT.md` v2.7** — complete shareable report (GPT parity + governance) | Founder: single handoff doc |
| 2026-06-09 | **`docs/architecture/FOUNDER_DEBRIEF_TEMPLATE.md`** — Layer 1 synopsis + Layer 2 pack | Founder offline debrief |
| 2026-06-09 | Morning archaeology unchanged — cross-linked: MEMORY/TRUTH/PERSONAL architecture + EVIDENCE_VAULT | Prior session deliverables |
| 2026-06-09 | **BUILD v2.7** — `db/migrations/20260609_deliberation_governance_v27.sql` | Seven tables: roster, consensus, scorecard, hist, cfo, evidence_vault, gate |
| 2026-06-09 | **BUILD** — `config/deliberation-governance.js`, `services/deliberation-governance-service.js`, `routes/deliberation-governance-routes.js` | API `/api/v1/lifeos/deliberation/*` |
| 2026-06-09 | **BUILD** — gate-change synthesis round + deliberation auto-persist | Council v4 + Hist/CFO on run-preset |
| 2026-06-09 | **BUILD** — factory deliberation gate + historian persist | BPB intake hook; jsonl ledger |
| 2026-06-09 | **BUILD** — `scripts/verify-deliberation-governance.mjs` | Local validation |
| 2026-06-09 | **A→Z completion** — `db/migrations/20260609b_founder_debrief_rep_catalog.sql` | `founder_debriefs`, `rep_catalog_entries` |
| 2026-06-09 | **A→Z** — `services/founder-debrief-service.js`; pipeline seed/finalize/debrief/reps API routes | Full session bundle + Founder Debrief generator |
| 2026-06-09 | **A→Z** — `scripts/deliberation-a-to-z-smoke.mjs` + `npm run lifeos:deliberation:a-to-z-smoke` | Factory + optional Railway API smoke |
| 2026-06-09 | **A→Z** — `services/builder-deliberation-hook.js` + `/build` wire in `lifeos-council-builder-routes.js` | Seed before codegen; finalize + debrief after commit |
| 2026-06-09 | **A→Z** — `bootDeliberationRepCatalog` in `startup/boot-domains.js` | REP catalog sync on boot (idempotent) |
| 2026-06-09 | **Factory loop** — `builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/` FP+BP+acceptance+SENTRY | Reverse-BP formalization; 18 tests pass; SENTRY WIRED |
| 2026-06-09 | **SENTRY aspect loop** — 14 aspects (`A01`–`A14`), 54 acceptance tests, `npm run factory:deliberation-v27:sentry-loop` | Per-aspect FP→BP→verify; `SENTRY_SESSION_PASS` |
| 2026-06-10 | **SENTRY audit fixes (Claude Code)** — `getGateStatus(session_id, { load_bearing })`; `passDeliberationGate` honors payload load_bearing; builder seed **fail-closed** on exception; `no_pool` returns fail not skip; `MISSION_QUEUE` → `wired_uncommitted`; `HANDOFF.md` v2.7 block | P0/P1 from qualitative SENTRY — honest status until commit+deploy |
| 2026-06-10 | **Codex SENTRY behavioral fixes** — `validateConsensusSession()` (non-empty synthesis/participants/votes/horizons); load-bearing gate validates consensus **substance** not row count; `finalizePipeline` no debrief on gate fail; factory `validateDeliberationGate({ load_bearing })`; `scripts/deliberation-governance-behavior.mjs` + AT-BEH-1..4 (22 acceptance tests) | Fail-closed law was breakable with `{}` consensus and debrief-on-fail |
| 2026-06-10 | **Codex adversarial probe fixes** — BPB+CDR session law (require focus + distinct ids); `clampQueryLimit`; whitespace `case_text`; `skip_intake_gate` env-gated; factory consensus validation; `force_reseed`; `run-mission` missing import + blueprint sort try/catch; behavior suite **17 assertions**, acceptance **24/24** | Adversarial SENTRY found exploitable paths tests did not cover |
| 2026-05-24 | **Claude live SENTRY L1–L12 (GAP-FILL)** — `validateHistCase` min 20 chars + trim; `validateCfoReceipt` role min 3; `validateEvidenceVaultEntry` allowlist + path traversal block; `VALID_REP_CATALOG` enforced; roster size caps (20 reps / 10 models / 7 authorities); `passDeliberationGate` immutable PASS + corrupt PASS revocation + `passed_at` COALESCE; ghost debrief guard (404 on empty session); `respondDeliberationError` PG 23505→409; deliberation rate limit 60/min; boot REP sync warn + 2s retry; `scripts/deliberation-sentry-probe-cleanup.mjs`; behavior suite **22/22 PASS** | Live Neon probe found whitespace hist PASS, corrupt load-bearing PASS, ghost debriefs, XSS evidence, constraint leak, no throttle |
| 2026-05-24 | **SNT pass-3 doctrine (GAP-FILL)** — sticky `load_bearing` metadata (non-downgradable); `ROSTER_MISSING` gate check; `pg_advisory_xact_lock` on gate pass; `validateScorecardEntry`; CFO/consensus horizon+vote numeric validation; expand null guard; `scripts/deliberation-snt-live-verify.mjs` + `npm run lifeos:deliberation:snt-live`; behavior **31/31**, acceptance **24/24** | Codex pass-3 `DOCTRINE_FAIL` on live Railway: load-bearing downgrade, no-roster PASS, N1/N2/N3/N6b/N11 |

---

## Agent Handoff Notes

**Current state:** **SNT mechanical PASS; live BLOCKED on deploy drift.** GitHub `57ef960c16`; Railway still `23fc14fe02`. `SNT_VERIFY_RESULT.json` verdict: `SNT_MECHANICAL_PASS_LIVE_BLOCKED`. **Deliberation phase alpha NOT signed.**

**Next priority:**
1. Railway `build-from-latest` until SHA matches `57ef960c16`
2. `npm run lifeos:deliberation:snt-live` → 9/9
3. Mission → `complete` / PROVEN; then deliberation slice counts toward BuilderOS alpha receipt

**Legacy code:** Many files still say TSOS dept or six depts — read v2.7 vocabulary; rename on touch with receipt.

**⚠️ INCOMPLETE:** SNT live verify on Railway after pass-3 deploy; REP catalog UI; Founder Debrief auto-delivery.
