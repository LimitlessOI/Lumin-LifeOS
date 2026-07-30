<!-- SYNOPSIS: BuilderOS scheduler runtime classification and authority audit -->

# BuilderOS Scheduler Audit

**Scope:** Every background scheduler/cron start call in the active production runtime (`server-founder-runtime.js`) and the legacy full-runtime bootstrap (`startup/boot-domains.js`), plus the additional schedulers in `server-full-runtime.js`.

**Date:** 2026-07-31

**Runtime facts (KNOW):**
- `services/runtime-modes.js` forces Railway to `founder_builder` unless `LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY=true` is set.
- `server.js` imports `server-founder-runtime.js` when `isFullRuntimeProfile()` is false.
- `server-full-runtime.js` is the only caller of `startup/boot-domains.js#bootAllDomains`, and only when `fullRuntimeProfile` is true.
- Therefore, **no `boot-domains.js` scheduler is reachable in production today** unless the full-runtime levers are explicitly enabled on Railway.

---

## Classification key

| Class | Meaning |
|---|---|
| `founder_runtime` | Must run in the founder-builder lane; already wired there or should be moved there. |
| `full_runtime_only` | Only meaningful in the legacy/full-runtime lane; leave in `boot-domains.js` and document the `fullRuntimeProfile` requirement. |
| `env_gated` | Reaches production through `server-founder-runtime.js` but is conditionally active based on an env var; needs a health/ready probe and a test proving the gate. |

---

## Founder-runtime schedulers (`server-founder-runtime.js`)

| Scheduler | Line | Env / prereq | Classification | Recommendation | Evidence |
|---|---|---|---|---|---|
| `startDbHealthMonitor(pool)` | 251 | None. | `founder_runtime` | Keep always-on; add `/healthz` metric for pool utilization if not present. | `services/db-health-monitor.js` runs every 60s with no env gate. |
| `startNeverStopProductFactoryScheduler` | 468 | `BUILDEROS_NEVER_STOP=1` or `BUILDEROS_AUTOPILOT=1`. Self-fences if `GOVERNED_FACTORY_ONLY` is active. | `env_gated` | Add a ready/health endpoint or builder status route that reports whether this scheduler is actually armed. Add a unit test asserting the env gate. | `services/never-stop-product-factory-scheduler.js` lines 179–197. |
| `startGovernedAutonomousShippingLoop` | 477 | `GOVERNED_AUTONOMOUS_SHIP` or `BUILDEROS_NEVER_STOP` or `BUILDEROS_AUTOPILOT`. | `env_gated` | Same as above: expose armed/disarmed status in builder control plane and test the env gate. | `services/governed-autonomous-shipping-loop.js` lines 130–138. |
| `startCiHealthWatchdogScheduler` | 486 | `GITHUB_TOKEN` + `GITHUB_REPO` + `COMMAND_CENTER_KEY` + `ALERT_PHONE`/`ADAM_SMS_NUMBER` used at runtime. | `founder_runtime` | No env gate required to start, but document that it silently no-ops without keys. Keep started. | `scripts/ci-health-watchdog.mjs` lines 130–136. |
| `startProdHealthWatchdogScheduler` | 497 | `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY` + alert phone used at runtime. | `founder_runtime` | Same as CI watchdog: keep started; no-ops gracefully if config missing. | `scripts/prod-health-watchdog.mjs` lines 93–95. |
| `startSentryChairGovernanceScheduler` | 508 | `COMMAND_CENTER_KEY`, `GITHUB_TOKEN`, `PUBLIC_BASE_URL` used at runtime. | `founder_runtime` | Keep started; no separate env gate. | `scripts/sentry-chair-governance-audit.mjs` lines 90–94. |
| `startCompetitiveResearchScheduler` | 520 | Same keys as SENTRY-Chair. | `founder_runtime` | Keep started; runs once per day by default. | `scripts/sentry-chair-governance-audit.mjs` lines 210–224. |
| `startMemoryEmbeddingsBackfillScheduler` | 530 | `OPENAI_API_KEY` (prereq via `createUsefulWorkGuard`). | `env_gated` | Already uses `useful-work-guard`; add a test proving the scheduler skips when `OPENAI_API_KEY` is absent. | `scripts/memory-embeddings-backfill.mjs` lines 60–68. |
| `registerGovernanceReviewScheduler` | 547 | None at call site; internal `useful-work-guard` skips if a review already ran within the interval. | `founder_runtime` | Keep in founder runtime; add a `/api/v1/lifeos/builder/governance-review-history` endpoint if not exposed. | `services/governance-review-scheduler.js` lines 53–75. |

## Legacy full-runtime schedulers (`startup/boot-domains.js`)

**KNOW:** `bootAllDomains()` is only invoked by `server-full-runtime.js#startDeferredRuntimeServices`, which is gated by `if (!fullRuntimeProfile) return;`. On Railway, `fullRuntimeProfile` is permanently false. These schedulers are therefore unreachable in production unless the explicit full-runtime levers are enabled.

| Boot function / internal start | Line | Env / prereq | Classification | Recommendation | Evidence |
|---|---|---|---|---|---|
| `bootGLVARMonitor` → `startDuesCron` / `startViolationsCron` | 53 | `LIFEOS_ENABLE_TC_OPERATIONS_BOOT=true` AND `fullRuntimeProfile`. Also GLVAR vault credentials. | `full_runtime_only` | Leave in `boot-domains.js`; document full-runtime + TC-ops levers. Do not move to founder runtime. | `startup/boot-domains.js` lines 519–527. |
| `bootEmailTriage` → `startTriageCron` | 94 | `LIFEOS_ENABLE_TC_OPERATIONS_BOOT=true` AND `fullRuntimeProfile`. Also IMAP config. | `full_runtime_only` | Leave in full-runtime lane; TC email triage is not part of founder-builder scope. | `startup/boot-domains.js` lines 519–527. |
| `bootTCDeadlineCron` → `startTCDeadlineCron` | 130 | `LIFEOS_ENABLE_TC_OPERATIONS_BOOT=true` AND `fullRuntimeProfile`. | `full_runtime_only` | Leave in full-runtime lane. | `startup/boot-domains.js` lines 519–527. |
| `bootLifeOSScheduled` → `startLifeOSScheduledJobs` | 166 | `fullRuntimeProfile`; `LIFEOS_ENABLE_SCHEDULED_JOBS=1` inside service. | `full_runtime_only` | Leave; this is broad LifeOS scheduled outreach, not founder-builder. | `startup/boot-domains.js` line 528. |
| `bootTruthScoreboard` → `registerTruthScoreboardScheduler` | 190 | `fullRuntimeProfile`; `TRUTH_SCOREBOARD_ENABLED=0` opt-out. | `full_runtime_only` | Leave. Note: a separate pre-commit hook path (`scripts/run-wisdom-truth-audit.mjs`) may still generate receipts; do not confuse the two. | `startup/boot-domains.js` line 530. |
| `bootWisdomTruthAuditor` → `registerWisdomTruthAuditorScheduler` | 208 | `fullRuntimeProfile`; `WISDOM_TRUTH_AUDITOR_ENABLED=0` opt-out. | `full_runtime_only` | Leave. | `startup/boot-domains.js` line 531. |
| `bootChairPredictionScore` → `registerChairPredictionScoreScheduler` | 230 | `fullRuntimeProfile`; `CHAIR_PREDICTION_SCORE_ENABLED=0` opt-out. | `full_runtime_only` | Leave. | `startup/boot-domains.js` line 532. |
| `bootGovernanceReview` → `registerGovernanceReviewScheduler` | 257 | `fullRuntimeProfile`; `GOVERNANCE_REVIEW_ENABLED=0` opt-out. | `full_runtime_only` (duplicate) | **NOTE:** `registerGovernanceReviewScheduler` is also started directly in `server-founder-runtime.js:547`. The `boot-domains.js` instance is redundant and unreachable on Railway. Do not remove without confirming local full-runtime usage; safest to leave and document. | `startup/boot-domains.js` line 533. |
| `bootLaneIntel` | 272 | `fullRuntimeProfile`; `LANE_INTEL_ENABLED` / `LANE_INTEL_ENABLE_SCHEDULED` gates. | `full_runtime_only` | Leave. | `startup/boot-domains.js` line 529. |
| `bootTwinAutoIngest` | 302 | `fullRuntimeProfile` OR `LIFEOS_ENABLE_FOUNDER_BUILDER_BOOT_DOMAINS=true`; additionally `LIFEOS_ENABLE_TWIN_AUTO_INGEST_BOOT=true` within `bootAllDomains`. | `full_runtime_only` | Leave. The separate founder-memory routes handle twin ingestion in the founder lane. | `startup/boot-domains.js` line 534. |
| `bootOILDailySummary` | 353 | `fullRuntimeProfile`; `security_receipts` rows. | `full_runtime_only` | Leave. | `startup/boot-domains.js` line 535. |
| `bootSelfRepairDeployCheck` | 375 | `fullRuntimeProfile`; `SELF_REPAIR_BOOT_CHECK=0` opt-out. | `full_runtime_only` | Leave. Founder runtime has its own parity checks (e.g., deploy truth audit). | `startup/boot-domains.js` line 536. |
| `bootDeliberationRepCatalog` | 425 | `fullRuntimeProfile`; no AI, idempotent DB sync. | `full_runtime_only` | Leave. | `startup/boot-domains.js` line 506. |
| `bootFactoryAutopilotRecoveryOwner` → `startFactoryAutopilotScheduler` | 454 | `fullRuntimeProfile`. | `full_runtime_only` | Leave; this is the HIST autopilot recovery path. | `startup/boot-domains.js` line 537. |
| `bootBuilderOSPriorityQueue` → `startBpPriorityScheduler` | 465 | `fullRuntimeProfile`; `BUILDEROS_AUTOPILOT=1` env gate inside `startBpPriorityScheduler`. | `full_runtime_only` | **If** `BP_PRIORITY.json` autonomy is desired on Railway, `startBpPriorityScheduler` must be moved or re-wired into `server-founder-runtime.js`; otherwise leave in full-runtime lane and document `BUILDEROS_AUTOPILOT`. | `startup/boot-domains.js` line 538. |
| `bootBuilderOSPriorityQueue` → `startNeverStopProductFactoryScheduler` / `startGovernedAutonomousShippingLoop` | 465 | `fullRuntimeProfile`; same env gates as founder-runtime instances. | `full_runtime_only` (redundant) | Redundant with founder-runtime start calls at `server-founder-runtime.js:468` and `:477`. Safe to leave because the service functions are idempotent/no-op when not armed. | `startup/boot-domains.js` lines 473–478. |
| `bootLifeREDomain` → `bootLifeRE` + `startLifeREOutreachScheduler` | 484 | `fullRuntimeProfile`. | `full_runtime_only` | Leave. LifeRE has separate founder-builder routing. | `startup/boot-domains.js` line 507. |

## Additional full-runtime schedulers (`server-full-runtime.js`)

| Scheduler | Line | Env / prereq | Classification | Recommendation | Evidence |
|---|---|---|---|---|---|
| `startReminderCron` | 1099 | `fullRuntimeProfile` and `externalProductRoutesEnabled`. | `full_runtime_only` | Leave. | `server-full-runtime.js` lines 1093–1100. |
| `autoBuilder.startBuildScheduler` | 1529 | `fullRuntimeProfile`. | `full_runtime_only` | Leave. Founder runtime uses `startNeverStopProductFactoryScheduler` instead. | `server-full-runtime.js` lines 1528–1532. |
| `railwayManagedEnvService.startScheduler()` | 1143 | Always started in `startDeferredRuntimeServices` (full-runtime gated). | `full_runtime_only` | Leave. | `server-full-runtime.js` lines 1141–1145. |

## Summary counts (computed from the tables above)

- `founder_runtime`: 5 (`startDbHealthMonitor`, `startCiHealthWatchdogScheduler`, `startProdHealthWatchdogScheduler`, `startSentryChairGovernanceScheduler`, `startCompetitiveResearchScheduler`, `registerGovernanceReviewScheduler`)
- `env_gated`: 3 (`startNeverStopProductFactoryScheduler`, `startGovernedAutonomousShippingLoop`, `startMemoryEmbeddingsBackfillScheduler`)
- `full_runtime_only`: 18 boot functions + 3 `server-full-runtime.js` schedulers
- Redundant cross-runtime calls: 3 (`startNeverStopProductFactoryScheduler`, `startGovernedAutonomousShippingLoop`, `registerGovernanceReviewScheduler` appear in both lanes)

## Highest-risk findings

1. **Duplicate `registerGovernanceReviewScheduler`.** It now starts in both `server-founder-runtime.js` and `boot-domains.js`. The service uses `setInterval` and `lastReviewAt` to avoid double-running, so it is safe, but it is confusing and should be consolidated when the full-runtime lane is retired or re-activated.
2. **`startBpPriorityScheduler` is not in founder runtime.** If `BP_PRIORITY.json` is meant to drive autonomous builds on Railway, this scheduler must be moved/re-wired. As of this commit, it is unreachable in production.
3. **No health endpoint exposes env-gated scheduler status.** `BUILDEROS_NEVER_STOP`, `GOVERNED_AUTONOMOUS_SHIP`, `OPENAI_API_KEY`, etc. affect whether real work runs, but `/healthz` and `/api/v1/lifeos/builder/ready` do not surface those armed/disarmed states.
4. **`boot-domains.js` is full of dead code in production.** This is intentional (founder-builder lane is the governance boundary), but the file is large and the unreachability is not obvious to a cold reader. This audit is the documentation.
