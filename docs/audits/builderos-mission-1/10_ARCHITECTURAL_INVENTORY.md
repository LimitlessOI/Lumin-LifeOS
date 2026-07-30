<!-- SYNOPSIS: 10. Architectural Inventory -->


# 10. Architectural Inventory
| Layer | File Count | Sample |
|---|---|---|
| routes | 309 | routes/lesson-plan-routes.js, routes/billing-routes.js, routes/command-center-mode-routes.js, routes/issueApprovalRoutes.js, routes/lane-intel-routes.js |
| services | 1136 | services/builderos-arc-service.js, services/product-readiness.js, services/builderos-build-done-gate-helper.js, services/google_places_service.go, services/env-registry-map.js |
| core | 108 | core/enhanced-consensus-protocol.js, core/code-explainer.js, core/dependency-manager.js, core/intelligent-scaling.js, core/json-sanitizer.js |
| scripts | 1536 | scripts/verify-runner-telemetry-g815.mjs, scripts/verify-runner-telemetry-g219.mjs, scripts/verify-runner-telemetry-g245.mjs, scripts/cursor-pre-push-review.mjs, scripts/verify-runner-telemetry-g55.mjs |
| startup | 17 | startup/snapshots.js, startup/user-preferences.js, startup/latest-run.js, startup/register-runtime-routes.js, startup/auto-register-product-modules.js |
| public/overlay | 194 | public/overlay/chat-panel.js, public/overlay/lifeos-founder-interface.js, public/overlay/dialogue-price-book-ui.html, public/overlay/overlay-window.js, public/overlay/lifeos-onboarding.html |
| db/migrations | 408 | db/migrations/20260630_neon_archive_abandoned_tables.sql, db/migrations/create_user_trials_table.sql, db/migrations/20260704_create_agent_protocol_violations.sql, db/migrations/20260525_autonomous_telemetry.sql, db/migrations/20260704_create_story_rights.sql |
| config | 81 | config/design-studio.js, config/lifeos-stack-registry.json, config/judgment-capsule-contracts.js, config/auto-registered-product-modules.json, config/printerCapabilities.json |
| factory-staging | 121 | factory-staging/server.js, factory-staging/package-lock.json, factory-staging/package.json, factory-staging/AGENTS.md, factory-staging/README.md |
| builderos-reboot | 1261 | builderos-reboot/BUILDEROS_WORKING_DEFINITION.json, builderos-reboot/DETERMINISM_RECEIPT.json, builderos-reboot/MISSION_PACK_INDEX.json, builderos-reboot/MISSION_QUEUE.json, builderos-reboot/DUPLICATION_RECEIPT.json |
| docs/products | 264 | docs/products/PROJECTGOVERNANCE.md, docs/products/OILSECURITYDIVISIONS.md, docs/products/COMMANDCENTER.md, docs/products/BUSINESSTOOLS.md, docs/products/UNIVERSALOVERLAY.md |
| docs/constitution | 18 | docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md, docs/constitution/LUMIN_DISPLAY_DNA.md, docs/constitution/LUMIN_COMMUNICATION_DNA.md, docs/constitution/NORTH_STAR_SSOT.md, docs/constitution/NORTH_STAR.md |

## 10.1 Product registry
| Product | Home |
|---|---|
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |

## 10.2 BuilderOS governance artifacts
| Governance File | Size |
|---|---|
| builderos-reboot/governance/TYPED_BLOCKER_SSOT.json | 2046 |
| builderos-reboot/governance/LUMIN_OPERATING_MODEL.json | 6253 |
| builderos-reboot/governance/SESSION_DECISIONS_2026-07-03.md | 5192 |
| builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json | 8543 |
| builderos-reboot/governance/FOUNDER_PACKET_V2_CHAIR_RUNTIME.json | 1669 |
| builderos-reboot/governance/BLOCKER_PARKING_POLICY.json | 1166 |
| builderos-reboot/governance/LUMIN_CONNECTION_LAW.json | 2769 |
| builderos-reboot/governance/CHAIR_STRATEGIC_INTELLIGENCE.json | 2071 |
| builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json | 11610 |
| builderos-reboot/governance/CHAIR_INTENT_PROTOCOL.json | 1737 |
| builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json | 5099 |
| builderos-reboot/governance/LIFEOS_SERVICE_DOCTRINE_RUNTIME.json | 1160 |
| builderos-reboot/governance/CANONICAL_EXECUTION_SPINE.json | 1523 |
| builderos-reboot/governance/OB_EXECUTION_LADDER.json | 3320 |
| builderos-reboot/governance/BUILDEROS_TOOL_REGISTRY.json | 27516 |
| builderos-reboot/governance/BUILDEROS_INTAKE_REGRESSION_HARNESS.json | 752 |
| builderos-reboot/governance/DEVIN_EXECUTION_PACKET.json | 2337 |
| builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json | 3727909 |
| builderos-reboot/governance/DEPARTMENT_ROLE_CONTRACT.json | 5303 |
| builderos-reboot/governance/BUILDEROS_EXECUTION_TIER.json | 1261 |
| builderos-reboot/governance/FILE_SYNOPSIS_LAW.json | 2491 |
| builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.schema.json | 3641 |
| builderos-reboot/governance/POINT_B_DNA.json | 2753 |
| builderos-reboot/governance/MISSION_PHASE_ARTIFACTS.json | 3265 |
| builderos-reboot/governance/SENTRY_FINDINGS_QUEUE.json | 14233 |
| builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json | 6332 |
| builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json | 6898 |
| builderos-reboot/governance/ARTIFACT_ALIAS_REGISTRY.json | 3636 |
| builderos-reboot/governance/schemas/PREDICTION_RECEIPT.schema.json | 407 |
| builderos-reboot/governance/schemas/ARC_RUN_RECEIPT.schema.json | 777 |

## 10.3 Routes
| Route File | Route Count | Exports | Self-Mounting |
|---|---|---|---|
| lifere-os-routes.js | 142 | createLifeRERoutes | no |
| tc-routes.js | 136 | createTCRoutes | yes |
| cognitive-core-routes.js | 118 | createCognitiveCoreRoutes | yes |
| clientcare-billing-routes.js | 108 | createClientCareBillingRoutes | no |
| lifeos-core-routes.js | 74 | createLifeOSCoreRoutes | yes |
| public-routes.js | 42 |  | yes |
| life-coaching-routes.js | 35 | createLifeCoachingRoutes | no |
| command-center-routes.js | 35 | createCommandCenterRoutes | no |
| site-builder-routes.js | 34 | createSiteBuilderRoutes | yes |
| lifeos-legacy-routes.js | 34 | createLifeOSLegacyRoutes | yes |
| auto-builder-routes.js | 31 | createAutoBuilderRoutes | no |
| business-routes.js | 28 | createBusinessRoutes | no |
| lifeos-auth-routes.js | 28 | createLifeOSAuthRoutes, createLifeOSBillingRoutes | yes |
| lifeos-command-center-routes.js | 27 | createCommandCenterAggregateRoutes | no |
| railway-managed-env-routes.js | 27 | createRailwayManagedEnvRoutes | no |
| lifeos-voice-rail-routes.js | 24 | createLifeOSVoiceRailRoutes | no |
| lifeos-conflict-routes.js | 24 | createLifeOSConflictRoutes | yes |
| api-v1-core.js | 24 |  | no |
| memory-intelligence-routes.js | 23 | createMemoryIntelligenceRoutes | no |
| lifeos-children-routes.js | 22 | createLifeOSChildrenRoutes | no |
| lifeos-finance-routes.js | 22 | createLifeOSFinanceRoutes | yes |
| teacher-os-routes.js | 21 | createTeacherOSRoutes | no |
| lifeos-chat-routes.js | 20 | createLifeOSChatRoutes | no |
| lifeos-engine-routes.js | 20 | createLifeOSEngineRoutes, createLifeOSGatewayRoutes | yes |
| bundle_social_automation_routes.js | 20 |  | yes |
| lifeos-purpose-routes.js | 19 | createLifeOSPurposeRoutes | yes |
| word-keeper-routes.js | 19 | createWordKeeperRoutes | no |
| marketing-session-ui-routes.js | 19 | createMarketingSessionUiRoutes | yes |
| lifeos-growth-routes.js | 19 | createLifeOSGrowthRoutes | no |
| deliberation-governance-routes.js | 18 | createDeliberationGovernanceRoutes | no |
| account-manager-routes.js | 18 | createAccountManagerRoutes | yes |
| lifeos-emotional-routes.js | 18 | createLifeOSEmotionalRoutes | yes |
| twin-routes.js | 17 | createTwinRoutes | no |
| blueprint-intake-routes.js | 17 | createBlueprintIntakeRoutes | no |
| factory-mount-routes.js | 16 | createFactoryMountRoutes | no |
| lifeos-phase3-routes.js | 16 |  | no |
| tokenos-routes.js | 15 | createTokenOSRoutes | yes |
| video-routes.js | 15 | createVideoRoutes | no |
| tco-agent-routes.js | 15 |  | no |
| lifeos-council-builder-routes.js | 15 | createLifeOSCouncilBuilderRoutes | yes |

## 10.4 Services
| Service File | Function Count |
|---|---|
| clientcare-browser-service.js | 88 |
| site-builder-asset-ingestion.js | 65 |
| clientcare-billing-service.js | 65 |
| clientcare-ops-service.js | 57 |
| never-stop-product-factory.js | 50 |
| tc-browser-agent.js | 49 |
| marketing-youtube.js | 49 |
| governed-autonomous-shipping-loop.js | 44 |
| blueprint-intake.js | 39 |
| council-service.js | 38 |
| voice-rail-v1.js | 38 |
| lifere-receptionist-bridge.js | 34 |
| intake-blueprint-executor.js | 32 |
| clientcare-sellable-service.js | 31 |
| memory-intelligence-service.js | 30 |
| email-triage.js | 29 |
| oil-self-repair-detector.js | 28 |
| lumin-context-loader.js | 26 |
| adf-prediction-ledger.js | 25 |
| railway-managed-env-service.js | 25 |
| builder-council-review.js | 25 |
| faith-studio-service.js | 24 |
| lifeos-auth.js | 24 |
| boldtrail.js | 24 |
| deliberation-governance-service.js | 23 |
| site-builder-social-discovery.js | 23 |
| deployment-service.js | 23 |
| builderos-pbb-plan.js | 22 |
| lifeos-system-agent.js | 22 |
| ai-guard.js | 22 |
| truth-ladder.js | 21 |
| tc-email-document-service.js | 21 |
| go-vegas-outreach.js | 21 |
| commitment-tracker.js | 21 |
| founder-build-quorum-escalation.js | 20 |
| cognitive-core-oracle.js | 20 |
| lifere-alpha-surface-api.js | 20 |
| founder-provider-tool-action.js | 20 |
| lifeos-lumin.js | 20 |
| token-optimizer.js | 19 |