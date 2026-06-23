/**
 * SYNOPSIS: LifeRE LifeOS crosscheck — life-optimal vs business-optimal tradeoffs.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';

export function createLifeRELifeOSCrosscheck({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  async function fetchCommitmentLoad(userId) {
    if (!pool) return { open_count: 0, overloaded: false };
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM lifeos_commitments WHERE user_id = $1 AND status = 'open'`,
        [userId]
      );
      const open_count = rows[0]?.c ?? 0;
      return { open_count, overloaded: open_count > 12 };
    } catch {
      return { open_count: 0, overloaded: false };
    }
  }

  async function crosscheckBeforeRecommend({ tenantId = 'default', userId, businessRecommendation }) {
    const goal = twinStore.readTwin({ tenantId, userId, twinKey: 'goal' }) || {
      weights: { income: 0.35, family: 0.25, freedom: 0.2, health: 0.2 },
    };
    const marriage = twinStore.readTwin({ tenantId, userId: 'founder/household/marriage', twinKey: 'founder/household/marriage' })
      || twinStore.readTwin({ tenantId, userId, twinKey: 'founder/household/marriage' });
    const commitments = await fetchCommitmentLoad(userId);

    const familyWeight = goal.weights?.family ?? 0.25;
    const conflict =
      commitments.overloaded ||
      (businessRecommendation?.action === 'prospecting_block' && familyWeight > 0.3 && marriage?.tradeoff_rules?.length);

    if (!conflict) {
      return {
        ok: true,
        recommendation: businessRecommendation,
        tradeoff_prose: null,
        life_optimal_alternate: null,
      };
    }

    return {
      ok: true,
      recommendation: businessRecommendation,
      tradeoff_prose: 'Calendar/commitment load is high. Business-optimal action may conflict with family or health goals.',
      life_optimal_alternate: {
        action: 'protect_calendar_block',
        reason: 'LifeOS cross-check: prioritize recovery or family block before extra prospecting.',
      },
      label: 'THINK',
    };
  }

  return { crosscheckBeforeRecommend, fetchCommitmentLoad };
}
