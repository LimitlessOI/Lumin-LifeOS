/**
 * SYNOPSIS: Prevention hook planner — safe execution plans from CANDIDATE_RULE rows only.
 * Prevention hook planner — safe execution plans from CANDIDATE_RULE rows only.
 * No invariant promotion. Wired hooks are explicit; others are NOT_WIRED.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { buildPreventionRegistry } from './self-repair-prevention-registry.js';
import { readLastPreventionHookRun } from './self-repair-prevention-hook-log.js';

/** Governed hooks — only classifications listed here may execute. */
export const WIRED_HOOK_DEFINITIONS = Object.freeze({
  deploy_drift: {
    hook_id: 'HOOK-DEPLOY-DRIFT-001',
    endpoint: 'POST /api/v1/lifeos/command-center/self-repair/deploy-check',
    rollback_no_op:
      'If proof is CURRENT or no deploy SHA drift, skip with log only — no executor, no file/DB mutations',
    preferred_candidate_id: 'CAND-001',
  },
});

function isCandidateRule(rule) {
  return rule?.status === 'CANDIDATE_RULE' && rule?.promoted_to_invariant !== true;
}

/** Build one plan row from a candidate rule + optional wired definition. */
export function buildHookPlanFromRule(rule, wiredDef = null) {
  if (!isCandidateRule(rule)) return null;

  const wired = wiredDef || WIRED_HOOK_DEFINITIONS[rule.classification] || null;

  return {
    hook_id: wired?.hook_id || null,
    candidate_rule_id: rule.id,
    hook_status: wired ? 'WIRED' : 'NOT_WIRED',
    rule_status: 'CANDIDATE_RULE',
    promoted_to_invariant: false,
    classification: rule.classification,
    trigger: rule.trigger,
    proposed_action: rule.prevention_action,
    endpoint: wired?.endpoint || null,
    verification_path: rule.verification_path || null,
    rollback_no_op: wired?.rollback_no_op || 'No hook wired — no action taken',
    confidence: rule.confidence,
    source_receipt_ids: rule.source_receipt_ids || [],
    lesson_count: rule.lesson_count || 0,
  };
}

/**
 * Produce safe execution plans from live candidate rules.
 * Deduplicates by classification — prefers preferred_candidate_id when present.
 */
export async function buildPreventionHookPlans(pool, { lessonLimit = 50 } = {}) {
  const registry = await buildPreventionRegistry(pool, { lessonLimit, persist: false });
  const candidates = (registry.candidate_rules || []).filter(isCandidateRule);

  const byClassification = new Map();
  for (const rule of candidates) {
    const cls = rule.classification;
    const wired = WIRED_HOOK_DEFINITIONS[cls];
    const preferred = wired?.preferred_candidate_id;
    const existing = byClassification.get(cls);
    if (!existing) {
      byClassification.set(cls, rule);
      continue;
    }
    if (preferred && rule.id === preferred) {
      byClassification.set(cls, rule);
      continue;
    }
    if (preferred && existing.id === preferred) continue;
    if ((rule.confidence || 0) > (existing.confidence || 0)) {
      byClassification.set(cls, rule);
    }
  }

  const plans = [...byClassification.values()]
    .map((rule) => buildHookPlanFromRule(rule, WIRED_HOOK_DEFINITIONS[rule.classification]))
    .filter(Boolean);

  return {
    ok: plans.length > 0,
    status: plans.some((p) => p.hook_status === 'WIRED') ? 'HOOKS_AVAILABLE' : 'NOT_WIRED',
    promoted_to_invariant: false,
    plans,
    lesson_count_scanned: registry.lesson_count_scanned,
    generated_at: new Date().toISOString(),
  };
}

/** Resolve the wired deploy_drift plan (CAND-001 preferred). */
export async function findDeployDriftHookPlan(pool) {
  const { plans } = await buildPreventionHookPlans(pool);
  const wired = plans.find(
    (p) => p.classification === 'deploy_drift' && p.hook_status === 'WIRED'
  );
  if (wired) return wired;

  const candidate = plans.find((p) => p.classification === 'deploy_drift');
  return candidate || null;
}

/** Hook status aggregate for API / CC — includes last run from JSONL. */
export async function buildPreventionHooksStatus(pool) {
  const planResult = await buildPreventionHookPlans(pool);
  const hooks = planResult.plans.map((plan) => ({
    ...plan,
    last_run: plan.hook_id ? readLastPreventionHookRun(plan.hook_id) : null,
  }));

  const wiredCount = hooks.filter((h) => h.hook_status === 'WIRED').length;

  return {
    ok: wiredCount > 0,
    status: wiredCount ? 'WIRED' : hooks.length ? 'CANDIDATES_ONLY' : 'NOT_WIRED',
    promoted_to_invariant: false,
    hooks,
    wired_count: wiredCount,
    candidate_count: hooks.length,
    generated_at: planResult.generated_at,
  };
}
