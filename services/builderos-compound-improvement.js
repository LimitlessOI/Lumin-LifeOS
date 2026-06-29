/**
 * SYNOPSIS: Compound improvement — every failure must improve the platform (Cursor/Codex lesson).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCodegenFailure } from './builderos-codegen-self-repair.js';
import { classifyBuilderGap } from './builderos-gap-classifier.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COMPOUND_LOG_PATH = path.join(ROOT, 'data', 'builderos-compound-improvement-log.jsonl');
export const COMPOUND_STATE_PATH = path.join(ROOT, 'data', 'builderos-compound-improvement-state.json');

const LEVER_BY_PLAYBOOK = Object.freeze({
  TRUNCATED_OUTPUT: 'routing_strong_model_on_truncation',
  PROSE_REFUSAL: 'routing_strong_model_on_refusal',
  SYNTAX_FAIL: 'inner_review_syntax_gate',
  ZONE3_PATCH: 'zone3_patch_spec_routing',
  DONE_GATE_BLOCKED: 'kernel_wrap_build_ledger',
  MISSING_TARGET: 'blueprint_target_file_required',
  DEPLOY_STALE: 'self_repair_deploy_chain',
  SAFE_SCOPE_BLOCKED: 'safe_scope_prefix_or_retry',
  ROUTING_MODEL_UNAVAILABLE: 'routing_policy_model_map',
  ROUTING_DISPATCH: 'routing_dispatch_repair',
  VALIDATION_FAIL: 'validation_prompt_hardening',
  UNKNOWN: 'builder_gaps_pattern_review',
});

export function selectCompoundLever(classification = {}) {
  return LEVER_BY_PLAYBOOK[classification.playbook] || LEVER_BY_PLAYBOOK.UNKNOWN;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function appendCompoundLog(row) {
  ensureDir(COMPOUND_LOG_PATH);
  fs.appendFileSync(COMPOUND_LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

export function readCompoundState() {
  try {
    return JSON.parse(fs.readFileSync(COMPOUND_STATE_PATH, 'utf8'));
  } catch {
    return { levers_applied: {}, failure_counts: {}, last_improvement_at: null };
  }
}

export function writeCompoundState(state) {
  ensureDir(COMPOUND_STATE_PATH);
  fs.writeFileSync(COMPOUND_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

export function recordCompoundImprovement({
  source = 'builderos',
  mission_id = null,
  step_id = null,
  target_file = null,
  blocker = '',
  code = '',
  error = '',
  builderResult = {},
  httpStatus = null,
  success = false,
  classification: explicitClassification = null,
  failure_stage = null,
  failure_reason = null,
} = {}) {
  const classification =
    explicitClassification ||
    (() => {
      const gapClass = classifyBuilderGap({
        failure_stage: failure_stage || builderResult?.gap_recommendation?.stage,
        failure_reason: failure_reason || blocker || error || builderResult?.gap_recommendation?.reason,
        target_file,
        gap_recommendation: builderResult?.gap_recommendation,
      });
      if (gapClass.playbook !== 'UNKNOWN') {
        return {
          playbook: gapClass.playbook,
          repairable: gapClass.repairable,
          severity: gapClass.severity,
        };
      }
      return classifyCodegenFailure({
        blocker,
        code,
        error,
        builderResult,
        httpStatus,
      });
    })();

  const lever = selectCompoundLever(classification);
  const state = readCompoundState();
  const key = `${classification.playbook}::${lever}`;
  state.failure_counts[key] = (state.failure_counts[key] || 0) + 1;

  if (!success) {
    state.levers_applied[key] = state.levers_applied[key] || {
      lever,
      playbook: classification.playbook,
      first_at: state.levers_applied[key]?.first_at || new Date().toISOString(),
      count: 0,
    };
    state.levers_applied[key].count += 1;
    state.levers_applied[key].last_at = new Date().toISOString();
    state.last_improvement_at = new Date().toISOString();
  }

  writeCompoundState(state);

  const row = {
    source,
    mission_id,
    step_id,
    target_file,
    success,
    classification,
    lever,
    failure_count: state.failure_counts[key],
  };
  appendCompoundLog(row);

  return { classification, lever, state, row };
}

export function getCompoundImprovementSummary() {
  const state = readCompoundState();
  const levers = Object.values(state.levers_applied || {});
  const totalFailures = Object.values(state.failure_counts || {}).reduce((a, b) => a + b, 0);
  const uniqueLevers = levers.length;
  return {
    total_failures_logged: totalFailures,
    unique_levers: uniqueLevers,
    last_improvement_at: state.last_improvement_at,
    levers,
  };
}
