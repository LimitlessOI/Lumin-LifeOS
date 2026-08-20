/**
 * SYNOPSIS: Real composition root wiring all 8 "heart and soul" Taloa
 * components (§14a) plus the Fluid UI Composer (§8) into one ready-to-use
 * runtime instance. This is what a real route/caller imports — the concrete
 * fix for the finding that these 8 files existed but had no live caller
 * connecting them (confirmed 2026-08-19: only 1 of 8 had any route
 * reference, the other 7 were dead code).
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { createTaloaRuntimeStore } from './taloa-runtime-store.js';
import { createOverlayHostService } from './overlay-host-service.js';
import { createBodyAdapterService } from './body-adapter-service.js';
import { createPerceptionFusionService } from './perception-fusion-service.js';
import { createStrategyRouterService } from './strategy-router-service.js';
import { createCapsuleRuntimeService } from './capsule-runtime-service.js';
import { createVerificationService } from './verification-service.js';
import { createReceiptLedgerService } from './receipt-ledger-service.js';
import { createTaskOrchestratorService } from './task-orchestrator-service.js';
import { composeViewIntent } from './fluid-ui-composer.js';
import { createTaskAuthorizationEnvelope } from './task-authorization-envelope.js';
import { createTemplateReplayService } from './template-replay-service.js';

let singleton = null;

/**
 * @param {object} deps
 * @param {import('pg').Pool} [deps.pool] - real Postgres pool for
 *   task-authorization-envelope.js's real DB-backed authority checks; if
 *   omitted, StrategyRouter runs in its documented dev-mode fallback
 *   (logged, not silent) rather than throwing.
 * @param {object} [deps.logger]
 */
export function createTaloaRuntime({ pool = null, logger = console } = {}) {
  const store = createTaloaRuntimeStore();
  const receiptLedger = createReceiptLedgerService({ store, logger });
  const verificationService = createVerificationService({ store, logger, receiptLedger });
  const bodyAdapter = createBodyAdapterService({ store, logger, composeViewIntent });
  const overlayHost = createOverlayHostService({ store, logger });
  const perceptionFusion = createPerceptionFusionService({ store, logger });
  const capsuleRuntime = createCapsuleRuntimeService({ store, logger });

  const taskAuthorizationEnvelope = pool
    ? createTaskAuthorizationEnvelope({ pool, logger })
    : { verify: async () => { throw new Error('no pool configured — StrategyRouter will use its documented dev-mode fallback'); } };

  const strategyRouter = createStrategyRouterService({ store, logger, taskAuthorizationEnvelope });
  // template-replay-service.js is honest when pool lacks persistTemplate/loadTemplate
  // helpers (a real pg.Pool does not define these) -- isTemplateValid/replayTemplate
  // return { valid: false }/{ replayed: false } rather than throwing, so wiring it in
  // with the bare pool is safe today and picks up real replay once those helpers exist.
  const templateReplayService = createTemplateReplayService({ pool, logger });
  const taskOrchestrator = createTaskOrchestratorService({ store, logger, strategyRouter, bodyAdapter, verificationService, receiptLedger, templateReplayService });

  return {
    store, receiptLedger, verificationService, bodyAdapter, overlayHost,
    perceptionFusion, capsuleRuntime, strategyRouter, taskOrchestrator,
    taskAuthorizationEnvelope, composeViewIntent, templateReplayService,
  };
}

/** Process-wide singleton for real route callers — one shared store/state. */
export function getTaloaRuntime(deps) {
  if (!singleton) singleton = createTaloaRuntime(deps);
  return singleton;
}

export default createTaloaRuntime;
