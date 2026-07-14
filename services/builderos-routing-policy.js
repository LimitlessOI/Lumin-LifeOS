/**
 * SYNOPSIS: BuilderOS routing policy — classify Builder tasks and constrain model choice
 * before runtime availability and memory-based routing are applied.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const RISKY_CODE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.sql'];
const HIGH_RISK_PREFIXES = [
  'services/',
  'routes/',
  'config/',
  'db/migrations/',
  'startup/',
  'middleware/',
  'core/',
];

const CHEAP_MODELS = ['openai_builder_mini', 'groq_llama', 'gemini_flash', 'deepseek', 'cerebras_llama'];
const STRONGER_MODELS = [
  'openai_builder_standard',
  'openai_builder_escalation',
  'claude_sonnet',
  'openai_gpt',
  'century',
  'deepseek',
];

function normalizePath(targetFile) {
  return String(targetFile || '').trim().replace(/^[/\\]+/, '').toLowerCase();
}

function hasRiskyExtension(targetFile) {
  const normalized = normalizePath(targetFile);
  return RISKY_CODE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

function hasHighRiskPrefix(targetFile) {
  const normalized = normalizePath(targetFile);
  return HIGH_RISK_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function classifyBuilderRoutingTask({ routingKey, mode, executionOnly, targetFile }) {
  const normalizedTarget = normalizePath(targetFile);
  const riskyTarget = hasRiskyExtension(normalizedTarget) || hasHighRiskPrefix(normalizedTarget);

  if (routingKey === 'council.builder.plan') {
    return 'architecture_planning';
  }
  if (routingKey === 'council.builder.review' || routingKey === 'council.gate_change.debate') {
    return 'governance_review';
  }
  if (routingKey === 'council.builder.code_review') {
    return 'verifier_conflict_resolution';
  }
  if (routingKey === 'council.builder.code_execute') {
    return executionOnly ? 'autonomous_retry' : 'bounded_patching';
  }
  if (routingKey === 'council.builder.code') {
    if (riskyTarget) return 'high_risk_repo_edit';
    return 'bounded_patching';
  }
  if (mode === 'review') {
    return 'governance_review';
  }
  if (mode === 'plan') {
    return 'architecture_planning';
  }
  if (normalizedTarget.endsWith('.md') || normalizedTarget.endsWith('.json')) {
    return 'cheap_summary';
  }
  return 'classification';
}

export function getBuilderRoutingPolicy(input) {
  const taskClass = classifyBuilderRoutingTask(input);

  const shared = {
    cheap_summary: {
      allowedModels: CHEAP_MODELS,
      blockedModels: [],
      escalationTriggers: ['verifier_failure', 'scope_drift', 'structure_loss'],
      retryCeiling: 1,
      verifierRequired: false,
      maxContextAllowance: 'medium',
      costSensitivity: 'high',
    },
    extraction: {
      allowedModels: CHEAP_MODELS,
      blockedModels: [],
      escalationTriggers: ['json_shape_fail', 'hallucinated_fields'],
      retryCeiling: 1,
      verifierRequired: false,
      maxContextAllowance: 'small',
      costSensitivity: 'high',
    },
    classification: {
      allowedModels: CHEAP_MODELS,
      blockedModels: [],
      escalationTriggers: ['routing_conflict', 'confidence_low'],
      retryCeiling: 1,
      verifierRequired: false,
      maxContextAllowance: 'small',
      costSensitivity: 'high',
    },
    scan: {
      allowedModels: CHEAP_MODELS,
      blockedModels: [],
      escalationTriggers: ['scanner_conflict'],
      retryCeiling: 0,
      verifierRequired: false,
      maxContextAllowance: 'small',
      costSensitivity: 'high',
    },
    bounded_patching: {
      allowedModels: ['openai_builder_mini', 'deepseek', 'gemini_flash', ...STRONGER_MODELS],
      blockedModels: ['groq_llama', 'mistral_free'],
      escalationTriggers: ['import_merge_bug', 'stub_output', 'commonjs_bleed', 'verifier_failure'],
      retryCeiling: 1,
      verifierRequired: true,
      maxContextAllowance: 'medium',
      costSensitivity: 'medium',
    },
    architecture_planning: {
      allowedModels: ['openai_builder_standard', 'openai_builder_mini', 'deepseek', 'gemini_flash', ...STRONGER_MODELS],
      blockedModels: ['groq_llama'],
      escalationTriggers: ['multi_file_plan', 'governance_boundary', 'db_plus_route_plus_service'],
      retryCeiling: 1,
      verifierRequired: false,
      maxContextAllowance: 'large',
      costSensitivity: 'medium',
    },
    governance_review: {
      allowedModels: ['openai_builder_standard', 'openai_builder_mini', 'gemini_flash', ...STRONGER_MODELS],
      blockedModels: ['groq_llama'],
      escalationTriggers: ['policy_conflict', 'runtime_truth_conflict', 'receipt_gap'],
      retryCeiling: 0,
      verifierRequired: false,
      maxContextAllowance: 'medium',
      costSensitivity: 'medium',
    },
    verifier_conflict_resolution: {
      allowedModels: ['openai_builder_standard', 'openai_builder_mini', 'deepseek', 'gemini_flash', ...STRONGER_MODELS],
      blockedModels: ['groq_llama'],
      escalationTriggers: ['repeat_verifier_failure', 'syntax_failure', 'scope_drift'],
      retryCeiling: 1,
      verifierRequired: true,
      maxContextAllowance: 'medium',
      costSensitivity: 'medium',
    },
    autonomous_retry: {
      allowedModels: ['openai_builder_mini', 'deepseek', 'gemini_flash', ...STRONGER_MODELS],
      blockedModels: ['groq_llama'],
      escalationTriggers: ['first_retry_failed', 'failure_family_repeat'],
      retryCeiling: 1,
      verifierRequired: true,
      maxContextAllowance: 'medium',
      costSensitivity: 'medium',
    },
    high_risk_repo_edit: {
      allowedModels: ['openai_builder_standard', 'openai_builder_escalation', 'openai_builder_mini', 'deepseek', 'gemini_flash', ...STRONGER_MODELS],
      blockedModels: ['groq_llama', 'mistral_free', 'cerebras_llama'],
      escalationTriggers: ['zone3_target', 'auth_or_runtime_boundary', 'migration_or_governance_change', 'failure_family_repeat'],
      retryCeiling: 1,
      verifierRequired: true,
      maxContextAllowance: 'large',
      costSensitivity: 'low',
    },
  };

  return {
    taskClass,
    ...(shared[taskClass] || shared.classification),
  };
}

export function applyBuilderRoutingPolicy({
  candidateModels,
  requestedModel,
  routingKey,
  mode,
  executionOnly,
  targetFile,
}) {
  const policy = getBuilderRoutingPolicy({ routingKey, mode, executionOnly, targetFile });
  const requested = requestedModel || null;
  const orderedCandidates = [...new Set((candidateModels || []).filter(Boolean))];
  const blockedSet = new Set(policy.blockedModels || []);
  const allowedSet = new Set(policy.allowedModels || []);

  const blockedCandidates = orderedCandidates.filter((model) => blockedSet.has(model));
  const filteredCandidateModels = orderedCandidates.filter((model) => {
    if (blockedSet.has(model)) return false;
    return allowedSet.size === 0 || allowedSet.has(model);
  });

  const requestedModelBlocked = Boolean(requested && blockedSet.has(requested));

  return {
    taskClass: policy.taskClass,
    policy,
    requestedModelBlocked,
    blockedCandidates,
    filteredCandidateModels,
    reason: requestedModelBlocked
      ? `Explicit model override ${requested} is blocked for ${policy.taskClass}`
      : `Applied BuilderOS routing policy for ${policy.taskClass}`,
  };
}
