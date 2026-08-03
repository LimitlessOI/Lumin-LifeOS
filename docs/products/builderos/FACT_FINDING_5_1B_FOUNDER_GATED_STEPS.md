<!-- SYNOPSIS: Phase 5.1b fact-finding — what the 84 shipped founder_gated steps actually did -->
<!-- @ssot docs/products/builderos/PRODUCT_HOME.md -->
# Phase 5.1b Fact-Finding: Shipped founder_gated Steps

**Scope:** All `BUILD_QUEUE.json` files on `origin/main` at the time of audit.  
**Count:** 93 steps marked `founder_gated: true`.  
**Status breakdown:** `done`: 84, `skipped`: 8, `blocked`: 1.  
**No disposition applied.** This report is purely descriptive; whether any of the 84 `done` steps need retroactive review is Adam's decision.

## Summary by target category

| Category | Count |
|---|---|
| public | 48 |
| services | 17 |
| routes | 12 |
| scripts | 2 |
| docs | 2 |
| db | 2 |
| other | 1 |

## Details — done steps (84)

| Queue | Step ID | Target file | Task / spec summary | Category |
|---|---|---|---|---|
| ai-receptionist/BUILD_QUEUE.json | `landing-page` | public/ai-receptionist.html | build AI receptionist landing page | public |
| ai-receptionist/BUILD_QUEUE.json | `7` | public/overlay/stripeInfo.html | build Stripe price tier overlay | public |
| builderos/BUILD_QUEUE.json | `step-06` | public/overlay/lifeos-household.html | Build household overlay UI with 8 sections, 30s poll, ?key= auth, approve button, and add form per BPB-0001 §Section 6 | public |
| builderos/BUILD_QUEUE.json | `builderos-12` | public/overlay/money-lane.html | update money-lane builds | public |
| builderos/BUILD_QUEUE.json | `builderos-step8` | public/overlay/commitments.html | display commitments to users | public |
| clientcare-billing-recovery/BUILD_QUEUE.json | `10` | public/overlay/ReportAging.html | design report aging overlay | public |
| faith-studio/BUILD_QUEUE.json | `step5` | routes/publicPublishingReview.js | establish public publishing review workflow | routes |
| faith-studio/BUILD_QUEUE.json | `step7` | routes/privateWitnessMode.js | configure private witness mode controls | routes |
| faith-studio/BUILD_QUEUE.json | `step9` | routes/familySafety.js | enforce stricter default safety settings | routes |
| faith-studio/BUILD_QUEUE.json | `04` | services/theologicalAdvisoryModel.js | design theological advisory model | services |
| faith-studio/BUILD_QUEUE.json | `faith-studio-5` | routes/publicPublishingReview.js | implement public publishing review workflow | routes |
| lifeos/BUILD_QUEUE.json | `8` | services/lifeos-crisis-language-detector.js | implement crisis language detector | services |
| lifeos/BUILD_QUEUE.json | `lifeos-admin-7` | routes/pending-adam-routes.js | Expose pending Adam panel API endpoints | routes |
| lifeos/BUILD_QUEUE.json | `lifeos-admin-9` | public/overlay/pending-adam-panel.html | Build Pending Adam panel UI with priority sort, type badges, one-click resolve | public |
| lifeos/BUILD_QUEUE.json | `lifeos-admin-10` | public/overlay/projects-dashboard-drilldown.html | Build Projects Dashboard panel with hover tooltip and click drawer drill-down | public |
| lifeos/BUILD_QUEUE.json | `lifeos-admin-11` | public/overlay/mode-switcher-panel.html | Build runtime mode switcher UI panel wired to POST /command-center/mode | public |
| lifeos/BUILD_QUEUE.json | `lifeos-4` | public/overlay/lifeos-app.html | Activate overlay lifeos-ambient-listener.js | public |
| lifeos/BUILD_QUEUE.json | `lifeos-5` | public/overlay/lifeos-ambient-listener.js | Patch DOM and transcript dispatch | public |
| lifeos/BUILD_QUEUE.json | `lifeos-7` | public/overlay/lifeos-voice-note-journal.html | Implement UI for voice journaling | public |
| lifeos/BUILD_QUEUE.json | `lifeos-step4` | public/overlay/lifeos-app.html | replace legacy ambient listener script | public |
| lifeos/BUILD_QUEUE.json | `lifeos-step5` | public/overlay/lifeos-ambient-listener.js | patch voice transcript handling | public |
| lifeos/BUILD_QUEUE.json | `lifeos-step7` | services/lifeos-communication-profile.js | create communication profile UI | services |
| lifeos/BUILD_QUEUE.json | `lifeos-step8` | public/overlay/lifeos-voice-note-journal.html | implement voice journaling feature | public |
| limitlessos/BUILD_QUEUE.json | `8` | routes/cityos-home-routes.js | create CityOS/Go Vegas product home | routes |
| limitlessos/BUILD_QUEUE.json | `9` | public/overlay/canonical-branding.html | formalize BusinessOS naming | public |
| limitlessos/BUILD_QUEUE.json | `10` | public/overlay/audit-intake.html | audit intake flow UI | public |
| limitlessos/BUILD_QUEUE.json | `step1` | public/overlay/formalize-businessos-ui.html | implement UI naming distinctions | public |
| limitlessos/BUILD_QUEUE.json | `step2` | public/overlay/audit-intake-flow.html | enhance audit intake UI | public |
| limitlessos/BUILD_QUEUE.json | `step8` | public/overlay/sticker-marketing.html | add UI for sticker marketing SKUs | public |
| limitlessos/BUILD_QUEUE.json | `s1` | routes/limitlessos-ui-routes.js | create route for product id | routes |
| limitlessos/BUILD_QUEUE.json | `step9` | public/overlay/dialogue-price-book-ui.html | price book UI | public |
| limitlessos/BUILD_QUEUE.json | `step12` | public/overlay/dialogue-bundle-skus-ui.html | create bundle SKUs UI | public |
| limitlessos/BUILD_QUEUE.json | `12` | routes/limitlessos-ui-routes.js | register UI updates | routes |
| limitlessos/BUILD_QUEUE.json | `limitlessos-step1` | public/overlay/formalize-businessos-ui.html | update UI branding | public |
| limitlessos/BUILD_QUEUE.json | `limitlessos-1` | services/formalize-businessos-ui.js | create service for UI naming | services |
| lumin-university/BUILD_QUEUE.json | `step4` | public/overlay/credentialVerification.html | create UI for credential verification | public |
| lumin-university/BUILD_QUEUE.json | `008` | public/overlay/accreditationLegalStructure.html | document legal structure for accreditation-seeking | public |
| marketingos/BUILD_QUEUE.json | `step-06` | public/overlay/marketing-session-new.html | Build /marketing/session/new UI surface | public |
| marketingos/BUILD_QUEUE.json | `step-07` | routes/marketing-session-new-ui-routes.js | Serve /marketing/session/new and /marketing/session/:id/export UI routes | routes |
| marketingos/BUILD_QUEUE.json | `step-08` | public/overlay/marketing-session-export.html | Build /marketing/session/:id/export UI surface | public |
| marketingos/BUILD_QUEUE.json | `step-10` | scripts/run-lifeos-product-home-verify.mjs | Implement npm run lifeos:product-home:verify script | scripts |
| marketingos/BUILD_QUEUE.json | `step-12` | services/marketing-adam-decisions.js | Scaffold Adam decision tracking service for §12 open items | services |
| memory-intelligence/BUILD_QUEUE.json | `memory-intelligence-5` | docs/AI_COLD_START.md | update AI cold start docs | docs |
| memory-intelligence/BUILD_QUEUE.json | `memory-intelligence-step7` | prompts/lifeos-platform.md | update_domain_prompt_files | other |
| oil-security-divisions/BUILD_QUEUE.json | `oil-security-divisions-10` | docs/products/project-governance/PRODUCT_HOME.md | update probe precedent section | docs |
| personal-finance-os/BUILD_QUEUE.json | `personal-finance-os-5` | db/migrations/amendment_21_layer_12.sql | design Layer 12 DB schema | db |
| personal-finance-os/BUILD_QUEUE.json | `personal-finance-os-7` | services/emotionalIntelligenceSignals.js | emit emotional intelligence signals | services |
| personal-finance-os/BUILD_QUEUE.json | `personal-finance-os-step5` | db/migrations/amendment_21_layer_12.sql | Implement Layer 12 DB schema | db |
| productized-sprint/BUILD_QUEUE.json | `productized-sprint-5` | routes/sprintQueuePanel.js | build sprint queue panel | routes |
| productized-sprint/BUILD_QUEUE.json | `productized-sprint-6` | public/overlay/salesPage.html | create sales page | public |
| productized-sprint/BUILD_QUEUE.json | `productized-sprint-3` | public/overlay/completionEmailTemplate.html | create delivery email template | public |
| productized-sprint/BUILD_QUEUE.json | `productized-sprint-9` | routes/sprintQueuePanelRoute.js | add Sprint Queue panel route | routes |
| productized-sprint/BUILD_QUEUE.json | `productized-sprint-10` | public/overlay/salesPage.html | create sales page for offers | public |
| project-governance/BUILD_QUEUE.json | `6` | services/innovationListener.js | add innovation response mechanism | services |
| site-builder/BUILD_QUEUE.json | `step-6` | public/overlay/site-builder-template-picker.html | Build template picker UI overlay showing 3–5 starter templates | public |
| site-builder/BUILD_QUEUE.json | `step-7` | public/overlay/site-builder-editor-onboarding-prompt.html | Build first-step onboarding prompt UI for the editor | public |
| site-builder/BUILD_QUEUE.json | `step-8` | public/overlay/site-builder-chat-prompt.html | Build chat prompt UI with example questions | public |
| site-builder/BUILD_QUEUE.json | `step-9` | public/overlay/site-builder-save-confirmation.html | Build save confirmation UI widget with timestamp and checkmark | public |
| site-builder/BUILD_QUEUE.json | `step-10` | public/overlay/site-builder-device-toggle.html | Build plainly-labelled Desktop/Tablet/Mobile device toggle UI | public |
| site-builder/BUILD_QUEUE.json | `step-06` | services/site-builder-template-options.js | Expand template options service to address ux_friction_1 | services |
| site-builder/BUILD_QUEUE.json | `step-07` | services/site-builder-color-palettes.js | Expand color palette options to address ux_friction_2 | services |
| site-builder/BUILD_QUEUE.json | `step-08` | routes/site-builder-customization-routes.js | Mount customization UI routes serving template and palette choices | routes |
| site-builder/BUILD_QUEUE.json | `step-11` | services/site-builder-preview-expiry-ui.js | Add UI-layer helpers for preview-expiry sweep feature | services |
| site-builder/BUILD_QUEUE.json | `step-12` | public/overlay/site-builder-editor-hints-overlay.html | Build founder-gated editor hints overlay embedding onboarding banner, chat hints, control tooltips, and device preview diff UI | public |
| story-studio/BUILD_QUEUE.json | `2` | services/characterProfile.js | Develop character/world/story bible editor | services |
| story-studio/BUILD_QUEUE.json | `6` | services/franchiseScoring.js | Develop franchise scoring system with anti-abuse | services |
| story-studio/BUILD_QUEUE.json | `7` | services/cartoonGeneration.js | Create cartoon/anime-style short generator | services |
| story-studio/BUILD_QUEUE.json | `12` | public/overlay/formatExportUI.html | create format export UI | public |
| tc-service/BUILD_QUEUE.json | `s11` | public/overlay/tc-intake-dashboard.html | Build agent-facing real-time file status card and one-tap mobile approval UI for intake runs | public |
| tc-service/BUILD_QUEUE.json | `s12` | public/overlay/tc-billing-enroll.html | Build founder-gated agent enrollment and Stripe checkout UI for first paying agent client | public |
| tc-service/BUILD_QUEUE.json | `step-11` | public/overlay/tc-dashboard.html | Build agent-facing real-time file status card and one-tap approval UI (items 4, 6) | public |
| tc-service/BUILD_QUEUE.json | `step-12` | public/overlay/tc-agent-enroll.html | Build first paying agent enrollment UI wired to billing (items 2, 38) | public |
| teacher-os/BUILD_QUEUE.json | `teacher-os-6` | public/overlay/pricingValidation.html | create pricing validation HTML | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-4` | public/overlay/fluidUIContextRouter.js | integrate fluid UI context router | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-5` | public/icons/lifeosIcons.html | add extension icons | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-6` | public/overlay/pinnedModules.js | implement pinned modules in overlay | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-7` | public/overlay/multiProgramView.js | implement multi-program simultaneous view | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-8` | public/overlay/adaptiveLayout.js | save adaptive layout preferences | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-step12` | scripts/iosAppBuild.mjs | complete iOS PWA and IPA build | scripts |
| wellness-studio/BUILD_QUEUE.json | `step-07` | public/overlay/wellness-studio.html | Create founder-gated wellness studio dashboard overlay UI | public |
| white-label/BUILD_QUEUE.json | `white-label-5` | services/stripe-billing-separation.js | design stripe billing separation | services |
| white-label/BUILD_QUEUE.json | `white-label-4` | services/partner-key-generation.js | define partner API key schema | services |
| white-label/BUILD_QUEUE.json | `white-label-step3` | services/partner-key-scheme.js | design partner API key schema | services |
| white-label/BUILD_QUEUE.json | `white-label-step4` | services/stripe-billing-separation.js | design separate billing flow | services |

## Skipped steps (8)

| Queue | Step ID | Target file | Task / spec summary | Category |
|---|---|---|---|---|
| kids-os/BUILD_QUEUE.json | `kids-os-5` | public/overlay/pricing-validation.html | validate pricing with users | public |
| limitlessos/BUILD_QUEUE.json | `s2` | public/overlay/limitlessos.html | update brand naming | public |
| limitlessos/BUILD_QUEUE.json | `limitlessos-step3` | public/overlay/audit-intake-flow.html | update audit intake UI | public |
| productized-sprint/BUILD_QUEUE.json | `step6` | public/overlay/salesPage.html | create one-page sales content | public |
| teacher-os/BUILD_QUEUE.json | `teacher-os-8` | routes/uxRoutes.js | Add UX wireframes route | routes |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-9` | public/overlay/iPhonePWA.md | document iPhone PWA installation | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-step7` | public/overlay/moduleRouter.js | implement fluid UI context router | public |
| universal-overlay/BUILD_QUEUE.json | `universal-overlay-step8` | public/overlay/uiExtensions.js | support overlay pinned modules | public |

## Blocked steps (1)

| Queue | Step ID | Target file | Task / spec summary | Category |
|---|---|---|---|---|
| site-builder/BUILD_QUEUE.json | `step-09` | routes/site-builder-customization-ui-routes.js | Register customization UI API and HTML routes | routes |
