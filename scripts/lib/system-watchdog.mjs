/**
 * SYNOPSIS: In-system watchdog decisions. The actor doing the work is not
 * the only thing allowed to notice it stopped. Pure functions — production
 * prod-health-watchdog and the local factory-2 lane both call this.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const GOVERNED_STALE_MS = 10 * 60 * 1000;
export const FACTORY2_STALE_MS = 3 * 60 * 1000;

/**
 * @param {object} input
 * @param {number} [input.now]
 * @param {{ enabled?: boolean, lastTickAt?: string, hardHalt?: boolean }} [input.governed]
 * @param {{ tickAt?: string, ok?: boolean, taloaRunning?: boolean } | null} [input.factory2]
 * @param {Array<{ id?: string, last_error?: string, target_file?: string, status?: string }>} [input.overlayNativeBlocks]
 */
export function evaluateSystemWatchdog({
  now = Date.now(),
  governed = null,
  factory2 = null,
  overlayNativeBlocks = [],
} = {}) {
  const findings = [];

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
