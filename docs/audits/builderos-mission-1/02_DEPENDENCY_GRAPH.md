<!-- SYNOPSIS: 2. Dependency Graph -->


# 2. Dependency Graph

## 2.1 Forward chain
```
Founder Intent (Adam)
  -> Point B DNA
  -> NORTH_STAR_SSOT
  -> Product/BuilderOS PRODUCT_HOME.md
  -> BP_PRIORITY.json
  -> Mission BLUEPRINT.json
  -> factory-staging/execute-step.js or routes/lifeos-council-builder-routes.js
  -> SENTRY verification / deploy truth audit
  -> Runtime on Railway
  -> Reality (revenue, founder usability, usage)
```

## 2.2 Reverse dependencies
- Runtime depends on deploy pipeline, GitHub main, Railway env, secrets.
- SENTRY depends on live routes, Playwright, fixtures, command key.
- Builder depends on council-service, model keys, Neon pool, GitHub token.
- Chair depends on lumin-context-loader, founder twin, council members, truth-enforcement.
- Factory depends on mission packs, BPB intake gate, execute-step, SENTRY, TSOS, Historian.
- Revenue depends on Stripe keys, email provider, real customers, founder usability.

## 2.3 @ssot mapping (code -> owning product home)
| SSOT Target | File Count | Sample |
|---|---|---|
| docs/products/builderos/PRODUCT_HOME.md | 1310 | builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/CONTENT/run-all-aspects-sentry.mjs, builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/CONTENT/run-deliberation-sentry.mjs, builderos-reboot/MISSIONS/FACTORY-REBOOT-0029/CONTENT/tsos-guardrails.js |
| docs/products/lifeos/PRODUCT_HOME.md | 410 | builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/CONTENT/LFA-S01/chair-context-classifier.js, builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/CONTENT/LFA-S02/chair-lumin-unified.js, builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/CONTENT/LFA-S03/chair-native-facts.js |
| docs/products/lifere/PRODUCT_HOME.md | 90 | builderos-reboot/MISSIONS/PRODUCT-LIFERE-SALES-COACHING-V1-0001/CONTENT/LSC-003/lifere-sales-simulator.js, builderos-reboot/MISSIONS/PRODUCT-LIFERE-SALES-COACHING-V1-0001/CONTENT/LSC-004/lifere-sales-coaching-routes.js, lumin-factory-bundle/missions/PRODUCT-LIFERE-SALES-COACHING-V1-0001/CONTENT/LSC-003/lifere-sales-simulator.js |
| docs/products/tc-service/PRODUCT_HOME.md | 70 | builderos-reboot/scripts/general-browser-agent-live-proof.mjs, builderos-reboot/scripts/general-browser-agent-proof.mjs, builderos-reboot/scripts/general-browser-agent-runtime-proof.mjs |
| docs/products/site-builder/PRODUCT_HOME.md | 66 | config/design-studio-layout-families.js, config/design-studio-layouts.js, config/design-studio.js |
| docs/products/unknown/PRODUCT_HOME.md | 40 | scripts/verify-aicouncil.mjs, scripts/verify-aireceptionist.mjs, scripts/verify-apicostsavings.mjs |
| docs/products/lip/PRODUCT_HOME.md | 39 | scripts/lip/backtest-limitless.mjs, scripts/lip/blind/enrich-reddit-b.mjs, scripts/lip/blind/feeder.mjs |
| docs/products/command-center/PRODUCT_HOME.md | 36 | middleware/apply-middleware.js, public/overlay/command-center-communication.js, public/shared/lifeos-voice-chat.js |
| docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md | 34 | routes/lane-intel-routes.js, scripts/amendment-readiness-check.mjs, scripts/cursor-pre-push-review.mjs |
| docs/products/project-governance/PRODUCT_HOME.md | 32 | builderos-reboot/MISSIONS/PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001/CONTENT/LCP2-S04/register-runtime-routes.js, builderos-reboot/MISSIONS/PRODUCT-LIFEOS-COMMITMENT-ROUTE-V2-0001/CONTENT/LCR2-S03/register-runtime-routes.js, lumin-factory-bundle/missions/PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001/CONTENT/LCP2-S04/register-runtime-routes.js |
| docs/products/memory-intelligence/PRODUCT_HOME.md | 32 | config/cognitive-core-advisors.js, config/judgment-capsule-contracts.js, routes/cognitive-core-routes.js |
| docs/products/marketingos/PRODUCT_HOME.md | 30 | config/smos-pricing.js, public/shared/smos-film-studio.js, routes/_probe-marketing-ping-routes.js |
| docs/products/ai-council/PRODUCT_HOME.md | 22 | config/codebook-domains.js, config/codebook-v1.js, config/council-members.js |
| docs/products/memory-system/PRODUCT_HOME.md | 20 | builderos-reboot/scripts/founder-memory-sentry-proof.mjs, config/memory-truth-classes.js, core/memory-system.js |
| docs/products/limitlessos/PRODUCT_HOME.md | 20 | config/go-vegas-campaign.js, config/go-vegas-network-playbook.js, routes/audit-intake-flow-routes.js |
| docs/products/clientcare-billing-recovery/PRODUCT_HOME.md | 17 | config/clientcare-billing-pricing.js, config/clientcare-billing-stages.js, public/clientcare-billing/clientcare-billing.js |
| docs/products/memory-system/PRODUCT_HOME.md */ | 16 | routes/memory-capsule-routes.js, services/memory-candidate.js, services/memory-capsule.js |
| docs/products/universal-overlay/PRODUCT_HOME.md | 14 | extension/background.js, extension/content.js, extension/popup.js |
| docs/products/teacher-os/PRODUCT_HOME.md | 14 | routes/competitiveLandscapeRoutes.js, routes/ferpaRoutes.js, routes/teacher-os-routes.js |
| docs/products/creative-engine/PRODUCT_HOME.md | 14 | routes/creative-engine-routes.js, routes/creative-engine-ui-routes.js, services/creative-engine/index.js |
| docs/products/marketingos/socialmediaos/PRODUCT_HOME.md | 13 | builderos-reboot/MISSIONS/PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001/CONTENT/SSM-001/socialmediaos-coaching-service.js, builderos-reboot/MISSIONS/PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001/CONTENT/SSM-002/socialmediaos-content-generator.js, builderos-reboot/MISSIONS/PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001/CONTENT/SSM-003/socialmediaos-coaching-routes.js |
| docs/products/lumin-university/PRODUCT_HOME.md | 12 | routes/detailedCompetencyStandardsRoutes.js, routes/prospectiveStudentInterviewRoutes.js, services/accreditationBodyConsultation.js |
| docs/products/token-accounting-os/PRODUCT_HOME.md | 11 | routes/operator-consumption-ledger-routes.js, routes/token-accounting-routes.js, scripts/operator-consumption-ledger.mjs |
| builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json | 11 | scripts/run-builderos-autonomy-closure-v1-acceptance.mjs, scripts/run-builderos-build-deploy-truth.mjs, scripts/run-builderos-founder-ui-proof.mjs |
| builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json | 10 | builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/builderos-reboot/scripts/mission-recovery-owner.mjs, builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/builderos-reboot/scripts/run-overnight-bp-autonomy.mjs, builderos-reboot/scripts/mission-recovery-owner.mjs |
| docs/products/oil-security-divisions/PRODUCT_HOME.md | 9 | routes/registerHoneypotProbeRoutes.js, routes/registerPreflightSecurityRoutes.js, scripts/securityPreflightChecks.mjs |
| docs/products/business-tools/PRODUCT_HOME.md | 8 | routes/curriculumRoutes.js, routes/entitlementRoutes.js, routes/issueApprovalRoutes.js |
| docs/products/music-talent-studio/PRODUCT_HOME.md | 8 | routes/studentInterviewRoutes.js, services/audioAnalysisApproach.js, services/detailedAPISpecification.js |
| docs/products/productized-sprint/PRODUCT_HOME.md | 8 | scripts/deliver-content-pack.mjs, scripts/identifyTargetCustomers.mjs, scripts/identifyTargetCustomersScript.mjs |
| docs/products/word-keeper/PRODUCT_HOME.md | 7 | routes/googleCalendarIntegrationRoutes.js, routes/transcriptVerificationRoutes.js, routes/word-keeper-routes.js |