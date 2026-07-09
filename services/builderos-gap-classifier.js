/**
 * SYNOPSIS: Unified builder gap failure-family classifier (gaps API + supervisor + verify).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { classifyCodegenFailure } from './builderos-codegen-self-repair.js';

function norm(value) {
  return String(value || '').trim();
}

function joinSignals(parts) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

const STAGE_FAMILY = Object.freeze({
  routing: 'ROUTING_DISPATCH',
  dispatch: 'ROUTING_DISPATCH',
  placement: 'MISSING_TARGET',
  validation: 'VALIDATION_FAIL',
  syntax: 'SYNTAX_FAIL',
  sql: 'SQL_FAIL',
  html: 'TRUNCATED_OUTPUT',
  commit: 'COMMIT_TRANSPORT',
  safe_scope: 'SAFE_SCOPE_BLOCKED',
  precommit_governance: 'ZONE3_PATCH',
});

export function classifyBuilderGap({
  failure_stage = null,
  failure_reason = null,
  target_file = null,
  gap_recommendation = null,
  status = null,
} = {}) {
  const stage = norm(failure_stage || gap_recommendation?.stage);
  const reason = norm(failure_reason || gap_recommendation?.reason);
  const signal = joinSignals([reason, stage, status, target_file]);

  const codegen = classifyCodegenFailure({ blocker: reason, error: reason, code: stage });
  if (codegen.playbook !== 'UNKNOWN') {
    return {
      failure_family: codegen.playbook,
      playbook: codegen.playbook,
      repairable: codegen.repairable,
      severity: codegen.severity,
      classifier: 'codegen',
    };
  }

  if (/explicit model override.*unavailable|unknown_model|blocked for architecture/i.test(signal)) {
    return {
      failure_family: 'ROUTING_MODEL_UNAVAILABLE',
      playbook: 'ROUTING_MODEL_UNAVAILABLE',
      repairable: true,
      severity: 'P2',
      classifier: 'routing_probe',
    };
  }

  if (/refusing overlay shrink|overlay.*lines on disk/i.test(signal)) {
    return {
      failure_family: 'ZONE3_PATCH',
      playbook: 'ZONE3_PATCH',
      repairable: true,
      severity: 'P1',
      classifier: 'overlay_shrink',
    };
  }

  if (/outside the builder safe-scope|safe.scope|out_of_scope/i.test(signal)) {
    return {
      failure_family: 'SAFE_SCOPE_BLOCKED',
      playbook: 'SAFE_SCOPE_BLOCKED',
      repairable: true,
      severity: 'P2',
      classifier: 'safe_scope',
    };
  }

  if (/target_file not in placement|missing_target|builder_missing_target/i.test(signal)) {
    return {
      failure_family: 'MISSING_TARGET',
      playbook: 'MISSING_TARGET',
      repairable: true,
      severity: 'P2',
      classifier: 'placement',
    };
  }

  if (/zone3_patch|zone3 patch/i.test(signal)) {
    return {
      failure_family: 'ZONE3_PATCH',
      playbook: 'ZONE3_PATCH',
      repairable: true,
      severity: 'P1',
      classifier: 'precommit',
    };
  }

  if (STAGE_FAMILY[stage]) {
    const family = STAGE_FAMILY[stage];
    return {
      failure_family: family,
      playbook: family,
      repairable: family !== 'COMMIT_TRANSPORT',
      severity: 'P2',
      classifier: 'stage_map',
    };
  }

  return {
    failure_family: 'other',
    playbook: 'UNKNOWN',
    repairable: false,
    severity: 'P2',
    classifier: 'unclassified',
    signal: signal.slice(0, 240),
  };
}

/**
 * Classify runtime/boot/deploy log failures into BuilderOS self-repair families (Wave 0 #12).
 * @param {{ error?: string, log?: string, code?: string, stage?: string }} input
 */
export function classifyRuntimeFailure({ error = '', log = '', code = '', stage = '' } = {}) {
  const signal = joinSignals([error, log, code, stage]);

  if (/err_module_not_found|cannot find module|module not found/.test(signal)) {
    return {
      failure_family: 'BOOT_IMPORT_MISSING',
      repairable: true,
      severity: 'P0',
      self_repair_class: 'commit_missing_import_or_remove_import',
      signal: signal.slice(0, 240),
    };
  }
  if (/syntaxerror|unexpected token|unexpected identifier/.test(signal)) {
    return {
      failure_family: 'BOOT_SYNTAX',
      repairable: true,
      severity: 'P0',
      self_repair_class: 'syntax_fix',
      signal: signal.slice(0, 240),
    };
  }
  if (/content.?pin|sha256 mismatch|exact_output_contract|pin drift/.test(signal)) {
    return {
      failure_family: 'VERIFIER_DRIFT',
      repairable: true,
      severity: 'P1',
      self_repair_class: 're_pin_content_or_restore_bytes',
      signal: signal.slice(0, 240),
    };
  }
  if (/stale|deploy.*behind|proof.*stale|dr-003|deploy_does_not_serve/.test(signal)) {
    return {
      failure_family: 'DEPLOY_STALE',
      repairable: true,
      severity: 'P1',
      self_repair_class: 'redeploy_and_prove_sha',
      signal: signal.slice(0, 240),
    };
  }
  if (/econnreset|enotfound|etimedout|502|503|504|rate.?limit|provider/.test(signal)) {
    return {
      failure_family: 'EXTERNAL_FAILURE',
      repairable: true,
      severity: 'P1',
      self_repair_class: 'park_and_retry',
      signal: signal.slice(0, 240),
    };
  }
  if (/missing.*(key|token|secret|password)|unauthorized/.test(signal)) {
    return {
      failure_family: 'SECRET_MISSING',
      repairable: false,
      severity: 'P0',
      self_repair_class: 'page_human_for_secret',
      signal: signal.slice(0, 240),
    };
  }
  return {
    failure_family: 'UNKNOWN_RUNTIME',
    repairable: false,
    severity: 'P2',
    self_repair_class: 'escalate',
    signal: signal.slice(0, 240),
  };
}

export function summarizeGapFamilies(rows = []) {
  const buckets = {};
  let other = 0;
  for (const row of rows) {
    const classified =
      row.failure_family && row.failure_family !== 'other'
        ? row
        : { ...row, ...classifyBuilderGap(row) };
    const key = classified.failure_family || 'other';
    buckets[key] = (buckets[key] || 0) + 1;
    if (key === 'other') other += 1;
  }
  const total = rows.length;
  return {
    total,
    other,
    otherPct: total ? Math.round((other / total) * 100) : 100,
    buckets,
  };
}
