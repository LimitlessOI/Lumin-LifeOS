/**
 * SYNOPSIS: LifeRE Chair aggregator — answers founder chair questions in one call.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeRECommandCenter } from './lifere-command-center.js';
import { createLifeREPerformanceTwin } from './lifere-performance-twin.js';
import { createLifeREMarketingModule } from './lifere-marketing-module.js';
import { createLifeREFollowUpOS } from './lifere-follow-up-os.js';
import { createLifeREScenarioEngine } from './lifere-scenario-engine.js';
import { createLifeRESkillCoaching } from './lifere-skill-coaching.js';
import { createLifeRERelationshipTwin } from './lifere-relationship-twin.js';

export function createLifeREChairService({ pool = null } = {}) {
  const commandCenter = createLifeRECommandCenter({ pool });
  const performance = createLifeREPerformanceTwin({ pool });
  const marketing = createLifeREMarketingModule({ pool });
  const followUp = createLifeREFollowUpOS({ pool });
  const scenario = createLifeREScenarioEngine({ pool });
  const coaching = createLifeRESkillCoaching({ pool });
  const relationship = createLifeRERelationshipTwin({ pool });

  async function answerChairBrief({ userId = 'adam', tenantId = 'default', goalGci = 30000 }) {
    const daily = await commandCenter.buildDailyCommandCenter({ user_id: userId, tenant_id: tenantId, goal_gci: goalGci });
    const funnel = await performance.computeFunnel({ tenantId, userId });
    const rates = performance.computeConversionRates(funnel);
    const bottleneck = performance.findBottleneck(rates, funnel);
    const queue = await followUp.prioritizeQueue({ userId });
    const calendar = await marketing.listCalendar({ tenantId, userId });
    const skillImpact = coaching.skillImpact({ baselineRate: 0.08, improvedRate: 0.12, goalGci });
    const future = await scenario.projectFuturePath({ userId, horizonDays: 90 });
    const edges = await relationship.listEdgesForUser({ tenantId, userId });
    const marriageEdge = edges.find((e) => e.type === 'marriage') || edges[0];

    const weakest = Object.entries(rates).sort((a, b) => a[1] - b[1])[0];

    return {
      ok: true,
      user_id: userId,
      what_should_i_do_next: daily.chair?.next_action,
      closest_to_30k: daily.chair?.closest_to_30k,
      bottleneck: bottleneck?.recommendation,
      weakest_conversion: weakest ? { stage: weakest[0], rate: weakest[1] } : null,
      conversations_needed: daily.chair?.closest_to_30k?.conversations_needed,
      skill_practice_fastest_lift: {
        module: 'objections',
        conversations_saved_if_8_to_12: skillImpact.conversations_saved,
      },
      content_next: calendar.rows?.[0] || { suggestion: 'market_update_60', label: 'THINK' },
      leads_need_attention: queue.slice(0, 5),
      clients_need_communication: queue.filter((q) => q.status_label === 'client').slice(0, 3),
      busywork_for_lumin: [
        'Draft follow-ups for approval queue',
        'Log activity to Performance Twin',
        'Research hooks for next video',
      ],
      future_90d: future?.current_path_projection?.['90d'] || future,
      tradeoff: daily.chair?.tradeoff_prose,
      relationship_guardrails: marriageEdge ? {
        edge_id: marriageEdge.edge_id,
        shared_goals: marriageEdge.shared_goals,
        friction_points: marriageEdge.friction_points,
        chair_note: marriageEdge.friction_points?.includes('builder_hours')
          ? 'Protect family dinner blocks before adding BuilderOS hours'
          : null,
      } : null,
      label: 'THINK',
      receipt_hint: 'products/receipts/LIFERE_CHAIR_BRIEF.json',
    };
  }

  return { answerChairBrief };
}
