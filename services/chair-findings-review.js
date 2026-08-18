/**
 * SYNOPSIS: Conductor review of SENTRY findings. Legacy persisted field names
 * remain chair_status/chair_reasoning for compatibility, but the governing
 * office is Conductor. Technical recovery stays inside the autonomous
 * SENTRY -> Conductor -> Architect path; founder routing is reserved for
 * genuine founder-authority product/priority/stop decisions.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { recordModelOutcome } from './model-capability-ledger.js';

const AUTO_APPROVABLE_CHECKS = new Set([
  'ci_health',
  'workflow_health',
  'system_still_working',
  'receipt_integrity',
  'fixer_failed',
  'fixer_unrepaired',
]);

const FOUNDER_ESCALATION_CHECKS = new Set([
  'product_backlog',
  'competitive_gap',
  'founder_stop',
]);

export function reviewFinding(finding) {
  if (!finding || typeof finding !== 'object') {
    return { ...finding, chair_status: 'rejected', chair_reasoning: 'not a valid finding object' };
  }
  if (!finding.proposed_solution || String(finding.proposed_solution).trim().length < 10) {
    return {
      ...finding,
      chair_status: 'rejected',
      chair_reasoning: 'SO-002 violation: no concrete proposed_solution attached - a flag without a fix is an incomplete report',
    };
  }

  if (FOUNDER_ESCALATION_CHECKS.has(finding.check)) {
    return {
      ...finding,
      chair_status: 'escalate_to_founder',
      chair_reasoning: 'founder-authority scope/priority/stop decision - Conductor may package evidence but may not substitute its authority',
    };
  }

  if (AUTO_APPROVABLE_CHECKS.has(finding.check)) {
    return {
      ...finding,
      chair_status: 'approved',
      chair_reasoning: 'technical recovery finding with a concrete SENTRY solution - within Conductor technical authority; route through governed repair handoff, not founder',
    };
  }

  return {
    ...finding,
    chair_status: 'rejected',
    chair_reasoning: `unrecognized check type "${finding.check}" - no authority mapping exists; fail closed and require governance classification rather than using founder as a default router`,
  };
}

export function reviewFindings(findings) {
  const reviewed = (Array.isArray(findings) ? findings : []).map(reviewFinding);
  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const statusRank = { escalate_to_founder: 0, approved: 1, rejected: 2 };
  return reviewed.sort((a, b) => {
    const statusDelta = (statusRank[a.chair_status] ?? 3) - (statusRank[b.chair_status] ?? 3);
    if (statusDelta !== 0) return statusDelta;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });
}

function buildConductorAIPrompt(finding, ruleBased) {
  return [
    'You are Conductor, reviewing one SENTRY system-health finding.',
    'Give genuine judgment, not a restatement of the rule. Be specific and brief (under 120 words).',
    'SENTRY owns independent observation and must supply its own proposed solution. You own supervisory judgment, independent solving when the handoff lane requires it, and lawful routing.',
    '',
    `Finding check type: ${finding.check}`,
    `Severity: ${finding.severity}`,
    `Summary: ${finding.summary}`,
    `SENTRY proposed solution: ${finding.proposed_solution}`,
    `Deterministic authority classification (do not loosen it): ${ruleBased.chair_status}`,
    `Rule reasoning: ${ruleBased.chair_reasoning}`,
    '',
    'Assess whether the proposed solution is sound, what implications it misses, and what evidence must prove the repair. Do not route technical mechanics to the founder. Do not fabricate dissent.',
  ].join('\n');
}

export async function reviewFindingWithAI(finding, { callModel, model = 'claude_sonnet', logger = console, pool = undefined } = {}) {
  const ruleBased = reviewFinding(finding);

  if (ruleBased.chair_status === 'rejected') {
    return { ...ruleBased, chair_reasoning_source: 'rule_based' };
  }

  if (typeof callModel !== 'function') {
    logger?.warn?.({ finding_id: finding.id }, '[CONDUCTOR-AI] no callModel available - using deterministic authority floor');
    return { ...ruleBased, chair_reasoning_source: 'rule_based_no_model' };
  }

  try {
    const raw = await callModel(model, buildConductorAIPrompt(finding, ruleBased), { maxOutputTokens: 300, taskType: 'conductor_review' });
    const aiText = String(raw || '').trim();
    if (!aiText) {
      recordModelOutcome(pool, { model_tier: model, role: 'oil_review', ok: false, theater_detected: true }).catch(() => {});
      return { ...ruleBased, chair_reasoning_source: 'rule_based_empty_model_response' };
    }
    recordModelOutcome(pool, { model_tier: model, role: 'oil_review', ok: true, trust_earned: true }).catch(() => {});
    return {
      ...ruleBased,
      chair_reasoning: `${ruleBased.chair_reasoning} | Conductor (AI): ${aiText}`,
      chair_reasoning_source: 'ai_model',
    };
  } catch (err) {
    logger?.warn?.({ finding_id: finding.id, err: err.message }, '[CONDUCTOR-AI] model call failed - using deterministic authority floor');
    recordModelOutcome(pool, { model_tier: model, role: 'oil_review', ok: false }).catch(() => {});
    return { ...ruleBased, chair_reasoning_source: 'rule_based_model_error' };
  }
}

export async function reviewFindingsWithAI(findings, opts = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const reviewed = [];
  for (const finding of list) reviewed.push(await reviewFindingWithAI(finding, opts));
  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const statusRank = { escalate_to_founder: 0, approved: 1, rejected: 2 };
  return reviewed.sort((a, b) => {
    const statusDelta = (statusRank[a.chair_status] ?? 3) - (statusRank[b.chair_status] ?? 3);
    if (statusDelta !== 0) return statusDelta;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });
}
