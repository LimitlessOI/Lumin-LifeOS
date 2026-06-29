/**
 * SYNOPSIS: Classify self-repair memory lessons from observable lesson fields only.
 * Classify self-repair memory lessons from observable lesson fields only.
 * Unknown → UNKNOWN (never guessed).
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

export const LESSON_CLASSIFICATIONS = Object.freeze([
  'deploy_drift',
  'proof_store_mismatch',
  'fake_green',
  'stale_receipt',
  'builder_output_error',
  'oil_missed_issue',
  'UNKNOWN',
]);

const VERIFICATION_PATH_BY_CLASS = Object.freeze({
  deploy_drift: 'GET /api/v1/lifeos/command-center/proof-freshness',
  stale_receipt: 'GET /api/v1/gemini/proof/status',
  proof_store_mismatch: 'GET /api/v1/lifeos/command-center/self-repair/audit',
  fake_green: 'GET /lifeos-command-center',
  builder_output_error: 'node --check on changed JS file',
  oil_missed_issue: 'GET /api/v1/lifeos/command-center/self-repair/oil-misses',
});

function lessonText(lesson = {}) {
  return [
    lesson.issue_detected,
    lesson.lesson_learned,
    lesson.repair_id,
    lesson.stopped_reason,
    lesson.prevention_rule,
    lesson.repair_chain_run,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Classify one repair lesson using only fields present on the lesson object.
 */
export function classifyRepairLesson(lesson = {}) {
  if (!lesson || typeof lesson !== 'object') {
    return { classification: 'UNKNOWN', signals: [], verification_path: null };
  }

  const text = lessonText(lesson);
  const signals = [];

  if (/local_proof_only|proof_store mismatch|proof store|local vs railway|local_proof/.test(text)) {
    signals.push('proof_store_text');
    return classifyResult('proof_store_mismatch', signals);
  }

  if (/fake green|ui_fake_green|fake_green|fake fallback/.test(text)) {
    signals.push('fake_green_text');
    return classifyResult('fake_green', signals);
  }

  if (/oil.miss|oil_missed|oil-sec-find|what_oil_missed|miss_category/.test(text)) {
    signals.push('oil_miss_text');
    return classifyResult('oil_missed_issue', signals);
  }

  if (
    /step_failed|builder output|import error|syntax error|node --check|builder_output/.test(text) ||
    lesson.stopped_reason?.startsWith('step_failed:')
  ) {
    signals.push('builder_error_text');
    return classifyResult('builder_output_error', signals);
  }

  if (/deploy drift/.test(lesson.issue_detected || '') || /rolling deploy|deploy-check|mid-rollout|mid-chain/.test(text)) {
    signals.push('deploy_drift_text');
    return classifyResult('deploy_drift', signals);
  }

  if (
    lesson.repair_id === 'DR-003-RECEIPT-STALE' ||
    /receipt_stale_runtime|receipt sha|dr-003|pf-001|stale runtime proof/.test(text)
  ) {
    signals.push('stale_receipt_fields');
    return classifyResult('stale_receipt', signals);
  }

  if (lesson.proof_status_before === 'STALE' && lesson.result === 'PASS' && lesson.repair_id) {
    signals.push('stale_to_current_pass');
    return classifyResult('stale_receipt', signals);
  }

  return classifyResult('UNKNOWN', signals);
}

function classifyResult(classification, signals) {
  return {
    classification,
    signals,
    verification_path: VERIFICATION_PATH_BY_CLASS[classification] || null,
  };
}

/** Attach classification to each lesson (read-time enrichment). */
export function enrichLessonsWithClassification(lessons = []) {
  return lessons.map((lesson) => {
    const { classification, signals, verification_path } = classifyRepairLesson(lesson);
    return {
      ...lesson,
      classification,
      classification_signals: signals,
      verification_path,
    };
  });
}

export function getVerificationPathForClassification(classification) {
  return VERIFICATION_PATH_BY_CLASS[classification] || null;
}
