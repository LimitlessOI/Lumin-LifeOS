/**
 * SYNOPSIS: Sealed manufacturing sequences for the ONE queue — factory may not
 * invent the next slice. Overlay = Taloa §64. Collectibles = MASTER_BLUEPRINT V1.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { PRINT_INVENTION_FORBIDDEN } from './live-build-queue.js';

export const OVERLAY_PRINT_SLICE_ID = /^(TALOA-S64-|TALOA-P1-|TALOA-G0-|TALOA-BADGE-|TALOA-NATIVE-|TALOA-SENTRY-)/;
export const OVERLAY_PRINT_SOURCE = 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md';
export const COLLECTIBLES_PRINT_SLICE_ID = /^COLLECTIBLES-V\d+-/;
export const COLLECTIBLES_PRINT_SOURCE = /docs\/products\/collectibles\/MASTER_BLUEPRINT/i;

const PRINT_SOURCE = `${OVERLAY_PRINT_SOURCE} §64`;
const COLLECTIBLES_SOURCE = 'docs/products/collectibles/MASTER_BLUEPRINT.md — V1 Trusted Personal Vault';

function printStep(partial) {
  return {
    status: 'pending',
    founder_gated: false,
    attempts: 0,
    action_type: 'author_then_write',
    blueprint_id: 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1',
    mission_id: 'PRODUCT-universal-overlay',
    source: PRINT_SOURCE,
    depends_on: [],
    ...partial,
    blueprint_step_id: partial.id,
  };
}

function collectiblesPrintStep(partial) {
  return {
    status: 'pending',
    founder_gated: false,
    attempts: 0,
    action_type: 'author_then_write',
    product_id: 'collectibles',
    // One-queue twin: Collectibles steps must cite the live BUILD_QUEUE twin
    // (same as foundation that shipped). PRODUCT-COLLECTIBLES-* has no twin file
    // → tip NOT_ON_BLUEPRINT idle (live 2026-08-13 SCHEMA).
    blueprint_id: 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1',
    mission_id: 'PRODUCT-universal-overlay',
    source: COLLECTIBLES_SOURCE,
    depends_on: [],
    ...partial,
    blueprint_step_id: partial.id,
  };
}

export const OVERLAY_PRINT_SEQUENCE = Object.freeze([
  printStep({
    id: 'TALOA-S64-ANDROID-BODY-001',
    target_file: 'services/taloa/android-body-adapter.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'The file MUST begin with a JSDoc block comment containing a line exactly "@ssot docs/products/universal-overlay/PRODUCT_HOME.md". Overlay print §64 item 3: Android Universal Body adapter. Export exactly: export function createAndroidBodyAdapter(deps). Return { observe(scope), act(action), verify(goal, expected) }. observe MUST call deps.dumpVisibleText (injected) then CALL redactObservation from "../drive-sensitive-content-filter.js" on that text before returning. act MUST call deps.enqueueCommand. verify MUST use independent evidence from a fresh observe(). Do NOT rebuild runBrowserGoal. Do NOT invent a table. ES module. Do not edit server.js.',
    spec: 'Reuse dumpVisibleText, enqueueCommand, redactObservation as injected deps. This file is only the Android Body observe/act/verify adapter.',
    expected_exports: ['createAndroidBodyAdapter'],
    file_contains: ['createAndroidBodyAdapter', 'redactObservation', 'dumpVisibleText', 'enqueueCommand'],
    behavior_assertions: [
      { type: 'exports_smoke', path: 'services/taloa/android-body-adapter.js', exports: ['createAndroidBodyAdapter'], assertion_id: 'expected_exports:services/taloa/android-body-adapter.js' },
      { type: 'file_contains', path: 'services/taloa/android-body-adapter.js', must_include: ['redactObservation', 'observe', 'act', 'verify'], assertion_id: 'reachability:android-body-observe-act-verify' },
    ],
    route: null,
  }),
  printStep({
    id: 'TALOA-S64-ANDROID-BODY-WIRE-001',
    target_file: 'services/general-browser-agent-runtime.js',
    sandbox_boundary: 'services/**',
    depends_on: ['TALOA-S64-ANDROID-BODY-001'],
    task: 'Keep existing @ssot. Import createAndroidBodyAdapter from "./taloa/android-body-adapter.js" and CALL it. Export makeAndroidBody(deps). Do NOT rewrite runBrowserGoal. Additive only.',
    spec: 'Add makeAndroidBody so a caller can pass the Android Body without forking the Mind.',
    expected_exports: ['observePage', 'makeAndroidBody'],
    file_contains: ['createAndroidBodyAdapter', 'makeAndroidBody'],
    behavior_assertions: [
      { type: 'file_contains', path: 'services/general-browser-agent-runtime.js', must_include: ['createAndroidBodyAdapter', 'makeAndroidBody'], assertion_id: 'reachability:android-body-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-MACOS-PERCEPTION-001',
    target_file: 'native/macos-overlay/SemanticPerception.swift',
    sandbox_boundary: 'native/macos-overlay/**',
    task: 'Overlay print §64 item 4: macOS semantic perception. Native Swift AXUIElement tree-walk plus vision-model fallback. factory-2 compiles. Do not edit services/ or routes/.',
    spec: 'AX tree as primary observe(); vision fallback when AX is empty. No independent reasoning loop.',
    file_contains: ['SemanticPerception', 'AXUIElement'],
  }),
  printStep({
    id: 'TALOA-S64-MACOS-BODY-001',
    target_file: 'native/macos-overlay/MacOsBodyAdapter.swift',
    sandbox_boundary: 'native/macos-overlay/**',
    depends_on: ['TALOA-S64-MACOS-PERCEPTION-001'],
    task: 'Overlay print §64 item 5: macOS Universal Body adapter observe/act/verify over ScreenControl + SemanticPerception. factory-2 compiles. Do not rebuild a second Mind.',
    spec: 'Same contract as Android Body. verify from independent observe.',
    file_contains: ['MacOsBodyAdapter', 'observe', 'act', 'verify'],
  }),
  printStep({
    id: 'TALOA-S64-AUTH-ENVELOPE-001',
    target_file: 'services/taloa/task-authorization-envelope.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 6: Task Authorization Envelope. Export createTaskAuthorizationEnvelope({ pool, logger }). Persist on existing agent_task_authority — do not invent a table. Do not import types/logger.',
    spec: 'Blueprint §23. Reuse authority_ledger (TALOA-P1-002).',
    expected_exports: ['createTaskAuthorizationEnvelope'],
    file_contains: ['createTaskAuthorizationEnvelope', 'authority_ledger'],
  }),
  printStep({
    id: 'TALOA-S64-TEMPLATE-REPLAY-001',
    target_file: 'services/taloa/template-replay-service.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 7: template persistence + replay. Export createTemplateReplayService({ pool, logger }). Replay when environment_signature still matches. Do not invent a table.',
    spec: 'Blueprint §30–32. Reuse capsule_store.',
    expected_exports: ['createTemplateReplayService'],
    file_contains: ['createTemplateReplayService', 'environment_signature'],
  }),
  printStep({
    id: 'TALOA-S64-PROMPT-INJECT-001',
    target_file: 'services/taloa/prompt-injection-authority-gate.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 8: observed page text cannot become instructions. Export assertObservationIsNotAuthority(observation, envelope).',
    spec: 'Blueprint §46.',
    expected_exports: ['assertObservationIsNotAuthority'],
    file_contains: ['assertObservationIsNotAuthority'],
  }),
  printStep({
    id: 'TALOA-S64-SENTRY-LAYER-B-001',
    target_file: 'scripts/sentry-overlay-layer-b.mjs',
    sandbox_boundary: 'scripts/**',
    task: 'Overlay print §64 item 9 / §52: real Layer B browser walkthrough for universal-overlay. Every finding carries proposed_solution. Register in SENTRY_PRODUCT_REGISTRY.json.',
    spec: 'SO-002 Layer B. Layer A already exists (TALOA-SENTRY-LAYER-A-001).',
    file_contains: ['universal-overlay', 'proposed_solution', 'layer-b'],
  }),
]);

/**
 * Sealed Collectibles print V1→V10 from MASTER_BLUEPRINT.
 * factory-3 NEVER idles while any sealed slice remains — continues through V10
 * unless the lane is explicitly reassigned (founder 2026-08-13).
 * Later versions depend on prior version acceptance; do not invent architecture.
 */
export const COLLECTIBLES_PRINT_SEQUENCE = Object.freeze([
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-ADAPTER-INTERFACE-001',
    target_file: 'services/collectibles/category-adapter.js',
    sandbox_boundary: 'services/collectibles/**',
    task: 'CategoryAdapter registry + contract. Export createCategoryAdapterRegistry.',
    spec: 'MASTER_BLUEPRINT V1 foundation.',
    expected_exports: ['createCategoryAdapterRegistry'],
    file_contains: ['createCategoryAdapterRegistry', 'identify', 'conditionSchema'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-TWIN-SERVICE-001',
    target_file: 'services/collectibles/twin-service.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-ADAPTER-INTERFACE-001'],
    task: 'CollectibleTwin create/update helpers with ownership/possession/custody/location separation.',
    spec: 'SCHEMA_CONTRACTS identity_status enums; never invent MarketplaceCard.',
    expected_exports: ['createCollectibleTwin', 'updateCollectibleTwin'],
    file_contains: ['createCollectibleTwin', 'needs_review', 'identity_status'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-MTG-ADAPTER-001',
    target_file: 'services/collectibles/adapters/mtg-adapter.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-ADAPTER-INTERFACE-001'],
    task: 'MTG CategoryAdapter wrapping mtg-card-vision + mtg-card-pricing.',
    spec: 'Do not duplicate Scryfall logic.',
    expected_exports: ['createMtgCategoryAdapter'],
    file_contains: ['createMtgCategoryAdapter', 'mtg-card-vision', 'mtg-card-pricing'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-ROUTES-001',
    target_file: 'routes/collectibles-routes.js',
    sandbox_boundary: 'routes/**',
    depends_on: ['COLLECTIBLES-V1-TWIN-SERVICE-001', 'COLLECTIBLES-V1-MTG-ADAPTER-001'],
    task: 'registerCollectiblesRoutes scaffold under /api/v1/collectibles.',
    spec: 'API_CONTRACTS base path.',
    expected_exports: ['registerCollectiblesRoutes'],
    file_contains: ['registerCollectiblesRoutes', '/api/v1/collectibles'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v1-foundation.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V1-ROUTES-001'],
    task: 'Foundation reachability acceptance test.',
    spec: 'Assert live callers, not exports-only.',
    file_contains: ['createCategoryAdapterRegistry', 'createCollectibleTwin', 'registerCollectiblesRoutes'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-SCHEMA-TWINS-001',
    target_file: 'db/migrations/20260813_collectible_twins_v1.sql',
    sandbox_boundary: 'db/migrations/**',
    depends_on: ['COLLECTIBLES-V1-ACCEPTANCE-001'],
    task: 'Postgres migration for V1 Vault: collectible_twins, media_evidence, price_evidence, ownership_records, possession_records, custody_records, location_records, liquidity_preferences, offers stub, play_entitlement stub, partner stubs, audit_events per SCHEMA_CONTRACTS. Soft-delete columns. Indexes as specified. Do NOT invent MarketplaceCard tables. Pure SQL file.',
    spec: 'SCHEMA_CONTRACTS §§1–10 + stubs. Money = integer cents. UUID PKs. timestamptz UTC.',
    file_contains: ['collectible_twins', 'media_evidence', 'identity_status', 'liquidity_preferences', 'ownership_records'],
    behavior_assertions: [
      {
        type: 'file_contains',
        path: 'db/migrations/20260813_collectible_twins_v1.sql',
        must_include: ['collectible_twins', 'media_evidence', 'location_records', 'liquidity_preferences'],
        assertion_id: 'schema:collectible-twins-v1',
      },
    ],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-TWIN-STORE-001',
    target_file: 'services/collectibles/twin-store.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-SCHEMA-TWINS-001', 'COLLECTIBLES-V1-TWIN-SERVICE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createCollectibleTwinStore({ pool, logger }) with insertTwin/getTwin/listTwins/softDeleteTwin against collectible_twins. Keep ownership/possession/custody/location as separate writes. ES module. Do not invent tables.',
    spec: 'Persistence over SCHEMA_CONTRACTS collectible_twins + ownership_records.',
    expected_exports: ['createCollectibleTwinStore'],
    file_contains: ['createCollectibleTwinStore', 'collectible_twins', 'insertTwin'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-MEDIA-EVIDENCE-001',
    target_file: 'services/collectibles/media-evidence.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-SCHEMA-TWINS-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createMediaEvidenceStore({ pool, logger }) — persistMedia, getMedia, listMediaForTwin against media_evidence. postgres_bytea OK for V1. sha256 required. ES module.',
    spec: 'SCHEMA_CONTRACTS media_evidence; API_CONTRACTS media.',
    expected_exports: ['createMediaEvidenceStore'],
    file_contains: ['createMediaEvidenceStore', 'media_evidence', 'sha256'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-CAPTURE-API-001',
    target_file: 'routes/collectibles-routes.js',
    sandbox_boundary: 'routes/**',
    depends_on: ['COLLECTIBLES-V1-TWIN-STORE-001', 'COLLECTIBLES-V1-MEDIA-EVIDENCE-001', 'COLLECTIBLES-V1-MTG-ADAPTER-001'],
    task: 'Keep @ssot. Wire real POST /api/v1/collectibles/twins/capture + GET /twins + GET /twins/:id per API_CONTRACTS: persist media, identify via MTG adapter, insert Twin via twin-store, set needs_review on low confidence. Import createCollectibleTwinStore + createMediaEvidenceStore + createMtgCategoryAdapter. Additive — do not delete registerCollectiblesRoutes.',
    spec: 'API_CONTRACTS §1 Twin lifecycle. Default liquidity surprise_me. Never auto-list.',
    expected_exports: ['registerCollectiblesRoutes'],
    file_contains: ['twins/capture', 'createCollectibleTwinStore', 'createMediaEvidenceStore', 'needs_review'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-REVIEW-QUEUE-001',
    target_file: 'services/collectibles/review-queue.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-TWIN-STORE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createReviewQueueService({ pool, logger }) with listNeedsReview(ownerUserId) and resolveReview(twinId, correction). Corrections persist + audit. ES module.',
    spec: 'MASTER_BLUEPRINT Needs Review workflow; API_CONTRACTS §3.',
    expected_exports: ['createReviewQueueService'],
    file_contains: ['createReviewQueueService', 'needs_review', 'resolveReview'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-VAULT-UI-001',
    target_file: 'public/collectibles/vault.html',
    sandbox_boundary: 'public/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-CAPTURE-API-001'],
    task: 'Brand-first Vault home: image-led browse, capture CTA, Needs Review entry, honest empty/error states. Call /api/v1/collectibles/twins. No card-grid dashboard aesthetic. No purple AI defaults.',
    spec: 'MASTER_BLUEPRINT V1 ENJOY + UX product design law. Deterministic fallback UI.',
    file_contains: ['collectibles', '/api/v1/collectibles', 'Needs Review'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-ERA-WALL-001',
    target_file: 'public/collectibles/era-wall.html',
    sandbox_boundary: 'public/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-VAULT-UI-001'],
    task: 'Era Wall: MTG era/generation buckets, image-led. Link into Twin Dossier. Honest empty state.',
    spec: 'MASTER_BLUEPRINT V1 Era Wall.',
    file_contains: ['Era Wall', 'era', '/api/v1/collectibles'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-DOSSIER-001',
    target_file: 'public/collectibles/twin-dossier.html',
    sandbox_boundary: 'public/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-VAULT-UI-001'],
    task: 'Twin Dossier: photos, identity, condition, price range, location abstract (owner), liquidity. Corrections path. Never show fake point price.',
    spec: 'MASTER_BLUEPRINT Twin Dossier + price range law.',
    file_contains: ['Dossier', 'liquidity', 'needs_review', '/api/v1/collectibles'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-LOCATION-API-001',
    target_file: 'services/collectibles/location-service.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-TWIN-STORE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createLocationService({ pool }). PUT location on Twin (binder/box/shelf). FORBIDDEN_PUBLIC — never leak in offers/public. ES module.',
    spec: 'MASTER_BLUEPRINT Binder GPS; SCHEMA location_records; API_CONTRACTS §4.',
    expected_exports: ['createLocationService'],
    file_contains: ['createLocationService', 'location_kind', 'FORBIDDEN_PUBLIC'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-HOUSEHOLD-001',
    target_file: 'services/collectibles/household-service.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-TWIN-STORE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createHouseholdService({ pool }) — memberships + roles; Twins may attach household_id. ES module.',
    spec: 'MASTER_BLUEPRINT V1 Household.',
    expected_exports: ['createHouseholdService'],
    file_contains: ['createHouseholdService', 'household', 'role'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-GUEST-CLAIM-001',
    target_file: 'services/collectibles/guest-claim-service.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-CAPTURE-API-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createGuestClaimService({ pool }) — guest capture session → claim into authenticated Vault via guest_claim_token_hash. ES module.',
    spec: 'MASTER_BLUEPRINT Guest scan → claim.',
    expected_exports: ['createGuestClaimService'],
    file_contains: ['createGuestClaimService', 'guest_claim', 'claim'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-EXPORT-PRIVACY-001',
    target_file: 'services/collectibles/export-privacy.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-TWIN-STORE-001', 'COLLECTIBLES-V1-MEDIA-EVIDENCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createExportPrivacyService({ pool }) — full owner export + soft-delete with audit. ES module.',
    spec: 'MASTER_BLUEPRINT Export/delete/privacy.',
    expected_exports: ['createExportPrivacyService'],
    file_contains: ['createExportPrivacyService', 'export', 'soft-delete'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V1-LAYER-B-001',
    target_file: 'scripts/sentry-collectibles-layer-b.mjs',
    sandbox_boundary: 'scripts/**',
    depends_on: [
      'COLLECTIBLES-V1-ERA-WALL-001',
      'COLLECTIBLES-V1-DOSSIER-001',
      'COLLECTIBLES-V1-REVIEW-QUEUE-001',
      'COLLECTIBLES-V1-LOCATION-API-001',
      'COLLECTIBLES-V1-HOUSEHOLD-001',
      'COLLECTIBLES-V1-GUEST-CLAIM-001',
      'COLLECTIBLES-V1-EXPORT-PRIVACY-001',
    ],
    task: 'SO-002 Layer B: real browser walkthrough of Vault capture → review → Era Wall → Dossier. Every finding needs proposed_solution. Register product in SENTRY registry if required.',
    spec: 'VERSION_ACCEPTANCE_GATES V1-B1. Foundation acceptance is not V1 done.',
    file_contains: ['collectibles', 'proposed_solution', 'layer-b'],
  }),

  // --- V2 Latent Liquidity + Want Graph (only after V1 Layer B) ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V2-WANT-GRAPH-001',
    target_file: 'services/collectibles/want-graph.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V1-LAYER-B-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createWantGraphService({ pool }) — Want/Watch/Love/Need-for-deck/Need-for-set persistent wants. No auto-list. ES module.',
    spec: 'MASTER_BLUEPRINT V2 Want Graph.',
    expected_exports: ['createWantGraphService'],
    file_contains: ['createWantGraphService', 'want', 'watch', 'need-for'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V2-INVISIBLE-LISTING-001',
    target_file: 'services/collectibles/invisible-listing.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V2-WANT-GRAPH-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createInvisibleListingService({ pool }) — latent liquidity from liquidity_preferences; Quiet Mode; never auto-list without permission. ES module.',
    spec: 'MASTER_BLUEPRINT V2 Invisible Listing.',
    expected_exports: ['createInvisibleListingService'],
    file_contains: ['createInvisibleListingService', 'invisible', 'liquidity', 'Quiet'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V2-OFFER-INBOX-001',
    target_file: 'services/collectibles/offer-inbox.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V2-INVISIBLE-LISTING-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createOfferInboxService({ pool }) — standing offers, quality score, spam controls. Matching engine may be minimal; no payments. ES module.',
    spec: 'MASTER_BLUEPRINT V2 offer inbox + trust foundation.',
    expected_exports: ['createOfferInboxService'],
    file_contains: ['createOfferInboxService', 'offer', 'quality'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V2-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v2-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V2-OFFER-INBOX-001'],
    task: 'node:test reachability for want-graph + invisible-listing + offer-inbox. Assert live imports/calls.',
    spec: 'VERSION_ACCEPTANCE_GATES V2 — collector can receive offer without active listing (structure).',
    file_contains: ['createWantGraphService', 'createInvisibleListingService', 'createOfferInboxService'],
  }),

  // --- V3 Protected Exchange ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V3-TRANSACTION-001',
    target_file: 'services/collectibles/transaction-service.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V2-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createTransactionService({ pool }) — buy/sell/trade state machine; object+cash balancing stubs. Transaction state SEPARATE from payment provider. Do NOT hold customer funds. ES module.',
    spec: 'MASTER_BLUEPRINT V3 Protected Exchange hard law.',
    expected_exports: ['createTransactionService'],
    file_contains: ['createTransactionService', 'payment_provider', 'do not hold'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V3-PAYMENT-ADAPTER-001',
    target_file: 'services/collectibles/adapters/payment-adapter.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V3-TRANSACTION-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createPaymentAdapterRegistry() — third-party held-funds abstraction only. Fail-closed if no provider. ES module.',
    spec: 'EXTERNAL_ADAPTERS payments; never invent in-house custody of funds.',
    expected_exports: ['createPaymentAdapterRegistry'],
    file_contains: ['createPaymentAdapterRegistry', 'held-funds', 'fail-closed'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V3-SHIPPING-001',
    target_file: 'services/collectibles/shipping-tracking.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V3-TRANSACTION-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createShippingTrackingService({ pool }) — tracking + inspection window stubs behind carrier adapters. ES module.',
    spec: 'MASTER_BLUEPRINT V3 shipping/tracking.',
    expected_exports: ['createShippingTrackingService'],
    file_contains: ['createShippingTrackingService', 'tracking', 'inspection'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V3-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v3-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V3-PAYMENT-ADAPTER-001', 'COLLECTIBLES-V3-SHIPPING-001'],
    task: 'node:test reachability for transaction + payment adapter + shipping. Assert no fund-holding paths.',
    spec: 'VERSION_ACCEPTANCE_GATES V3 structure.',
    file_contains: ['createTransactionService', 'createPaymentAdapterRegistry', 'createShippingTrackingService'],
  }),

  // --- V4 Intelligent Commerce ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V4-SELL-AGENT-001',
    target_file: 'services/collectibles/sell-agent.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V3-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createSellAgent({ pool }) — one-motion sell; net proceeds strategies fast/balanced/max-net; regret warnings for sentimental tags. ES module.',
    spec: 'MASTER_BLUEPRINT V4 Intelligent Commerce.',
    expected_exports: ['createSellAgent'],
    file_contains: ['createSellAgent', 'net proceeds', 'sentimental'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V4-OPPORTUNITY-001',
    target_file: 'services/collectibles/opportunity-engine.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V4-SELL-AGENT-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createOpportunityEngine({ pool }) — set/run completion + least-cost path stubs. ES module.',
    spec: 'MASTER_BLUEPRINT V4 opportunity / completion economics.',
    expected_exports: ['createOpportunityEngine'],
    file_contains: ['createOpportunityEngine', 'completion', 'least-cost'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V4-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v4-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V4-OPPORTUNITY-001'],
    task: 'node:test reachability for sell-agent + opportunity-engine.',
    spec: 'VERSION_ACCEPTANCE_GATES V4 structure.',
    file_contains: ['createSellAgent', 'createOpportunityEngine'],
  }),

  // --- V5 Local Collector Commerce Network ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V5-PARTNER-REGISTRY-001',
    target_file: 'services/collectibles/partner-capability-registry.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V4-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createPartnerCapabilityRegistry({ pool }) — partner-store accounts + capabilities. Sponsored placement MUST be labeled distinct from best recommendation. ES module.',
    spec: 'MASTER_BLUEPRINT V5 + PARTNER_MODEL.',
    expected_exports: ['createPartnerCapabilityRegistry'],
    file_contains: ['createPartnerCapabilityRegistry', 'sponsored', 'capability'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V5-LOCAL-DISCOVERY-001',
    target_file: 'services/collectibles/local-discovery.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V5-PARTNER-REGISTRY-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createLocalDiscoveryService({ pool }) — city/local inventory + event calendar stubs. ES module.',
    spec: 'MASTER_BLUEPRINT V5 local discovery / events.',
    expected_exports: ['createLocalDiscoveryService'],
    file_contains: ['createLocalDiscoveryService', 'local', 'event'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V5-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v5-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V5-LOCAL-DISCOVERY-001'],
    task: 'node:test reachability for partner registry + local discovery.',
    spec: 'VERSION_ACCEPTANCE_GATES V5 structure.',
    file_contains: ['createPartnerCapabilityRegistry', 'createLocalDiscoveryService'],
  }),

  // --- V6 Living Vault + Reveal ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V6-CUSTODY-001',
    target_file: 'services/collectibles/custody-workflow.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V5-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createCustodyWorkflow({ pool }) — owner vs possessor vs custodian vs location; check-in/out. Insurance marketing remain legal-gated comments only. ES module.',
    spec: 'MASTER_BLUEPRINT V6 Living Vault custody.',
    expected_exports: ['createCustodyWorkflow'],
    file_contains: ['createCustodyWorkflow', 'custodian', 'check-in'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V6-REVEAL-STUDIO-001',
    target_file: 'services/collectibles/reveal-studio.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V6-CUSTODY-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createRevealStudio({ pool }) — reveal provenance + privacy filtering stubs; claim/revoke/takedown. ES module.',
    spec: 'MASTER_BLUEPRINT V6 Reveal Network.',
    expected_exports: ['createRevealStudio'],
    file_contains: ['createRevealStudio', 'reveal', 'privacy'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V6-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v6-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V6-REVEAL-STUDIO-001'],
    task: 'node:test reachability for custody + reveal.',
    spec: 'VERSION_ACCEPTANCE_GATES V6 structure.',
    file_contains: ['createCustodyWorkflow', 'createRevealStudio'],
  }),

  // --- V7 Arena (IP fail-closed; no third-party game adapters) ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V7-TABLETOP-RUNTIME-001',
    target_file: 'services/collectibles/tabletop-runtime.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V6-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createTabletopRuntime({ pool }) — publisher-independent primitives + rules-adapter INTERFACE only. Do NOT ship third-party game adapters. IP gate fail-closed. play_entitlement separate from IP permission. ES module.',
    spec: 'MASTER_BLUEPRINT V7 + LEGAL_IP gates.',
    expected_exports: ['createTabletopRuntime'],
    file_contains: ['createTabletopRuntime', 'IP', 'fail-closed', 'play_entitlement'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V7-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v7-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V7-TABLETOP-RUNTIME-001'],
    task: 'node:test: runtime exports; assert no third-party adapter modules shipped.',
    spec: 'VERSION_ACCEPTANCE_GATES V7 structure (lawful test/original game only later).',
    file_contains: ['createTabletopRuntime', 'fail-closed'],
  }),

  // --- V8 Competition + Media ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V8-TOURNAMENT-001',
    target_file: 'services/collectibles/tournament-engine.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V7-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createTournamentEngine({ pool }) — registrations/brackets/standings stubs; prize framework behind legal gate comments. ES module.',
    spec: 'MASTER_BLUEPRINT V8.',
    expected_exports: ['createTournamentEngine'],
    file_contains: ['createTournamentEngine', 'bracket', 'standings'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V8-MEDIA-PIPELINE-001',
    target_file: 'services/collectibles/events-media-pipeline.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V8-TOURNAMENT-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createEventsMediaPipeline({ pool }) — events-to-content with explicit media consent. ES module.',
    spec: 'MASTER_BLUEPRINT V8 media consent/privacy.',
    expected_exports: ['createEventsMediaPipeline'],
    file_contains: ['createEventsMediaPipeline', 'consent', 'media'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V8-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v8-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V8-MEDIA-PIPELINE-001'],
    task: 'node:test reachability for tournament + media pipeline.',
    spec: 'VERSION_ACCEPTANCE_GATES V8 structure.',
    file_contains: ['createTournamentEngine', 'createEventsMediaPipeline'],
  }),

  // --- V9 High-Value Asset Services (partner referral; no direct lending) ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V9-PROVENANCE-001',
    target_file: 'services/collectibles/provenance-graph.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V8-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createProvenanceGraph({ pool }) — proof/provenance packaging for insurers/authenticators. Do NOT implement Teloa direct lending. ES module.',
    spec: 'MASTER_BLUEPRINT V9 hard law — no direct lending.',
    expected_exports: ['createProvenanceGraph'],
    file_contains: ['createProvenanceGraph', 'provenance', 'no direct lending'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V9-PARTNER-ROUTING-001',
    target_file: 'services/collectibles/high-value-partner-routing.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V9-PROVENANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createHighValuePartnerRouting({ pool }) — grading/auth/insurance/financing partner registry referrals only. ES module.',
    spec: 'MASTER_BLUEPRINT V9 partner routing.',
    expected_exports: ['createHighValuePartnerRouting'],
    file_contains: ['createHighValuePartnerRouting', 'referral', 'grading'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V9-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v9-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V9-PARTNER-ROUTING-001'],
    task: 'node:test reachability; assert no direct-lending export.',
    spec: 'VERSION_ACCEPTANCE_GATES V9 structure.',
    file_contains: ['createProvenanceGraph', 'createHighValuePartnerRouting'],
  }),

  // --- V10 Universal Collectibles Operating Network ---
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V10-CATEGORY-PACKS-001',
    target_file: 'services/collectibles/category-pack-registry.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V9-ACCEPTANCE-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createCategoryPackRegistry() — packs beyond TCG (sports/comics/coins/…) atop universal Twin; adapter certification status. Do not alter ownership/transaction/trust semantics. ES module.',
    spec: 'MASTER_BLUEPRINT V10 category packs + certification.',
    expected_exports: ['createCategoryPackRegistry'],
    file_contains: ['createCategoryPackRegistry', 'certification', 'category pack'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V10-UNIVERSAL-GRAPH-001',
    target_file: 'services/collectibles/universal-desire-graph.js',
    sandbox_boundary: 'services/collectibles/**',
    depends_on: ['COLLECTIBLES-V10-CATEGORY-PACKS-001'],
    task: 'JSDoc @ssot docs/products/collectibles/PRODUCT_HOME.md. Export createUniversalDesireGraph({ pool }) — cross-category Want/ownership/desire graph generalization. ES module.',
    spec: 'MASTER_BLUEPRINT V10 universal Want/ownership/desire graph.',
    expected_exports: ['createUniversalDesireGraph'],
    file_contains: ['createUniversalDesireGraph', 'cross-category', 'desire'],
  }),
  collectiblesPrintStep({
    id: 'COLLECTIBLES-V10-ACCEPTANCE-001',
    target_file: 'tests/collectibles-v10-acceptance.test.js',
    sandbox_boundary: 'tests/**',
    depends_on: ['COLLECTIBLES-V10-UNIVERSAL-GRAPH-001'],
    task: 'node:test reachability for category packs + universal desire graph. Assert Twin identity invariant preserved.',
    spec: 'VERSION_ACCEPTANCE_GATES V10 structure — new category via pack without rewriting ownership/tx/trust.',
    file_contains: ['createCategoryPackRegistry', 'createUniversalDesireGraph'],
  }),
]);

export function isOverlayPrintSliceId(id) {
  return OVERLAY_PRINT_SLICE_ID.test(String(id || ''));
}

export function isCollectiblesPrintSlice(step) {
  return COLLECTIBLES_PRINT_SLICE_ID.test(String(step?.id || ''))
    && COLLECTIBLES_PRINT_SOURCE.test(String(step?.source || ''));
}

export function isAuthorizedQueueSlice(step) {
  return isOverlayPrintSliceId(step?.id) || isCollectiblesPrintSlice(step);
}

function isOpen(step) {
  const status = String(step?.status || '');
  if (status === 'done' || status === 'skipped') return false;
  if (String(step?.skip_reason || '').startsWith('off_print')) return false;
  return true;
}

export function overlayPrintStillOpen(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  if (steps.some((s) => isOverlayPrintSliceId(s.id) && isOpen(s))) return true;
  return nextSealedOverlaySlice(queue) != null;
}

/**
 * Idle is illegal while any Collectibles sealed slice remains, unless the
 * lane was explicitly reassigned (FACTORY_3_REASSIGNED=1 or factory-3 owns:[]).
 */
export function collectiblesLaneReassigned() {
  if (process.env.FACTORY_3_REASSIGNED === '1') return true;
  if (process.env.COLLECTIBLES_LANE_REASSIGNED === '1') return true;
  return false;
}

/** Collectibles print still has open work or an unenrolled sealed slice (V1–V10). */
export function collectiblesPrintStillOpen(queue) {
  if (collectiblesLaneReassigned()) return false;
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  if (steps.some((s) => isCollectiblesPrintSlice(s) && isOpen(s))) return true;
  return nextSealedCollectiblesSlice(queue) != null;
}

function nextSealedFromSequence(queue, sequence) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  const doneIds = new Set(
    steps
      .filter((s) => String(s.status || '').toLowerCase() === 'done')
      .map((s) => s.id),
  );
  for (const slice of sequence) {
    if (byId.has(slice.id)) continue;
    const deps = Array.isArray(slice.depends_on) ? slice.depends_on : [];
    if (!deps.every((d) => doneIds.has(d))) continue;
    return slice;
  }
  return null;
}

/**
 * Next sealed slice that is not yet on the queue and whose depends_on are done.
 * Open slices owned by another factory do NOT block enrollment — factory-1 and
 * factory-2 must manufacture overlay in parallel (founder mandatory 2026-08-13).
 */
export function nextSealedOverlaySlice(queue) {
  return nextSealedFromSequence(queue, OVERLAY_PRINT_SEQUENCE);
}

export function nextSealedCollectiblesSlice(queue) {
  return nextSealedFromSequence(queue, COLLECTIBLES_PRINT_SEQUENCE);
}

/** Enroll the next ready sealed slice (one per call; open peers do not block). */
export function enrollNextOverlayPrintSlice(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  const next = nextSealedOverlaySlice(queue);
  if (!next || queue.steps.some((s) => s.id === next.id)) return null;
  queue.steps.push({ ...next });
  return next.id;
}

export function enrollNextCollectiblesPrintSlice(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  const next = nextSealedCollectiblesSlice(queue);
  if (!next || queue.steps.some((s) => s.id === next.id)) return null;
  queue.steps.push({ ...next });
  return next.id;
}

/**
 * Heal Collectibles steps blocked on missing PRODUCT-COLLECTIBLES twin — cite
 * the one-queue overlay twin (same as foundation) and return to pending.
 */
export function healCollectiblesBlueprintAuthority(queue) {
  const healed = [];
  for (const step of queue?.steps || []) {
    if (!COLLECTIBLES_PRINT_SLICE_ID.test(String(step?.id || ''))) continue;
    const err = String(step.last_error || '');
    const badTwin = /PRODUCT-COLLECTIBLES/i.test(String(step.blueprint_id || ''))
      || /NOT_ON_BLUEPRINT|blueprint_id_not_found|blueprint_step_id_not_on_twin/i.test(err);
    if (!badTwin && String(step.status || '').toLowerCase() !== 'blocked') continue;
    if (!badTwin) continue;
    step.blueprint_id = 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1';
    step.mission_id = 'PRODUCT-universal-overlay';
    step.blueprint_step_id = step.id;
    step.product_id = step.product_id || 'collectibles';
    if (!step.source) step.source = COLLECTIBLES_SOURCE;
    step.status = 'pending';
    step.last_error = null;
    step.demoted = false;
    step.heal_unblocked = true;
    step.heal_reason = 'collectibles_cite_one_queue_twin';
    healed.push(step.id);
  }
  return healed;
}

/**
 * Ensure at least one Collectibles print slice is open while V1–V10 remains.
 * Founder: never idle if anything is needed — through V10 unless reassigned.
 */
export function ensureCollectiblesPrintEnrolled(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  if (collectiblesLaneReassigned()) return null;
  healCollectiblesBlueprintAuthority(queue);
  const open = queue.steps.some((s) => isCollectiblesPrintSlice(s) && isOpen(s));
  if (open) return null;
  return enrollNextCollectiblesPrintSlice(queue);
}

/** Last sealed Collectibles slice id (V10 acceptance) — sequence complete only after this is DONE. */
export function collectiblesPrintTerminalId() {
  const last = COLLECTIBLES_PRINT_SEQUENCE[COLLECTIBLES_PRINT_SEQUENCE.length - 1];
  return last?.id || null;
}

export function assertOverlayQueuePrintLaw(queue) {
  if (!queue || queue.product_id !== 'universal-overlay' || !Array.isArray(queue.steps)) return;
  const illegal = queue.steps.filter((s) => isOpen(s) && !isAuthorizedQueueSlice(s));
  if (illegal.length) {
    throw new Error(
      `${PRINT_INVENTION_FORBIDDEN}: open steps are not sealed print slices: ${illegal.map((s) => s.id).join(', ')}. This is supposed to break.`,
    );
  }
}
