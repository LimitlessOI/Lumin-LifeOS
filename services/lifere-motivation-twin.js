/**
 * SYNOPSIS: LifeRE motivation twin — outcome-linked milestones (no dark patterns).
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';

const DEFAULT_MILESTONES = [
  { id: 'first_activity_log', label: 'Logged first activity day', metric: 'activity_log', threshold: 1 },
  { id: 'first_approval_send', label: 'First approved client send', metric: 'comms_sent', threshold: 1 },
  { id: 'first_showing', label: 'First showing scheduled', metric: 'showings', threshold: 1 },
  { id: 'pipeline_10', label: '10 conversations in 30 days', metric: 'conversations', threshold: 10 },
  { id: 'alpha_cycle', label: 'Completed Alpha daily cycle', metric: 'alpha_cycles', threshold: 1 },
];

export function createLifeREMotivationTwin({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  async function getMotivationState({ tenantId = 'default', userId }) {
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'motivation' })
      || { schema: 'lifere_motivation_twin_v1', milestones: {}, streaks: {} };
    const earned = DEFAULT_MILESTONES.filter((m) => twin.milestones?.[m.id]?.earned_at);
    return {
      ok: true,
      milestones: DEFAULT_MILESTONES.map((m) => ({
        ...m,
        earned: !!twin.milestones?.[m.id]?.earned_at,
        earned_at: twin.milestones?.[m.id]?.earned_at || null,
      })),
      earned_count: earned.length,
      activity_streak_days: twin.streaks?.activity_days || 0,
      label: 'THINK',
    };
  }

  async function recordMilestone({ tenantId = 'default', userId, milestoneId, evidence = {} }) {
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'motivation' })
      || { schema: 'lifere_motivation_twin_v1', milestones: {}, streaks: {} };
    twin.milestones = twin.milestones || {};
    if (!twin.milestones[milestoneId]) {
      twin.milestones[milestoneId] = {
        earned_at: new Date().toISOString(),
        evidence,
      };
    }
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'motivation',
      payload: twin,
      receiptMeta: { milestone_id: milestoneId },
    });
    return { ok: true, milestone_id: milestoneId, newly_earned: true };
  }

  async function bumpActivityStreak({ tenantId = 'default', userId }) {
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'motivation' })
      || { schema: 'lifere_motivation_twin_v1', milestones: {}, streaks: {} };
    twin.streaks = twin.streaks || {};
    twin.streaks.activity_days = (twin.streaks.activity_days || 0) + 1;
    twin.streaks.last_activity_at = new Date().toISOString();
    await twinStore.writeTwin({ tenantId, userId, twinKey: 'motivation', payload: twin });
    if (twin.streaks.activity_days >= 1) {
      await recordMilestone({ tenantId, userId, milestoneId: 'first_activity_log', evidence: { streak: twin.streaks.activity_days } });
    }
    return { ok: true, streak_days: twin.streaks.activity_days };
  }

  return { getMotivationState, recordMilestone, bumpActivityStreak, DEFAULT_MILESTONES };
}
