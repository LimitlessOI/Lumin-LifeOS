/**
 * SYNOPSIS: LifeRE alpha surface — routes UI expects but were missing from lifere-os-routes.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeREMotivationTwin } from './lifere-motivation-twin.js';
import { createLifeRETwinStore } from './lifere-twin-store.js';

const EDUCATION_TRACK = [
  {
    module_id: 'lifere_welcome',
    title: 'LifeRE welcome & daily rhythm',
    label: 'Welcome',
    level: 'new',
    next_practice: { type: 'tab', tab: 'command', blurb: 'Open Daily Command Center and set today\'s top 3.' },
  },
  {
    module_id: 'top3_mit',
    title: 'Top-3 MIT discipline',
    label: 'Top 3',
    level: 'new',
    next_practice: { type: 'tab', tab: 'command', blurb: 'Pull BoldTrail top-3 and protect one deep-work block.' },
  },
  {
    module_id: 'speed_to_lead',
    title: 'Speed-to-lead follow-up',
    label: 'Follow-up',
    level: 'new',
    next_practice: {
      type: 'drill',
      module_id: 'follow_up',
      blurb: 'Drill speed-to-lead, then clear one approval-queue SMS.',
    },
  },
  {
    module_id: 'client_comms',
    title: 'Client comms & approval queue',
    label: 'Comms',
    level: 'new',
    next_practice: { type: 'tab', tab: 'clients', blurb: 'Draft one client update and queue for approval.' },
  },
  {
    module_id: 'objection_practice',
    title: 'Objection handling (simulator)',
    label: 'Objections',
    level: 'building',
    next_practice: {
      type: 'sales_sim',
      scenario_hint: 'objection',
      blurb: 'Run one sales-sim scenario in Coaching → Sales simulator.',
    },
  },
  {
    module_id: 'buyer_consult',
    title: 'Buyer consult fundamentals',
    label: 'Buyers',
    level: 'building',
    next_practice: { type: 'drill', module_id: 'buyers', blurb: 'Complete the Buyers skill drill (15–25 min).' },
  },
  {
    module_id: 'tc_file_hygiene',
    title: 'TC file hygiene — blockers & missing docs',
    label: 'TC',
    level: 'building',
    next_practice: { type: 'tab', tab: 'ops', blurb: 'Open Ops → clear one TC blocker or draft a client update.' },
  },
  {
    module_id: 'relocation_niche',
    title: 'Relocation niche (this market)',
    label: 'Relocation',
    level: 'building',
    next_practice: { type: 'drill', module_id: 'relocation', blurb: 'Practice relocation buyer language, then film one talk card.' },
  },
  {
    module_id: 'marketing_brief',
    title: 'Content brief before coach/script',
    label: 'Marketing',
    level: 'scaling',
    next_practice: { type: 'tab', tab: 'marketing', blurb: 'Refresh YouTube ideas and approve one lead-intent title.' },
  },
  {
    module_id: 'alpha_cycle',
    title: 'Full daily LifeRE cycle',
    label: 'Daily cycle',
    level: 'scaling',
    next_practice: {
      type: 'tab',
      tab: 'command',
      blurb: 'Command → follow-ups → TC Ops → one coaching drill → close calendar.',
    },
  },
];

export function createLifeREAlphaSurfaceAPI({
  pool = null,
  followUpOS = null,
  funnel = null,
  marketing = null,
  clientComms = null,
  lifeosCrosscheck = null,
  opportunity = null,
  youtube = null,
} = {}) {
  const motivation = createLifeREMotivationTwin({ pool });
  const twinStore = createLifeRETwinStore({ pool });

  function readEducationProgress(tenantId, userId) {
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'education' })
      || { schema: 'lifere_education_v1', completed: {}, agent_level: null };
    const completed = twin.completed || {};
    const steps = EDUCATION_TRACK.map((m) => ({
      ...m,
      completed: Boolean(completed[m.module_id]),
    }));
    const completed_count = steps.filter((s) => s.completed).length;
    const total = steps.length;
    const next = steps.find((s) => !s.completed) || null;
    const agent_level = twin.agent_level
      || (completed_count >= 8 ? 'scaling' : completed_count >= 4 ? 'building' : 'new');
    return {
      ok: true,
      completed_count,
      total,
      percent: total ? Math.round((completed_count / total) * 100) : 0,
      agent_level,
      next_step: next
        ? {
            module_id: next.module_id,
            title: next.title,
            level: next.level,
            next_practice: next.next_practice || null,
          }
        : null,
      steps,
      label: pool ? 'KNOW' : 'THINK',
    };
  }

  async function setAgentLevel({ tenantId = 'default', userId, level = 'new' }) {
    const allowed = new Set(['new', 'building', 'scaling', 'experienced']);
    const agent_level = allowed.has(String(level)) ? String(level) : 'new';
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'education' })
      || { schema: 'lifere_education_v1', completed: {} };
    twin.agent_level = agent_level;
    twin.level_set_at = new Date().toISOString();
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'education',
      payload: twin,
      receiptMeta: { agent_level },
    });
    const progress = readEducationProgress(tenantId, userId);
    const recommended = EDUCATION_TRACK.filter((s) => {
      if (agent_level === 'new') return s.level === 'new';
      if (agent_level === 'building') return s.level === 'new' || s.level === 'building';
      return true;
    }).map((s) => ({
      ...s,
      completed: Boolean(progress.steps.find((x) => x.module_id === s.module_id)?.completed),
    }));
    return { ok: true, agent_level, recommended, progress };
  }

  async function getFollowUpMetrics({ userId = 'adam', tenantId = 'default' }) {
    if (followUpOS?.getMetrics) {
      return followUpOS.getMetrics({ tenantId, userId });
    }
    let queue_depth = 0;
    if (followUpOS?.prioritizeQueue) {
      const queue = await followUpOS.prioritizeQueue({ tenantId, userId, limit: 50 });
      queue_depth = queue?.length || 0;
    }
    let follow_ups_sent_7d = 0;
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT COUNT(*)::int AS c FROM lifere_approval_queue
           WHERE user_id = $1 AND status = 'approved' AND resolved_at > NOW() - INTERVAL '7 days'`,
          [userId],
        );
        follow_ups_sent_7d = rows[0]?.c ?? 0;
      } catch { /* table may be absent in offline */ }
    }
    return {
      ok: true,
      queue_depth,
      follow_ups_sent_7d,
      speed_to_lead: { target_minutes: 15, label: 'THINK' },
      label: 'THINK',
    };
  }

  function getEducationCurriculum() {
    return { ok: true, track: EDUCATION_TRACK, label: 'KNOW' };
  }

  async function completeEducationModule({ tenantId = 'default', userId, moduleId, score = null }) {
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'education' })
      || { schema: 'lifere_education_v1', completed: {} };
    twin.completed = twin.completed || {};
    twin.completed[moduleId] = {
      completed_at: new Date().toISOString(),
      score: score ?? null,
    };
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'education',
      payload: twin,
      receiptMeta: { module_id: moduleId },
    });
    return { ok: true, module_id: moduleId, progress: readEducationProgress(tenantId, userId) };
  }

  async function getLifeOSIntegration({ tenantId = 'default', userId }) {
    const goal = twinStore.readTwin({ tenantId, userId, twinKey: 'goal' }) || {
      weights: { income: 0.35, family: 0.25, freedom: 0.2, health: 0.2 },
    };
    const commitments = lifeosCrosscheck
      ? await lifeosCrosscheck.fetchCommitmentLoad(userId)
      : { open_count: 0, overloaded: false };
    return {
      ok: true,
      goal_weights: goal.weights || { income: 0.35, family: 0.25, freedom: 0.2, health: 0.2 },
      open_commitments: commitments.open_count ?? 0,
      health_checkins_7d: 0,
      protect_life_quality: commitments.overloaded === true,
      tradeoff_prose: commitments.overloaded
        ? 'High open commitment load — protect calendar before pushing GCI.'
        : null,
      life_optimal_alternate: commitments.overloaded
        ? { reason: 'Block recovery or family time before extra prospecting.' }
        : null,
      label: 'THINK',
    };
  }

  async function getFunnelSummary({ tenantId = 'default', userId }) {
    if (!pool) {
      return { ok: true, captures: 0, funnels: [], label: 'THINK' };
    }
    try {
      const { rows } = await pool.query(
        `SELECT funnel_id, COUNT(*)::int AS captures
         FROM lifere_funnel_events WHERE tenant_id = $1 AND user_id = $2
         GROUP BY funnel_id`,
        [tenantId, userId],
      );
      const captures = rows.reduce((n, r) => n + (r.captures || 0), 0);
      return { ok: true, captures, funnels: rows, label: 'KNOW' };
    } catch {
      return { ok: true, captures: 0, funnels: [], label: 'THINK' };
    }
  }

  async function listFunnelEvents({ tenantId = 'default', userId, limit = 8 }) {
    if (!pool) {
      return { ok: true, events: [], label: 'THINK' };
    }
    try {
      const { rows } = await pool.query(
        `SELECT funnel_id, step, lead_ref, created_at
         FROM lifere_funnel_events WHERE tenant_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, userId, Math.min(Number(limit) || 8, 50)],
      );
      return { ok: true, events: rows, label: 'KNOW' };
    } catch {
      return { ok: true, events: [], label: 'THINK' };
    }
  }

  async function listHookLibrary({ tenantId = 'default', userId, limit = 8 }) {
    if (!pool) {
      return { ok: true, hooks: [], label: 'THINK' };
    }
    try {
      const { rows } = await pool.query(
        `SELECT hook_text, niche, performance_score, source, created_at
         FROM lifere_hook_library WHERE tenant_id = $1 AND user_id = $2
         ORDER BY performance_score DESC NULLS LAST, created_at DESC LIMIT $3`,
        [tenantId, userId, Math.min(Number(limit) || 8, 50)],
      );
      return { ok: true, hooks: rows, label: rows.length ? 'KNOW' : 'THINK' };
    } catch {
      return { ok: true, hooks: [], label: 'THINK' };
    }
  }

  function getMarketSnapshot({ market = 'local' }) {
    return {
      ok: true,
      market,
      active_comp_count: null,
      pending_comp_count: null,
      avg_dom: null,
      price_trend: 'stable',
      narrative: `No MLS feed wired for ${market} — connect BoldTrail/MLS for live comps.`,
      label: 'THINK',
    };
  }

  function getMarketContentAngles({ market = 'local', userId = 'adam' }) {
    return {
      ok: true,
      market,
      angles: [
        { id: 'weekly_update', title: `${market} weekly market update`, hook: '3 numbers that changed this week' },
        { id: 'buyer_myth', title: 'Buyer myth bust', hook: 'Stop believing this about pre-approval' },
        { id: 'neighborhood', title: 'Neighborhood spotlight', hook: `Why families pick ${market}` },
      ],
      label: 'THINK',
    };
  }

  function previewClientComms({ templateId, channel = 'sms', vars = {} }) {
    const preview = clientComms.renderTemplate({ templateId, channel, vars });
    return { ok: true, preview, requires_approval: true, label: 'KNOW' };
  }

  async function youtubeStrategy({ market = 'local', userId = 'adam' }) {
    const topics = youtube
      ? await youtube.suggestTopics({ niche: 'real_estate', market })
      : { topics: [`${market} market update`, 'First-time buyer mistakes'] };
    return {
      ok: true,
      market,
      pillars: topics.topics || [],
      posting_cadence: '2 long-form + 3 shorts per week',
      label: 'THINK',
    };
  }

  function recordingCoach({ scriptOutline = [], scriptExcerpt = '' }) {
    const beats = scriptOutline?.length
      ? scriptOutline
      : [scriptExcerpt || 'Open with hook', 'Proof beat', 'Personal story', 'CTA'];
    return {
      ok: true,
      coach_notes: [
        'Pause 1 beat after the hook — let it land.',
        'Smile on camera during the personal beat.',
        'End with one clear CTA — no stacked asks.',
      ],
      scroll_bullets: beats.map((b, i) => ({ order: i + 1, text: String(b) })),
      label: 'THINK',
    };
  }

  function thumbnailSeo({ videoTypeId = '', hookText = '', city = 'local' }) {
    const hook = hookText || 'market update';
    return {
      ok: true,
      title_options: [
        `${city} market update — what changed`,
        `3 things buyers miss in ${city}`,
        hook.slice(0, 60),
      ],
      thumbnail_text: hook.split(' ').slice(0, 5).join(' '),
      tags: [city, 'real estate', 'market update', videoTypeId].filter(Boolean),
      label: 'THINK',
    };
  }

  function communityContentPlan({ groupName = 'Local RE community', weeks = 2 }) {
    const posts = [];
    for (let w = 0; w < weeks; w += 1) {
      posts.push({ week: w + 1, theme: 'Market insight', format: 'discussion prompt' });
      posts.push({ week: w + 1, theme: 'Client win story', format: 'celebration' });
    }
    return { ok: true, group_name: groupName, weeks, posts, requires_approval: true, label: 'THINK' };
  }

  function communityPostDraft({ groupName = '', theme = 'Market update' }) {
    return {
      ok: true,
      group_name: groupName || 'Community',
      theme,
      draft: `Quick ${theme.toLowerCase()} for our group — what are you seeing locally this week?`,
      requires_approval: true,
      label: 'THINK',
    };
  }

  function communityModeration({ flaggedComments = [] }) {
    const items = (flaggedComments || []).map((text, i) => ({
      id: `flag_${i + 1}`,
      text,
      recommendation: /spam|scam|link/i.test(String(text)) ? 'hide' : 'review',
    }));
    return { ok: true, reviewed: items.length, actions: items, label: 'THINK' };
  }

  async function scanOpportunities({ tenantId = 'default', userId }) {
    if (opportunity?.scanSignals) {
      return opportunity.scanSignals({ tenantId, userId });
    }
    return { ok: true, signals: [], label: 'THINK' };
  }

  return {
    getFollowUpMetrics,
    readEducationProgress,
    getEducationCurriculum,
    completeEducationModule,
    setAgentLevel,
    getMotivationState: (opts) => motivation.getMotivationState(opts),
    getLifeOSIntegration,
    getFunnelSummary,
    listFunnelEvents,
    listHookLibrary,
    getMarketSnapshot,
    getMarketContentAngles,
    previewClientComms,
    youtubeStrategy,
    recordingCoach,
    thumbnailSeo,
    communityContentPlan,
    communityPostDraft,
    communityModeration,
    scanOpportunities,
  };
}
