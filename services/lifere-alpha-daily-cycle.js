/**
 * SYNOPSIS: LifeRE alpha daily cycle — one-shot founder success test orchestration.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeRECommandCenter } from './lifere-command-center.js';
import { createLifeREPerformanceTwin } from './lifere-performance-twin.js';
import { createLifeREOSService } from './lifere-os-v1.js';
import { createLifeREFollowUpOS } from './lifere-follow-up-os.js';
import { createLifeREOutreachBridge } from './lifere-outreach-bridge.js';
import { createLifeREClientComms } from './lifere-client-comms.js';

export function createLifeREAlphaDailyCycle({ pool = null, logger = console } = {}) {
  const commandCenter = createLifeRECommandCenter({ pool, logger });
  const performance = createLifeREPerformanceTwin({ pool });
  const service = createLifeREOSService();
  const followUp = createLifeREFollowUpOS({ pool });
  const outreach = createLifeREOutreachBridge({ pool, logger });
  const clientComms = createLifeREClientComms({ pool, outreach, logger });

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

    const queue = await followUp.prioritizeQueue({ userId, limit: 1 });
    let approvalSeed = null;
    if (queue[0]) {
      approvalSeed = await followUp.draftFollowUp({
        userId,
        contactId: queue[0].contact_id,
        message: queue[0].message_draft,
        contactMeta: {
          tenant_id: tenantId,
          lead: queue[0].lead,
          recipient_phone: queue[0].recipient_phone,
          recipient_email: queue[0].recipient_email,
          source: 'alpha_daily_cycle',
        },
      });
    } else {
      approvalSeed = await clientComms.queueDraft({
        tenantId,
        userId,
        actionType: 'sms_client',
        draft: 'Alpha cycle sample: quick update on your home search — reply if you need anything.',
        payload: { source: 'alpha_daily_cycle', channel: 'sms', recipient_name: 'Alpha test client' },
      });
    }
    steps.push({
      step: 'approval_draft_seeded',
      ok: Boolean(approvalSeed?.ok || approvalSeed?.queue?.ok),
    });

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
      approval_seed: approvalSeed,
      founder_success_test: 'daily command center + top-3 + activity + debrief + approval draft',
      label: ok ? 'KNOW' : 'THINK',
      receipt_hint: 'products/receipts/LIFERE_ALPHA_DAILY_CYCLE.json',
    };
  }

  return { runDailyCycle };
}
