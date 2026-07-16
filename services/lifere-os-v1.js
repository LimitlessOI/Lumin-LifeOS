/**
 * SYNOPSIS: LifeRE OS v1 service — light operational copilot for real estate agents.
 * LifeRE OS v1 service — light operational copilot for real estate agents.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

const PILLARS = [
  'daily_command_center',
  'top_3_priorities',
  'nightly_debrief',
  'contextual_education',
  'sales_coaching',
  'social_media_os_lite',
  'follow_up_os_lite',
  'tc_document_extraction_lite',
  'compliance_guardrails',
  'recruiting_lite',
  'finance_lite',
  'lifeos_accountability',
];

function ensureText(value) {
  return String(value || '').trim();
}

function top3FromBacklog(backlog = []) {
  return backlog
    .filter(Boolean)
    .map((item) => ensureText(item))
    .filter(Boolean)
    .slice(0, 3)
    .map((task, index) => ({
      rank: index + 1,
      task,
      why_now: index === 0 ? 'highest leverage for pipeline movement' : 'supports current pipeline',
    }));
}

function makeActionDraft({ title, owner = 'agent', due = 'today' }) {
  return {
    title: ensureText(title),
    owner,
    due,
    status: 'draft',
    execute_external: false,
    requires_agent_approval: true,
  };
}

function extractTcFields(text) {
  const source = ensureText(text);
  return {
    client_name: (source.match(/client[:\s]+([A-Za-z .'-]+)/i) || [])[1] || null,
    property_address: (source.match(/address[:\s]+([A-Za-z0-9 .,#'-]+)/i) || [])[1] || null,
    close_date: (source.match(/close(?: date)?[:\s]+([0-9\-\/]+)/i) || [])[1] || null,
    emd_due: (source.match(/emd(?: due)?[:\s]+([0-9\-\/]+)/i) || [])[1] || null,
  };
}

export function createLifeREOSService() {
  function health() {
    return {
      ok: true,
      service: 'lifere-os-v1',
      pillars: PILLARS,
      doctrine: {
        automation_default: 'safe_internal_work_auto',
        external_execution: 'approval_required',
      },
    };
  }

  function dailyCommandCenter({ agent = 'agent', backlog = [], boldtrail = null } = {}) {
    if (boldtrail?.connected) {
      const top3 = Array.isArray(boldtrail.top3) ? boldtrail.top3 : [];
      return {
        agent: ensureText(agent) || 'agent',
        daily_focus: top3,
        top_3_priorities: top3,
        blocker_scan: top3.length
          ? (boldtrail.blocker_scan || [])
          : ['BoldTrail connected — pipeline empty; no canned priorities shown', ...(boldtrail.blocker_scan || [])],
        boldtrail: {
          connected: true,
          pipeline_summary: boldtrail.pipeline_summary,
          follow_up_queue: boldtrail.follow_up_queue || [],
          portal_url: boldtrail.portal_url || 'https://boldtrail.exprealty.com',
          source: 'boldtrail',
          empty_pipeline: top3.length === 0,
        },
      };
    }

    const top3 = top3FromBacklog(backlog);
    return {
      agent: ensureText(agent) || 'agent',
      daily_focus: top3.length ? top3 : [
        { rank: 1, task: 'prospect 10 people', why_now: 'new pipeline' },
        { rank: 2, task: 'follow up on 5 warm leads', why_now: 'conversion' },
        { rank: 3, task: 'post 1 value social update', why_now: 'visibility' },
      ],
      top_3_priorities: top3.length ? top3 : [
        { rank: 1, task: 'prospect 10 people', why_now: 'new pipeline' },
        { rank: 2, task: 'follow up on 5 warm leads', why_now: 'conversion' },
        { rank: 3, task: 'post 1 value social update', why_now: 'visibility' },
      ],
      blocker_scan: boldtrail?.connected === false
        ? ['BoldTrail API not connected — showing LifeRE defaults', ...(boldtrail?.blocker_scan || [])]
        : ['missing docs', 'follow-up delay', 'compliance uncertainty'],
      boldtrail: boldtrail ? {
        connected: !!boldtrail.connected,
        reason: boldtrail.reason || null,
        portal_url: boldtrail.portal_url || 'https://boldtrail.exprealty.com',
        source: boldtrail.connected ? 'boldtrail' : 'fallback',
      } : null,
    };
  }

  function top3Priorities({ backlog = [] } = {}) {
    const center = dailyCommandCenter({ backlog });
    return { priorities: center.top_3_priorities || center.daily_focus };
  }

  function nightlyDebrief({ wins = [], losses = [], notes = '' } = {}) {
    return {
      wins: (wins || []).map((w) => ensureText(w)).filter(Boolean),
      losses: (losses || []).map((l) => ensureText(l)).filter(Boolean),
      summary: ensureText(notes) || 'No notes provided.',
      next_day_top_3_seed: [
        makeActionDraft({ title: 'Follow up all warm leads from today', due: 'tomorrow 10:00' }),
        makeActionDraft({ title: 'Publish one educational social post', due: 'tomorrow noon' }),
        makeActionDraft({ title: 'Complete TC checklist on active files', due: 'tomorrow 4:00pm' }),
      ],
    };
  }

  function educationContext({ question = '' } = {}) {
    const q = ensureText(question).toLowerCase();
    const lesson = q.includes('contract')
      ? 'Use a clause-by-clause checklist before sending.'
      : q.includes('listing')
        ? 'Run prep: pricing comp + pre-market narrative + launch timeline.'
        : 'Teach while doing: explain the task, then provide a one-step-next action.';
    return {
      lesson,
      one_step_now: makeActionDraft({ title: 'Apply lesson to one active deal', due: 'today' }),
    };
  }

  function salesCoach({ scenario = '' } = {}) {
    return {
      scenario: ensureText(scenario) || 'general follow-up',
      opener: 'Quick check-in: are you still aiming to move this quarter?',
      objection_response: 'Makes sense. Would a 10-minute options walkthrough help you decide next steps?',
      next_action: makeActionDraft({ title: 'Send personalized follow-up text', due: 'today' }),
    };
  }

  function socialLite({ topic = 'local market update' } = {}) {
    const t = ensureText(topic);
    return {
      post_draft: `3 things buyers should know about ${t} this week.`,
      cta: 'Reply "guide" and I will send the checklist.',
      schedule_recommendation: 'post at 8:30am local',
      execute_external: false,
      requires_agent_approval: true,
    };
  }

  function followUpLite({ leads = [] } = {}) {
    const queue = (leads || []).slice(0, 10).map((lead, i) => ({
      rank: i + 1,
      lead: ensureText(lead) || `lead-${i + 1}`,
      message_draft: `Hey ${ensureText(lead) || 'there'}, wanted to make sure you got the options I sent.`,
      execute_external: false,
      requires_agent_approval: true,
    }));
    return { queue };
  }

  function tcExtractionLite({ text = '' } = {}) {
    return {
      extracted: extractTcFields(text),
      confidence: 'THINK',
      review_required: true,
    };
  }

  function complianceGuardrails({ activity = '' } = {}) {
    const a = ensureText(activity).toLowerCase();
    return {
      risk_level: a.includes('guarantee') ? 'high' : 'medium',
      guardrails: [
        'No misleading performance claims',
        'No unauthorized legal advice',
        'Require brokerage review when uncertain',
      ],
      required_review: true,
    };
  }

  function recruitingLite({ candidate = '' } = {}) {
    return {
      candidate: ensureText(candidate) || 'new recruit',
      first_call_agenda: [
        'Current business baseline',
        'Biggest blocker',
        '90-day growth goal',
      ],
      follow_up_draft: makeActionDraft({ title: 'Send recruiting follow-up summary', due: 'today' }),
    };
  }

  function financeLite({ monthly_revenue = 0, monthly_cost = 0 } = {}) {
    const revenue = Number(monthly_revenue) || 0;
    const cost = Number(monthly_cost) || 0;
    return {
      monthly_revenue: revenue,
      monthly_cost: cost,
      margin: revenue - cost,
      value_signal: revenue > cost ? 'positive' : 'needs_attention',
      recommendation: revenue > cost
        ? 'Scale repeatable actions with best ROI.'
        : 'Reduce low-conversion spend and increase follow-up quality.',
    };
  }

  function accountability({ commitments = [] } = {}) {
    return {
      commitments_due_today: (commitments || []).map((c) => ensureText(c)).filter(Boolean),
      reminder_plan: makeActionDraft({ title: 'Check commitment completion at end of day', due: 'today 6:00pm' }),
      execute_external: false,
      requires_agent_approval: true,
    };
  }

  return {
    PILLARS,
    health,
    dailyCommandCenter,
    top3Priorities,
    nightlyDebrief,
    educationContext,
    salesCoach,
    socialLite,
    followUpLite,
    tcExtractionLite,
    complianceGuardrails,
    recruitingLite,
    financeLite,
    accountability,
  };
}
