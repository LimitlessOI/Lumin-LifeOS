import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const POLICY_PATH = path.join(ROOT, 'policies', 'execution_gate_policy.json');

function loadPolicy() {
  try {
    const raw = fs.readFileSync(POLICY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    // Fallback defaults if policy missing
    return {
      severity_threshold_block: 45,
      severity_threshold_review: 25,
      required_fields: ["id", "timestamp", "proposal", "severity", "risks", "mitigations", "block_execution"],
    };
  }
}

function validateRequiredFields(report, required) {
  const missing = required.filter((k) => report[k] === undefined || report[k] === null);
  return missing;
}

/**
 * Evaluate execution gate for an FSAR-like report.
 * @param {object} report - includes severity, block_execution, required fields per policy
 * @returns {{ allow: boolean, reason: string, requires_human_review: boolean }}
 */
export function evaluateExecutionGate(report) {
  const policy = loadPolicy();

  if (!report || typeof report !== 'object') {
    return { allow: false, reason: 'Invalid report payload', requires_human_review: true };
  }

  const missing = validateRequiredFields(report, policy.required_fields || []);
  if (missing.length > 0) {
    return {
      allow: false,
      reason: `Missing required fields: ${missing.join(', ')}`,
      requires_human_review: true,
    };
  }

  const severity = Number(report.severity ?? 0);
  const blockFlag = !!report.block_execution;
  const blockThreshold = Number(policy.severity_threshold_block ?? 45);
  const reviewThreshold = Number(policy.severity_threshold_review ?? 25);

  if (blockFlag || severity >= blockThreshold) {
    return {
      allow: false,
      reason: blockFlag
        ? 'FSAR block_execution=true'
        : `Severity ${severity} >= block threshold ${blockThreshold}`,
      requires_human_review: true,
    };
  }

  if (severity >= reviewThreshold) {
    return {
      allow: true,
      reason: `Severity ${severity} >= review threshold ${reviewThreshold}`,
      requires_human_review: true,
    };
  }

  return {
    allow: true,
    reason: `Severity ${severity} below review threshold ${reviewThreshold}`,
    requires_human_review: false,
  };
}

export default evaluateExecutionGate;
