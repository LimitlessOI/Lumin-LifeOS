/**
 * SYNOPSIS: In-system watchdog decisions. The actor doing the work is not
 * the only thing allowed to notice it stopped. Pure functions — three
 * consumers of the same signal: production prod-health-watchdog (SMS/call),
 * the local factory-2 lane (relaunch Taloa), and SENTRY
 * (`checkSystemStillWorking` in sentry-system-audit.js) which writes the
 * finding into the Chair → Architect repair pipe and never stops.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { collectiblesPrintStillOpen } from '../../config/overlay-print-sequence.js';
import { hasSealedPrintSequence } from '../../services/architect-print-seal.js';

export const GOVERNED_STALE_MS = 10 * 60 * 1000;
export const FACTORY2_STALE_MS = 3 * 60 * 1000;

/**
 * @param {object} input
 * @param {number} [input.now]
 * @param {{ enabled?: boolean, lastTickAt?: string, hardHalt?: boolean }} [input.governed]
 * @param {{ tickAt?: string, ok?: boolean, taloaRunning?: boolean } | null} [input.factory2]
 * @param {{ ok?: boolean, status?: number, db?: string, readyStatus?: number, error?: string } | null} [input.tip]
 * @param {Array<{ id?: string, last_error?: string, target_file?: string, status?: string }>} [input.overlayNativeBlocks]
 * @param {{ ok?: boolean, shipped?: number, products?: Array, reason?: string, error?: string } | null} [input.laneShip]
 * @param {{ steps?: Array } | null} [input.queue]
 * @param {string | null} [input.factoryId]
 * @param {Array<{ id?: string, target_file?: string, reason?: string, missing?: string[] }>} [input.diskChecks]
 *   Local on-disk file_contains checks (stepSatisfiedOnDisk), already computed
 *   this tick — used to turn a generic queue_ship_thrash finding into the exact
 *   needle + file that's missing, instead of advisory text nobody can act on.
 */
export function evaluateSystemWatchdog({
  now = Date.now(),
  governed = null,
  factory2 = null,
  tip = null,
  overlayNativeBlocks = [],
  laneShip = null,
  queue = null,
  factoryId = null,
  diskChecks = [],
} = {}) {
  const findings = [];

  if (tip && tip.ok === false) {
    const db = String(tip.db || '');
    const ready = Number(tip.readyStatus || 0);
    const health = Number(tip.status || 0);
    findings.push({
      id: 'tip_manufacturing_down',
      proposed_solution:
        db === 'error' || health === 503
          ? 'Production tip is up but database probe failed (Neon itself may still be healthy). In Railway vault for lumin-web-production: verify DATABASE_URL / DATABASE_PUBLIC_URL, restart the founder_builder service, then confirm GET /api/v1/lifeos/builder/ready returns 200 with deploy_commit_sha. Factory lanes cannot ship while tip routes 404.'
          : ready === 404 || health === 404
            ? 'Production tip is not serving BuilderOS routes (ready/factory 404). Redeploy Railway from origin/main tip SHA and confirm /builder/ready. Local factory-2/3 keep watching; they cannot manufacture without tip.'
            : `Production tip probe failed (${tip.error || `health=${health} ready=${ready}`}). Restore tip, then factory-3 Collectibles + factory-1 overlay ships resume.`,
    });
  }

  if (governed?.hardHalt) {
    findings.push({
      id: 'governed_hard_halt',
      proposed_solution: 'FOUNDER_STOP or PAUSE_AUTONOMY is on. Do not invent a second loop; lift the named halt if the founder asked to keep building.',
    });
  } else if (governed?.enabled && governed.lastTickAt) {
    const age = now - Date.parse(governed.lastTickAt);
    if (Number.isFinite(age) && age > GOVERNED_STALE_MS) {
      findings.push({
        id: 'governed_loop_stale',
        proposed_solution: 'Governed shipping lastTick is older than 10m. The in-process watchdog in governed-autonomous-shipping-loop should reschedule; if this persists, Railway restart the founder_builder service.',
      });
    }
  }

  if (factory2) {
    if (factory2.taloaRunning === false) {
      findings.push({
        id: 'taloa_not_running',
        proposed_solution: 'open native/macos-overlay/build/Taloa.app from the factory-2 worktree (the lane runner already does this).',
      });
    }
    if (factory2.tickAt) {
      const age = now - Date.parse(factory2.tickAt);
      if (Number.isFinite(age) && age > FACTORY2_STALE_MS) {
        findings.push({
          id: 'factory2_tick_stale',
          proposed_solution: 'Relaunch LaunchAgent com.lumin.factory-2-lane (`npm run builderos:factory:lane:install`).',
        });
      }
    }
  }

  for (const step of overlayNativeBlocks || []) {
    const file = String(step.target_file || step.file || '');
    const err = String(step.last_error || '');
    if (!file.startsWith('native/')) continue;
    if (err !== 'NOT_ON_BLUEPRINT') continue;
    findings.push({
      id: `false_block:${step.id || file}`,
      proposed_solution: 'factory-1 shipped a factory-2 native file. Do not retry via ship-queue. Claim done if file_contains holds on HEAD.',
    });
  }

  // Lane ship / queue SENTRY thrash — fixer must see this (proven blind 2026-08-13).
  const shipErrors = [];
  for (const p of laneShip?.products || []) {
    if (p && p.ok === false && p.error) shipErrors.push(String(p.error));
  }
  if (laneShip?.error) shipErrors.push(String(laneShip.error));
  if (laneShip?.reason && /SENTRY|FORBIDDEN|codegen|already_running/i.test(String(laneShip.reason))) {
    shipErrors.push(String(laneShip.reason));
  }
  if (laneShip && laneShip.ok === false && /already_running/i.test(String(laneShip.reason || ''))) {
    findings.push({
      id: 'lane_ship_already_running',
      factory_id: factoryId || null,
      action: 'retry_ship_after_reclaim',
      proposed_solution:
        `Tip returned already_running for ${factoryId || 'lane'}. Tip reclaimStaleShipLock (default 90s) clears hung locks; lane retries once after short wait. Do not redeploy for a fresh lock.`,
    });
  }
  const sentryShip = shipErrors.find((e) => /SENTRY_FAILED|behavior_assertion|missing:/i.test(e));
  if (sentryShip) {
    findings.push({
      id: 'lane_sentry_failed',
      factory_id: factoryId || null,
      action: 'promote_sealed_exact_and_reship',
      proposed_solution:
        `Tip ship for ${factoryId || 'lane'} failed SENTRY: ${sentryShip.slice(0, 240)}. applyManufacturingSelfRepair promotes sealed exact twins to write_file_exact, then re-run POST /factory/ship-queue-and-commit with factory_id=${factoryId || 'factory-3'}.`,
    });
  }

  for (const step of queue?.steps || []) {
    const st = String(step.status || '').toLowerCase();
    const err = String(step.last_error || '');
    if (st !== 'blocked' && st !== 'pending') continue;
    if (!/SENTRY_FAILED|STEP_STATUS_FORBIDDEN/i.test(err)) continue;
    if (Number(step.attempts || 0) < 1 && !/SENTRY_FAILED/i.test(err)) continue;

    // If this is a static missing-literal-substring failure, the exact needle
    // and file were already computed locally this tick (stepSatisfiedOnDisk).
    // Re-shipping identical bytes can never pass that check — surface the
    // concrete needle + both candidate source files so the fix is one edit,
    // not a forensic search. Proven live 2026-08-13: a generic "align
    // behavior_assertions with SCHEMA" solution left this thrashing 40+ min.
    const diskCheck = diskChecks.find((c) => c && c.id === step.id && c.reason === 'missing_strings');
    let proposed_solution =
      `Step ${step.id} is thrashing (${err.slice(0, 160)}). applyManufacturingSelfRepair + revive, then re-ship. Do not Cursor GAP-FILL sealed twins.`;
    if (diskCheck && Array.isArray(diskCheck.missing) && diskCheck.missing.length) {
      const needles = diskCheck.missing.join(', ');
      const scriptPath = diskCheck.target_file || step.target_file || 'unknown target_file';
      const twinPath = `docs/products/universal-overlay/twins/steps/${step.id}.exact`;
      proposed_solution =
        `Step ${step.id} is missing literal SENTRY needle(s) [${needles}] from ${scriptPath}. `
        + `write_file_exact re-materializes from the sealed twin, so fix BOTH ${scriptPath} `
        + `AND ${twinPath} (if it exists) — re-shipping unchanged bytes will fail identically forever.`;
    }
    findings.push({
      id: `queue_ship_thrash:${step.id || 'unknown'}`,
      action: 'promote_sealed_exact_and_reship',
      proposed_solution,
    });
  }

  if (!hasSealedPrintSequence('collectibles')) {
    findings.push({
      id: 'architect_print_seal_missing_collectibles',
      action: 'architect_seal_print',
      proposed_solution:
        'Architect must seal Collectibles print: npm run builderos:architect:seal-print -- --product collectibles --from-amended-blueprint (reads docs/products/collectibles/AMENDED_BLUEPRINT.json → PRINT_SEQUENCE.json). Cursor must not hand-edit print slices in config — that SO-001 drift made manufacturing Cursor-dependent.',
    });
  }

  if (
    factoryId === 'factory-3'
    && laneShip
    && (
      /collectibles_print_still_open_idle_forbidden/i.test(String(laneShip.reason || ''))
      || (
        /no_shippable_steps/i.test(String(laneShip.reason || ''))
        && collectiblesPrintStillOpen(queue)
      )
    )
  ) {
    findings.push({
      id: 'factory3_idle_with_collectibles_work',
      factory_id: 'factory-3',
      action: 'enroll_collectibles_print_and_reship',
      proposed_solution:
        'factory-3 idle while Collectibles print still open. Load Architect-sealed docs/products/collectibles/PRINT_SEQUENCE.json via enrollNextCollectiblesPrintSlice; never treat foundation DONE as product complete; continue through V10 unless FACTORY_3_REASSIGNED=1. Re-ship factory_id=factory-3.',
    });
  }

  if (!hasSealedPrintSequence('collectibles')) {
    findings.push({
      id: 'architect_print_seal_missing_collectibles',
      action: 'architect_seal_print',
      proposed_solution:
        'Architect must seal Collectibles print: npm run builderos:architect:seal-print -- --product collectibles --from-amended-blueprint (reads docs/products/collectibles/AMENDED_BLUEPRINT.json → PRINT_SEQUENCE.json). Cursor must not hand-edit print slices in config — that SO-001 drift made manufacturing Cursor-dependent.',
    });
  }

  if (
    factoryId === 'factory-3'
    && laneShip
    && (
      /collectibles_print_still_open_idle_forbidden/i.test(String(laneShip.reason || ''))
      || (
        /no_shippable_steps/i.test(String(laneShip.reason || ''))
        && collectiblesPrintStillOpen(queue)
      )
    )
  ) {
    findings.push({
      id: 'factory3_idle_with_collectibles_work',
      factory_id: 'factory-3',
      action: 'enroll_collectibles_print_and_reship',
      proposed_solution:
        'factory-3 idle while Collectibles print still open. Load Architect-sealed docs/products/collectibles/PRINT_SEQUENCE.json via enrollNextCollectiblesPrintSlice; never treat foundation DONE as product complete; continue through V10 unless FACTORY_3_REASSIGNED=1. Re-ship factory_id=factory-3.',
    });
  }

  return {
    ok: findings.length === 0,
    findings,
    reasonKey: findings.length ? findings.map((f) => f.id).sort().join('|') : null,
  };
}

export function overlayNativeBlockedSteps(queue) {
  return (queue?.steps || []).filter((s) => {
    const file = String(s.target_file || s.file || '');
    if (!file.startsWith('native/')) return false;
    const st = String(s.status || '').toLowerCase();
    return st === 'blocked' && String(s.last_error || '') === 'NOT_ON_BLUEPRINT';
  });
}
