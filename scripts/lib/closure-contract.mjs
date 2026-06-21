/**
 * SYNOPSIS: C09 — Build Closure Contract
 * C09 — Build Closure Contract
 *
 * Every task that enters the per-task loop must record exactly one
 * closure_contract_result event before its cursor advances. Three legal types:
 *
 *   committed_success     — builder returned ok:true, committed:true
 *   skipped_already_valid — SIS1: file exists, validator passed, no build call made
 *   explicit_noncommit_reason — committed:false, reason stated, advance justified or not
 *
 * buildClosureRecord() is a pure function — no I/O, no side effects.
 * The caller (queue) passes the result to logLine().
 * The test suite can import and exercise it without network or filesystem.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

const VALID_TYPES = ['committed_success', 'skipped_already_valid', 'explicit_noncommit_reason'];

/**
 * Builds and validates a closure_contract_result log record.
 *
 * @param {{ closureType: string, taskId: string, lane: string, proof: object, okToAdvance: boolean }} opts
 * @returns {{ event: string, task_id: string, lane: string, closure_type: string, proof: object, ok_to_advance: boolean }}
 * @throws {Error} on contract violation (wrong type, missing proof fields)
 */
export function buildClosureRecord({ closureType, taskId, lane, proof, okToAdvance }) {
  if (!VALID_TYPES.includes(closureType)) {
    throw new Error(
      `C09 contract violation: closure_type "${closureType}" is not one of ${VALID_TYPES.join(' | ')}`,
    );
  }

  if (closureType === 'committed_success') {
    if (!proof?.ok || !proof?.committed) {
      throw new Error(
        'C09 contract violation: committed_success requires proof.ok=true AND proof.committed=true',
      );
    }
    if (okToAdvance !== true) {
      throw new Error('C09 contract violation: committed_success must have okToAdvance=true');
    }
  }

  if (closureType === 'skipped_already_valid') {
    if (!proof?.target_file || !proof?.validator) {
      throw new Error(
        'C09 contract violation: skipped_already_valid requires proof.target_file AND proof.validator',
      );
    }
    if (okToAdvance !== true) {
      throw new Error('C09 contract violation: skipped_already_valid must have okToAdvance=true');
    }
  }

  if (closureType === 'explicit_noncommit_reason') {
    if (!proof?.reason || proof?.committed !== false) {
      throw new Error(
        'C09 contract violation: explicit_noncommit_reason requires proof.reason AND proof.committed=false',
      );
    }
  }

  return {
    event: 'closure_contract_result',
    task_id: taskId,
    lane,
    closure_type: closureType,
    proof,
    ok_to_advance: Boolean(okToAdvance),
  };
}

/**
 * Validates that a raw log line (parsed JSON) is a well-formed closure record.
 * Used by auditors and tests.
 *
 * @param {object} record
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateClosureRecord(record) {
  if (!record || typeof record !== 'object') return { valid: false, reason: 'not an object' };
  if (record.event !== 'closure_contract_result') return { valid: false, reason: 'wrong event type' };
  if (!record.task_id) return { valid: false, reason: 'missing task_id' };
  if (!record.lane) return { valid: false, reason: 'missing lane' };
  if (!VALID_TYPES.includes(record.closure_type)) return { valid: false, reason: `invalid closure_type: ${record.closure_type}` };
  if (!record.proof || typeof record.proof !== 'object') return { valid: false, reason: 'missing proof object' };
  if (typeof record.ok_to_advance !== 'boolean') return { valid: false, reason: 'ok_to_advance must be boolean' };
  return { valid: true };
}
