/**
 * SYNOPSIS: LifeRE unified command center — BoldTrail + Performance + LifeOS crosscheck.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { enrichDailyCommandCenter } from './lifere-boldtrail-bridge.js';
import { createLifeREOSService } from './lifere-os-v1.js';
import { createLifeREPerformanceTwin } from './lifere-performance-twin.js';
import { createLifeRELifeOSCrosscheck } from './lifere-lifeos-crosscheck.js';
import { createLifeREOpportunityOS } from './lifere-opportunity-os.js';

export function createLifeRECommandCenter({ pool = null, logger = console } = {}) {
  const service = createLifeREOSService();
  const performance = createLifeREPerformanceTwin({ pool });
  const crosscheck = createLifeRELifeOSCrosscheck({ pool });
  const opportunity = createLifeREOpportunityOS({ pool });

  async function buildDailyCommandCenter(body = {}) {
    const userId = body.user_id || body.agent || 'adam';
    const enriched = await enrichDailyCommandCenter(body);
    const base = service.dailyCommandCenter(enriched);

    let perfSnapshot = null;
    let bottleneck = null;
    try {
      perfSnapshot = await performance.buildSnapshot({
        tenantId: body.tenant_id || 'default',
        userId,
        windowDays: Number(body.window_days) || 30,
        goalGci: Number(body.goal_gci) || 30000,
      });
      const funnel = perfSnapshot.funnel || await performance.computeFunnel({ userId });
      const rates = performance.computeConversionRates(funnel);
      bottleneck = performance.findBottleneck(rates, funnel);
    } catch (err) {
      logger.warn?.('[lifere-command-center] performance skip:', err.message);
    }

    let nextHour = perfSnapshot?.next_hour_recommendation;
    if (bottleneck) {
      nextHour = performance.recommendNextHour({
        bottleneck,
        boldtrailTop3: enriched.boldtrail?.top3?.map((t) => t.contact || { name: t.task }) || [],
      });
    }

    const lifeCheck = await crosscheck.crosscheckBeforeRecommend({
      userId,
      businessRecommendation: nextHour,
    });

    let opSignals = { signals: [] };
    try {
      opSignals = await opportunity.rankOpportunities({ userId });
    } catch {
      /* optional */
    }

    return {
      ...base,
      user_id: userId,
      performance: perfSnapshot
        ? {
            bottleneck_stage: perfSnapshot.bottleneck_stage,
            activities_to_goal: perfSnapshot.activities_to_goal,
            label: perfSnapshot.label,
          }
        : null,
      chair: {
        next_action: lifeCheck.recommendation || nextHour,
        tradeoff_prose: lifeCheck.tradeoff_prose,
        life_optimal_alternate: lifeCheck.life_optimal_alternate,
        closest_to_30k: perfSnapshot?.activities_to_goal || null,
        bottleneck: bottleneck || null,
        opportunity_top: opSignals.signals?.[0] || null,
      },
      label: perfSnapshot?.label || 'THINK',
    };
  }

  return { buildDailyCommandCenter };
}
