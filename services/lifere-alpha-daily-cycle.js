/**
 * SYNOPSIS: LifeRE alpha daily cycle — one-shot founder success test orchestration.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeRECommandCenter } from './lifere-command-center.js';
import { createLifeREPerformanceTwin } from './lifere-performance-twin.js';
import { createLifeREOSService } from './lifere-os-v1.js';

export function createLifeREAlphaDailyCycle({ pool = null, logger = console } = {}) {
  const commandCenter = createLifeRECommandCenter({ pool, logger });
  const performance = createLifeREPerformanceTwin({ pool });
  const service = createLifeREOSService();

  async function runDailyCycle({
    userId = 'adam',
    tenantId = 'default',
    goalGci = 30000,
    activityCounts = null,
    debriefNotes = 'Alpha daily cycle test',
  } = {}) {
    const steps = [];

    const daily = await commandCenter.buildDailyCommandCenter({
      user_id: userId,
      tenant_id: tenantId,
      goal_gci: goalGci,
    });
    steps.push({
      step: 'daily_command_center',
      ok: Boolean(daily.daily_focus?.length || daily.top_3_priorities?.length || daily.chair),
    });

    const top3 = service.top3Priorities({ backlog: [] });
    steps.push({ step: 'top_3', ok: Array.isArray(top3.priorities) && top3.priorities.length >= 1 });

    let activity = null;
    if (activityCounts && Object.keys(activityCounts).length) {
      activity = await performance.recordActivity({
        tenantId,
        userId,
        counts: activityCounts,
      });
    } else {
      activity = await performance.recordActivity({
        tenantId,
        userId,
        counts: { conversations: 5, calls: 2, appointments_set: 1 },
      });
    }
    steps.push({ step: 'activity_log', ok: activity.ok === true });

    const debrief = service.nightlyDebrief({
      wins: ['Completed alpha daily cycle'],
      losses: [],
      notes: debriefNotes,
    });
    steps.push({ step: 'nightly_debrief', ok: Boolean(debrief.summary) });

    const funnel = await performance.computeFunnel({ tenantId, userId });
    const rates = performance.computeConversionRates(funnel);
    const bottleneck = performance.findBottleneck(rates, funnel);
    steps.push({ step: 'performance_snapshot', ok: Boolean(bottleneck.stage) });

    const ok = steps.every((s) => s.ok);

    return {
      ok,
      user_id: userId,
      steps,
      daily_focus: daily.daily_focus || daily.top_3_priorities,
      top_3: top3.priorities,
      activity: activity.row,
      debrief,
      bottleneck: bottleneck.recommendation,
      founder_success_test: 'daily command center + top-3 + activity + debrief',
      label: ok ? 'KNOW' : 'THINK',
      receipt_hint: 'products/receipts/LIFERE_ALPHA_DAILY_CYCLE.json',
    };
  }

  return { runDailyCycle };
}
