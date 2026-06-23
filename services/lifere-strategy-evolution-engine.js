/**
 * SYNOPSIS: LifeRE strategy evolution — update recommendation weights only.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeREPermissionTwin } from './lifere-permission-twin.js';

export function createLifeREStrategyEvolutionEngine() {
  const weights = { hook_weight: 1, script_weight: 1, follow_up_weight: 1 };

  async function updateWeights({ delta = {}, userId = 'adam' }) {
    const perm = createLifeREPermissionTwin();
    const { level } = await perm.getAutonomyLevel({ userId, actionType: 'learning_weight_update' });
    if (level < 4) {
      return { ok: false, reason: 'learning_weight_update requires autonomy level 4+' };
    }
    for (const [k, v] of Object.entries(delta)) {
      if (weights[k] != null) weights[k] = Math.max(0.1, Math.min(2, weights[k] + v));
    }
    return { ok: true, weights, label: 'THINK' };
  }

  function getWeights() {
    return { ok: true, weights };
  }

  return { updateWeights, getWeights };
}
