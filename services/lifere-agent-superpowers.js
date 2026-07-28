/**
 * SYNOPSIS: LifeRE agent superpowers — real strength/interest profile from
 * actual drill data, next-module recommendation.
 * Founder, direct: "find out what their superpowers are and direct them to
 * do the things they like to do." Confirmed missing this session -- no code
 * anywhere discovered an agent's strengths/preferences and routed them
 * toward matching work. Built here on data that already exists: every real
 * drill completion (services/lifere-skill-coaching.js) writes a per-module
 * score (measured performance) and practice_hours (voluntary time invested)
 * into the agent's real "skill" twin. This is genuine behavioral evidence,
 * not a personality quiz or an invented AI judgment call.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { loadCoachingModules } from './lifere-skill-coaching.js';

const MASTERY_SCORE_THRESHOLD = 90;
const TOP_N = 3;

export function createLifeREAgentSuperpowers({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  /**
   * Real profile from real drill history. No fabricated fields: strengths
   * come from measured score, interests come from measured practice_hours.
   * has_data is honest -- an agent with zero drills gets an explicit
   * "no data yet" state, never a guessed profile.
   */
  function getAgentProfile({ tenantId = 'default', userId, requesterId } = {}) {
    const skill = twinStore.readTwin({ tenantId, userId, twinKey: 'skill', requesterId }) || {};
    const scores = skill.scores || {};
    const practiceHours = skill.practice_hours || {};
    const modules = loadCoachingModules().modules;

    const entries = modules.map((m) => ({
      module_id: m.id,
      label: m.label,
      score: Object.prototype.hasOwnProperty.call(scores, m.id) ? Number(scores[m.id]) : null,
      practice_hours: Number(practiceHours[m.id] || 0),
    }));
    const attempted = entries.filter((e) => e.score !== null || e.practice_hours > 0);
    const hasData = attempted.length > 0;

    const strengths = attempted
      .filter((e) => e.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);
    const interests = attempted
      .filter((e) => e.practice_hours > 0)
      .sort((a, b) => b.practice_hours - a.practice_hours)
      .slice(0, TOP_N);
    const totalHours = attempted.reduce((sum, e) => sum + e.practice_hours, 0);

    return {
      ok: true,
      user_id: userId,
      has_data: hasData,
      modules_attempted: attempted.length,
      modules_total: modules.length,
      total_practice_hours: Number(totalHours.toFixed(2)),
      strengths,
      interests,
      last_drill: skill.last_drill || null,
    };
  }

  /**
   * Recommend the next module to focus on -- grounded, explicit, and
   * honest about confidence. Logic (no invented judgment, only the
   * profile's own real numbers):
   *   1. No drill history at all -> default to the foundational module,
   *      labeled low confidence and the exact reason (cold start, not a
   *      guessed preference).
   *   2. Their highest-interest module (most voluntary time invested)
   *      is not yet mastered -> recommend doubling down there: they
   *      clearly choose to spend time on it, and there's real room to
   *      still improve. This is literally "direct them to what they like
   *      to do."
   *   3. Their highest-interest module IS mastered (score >= threshold)
   *      -> recommend the highest-interest module among ones they have
   *      NOT yet mastered, so growth follows genuine engagement, not a
   *      forced generic curriculum order.
   *   4. No unmastered attempted module exists (rare, means broad mastery)
   *      -> recommend the first module they have never tried, so real
   *      coverage keeps expanding once existing interests are exhausted.
   */
  function recommendNextModule({ tenantId = 'default', userId, requesterId } = {}) {
    const profile = getAgentProfile({ tenantId, userId, requesterId });
    const modules = loadCoachingModules().modules;

    if (!profile.has_data) {
      const fallback = modules.find((m) => m.id === 'new_agents') || modules[0];
      return {
        ok: true,
        user_id: userId,
        recommendation: fallback,
        reason: 'no_practice_data_yet — defaulting to fundamentals, not a guessed preference',
        confidence: 'low',
      };
    }

    const byInterestDesc = [...profile.interests];
    const topUnmastered = byInterestDesc.find((e) => e.score === null || e.score < MASTERY_SCORE_THRESHOLD);
    if (topUnmastered) {
      const mod = modules.find((m) => m.id === topUnmastered.module_id);
      return {
        ok: true,
        user_id: userId,
        recommendation: mod,
        reason: `highest real engagement (${topUnmastered.practice_hours}h practiced) and not yet mastered (score ${topUnmastered.score ?? 'unscored'})`,
        confidence: 'high',
      };
    }

    const attemptedIds = new Set(profile.strengths.concat(profile.interests).map((e) => e.module_id));
    const neverTried = modules.find((m) => !attemptedIds.has(m.id));
    if (neverTried) {
      return {
        ok: true,
        user_id: userId,
        recommendation: neverTried,
        reason: 'top interests already mastered — expanding into a module never attempted',
        confidence: 'medium',
      };
    }

    return {
      ok: true,
      user_id: userId,
      recommendation: null,
      reason: 'all tracked modules attempted and top interests mastered — no further real recommendation to make',
      confidence: 'n/a',
    };
  }

  return { getAgentProfile, recommendNextModule };
}
