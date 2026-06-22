/**
 * SYNOPSIS: Founder build quorum escalation — solo cap → 2-AI → 3-AI → Chair (no endless loops).
 * WIRED: partial — founder-build-self-repair.js after 3 solo failures
 * INTEGRATE: web-search-service.js on unknown blockers; token-accounting on CFO gate
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import { createMemoryIntelligenceService } from './memory-intelligence-service.js';
import { isCssOnlyUiFeedback } from './builder-instruction-target.js';

export const FOUNDER_SOLO_ATTEMPT_MAX = Number(process.env.FOUNDER_SOLO_ATTEMPT_MAX || '3');

const QUORUM_2_MEMBERS = ['gemini_flash', 'deepseek'];
const QUORUM_3_MEMBERS = ['gemini_flash', 'deepseek', 'claude_sonnet'];
const CHAIR_MEMBER = process.env.FOUNDER_CHAIR_MEMBER || 'claude_sonnet';

const STATIC_FOUNDER_LESSONS = [
  'Theme-only CSS commits fail when inline styles in lifeos-app.html / lifeos-dashboard.html override theme-overrides.',
  'Service worker cache-first hides overlay CSS changes until CACHE_NAME bump in public/overlay/sw.js.',
  'Founder PASS requires atomic 4-file commit (theme + dashboard inline + app inline + sw.js) plus live HTML token check.',
  'Whole-file HTML rewrites of lifeos-app.html truncate the shell — use CSS-only path for color/bubble feedback.',
  'Deploy SHA can lag live content — poll live HTML before declaring FOUNDER_VISUAL_NOT_VERIFIED terminal.',
];

function buildFailureContext({ task, attempts, blocker, verification, targetFile }) {
  return {
    task: String(task || '').slice(0, 2000),
    target_file: targetFile || null,
    blocker: String(blocker || 'unknown').slice(0, 500),
    verification_code: verification?.code || null,
    solo_attempts: (attempts || []).map((a) => ({
      attempt: a.attempt,
      pass_fail: a.pass_fail,
      blocker: a.blocker,
      repair_applied: a.repair_applied || null,
      target_file: a.target_file || null,
    })),
  };
}

function buildQuorumPrompt({ stage, members, context, lessons, priorDeliberations = [] }) {
  const cssHint = isCssOnlyUiFeedback(context.task)
    ? 'This is CSS-only UI feedback — prefer css_patch / redeploy_wait / cache_bust over HTML rewrites.'
    : 'Prefer scoped patches; never rewrite entire overlay shells.';

  return `You are part of a ${stage} deliberation to unblock a founder build that failed after ${context.solo_attempts.length} solo repair attempt(s).

TASK: ${context.task}
TARGET: ${context.target_file || '(inferred)'}
BLOCKER: ${context.blocker}
VERIFICATION: ${context.verification_code || 'n/a'}
${cssHint}

INSTITUTIONAL LESSONS (CFO + Hist):
${lessons.map((l, i) => `${i + 1}. ${l}`).join('\n')}

SOLO ATTEMPT LOG:
${JSON.stringify(context.solo_attempts, null, 2)}

${priorDeliberations.length ? `PRIOR DELIBERATIONS:\n${priorDeliberations.join('\n---\n')}\n` : ''}

Debate steel-man alternatives. End with ONLY valid JSON (no markdown fences):
{
  "root_cause": "one sentence",
  "fix_approach": "css_patch|redeploy_wait|target_reroute|builder_execute|chair_synthesis",
  "target_files": ["path/if/any"],
  "augmented_task": "concrete next build instruction for the system",
  "confidence": 1-10,
  "dissent": "optional minority view or null"
}`;
}

export function parseQuorumResponse(text) {
  const raw = String(text || '').trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { ok: false, error: 'no_json_in_quorum_response' };
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.fix_approach || !parsed.augmented_task) {
      return { ok: false, error: 'quorum_json_missing_fields' };
    }
    return { ok: true, plan: parsed };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function loadFounderBuildLessons(pool, limit = 8) {
  const out = [...STATIC_FOUNDER_LESSONS];
  if (!pool) return out.slice(0, limit);
  try {
    const mem = createMemoryIntelligenceService(pool, console);
    const rows = await mem.getLessonsByDomain('founder_build', limit);
    for (const row of rows) {
      const line = [row.problem, row.solution].filter(Boolean).join(' → ');
      if (line) out.unshift(line);
    }
  } catch {
    /* non-fatal */
  }
  return out.slice(0, limit);
}

export async function runCfoEscalationGate({ soloAttempts, blocker, lessons, pool }) {
  const attemptCount = soloAttempts?.length || 0;
  const b = String(blocker || '');

  if (/ADAM_REQUIRED|founder intent|BLOCKED_INTENT|secret|credential|auth.*required/i.test(b)) {
    return {
      approved: false,
      code: 'CFO_BLOCKED_HUMAN_REQUIRED',
      roi_note: 'Escalation denied — blocker requires founder or secret access, not more AI spend.',
      lessons_injected: lessons,
    };
  }

  if (attemptCount < FOUNDER_SOLO_ATTEMPT_MAX) {
    return {
      approved: false,
      code: 'CFO_SOLO_BUDGET_REMAINING',
      roi_note: `Solo repair not exhausted (${attemptCount}/${FOUNDER_SOLO_ATTEMPT_MAX}) — quorum deferred.`,
      lessons_injected: lessons,
    };
  }

  return {
    approved: true,
    code: 'CFO_ESCALATION_APPROVED',
    roi_note: `${attemptCount} solo failures — approved quorum spend (2→3→Chair cap, no infinite loop).`,
    lessons_injected: lessons,
    token_budget: { quorum_2: 8000, quorum_3: 12000, chair: 6000 },
  };
}

async function callMember(callCouncilMember, member, prompt, maxTokens) {
  if (!callCouncilMember) {
    return { member, ok: false, error: 'callCouncilMember unavailable' };
  }
  try {
    const text = await callCouncilMember(member, prompt, {
      maxTokens,
      temperature: 0.2,
      taskType: 'founder_build_quorum',
    });
    return { member, ok: true, text: String(text || '') };
  } catch (err) {
    return { member, ok: false, error: err.message };
  }
}

async function runQuorumDeliberation({ stage, members, callCouncilMember, context, lessons, priorDeliberations, maxTokens }) {
  const prompt = buildQuorumPrompt({ stage, members, context, lessons, priorDeliberations });
  const responses = await Promise.all(
    members.map((m) => callMember(callCouncilMember, m, prompt, maxTokens)),
  );
  const okResponses = responses.filter((r) => r.ok && r.text);
  const plans = okResponses.map((r) => parseQuorumResponse(r.text)).filter((p) => p.ok);

  if (!plans.length) {
    return {
      stage,
      members,
      ok: false,
      error: 'quorum_no_valid_plans',
      responses: responses.map((r) => ({ member: r.member, ok: r.ok, error: r.error || null })),
    };
  }

  const merged = plans.reduce((best, p) => (
    (p.plan.confidence || 0) > (best.plan.confidence || 0) ? p : best
  ), plans[0]);

  return {
    stage,
    members,
    ok: true,
    plan: merged.plan,
    perspectives: okResponses.map((r) => ({
      member: r.member,
      excerpt: String(r.text || '').slice(0, 400),
    })),
    dissent: plans.map((p) => p.plan.dissent).filter(Boolean),
  };
}

async function runChairSynthesis({ callCouncilMember, context, lessons, deliberations, maxTokens }) {
  const digest = deliberations
    .filter((d) => d.ok)
    .map((d) => `[${d.stage}] confidence=${d.plan?.confidence} approach=${d.plan?.fix_approach}\n${d.plan?.augmented_task}`)
    .join('\n\n');

  const prompt = `You are the CHAIR — final resolver for a founder build blocked after solo repair + quorum.

Do NOT escalate to Adam for mechanical issues. Synthesize one definitive fix.

TASK: ${context.task}
BLOCKER: ${context.blocker}

LESSONS:
${lessons.join('\n')}

QUORUM DELIBERATIONS:
${digest || '(none succeeded)'}

Produce the single best fix. JSON only:
{
  "root_cause": "...",
  "fix_approach": "css_patch|redeploy_wait|target_reroute|builder_execute",
  "target_files": [],
  "augmented_task": "exact instruction the build system should run next",
  "confidence": 1-10,
  "chair_rationale": "why this ends the loop"
}`;

  const chair = await callMember(callCouncilMember, CHAIR_MEMBER, prompt, maxTokens);
  if (!chair.ok) {
    return { stage: 'chair', ok: false, error: chair.error, member: CHAIR_MEMBER };
  }
  const parsed = parseQuorumResponse(chair.text);
  if (!parsed.ok) {
    return { stage: 'chair', ok: false, error: parsed.error, member: CHAIR_MEMBER };
  }
  return {
    stage: 'chair',
    ok: true,
    member: CHAIR_MEMBER,
    plan: parsed.plan,
    rationale: parsed.plan.chair_rationale || null,
  };
}

export async function recordFounderEscalationLesson(pool, { task, blocker, stage, outcome, plan }) {
  if (!pool) return null;
  try {
    const mem = createMemoryIntelligenceService(pool, console);
    return await mem.recordLesson({
      domain: 'founder_build',
      impactClass: outcome === 'PASS' ? 'medium' : 'large',
      problem: `Blocker after ${stage}: ${String(blocker || '').slice(0, 300)}`,
      solution: plan?.augmented_task || plan?.root_cause || 'quorum exhausted',
      howNovel: null,
      surfacedBy: `founder_quorum_${stage}`,
      tags: ['founder_build', 'quorum_escalation', stage],
    });
  } catch {
    return null;
  }
}

/**
 * Sequential escalation: 2-AI → apply → 3-AI → apply → Chair → apply → hard stop.
 */
export async function runFounderBuildQuorumEscalation({
  task,
  attempts,
  blocker,
  verification,
  targetFile,
  callCouncilMember,
  pool,
  onStagePlan = null,
}) {
  const context = buildFailureContext({ task, attempts, blocker, verification, targetFile });
  const lessons = await loadFounderBuildLessons(pool);
  const cfo = await runCfoEscalationGate({ soloAttempts: attempts, blocker, lessons, pool });

  const receipt = {
    solo_max: FOUNDER_SOLO_ATTEMPT_MAX,
    cfo,
    stages: [],
    final_plan: null,
    exhausted: false,
  };

  if (!cfo.approved) {
    receipt.exhausted = true;
    receipt.stop_reason = cfo.code;
    return receipt;
  }

  if (!callCouncilMember) {
    receipt.exhausted = true;
    receipt.stop_reason = 'QUORUM_UNAVAILABLE_NO_COUNCIL';
    return receipt;
  }

  const deliberations = [];

  const q2 = await runQuorumDeliberation({
    stage: 'quorum_2',
    members: QUORUM_2_MEMBERS,
    callCouncilMember,
    context,
    lessons,
    maxTokens: cfo.token_budget?.quorum_2 || 8000,
  });
  receipt.stages.push(q2);
  if (q2.ok) {
    deliberations.push(q2);
    receipt.final_plan = q2.plan;
    if (onStagePlan) {
      const applied = await onStagePlan(q2.plan, 'quorum_2');
      if (applied?.stop) return { ...receipt, applied, stop_reason: 'RECOVERED' };
    }
  }

  const q3 = await runQuorumDeliberation({
    stage: 'quorum_3',
    members: QUORUM_3_MEMBERS,
    callCouncilMember,
    context,
    lessons,
    priorDeliberations: deliberations.map((d) => JSON.stringify(d.plan)),
    maxTokens: cfo.token_budget?.quorum_3 || 12000,
  });
  receipt.stages.push(q3);
  if (q3.ok) {
    deliberations.push(q3);
    receipt.final_plan = q3.plan;
    if (onStagePlan) {
      const applied = await onStagePlan(q3.plan, 'quorum_3');
      if (applied?.stop) return { ...receipt, applied, stop_reason: 'RECOVERED' };
    }
  }

  const chair = await runChairSynthesis({
    callCouncilMember,
    context,
    lessons,
    deliberations,
    maxTokens: cfo.token_budget?.chair || 6000,
  });
  receipt.stages.push(chair);
  if (chair.ok) {
    receipt.final_plan = chair.plan;
    if (onStagePlan) {
      const applied = await onStagePlan(chair.plan, 'chair');
      if (applied?.stop) return { ...receipt, applied, stop_reason: 'RECOVERED' };
    }
  }

  receipt.exhausted = true;
  receipt.stop_reason = 'QUORUM_AND_CHAIR_EXHAUSTED';
  await recordFounderEscalationLesson(pool, {
    task,
    blocker,
    stage: 'chair',
    outcome: 'FAIL',
    plan: receipt.final_plan,
  });
  return receipt;
}

export function buildQuorumFailureEnvelope(receipt, baseFailure) {
  const stageLines = (receipt.stages || []).map((s) => {
    if (!s.ok) return `• ${s.stage}: failed (${s.error || 'unknown'})`;
    return `• ${s.stage}: ${s.plan?.fix_approach} (confidence ${s.plan?.confidence ?? '?'})`;
  });
  return {
    ...baseFailure,
    quorum_escalation: receipt,
    first_blocker: baseFailure.first_blocker || receipt.stop_reason || 'QUORUM_EXHAUSTED',
    human_summary: [
      baseFailure.human_summary,
      '',
      '── Quorum escalation (CFO overseen) ──',
      receipt.cfo?.roi_note || '',
      ...stageLines,
      receipt.final_plan
        ? `Chair/quorum plan: ${receipt.final_plan.augmented_task}`
        : 'All quorum stages exhausted — mechanical blocker remains.',
    ].filter(Boolean).join('\n'),
    self_repair: {
      ...(baseFailure.self_repair || {}),
      quorum_escalation: receipt,
      exhausted: true,
    },
  };
}
