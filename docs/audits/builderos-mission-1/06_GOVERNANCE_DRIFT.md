<!-- SYNOPSIS: 6. Governance Drift Report -->


# 6. Governance Drift Report

## 6.1 Dead schedulers in boot-domains.js
| Scheduler/Boot Call | Count |
|---|---|
| bootGLVARMonitor | 2 |
| bootEmailTriage | 2 |
| bootTCDeadlineCron | 2 |
| bootLifeOSScheduled | 2 |
| bootMyDomain | 2 |
| bootTruthScoreboard | 2 |
| bootWisdomTruthAuditor | 2 |
| bootChairPredictionScore | 2 |
| bootGovernanceReview | 2 |
| bootLaneIntel | 2 |
| bootTwinAutoIngest | 2 |
| bootOILDailySummary | 2 |
| bootSelfRepairDeployCheck | 2 |
| bootDeliberationRepCatalog | 2 |
| bootFactoryAutopilotRecoveryOwner | 2 |
| bootBuilderOSPriorityQueue | 2 |
| bootLifeREDomain | 2 |
| registerTruthScoreboardScheduler | 1 |
| registerWisdomTruthAuditorScheduler | 1 |
| registerChairPredictionScoreScheduler | 1 |
| registerGovernanceReviewScheduler | 1 |
| startFactoryAutopilotScheduler | 1 |
| startBpPriorityScheduler | 1 |
| startNeverStopProductFactoryScheduler | 1 |
| bootLifeRE | 1 |
| startLifeREOutreachScheduler | 1 |
| bootAllDomains | 1 |

## 6.2 fullRuntimeProfile-gated schedulers
    const fullRuntimeProfile = isFullRuntimeProfile();
    // Not gated behind fullRuntimeProfile, unlike its siblings below: found live
    // founder_builder by explicit founder directive) -- so fullRuntimeProfile is
    // fullRuntimeProfile, so only this one gate is being removed here.
    if (!fullRuntimeProfile && process.env.LIFEOS_ENABLE_FOUNDER_BUILDER_BOOT_DOMAINS !== 'true') {
    if (!fullRuntimeProfile) {
    ...(fullRuntimeProfile ? [bootLifeOSScheduled(deps)] : []),
    ...(fullRuntimeProfile ? [bootLaneIntel(deps)] : []),
    ...(fullRuntimeProfile ? [bootWisdomTruthAuditor(deps)] : []),
    ...(fullRuntimeProfile ? [bootChairPredictionScore(deps)] : []),
    ...(fullRuntimeProfile ? [bootOILDailySummary(deps)] : []),
    ...(fullRuntimeProfile ? [bootFactoryAutopilotRecoveryOwner(deps)] : []),

## 6.3 Never-stop autonomous factory
Never-stop files found:
- data/bp-priority-never-stop-log.jsonl
- data/never-stop-product-factory-heartbeat.json
- data/never-stop-product-factory-log.jsonl
- data/never-stop-product-factory-state.json
- scripts/bp-priority-never-stop.mjs
- scripts/run-never-stop-product-factory.mjs
- services/never-stop-product-factory-scheduler.js
- services/never-stop-product-factory.js
- tests/never-stop-idempotent-complete.test.js
- tests/never-stop-non-ui-verify-skip.test.js
- tests/never-stop-queue-merge.test.js
- tests/never-stop-sentry-fix.test.js
These are the likely source of the autonomous `main` commits and deploys.

## 6.4 Governance receipts
| Metric | Value |
|---|---|
| certification_id | FACTORY-REBOOT-CERT-002 |
| generated_at | 2026-07-30T18:37:49.358Z |
| missions_complete | 37 |
| missions_total | 38 |
| product_salvage_candidates | 0 |
`PRODUCT_READINESS_REPORT.json` top keys: schema, updated_at, authority, summary, missing_homes, products, freshness

## 6.5 Silent governance failures
`factory:false-done:audit` shows many `done` steps with missing files/broken imports. The governance loop did not fail loudly.