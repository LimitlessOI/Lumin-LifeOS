/**
 * BuilderOS Sentry boundary audit for queued C2 instructions.
 * Deterministic supervisor checks — no council call on this step.
 * Zone 3 files (>150 lines) are not blocked — they are routed to
 * extract-helper patch mode so Builder creates a new Zone 1 helper
 * instead of rewriting the large file.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { isSafeTarget } from '../config/builder-safe-scope.js';
import { classifyBuildTarget, generatePatchSpec } from './builderos-patch-mode-policy.js';

const MIN_INSTRUCTION_LENGTH = 12;
const DANGEROUS_PATTERNS = [
  'DROP TABLE',
  'DELETE DATABASE',
  'EXPOSE SECRET',
  'ROTATE PROD SECRET',
  'IRREVERSIBLE_LAUNCH',
];

const LIFEOS_PRODUCT_MARKERS = [
  '/lifeos/family',
  '/lifeos/children',
  '/lifeos/mediation',
  'lifeos-dashboard',
  'clientcare',
  'boldtrail',
];

const TSOS_CUSTOMER_MARKERS = [
  'tsos customer',
  'token saver customer',
  'customer-facing tsos',
];

function normalizeText(value) {
  return String(value || '').trim();
}

function pushFinding(findings, code, severity, message) {
  findings.push({ code, severity, message });
}

export function auditCommandControlJobBoundary(job, haltState = {}) {
  const findings = [];
  const instruction = normalizeText(job?.instruction);
  const metadata = job?.metadata_json && typeof job.metadata_json === 'object' ? job.metadata_json : {};
  const targetFile = normalizeText(metadata.target_file) || null;
  const upper = instruction.toUpperCase();

  if (haltState?.active) {
    pushFinding(findings, 'GLOBAL_HALT', 'HIGH', 'Global halt is active');
  }
  if (!instruction) {
    pushFinding(findings, 'EMPTY_INSTRUCTION', 'HIGH', 'Instruction is empty');
  } else if (instruction.length < MIN_INSTRUCTION_LENGTH) {
    pushFinding(findings, 'INSUFFICIENT_INSTRUCTION', 'HIGH', 'Instruction is too short for governed execution');
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (upper.includes(pattern)) {
      pushFinding(findings, 'OUTSIDE_PB_BOUNDARY', 'HIGH', `Instruction matches blocked pattern: ${pattern}`);
      break;
    }
  }

  const lower = instruction.toLowerCase();
  for (const marker of LIFEOS_PRODUCT_MARKERS) {
    if (lower.includes(marker)) {
      pushFinding(findings, 'LIFEOS_PRODUCT_DRIFT', 'HIGH', `Instruction references LifeOS product surface: ${marker}`);
    }
  }
  for (const marker of TSOS_CUSTOMER_MARKERS) {
    if (lower.includes(marker)) {
      pushFinding(findings, 'TSOS_CUSTOMER_DRIFT', 'HIGH', `Instruction references TSOS customer surface: ${marker}`);
    }
  }

  if (targetFile) {
    if (!isSafeTarget(targetFile)) {
      pushFinding(findings, 'UNSAFE_TARGET', 'HIGH', `target_file is outside builder safe scope: ${targetFile}`);
    } else {
      const zone = classifyBuildTarget(targetFile);
      if (zone.zone === 4) {
        pushFinding(findings, 'ZONE4_BLOCKED', 'HIGH', zone.reason);
      }
      if (zone.zone === 3) {
        findings.push({
          code: 'ZONE3_PATCH_SPEC_ATTACHED',
          severity: 'MEDIUM',
          message: zone.reason,
          patch_spec: generatePatchSpec(zone.reason, targetFile, zone.lineCount),
        });
      }
    }
  }

  const verdict = findings.some((f) => f.severity === 'HIGH') ? 'FAIL' : 'PASS';
  return {
    ok: verdict === 'PASS',
    verdict,
    findings,
    audited_at: new Date().toISOString(),
    audit_mode: 'deterministic_boundary',
  };
}
