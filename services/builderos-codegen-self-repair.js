/**
 * SYNOPSIS: BuilderOS codegen failure classifier + repair dispatch (industry harness patterns).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { getBuilderRoutingPolicy } from './builderos-routing-policy.js';

export const CODEGEN_REPAIR_PLAYBOOKS = Object.freeze([
  'TRUNCATED_OUTPUT',
  'SYNTAX_FAIL',
  'PROSE_REFUSAL',
  'ZONE3_PATCH',
  'DONE_GATE_BLOCKED',
  'MISSING_TARGET',
  'DEPLOY_STALE',
]);

const STRONG_MODEL = 'claude_sonnet';

function norm(value) {
  return String(value || '').trim();
}

function joinSignals(parts) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function classifyCodegenFailure({
  blocker = '',
  code = '',
  error = '',
  builderResult = {},
  httpStatus = null,
} = {}) {
  const signal = joinSignals([blocker, code, error, builderResult?.error, builderResult?.raw?.error, builderResult?.raw?.note]);

  if (/stale|railway_stale|deploy.*behind|proof.*stale|dr-003/i.test(signal)) {
    return { playbook: 'DEPLOY_STALE', repairable: true, severity: 'P1' };
  }
  if (/zone3|patch.required|patch_spec|>150 lines/i.test(signal)) {
    return { playbook: 'ZONE3_PATCH', repairable: true, severity: 'P1' };
  }
  if (/done_gate|builderos_done_blocked|missing_proof|build_end_time|token_receipt/i.test(signal)) {
    return { playbook: 'DONE_GATE_BLOCKED', repairable: true, severity: 'P1' };
  }
  if (/missing_target|target_file|builder_missing_target/i.test(signal)) {
    return { playbook: 'MISSING_TARGET', repairable: true, severity: 'P2' };
  }
  if (/prose refusal|not code|refusing overlay|too short|truncated|html too short/i.test(signal)) {
    return { playbook: 'TRUNCATED_OUTPUT', repairable: true, severity: 'P1' };
  }
  if (/syntax|syntaxerror|node --check|parse error|unexpected token/i.test(signal)) {
    return { playbook: 'SYNTAX_FAIL', repairable: true, severity: 'P1' };
  }
  if (/prose_refusal|builder_prose_refusal/i.test(signal)) {
    return { playbook: 'PROSE_REFUSAL', repairable: true, severity: 'P1' };
  }
  if (/safe.scope|outside the builder safe-scope|out_of_scope/i.test(signal)) {
    return { playbook: 'SAFE_SCOPE_BLOCKED', repairable: true, severity: 'P2' };
  }
  if (httpStatus === 409 || (httpStatus === 422 && /done_gate|missing_proof|founder_packet|deliberation/i.test(signal))) {
    return { playbook: 'DONE_GATE_BLOCKED', repairable: true, severity: 'P2' };
  }

  return { playbook: 'UNKNOWN', repairable: false, severity: 'P2', signal: signal.slice(0, 240) };
}

function lineCountSpecAppend(targetFile) {
  const rel = norm(targetFile) || 'target file';
  return [
    'REPAIR: Previous attempt truncated or incomplete.',
    `Deliver the COMPLETE ${rel} in one response.`,
    'Include every export, import, and closing brace.',
    'If file exceeds 120 lines, implement core paths only — no comments, no examples.',
    'Run mental node --check before finishing.',
  ].join(' ');
}

function zone3SpecAppend(targetFile) {
  return [
    'REPAIR: ZONE3 patch mode — change ONLY the minimal region required.',
    `Target: ${norm(targetFile)}.`,
    'Do not rewrite the entire file. Preserve existing structure.',
    'Return a surgical patch or the smallest complete replacement section.',
  ].join(' ');
}

export function buildCodegenRepairDispatch(classification, { plan = {}, job = {}, attempt = 1 } = {}) {
  const targetFile = norm(plan.target_file || job?.metadata_json?.target_file);
  const baseTask = norm(plan.task || job?.instruction);
  const routing = getBuilderRoutingPolicy({
    routingKey: 'council.builder.code_execute',
    mode: 'code',
    executionOnly: true,
    targetFile,
  });

  const patch = {
    repair_attempt: attempt,
    playbook: classification.playbook,
    target_file: targetFile || undefined,
    platform_gap_fill: plan.platform_gap_fill,
    platform_gap_fill_reason: plan.platform_gap_fill_reason,
  };

  switch (classification.playbook) {
    case 'TRUNCATED_OUTPUT':
    case 'PROSE_REFUSAL':
      patch.model = STRONG_MODEL;
      patch.spec = `${baseTask}\n\n${lineCountSpecAppend(targetFile)}`;
      patch.max_output_tokens = 8192;
      patch.routing_task_class = 'high_risk_repo_edit';
      break;
    case 'SYNTAX_FAIL':
      patch.model = STRONG_MODEL;
      patch.spec = `${baseTask}\n\nREPAIR: Fix syntax only. Valid ES module. node --check must pass.`;
      patch.routing_task_class = 'verifier_conflict_resolution';
      break;
    case 'ZONE3_PATCH':
      patch.model = routing.allowedModels?.includes('claude_sonnet')
        ? 'claude_sonnet'
        : (routing.allowedModels?.[0] || STRONG_MODEL);
      patch.spec = `${baseTask}\n\n${zone3SpecAppend(targetFile)}`;
      patch.patch_mode = 'zone3_spec';
      patch.routing_task_class = 'bounded_patching';
      break;
    case 'DONE_GATE_BLOCKED':
      patch.use_kernel_wrap = true;
      patch.spec = `${baseTask}\n\nREPAIR: Prior commit may have landed; ensure measurement ledger completes.`;
      patch.routing_task_class = 'autonomous_retry';
      break;
    case 'MISSING_TARGET':
      patch.spec = `${baseTask}\n\nREPAIR: target_file is mandatory. Return code for exactly one path.`;
      patch.routing_task_class = 'classification';
      break;
    case 'DEPLOY_STALE':
      patch.action = 'run_self_repair_chain';
      patch.spec = baseTask;
      break;
    default:
      return null;
  }

  return patch;
}

export function mergeRepairIntoPlan(plan, repairPatch) {
  if (!repairPatch) return plan;
  if (repairPatch.action === 'run_self_repair_chain') {
    return { ...plan, self_repair_chain: true };
  }
  return {
    ...plan,
    task: repairPatch.spec || plan.task,
    spec: repairPatch.spec || plan.spec,
    model: repairPatch.model || plan.model,
    max_output_tokens: repairPatch.max_output_tokens || plan.max_output_tokens,
    patch_mode: repairPatch.patch_mode || plan.patch_mode,
    routing_task_class: repairPatch.routing_task_class || plan.routing_task_class,
    codegen_repair: {
      playbook: repairPatch.playbook,
      attempt: repairPatch.repair_attempt,
    },
  };
}
