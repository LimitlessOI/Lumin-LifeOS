/**
 * BuilderOS BP/PBB planner — turns OIL findings into one executable build plan.
 * Deterministic planner for the minimal governed loop bridge.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { randomUUID } from 'crypto';

function normalizeText(value) {
  return String(value || '').trim();
}

export function generatePbbPlanFromOilAudit(job, oilAudit, options = {}) {
  if (!oilAudit?.ok) {
    return {
      ok: false,
      error: 'oil_audit_failed',
      oil_findings: oilAudit?.findings || [],
    };
  }

  const metadata = job?.metadata_json && typeof job.metadata_json === 'object' ? job.metadata_json : {};
  const instruction = normalizeText(job?.instruction);
  const targetFile = normalizeText(metadata.target_file) || null;
  const domain = normalizeText(metadata.domain) || 'builderos-platform';
  const repairAttempt = Number(options.repairAttempt || 0);
  const verifierResult = options.verifierResult || null;

  let spec = [
    'BuilderOS-only governed loop execution.',
    'Do not modify LifeOS user features or TSOS customer-facing surfaces.',
    'Implement exactly what the instruction asks for inside approved builder safe scope.',
    `Instruction: ${instruction}`,
  ].join('\n');

  if (repairAttempt > 0 && verifierResult) {
    spec += `\n\nOIL verifier rejection (attempt ${repairAttempt}):\n`;
    spec += `- first_failure: ${verifierResult.first_failure || 'unknown'}\n`;
    if (verifierResult.syntax_error) spec += `- syntax_error: ${verifierResult.syntax_error}\n`;
    if (Array.isArray(verifierResult.stub_signals) && verifierResult.stub_signals.length) {
      spec += `- stub_signals: ${verifierResult.stub_signals.join('; ')}\n`;
    }
    spec += 'Revise the output to pass syntax, antipattern, and stub gates with complete working code.';
  }

  const task = repairAttempt > 0
    ? `Repair BuilderOS change after OIL verifier rejection: ${instruction}`
    : `Execute BuilderOS instruction: ${instruction}`;

  const commitSuffix = repairAttempt > 0 ? ` repair-${repairAttempt}` : '';
  const commitMessage = `[system-build] BuilderOS governed loop job ${job.id}${commitSuffix}`;

  return {
    ok: true,
    plan_id: randomUUID(),
    task,
    spec,
    target_file: targetFile,
    domain,
    mode: 'code',
    commit_message: commitMessage,
    builder_scope: 'builderos-only',
    repair_attempt: repairAttempt,
    planned_at: new Date().toISOString(),
  };
}
