<!-- SYNOPSIS: Continuity Log — chronological session handoff and key decisions. -->

## 2026-07-23 — STT correction learning + tone/tonal awareness amendment

Adam: STT must learn so "Tolowa" does not happen again — it must output "Taloa" next time. GAP-FILL: `db/migrations/20260723_voice_rail_stt_corrections.sql` creates `voice_rail_stt_corrections` (per-user, upserted `misheard` → `canonical`); `config/voice-rail-stt-vocabulary.js` accepts `extraTerms`/`correctionHints` for the Whisper prompt and `applyVoiceRailVocabulary(text, userCorrections)` for post-transcription; `services/voice-rail-stt.js` loads corrections per user and passes them into the prompt + post-processing; `routes/lifeos-voice-rail-routes.js` adds `GET/POST /api/v1/lifeos/voice-rail/stt/corrections`; `public/overlay/lifeos-app.html` enables `serverSttEnabled` for the Lumin drawer so dictation uses the correction-aware endpoint. Adam also clarified warm phrases ("absolutely, it's a pleasure to help you") are fine as long as they are not a repetitive pattern, and the system must be tonally aware (not super cheery when depressed). `builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json`, `docs/constitution/LUMIN_COMMUNICATION_DNA.md`, `services/response-variety.js`, `services/chair-direct-agent.js`, and `services/chair-personality-translate.js` updated to allow real warmth, vary phrasing, and read emotional/tonal context. Next: build a real prosody/tonal-intelligence pipeline (pitch/energy/pause/speaker features) so the chair can hear frustration/anger/sadness, not just text.

## 2026-07-23 — Chair/chat anti-template fix + communication strategy review

Adam: the chair felt like a template because `life_admin` and `grounded_direct_answer` paths emitted pre-written prose. GAP-FILL: `services/lifeos-chat-intent-executor.js` now returns a concise `human_summary` of the executed action; `services/chair-program-direct-answer.js` returns fact-grounding strings or `system_knowledge` blocks instead of canned paragraphs; `services/chair-direct-agent.js` accepts `ctx.intentExecution` so the model knows the action is already done; `services/lumin-chair-orchestrator.js` calls `executeChatIntent` then `runChairDirectAgent` for every known `life_admin` intent, so the API model speaks every reply. Preflight passed locally (396/396). Adam also asked for a full communication-strategy review across the constitution, SSOTs, and product conversations, with focus on personality/tone, client feedback grouping, and whether the system is directly tied to the "Karen" browser TTS voice. Next: document the synthesized communication approach, then continue the ChatGPT-style layout, real-time voice transcript, read-aloud controls, queued/multi-request, and file-attachment work.

## 2026-07-23 — Go Vegas flagship site + recognition flywheel

Adam: multi-brand value posts (not Adam-show); daily recognition questions → outreach “Superior Place” + Best Of + join free network; rotating member threads; free SiteBuilder as contest/surprise. Shipped `/go-vegas` public site (powered by SiteBuilder) + `config/go-vegas-network-playbook.js`. Next: wire recognition sends to go_vegas_prospects; fill Best Of from real nominations.

## 2026-07-23 — Site Builder: 50 niche templates + denser images

Adam: template toggles look the same; need more photos from their site (stock/Google holding before ~2–3¢ Replicate); want ~50 different niche templates. Shipped `site-builder-template-catalog-50.js` + 16 layout families, family round-robin picks, per-variant `imageOffset`, secondary-page image crawl, hero cap 16, curated Unsplash/Google CSE holding before Flux. Next: tip rebuild + eye-test diversity.

## 2026-07-23 — Site Builder distribution (no founder bottleneck)

Chair: fix first-minute UX before push. Shipped experience gates; built LV Handyman preview (clean title); SMS/voice queued for **08:05 PT** (not midnight). Cold email still blocked — Postmark pending approval (need Resend key or Postmark approve). Reddit requires login; r/smallbusiness bans promo outside megathreads. Playbook: `docs/products/site-builder/DISTRIBUTION_PLAYBOOK.md`. Comp code `TALOA-FRIENDS` still live. Next: morning flush + email unblock.

## 2026-07-23 — Site Builder complimentary publish codes

Adam asked for a discount/comp code so he can publish free and gift free publish to a friend/business when he wants. Shipped `SITE_BUILDER_FREE_CODES` (comma-separated) → `GET /api/v1/sites/publish/checkout?clientId=…&code=…` redeems without Stripe; landing + preview chrome have “Have a code?”. Paid path unchanged; Stripe also allows promotion codes. Next: set code on Railway, tip-prove redeem, share privately.

## 2026-07-14 — Command Center admin surface folded into LifeOS; Railway deployment queue rate-limited

Adam: Command Center is not a separate product; it is the LifeOS admin command surface. `docs/products/PRODUCT_BUILD_PRIORITY.json` no longer lists `command-center`; `docs/products/command-center/BUILD_QUEUE.json` is deprecated and emptied. `docs/products/lifeos/BUILD_QUEUE.json` now contains `lifeos-admin-*` steps for the builder runtime mode table, phase14 cert, pending Adam, and admin overlays. `lifeos-admin-3` (`routes/command-center-mode-routes.js`) is `blocked` with `park_until` removed so it will ship through the governed factory once the migration is deployed. The Railway deployment queue is rate-limited (`429` after cleaning 991 stale `REMOVED` deployments); the service is currently `404`/`Application not found` and needs the rate limit to clear before the next build can proceed. The chair/council identified the 1000-deployment history limit as the likely root cause. Next: wait for the Railway GraphQL rate limit, trigger a fresh build for `origin/main` (which includes `builder_runtime_config` text-id migration + `x-command-key` fix), enable `GOVERNED_AUTONOMOUS_SHIP`, force a BuilderOS tick, and verify `GET /api/v1/lifeos/command-center/mode` returns 200 and `GET /api/v1/lifeos/never-stop/status` `governed_status` increments.

## 2026-07-12 — `command-center` s5 shipped, s3 parked, `mergeQueueRuntimeStatus` bug fixed

`command-center` `s5` (`routes/phase14-cert-routes.js`) has shipped: `GET /api/v1/builder/cert/phase14` returns 200. `s3` (`routes/command-center-mode-routes.js`) is parked until `2026-07-15T00:00:00Z` while the migration deploys. A second bug surfaced: `services/never-stop-product-factory.js` `mergeQueueRuntimeStatus` was letting a stale in-memory `pending` snapshot with a higher `revive_count` overwrite a repo `done` step, so every `s3` failure reverted `s5` from `done` back to `pending` and caused it to be re-queued. Fix: `revive_count` override now only applies when the repo step is `blocked`, not `done` or `building`. `docs/products/builderos/PRODUCT_HOME.md` and `docs/CONTINUITY_LOG.md` updated. Next: commit/push/redeploy, then remove `s3` `park_until` once migration is live and verify `s3` ships.

## 2026-07-12 — `command-center` s3 follow-up: `builder_runtime_config` id type + ship-queue auth header

The first `command-center/mode` test still failed. `services/builder-runtime-mode-service.js` uses a string sentinel id `builder_runtime_config_singleton`, but `db/migrations/20260601_builder_runtime_config.sql` declared `id uuid`, so `getCurrentMode()` `WHERE id = $1` cast a text value to uuid and threw. Fix: migration now uses `id text PRIMARY KEY` and seeds the default row with mode `run`. `services/governed-autonomous-shipping-loop.js` `shipViaGovernedQueue` was sending `x-api-key`; the `factory/ship-queue` guard expects `x-command-key`, so every governed POST was `401 Unauthorized`. Header fixed. `s3` remains parked until `2026-07-15T00:00:00Z` while the `s5` route can ship now. `docs/products/command-center/BUILD_QUEUE.json` `s1` spec updated. `docs/products/command-center/PRODUCT_HOME.md` and `docs/products/builderos/PRODUCT_HOME.md` updated. Next: gates, commit, push, redeploy, verify `s5` ships, then remove `s3` `park_until` and verify `s3` ships.

## 2026-07-12 — `command-center` s3: real failure is DB migration, not `autoReg`

The `codegen_empty`/`path` fix is deployed, but `command-center` `s3` was still deadlocked. Root cause: `s3` `last_error` was stale `route module not auto-registered`, but `routes/command-center-mode-routes.js` is already built and `config/auto-registered-product-modules.json` already has its entry; `GET /api/v1/lifeos/command-center/mode` returns 500 because `builder_runtime_config` table does not exist — `gen_random_uuid()` requires `pgcrypto` extension in Neon. Fix: `db/migrations/20260601_builder_runtime_config.sql` now starts with `CREATE EXTENSION IF NOT EXISTS pgcrypto;`. `BUILD_QUEUE.json` `s3` is `park_until: 2026-07-13T02:00:00Z` to avoid token burn until the migration deploys. `services/governed-autonomous-shipping-loop.js` now records governed/SENTRY failures back to `BUILD_QUEUE` (`markFailedStep`, `deriveFailureReason`) so `reviveStaleBlockedSteps` sees real failure reasons (`behavior_proof`, `codegen_authoring_failed`, etc.) instead of stale `autoReg` text. `docs/products/command-center/PRODUCT_HOME.md` updated. Next: commit, push, redeploy, then remove `s3` `park_until` once the new deploy serves the migration and `GET /api/v1/lifeos/command-center/mode` returns 200.

## 2026-07-14 — Chair-counsel fix: missing `path` import in `factory-mount-routes.js` codegenRunner

Second-opinion review found the real `codegen_empty` cause: `routes/factory-mount-routes.js` was missing `import path from 'node:path'`, so the `node --check` syntax-check block threw `ReferenceError: path is not defined`, caught every tier, and returned `content: null` / `model_tier: null` to `runAuthoring`. Fixed by adding the import and prefixing the `catch` error with the failing member. `factory-staging/factory-core/builder/run-step.js` now exposes `error` in `codegen_authoring_failed` evidence. `services/product-build-orchestrator.js` `reviveStaleBlockedSteps` clears stale runtime evidence (`commit_sha`, `last_error`, `attempts`, etc.) on revive and treats `codegen_*` failures as tooling blocks. `services/never-stop-product-factory.js` `mergeQueueRuntimeStatus` honors a `revive_count` increase so a revived `PENDING` step is not clobbered by the stale repo `BLOCKED` snapshot. `docs/products/builderos/PRODUCT_HOME.md` updated. Next: run gates, push, redeploy, force a BuilderOS tick, verify `command-center` `s3` ships and `GET /api/v1/lifeos/never-stop/status` `governed_status.totalRuns`/`lastShipped` increments.

## 2026-07-14 — Replicate credit unlocked; product presentation polish

Adam added Replicate payment. Tip proved Ideogram thumbnail render. Shipped Studio heroes + presentation surfaces: Site Builder full-bleed landing hero, `/marketing/for-you`, `/tc/for-you`, TC portal type polish, MarketingOS teal shell tokens.


## 2026-07-14 — BuilderOS governed codegen truth-envelope + cache-poison fix

Fixed the root cause of `POST /factory/ship-queue` returning `codegen_authoring_failed` / `codegen_empty` for `command-center` `s3` and other route steps. `routes/factory-mount-routes.js` `codegenRunner` now calls `callCouncilMember` with `taskType: 'codegen'`, `product_lane: 'builderos'`, and `useCache: false` so `services/ai-prose-truth-envelope.js` skips the generated code and `services/response-cache.js` cannot reuse a poisoned empty cache entry. `factory-staging/factory-core/builder/authoring.js` `DEFAULT_CODEGEN_TIERS` now reuses `config/task-model-routing.js` `TRUSTED_FALLBACK_MODELS` (strong-first, provider-diverse), `runAuthoring` propagates the underlying `error` when codegen returns empty, and `factory-staging/factory-core/builder/run-step.js` surfaces that `error` in SENTRY evidence. `config/council-members.js` `claude_sonnet` default model is `claude-sonnet-4-6` and `config/task-model-routing.js` `TRUSTED_FALLBACK_MODELS` is reordered. `services/response-cache.js` now refuses to cache empty/whitespace responses. `docs/products/command-center/BUILD_QUEUE.json` `s3` spec now explicitly lists allowed mode enum values (`run`, `dry_run`, `paused`) so the governed factory can generate a valid route. Gates: `node --check`, `npm run builder:preflight`, `npm run verify:ci`, `npm run lifeos:bp-priority:verify`, `npm run factory:ci` all PASS. Next: commit, push, redeploy, force a BuilderOS tick, and verify `GET /api/v1/lifeos/never-stop/status` `governed_status.totalRuns`/`lastShipped` increments while `command-center` `s3` ships.

## 2026-07-14 — Studio image gen gate: connected in UI, blocked by Replicate 402

Adam asked to polish Site Builder / SMOS / Marketing / TC through Studio with 2026 design — only if new image gen connected. Tip: `replicateConfigured:true` + estimate OK, but render returns **402 Insufficient credit**. Wired `/creative/studio` graphic_design mode (calm Fraunces/Manrope UI). HALT mass product image polish until Replicate credit; BirthBill still not prime-time.

## 2026-07-14 — Sherry presentation polish

Adam presenting BirthBill to Sherry. Shipped calm `/birthbill/for-you` walkthrough + quiet workboard `?present=1` (hides technical keys when access already saved). Copy: she does nothing; honest that Sent Bills auto-file is still finishing. Not prime-time for money file — presentation-ready for reassurance.

## 2026-07-14 — BuilderOS governed queue planner: no first-gap deadlock, pre-merged auto-register, route inference, and cross-product blueprint revival

Fixed the governed idle bug so BuilderOS will keep building the remaining blueprint steps. `services/governed-build-queue-scheduler.js` `planGovernedBuildQueueRun` now iterates all shippable steps instead of pre-slicing to the first candidate, derives `route` for route modules from the spec or existing file, derives `expected_exports` from `export`/`module.exports` declarations, and pre-merges all planned `config/auto-registered-product-modules.json` steps into a single `exact_content` so each product writes the same full config and concurrent auto-registers append rather than overwrite. `factory-staging/factory-core/bpb/build-queue-step-adapter.js` `toGovernedShipStep` auto-detects `config/auto-registered-product-modules.json` steps and produces a `write_file_exact` with new entries, plus `selectShippableSteps` uses exported `depSatisfiedForSelect` so auto-register config steps can ship while their route sibling is blocked. `services/product-build-orchestrator.js` `depSatisfiedForSelect` is exported. `services/governed-autonomous-shipping-loop.js` `httpBase` now hard-codes `http://127.0.0.1:${PORT}` so the loop POSTs `/factory/ship-queue` in-process on the same Railway container, preventing cross-container load-balancing from losing the shipping outcome. `BUILD_QUEUE.json` repaired/restarted for `lifere` (5), `memory-system` (9), `command-center` (s8 deps scoped to s3/s5), `limitlessos` (auto-reg step), `wellness-studio` (step-05-register step, step-05 demoted/attempts reset), and `site-builder` (step-04-register step, step-04 revive_count reset). Gates: `node --check` changed JS files, `npm run builder:preflight`, `npm run verify:ci`, `npm run lifeos:bp-priority:verify`, `npm run factory:ci` all PASS. Next: commit, push, redeploy, force a BuilderOS tick, and verify `GET /api/v1/lifeos/never-stop/status` `governed_status.totalRuns`/`lastShipped` increments while the remaining product blueprint steps ship.

## 2026-07-14 — Midwife does nothing (hands-off file)

Adam: Sherry must not do billing work to get paid. Shipped hands-off file cycle (`/hands-off/run` + scheduler), SYSTEM forever-chase next_actions, HCFA leaf/href click + claim-editor Save. Tip Denise still shows SuperBillReport 59400 + Invoice/HCFA but Sent Bills empty until claim_link click proves (prior job only hit Filter).

## 2026-07-14 — BirthBill UX: intuitive + clearly defined (not prime-time)

Honest answer: **not prime-time**. Forever-chase + signup/connect are sellable as pilot; ChargeSlip/HCFA auto-create is not tip-proved. Shipped clearer landing (definitions + steps + excludes), welcome wizard, and BirthBill workboard mode so midwives know what each term means and what is / is not promised.

## 2026-07-14 — BirthBill multi-tenant vault

Not done was fair: public landing alone is not sellable. Shipped encrypted per-tenant ClientCare credentials, claims.tenant_id isolation, post-pay connect UI on /birthbill/welcome, forever-chase + browser login scoped by tenant_id. ChargeSlip auto-create still unproved (honest V1).

## 2026-07-14 — BirthBill sellable to midwives

Adam: sell ClientCare recovery to other midwives now. Shipped public product **BirthBill** at `/birthbill` with Stripe pilot checkout ($297 + 5% recovered), practice signup → `clientcare_tenants` packaging, honest V1 promise (forever-chase queue + claim-status; ChargeSlip auto-create not sold). Tip forever-chase remains 64 open for Sherry; multi-tenant claim ledger isolation still next.

## 2026-07-14 — SuperBillReport has Denise 59400 + Invoice/HCFA

Tip KNOW: same-tab SuperBillReport lists Denise Alvarado / BCBS Anthem / 59400 with Invoice HCFA UB-04 links. Filter panel helpers include filterRecords/openwindowSuperBilling. Next: click HCFA/Invoice, prove Sent Bills, fix ChargeSlip rebind after report.

## 2026-07-14 — SuperBillReport same-tab (CDP wedge bypass)

Tip KNOW: Daily Super Bill → openReportItems → SuperBillReport URL. Popup driver via browser.pages hung tip (stale 240s, empty result). Next ship navigates `/Billing/SuperBillReport?FromDate=` in the same tab, drives Filter/Create Claim, returns to ChargeSlip + rebind, map timeout 360s. Forever-chase 64 open unchanged.

## 2026-07-14 — SuperBillReport is the Daily Super Bill surface

Tip KNOW: ChargeSlip "Daily Super bill" calls `openReportItems()` and opens `/Billing/SuperBillReport?FromDate=…` (title Super Bill Report; grid Loading then Procedure/Dx/Fee/Claims Created). First driver wrongly clicked Create New Client and cleared patient before Save. Next: drive report Filter/Create Claim actions + prove Sent Bills/chart 594xx. Forever-chase still 64 open.

## 2026-07-14 — ChargeSlip Daily Super Bill drive

Money-path blocker: tip binds Denise, sets 59400/O80 via dropdown, clicks Daily Super Bill + Save, but Review Sent Bills stays empty and billing chart has no 594xx. Fee-schedule list clicks wedge tip CDP. Next ship inventories DSB post-click UI (modals/popups/helpers), drives Create/Generate, then re-proves persist. Forever-chase remains 64 open on tip.

## 2026-07-14 — BuilderOS Perfect Day s12 codegen hardening

Diagnosed and fixed `s12` SENTRY failure: `routes/lifeos-perfect-day-routes.js` generated by `claude_sonnet` contained `import * from` (invalid ESM). `routes/factory-mount-routes.js` `codegenRunner` now runs `node --check` on generated ESM before accepting a tier, marks the council call `critical: true` so lossy token-optimizer layers (stripMd/phraseSub/LCL/TOON/IR) are skipped and code passes through byte-exact, and rejects malformed `import * from` output so the loop falls back. `factory-staging/factory-core/bpb/build-queue-step-adapter.js` `toGovernedShipStep` now propagates `authoring.tiers` and supports `action_type: 'write_file_exact'`. `services/governed-shipping-runner.js` blocked response now returns the full SENTRY `body`. `docs/products/lifeos/BUILD_QUEUE.json` `s12` reset to `pending` with `authoring.tiers: ['gemini_flash']`, spec aligned to `req.body.user_id`/`deps.requireKey`/`res.json(result)`, and `file_contains` tightened; `s13` set to `write_file_exact` with the current `config/auto-registered-product-modules.json` exact content. The governed loop shipped `s12` (`routes/lifeos-perfect-day-routes.js`) and `s13` (`config/auto-registered-product-modules.json`) and `GET /api/v1/lifeos/perfect-day/health` returns 200. `docs/products/lifeos/PRODUCT_HOME.md` and `docs/products/builderos/PRODUCT_HOME.md` updated. Gates: `builder:preflight`, `verify:ci`, `lifeos:bp-priority:verify`, `factory:ci` all PASS.


## 2026-07-14 — Forever-chase seed unblock
Tip inventory proved (15 births + 50 notes) but claims/import failed on partial unique index ON CONFLICT. Fixed upsert; stale browser jobs auto-fail; forever-chase sync sequential + /seed. ChargeSlip Save still does not persist (parallel).
## 2026-07-14 — Forever-chase founder mandate

Adam: chase every unpaid/underpaid insurance birth forever; ask insurers; prove Sherry did the work. Tip had 15 births + 50 notes accounts but claims ledger was empty (0 underpayments). Shipped seedForeverChaseFromInventory + GET/POST forever-chase; age no longer write-off. ChargeSlip Save still does not persist (parallel blocker).

## 2026-07-14 — ClientCare ChargeSlip fail-closed

Tip proved 11/21/2025 visit list can bind a *different* scheduled patient than the status-ready pregnancyId. Mapper now reads Born from billing, scans ±days, requires pregnancyId match before Save, dismisses session-takeover dialog. Live Save still pending correct bind for 3 status-ready births.
<!-- SYNOPSIS: Continuity Log -->

---

## 2026-07-14 — BuilderOS Perfect Day s12 gate reset + SENTRY harness local URL

Reset `docs/products/lifeos/BUILD_QUEUE.json` `s12` from `blocked` to `pending` with `attempts: 0` and `last_error`/`last_attempt_at`/`revive_count` cleared; `routes/factory-mount-routes.js` SENTRY `httpBase` now always points to `http://127.0.0.1:${PORT}` so a `module_mounts` 404 retry after `runner.reload` hits the same Railway container, not a random peer; `services/governed-autonomous-shipping-loop.js` `markShippedStepsDone` now also clears `blocker_class`, `claim_level`, `park_until`, and `revive_count` on done. Next: redeploy, force a governed BuilderOS tick, and verify `GET /api/v1/lifeos/perfect-day/health` returns 200 and `GET /api/v1/lifeos/never-stop/status` `governed_status` increments.

## 2026-07-14 — ClientCare claim-status PROVED (3 births)

KNOW: tip force `$eval`/Kendo writeback persists **Claims Processing + CPM** on 3 resolved births with insurers (Sierra/BCBS/Cigna). Birth Activity + directory clear finds recent births; SuperBillSPAPartialNew and bare InvoiceHCFAEdit 500 on vendor side. ChargeSlip loads but needs patient/visit pick. NEXT: automate ChargeSlip patient select → procedure codes → Save for those 3, then raise birth→billing resolve beyond 3/15.

## 2026-07-14 — ClientCare money path (birth→billing)

Operator routes live on tip (`birth-activity`, `prepare-claim-status`, persisted `clientcare_browser_jobs`). KNOW: 2026 births found; directory clear yields ~235 clients; 3 births resolve to billing hrefs with insurers (Sierra/BSBC/Cigna). Claim-status apply runs + Save nearest controls, but after-reload status still blank — suspect Kendo DropDownList over native select (`page.select` hung on tip). NEXT: Kendo widget `.value()` force + verify persist, then ChargeSlip for those 3, then raise name-resolve budget for remaining births.

## 2026-07-12 — BuilderOS Perfect Day s12 gate reset

Reset `docs/products/lifeos/BUILD_QUEUE.json` `s12` from `blocked` to `pending` with `attempts: 0` and cleared `s11` stale `last_error`/`last_attempt_at`. `services/governed-autonomous-shipping-loop.js` `markShippedStepsDone` now clears `last_error`, `last_attempt_at`, and `attempts` when a step is actually done, so future ships are not poisoned by transient failures. `NEVER_STOP_BOOT_DELAY_MS` and `GOVERNED_AUTONOMOUS_SHIP_INTERVAL_MS` will be reduced to ~60s and ~5m so the governed loop can ship `routes/lifeos-perfect-day-routes.js` and prove `GET /api/v1/lifeos/perfect-day/health` live. `docs/products/lifeos/PRODUCT_HOME.md` and `docs/products/builderos/PRODUCT_HOME.md` updated.
