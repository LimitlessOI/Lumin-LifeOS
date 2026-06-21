/**
 * SYNOPSIS: Simulation measurement envelope — every sim records falsifiable predictions for Hist to score later.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../../builder/run-step.js';

const CONTRACT_PATH = path.join(REPO_ROOT, 'builderos-reboot/governance/DEPARTMENT_ROLE_CONTRACT.json');

let cachedContract = null;

export function loadDepartmentRoleContract() {
  if (cachedContract) return cachedContract;
  if (!fs.existsSync(CONTRACT_PATH)) return { seats: {} };
  cachedContract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  return cachedContract;
}

export function measurementEnvelope({ seat, metric_id, predicted, confidence = 'THINK', how_we_know_if_wrong, evidence_path = null }) {
  if (!how_we_know_if_wrong) {
    throw new Error(`simulation measurement missing how_we_know_if_wrong for ${seat}/${metric_id}`);
  }
  return {
    metric_id,
    seat,
    predicted,
    confidence,
    how_we_know_if_wrong,
    evidence_path,
    predicted_at: new Date().toISOString(),
    actual: null,
    scored_at: null,
    match: null,
  };
}

export function attachMeasurementsToReceipt(receipt, seat, measurements) {
  const contract = loadDepartmentRoleContract().seats?.[seat];
  return {
    ...receipt,
    role_contract: {
      seat,
      contract_version: '2.0A',
      title: contract?.title || seat,
      role: contract?.role || null,
    },
    measurements: measurements.map((m) => (typeof m === 'object' && m.metric_id ? m : null)).filter(Boolean),
  };
}

export function validateReceiptMeasurements(receipt, seat) {
  const violations = [];
  const contract = loadDepartmentRoleContract().seats?.[seat];
  if (!contract) return { pass: true, violations: [], skipped: true };

  const measurements = receipt?.measurements || [];
  if (!measurements.length) {
    violations.push(`${seat}:missing measurements envelope`);
  }
  for (const m of measurements) {
    if (!m.how_we_know_if_wrong) {
      violations.push(`${seat}:measurement ${m.metric_id || '?'} missing how_we_know_if_wrong`);
    }
  }

  if (seat === 'SNT' && Array.isArray(receipt.attacks)) {
    for (const a of receipt.attacks) {
      if (a.severity === 'blocking' && a.pass && !a.evidence_if_wrong) {
        violations.push(`SNT:blocking attack "${a.claim}" passed without evidence_if_wrong`);
      }
    }
  }

  return { pass: violations.length === 0, violations, seat };
}
