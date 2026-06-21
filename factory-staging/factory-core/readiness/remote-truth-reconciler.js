/**
 * SYNOPSIS: Remote truth reconciler — GitHub (receipts), factory-staging, readiness in one surface.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../builder/run-step.js';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Remote truth reconciler — GitHub (receipts), factory-staging, readiness in one surface.
 */
export function reconcileRemoteTruth() {
  const sources = {
    github_main: null,
    readiness: null,
    factory_ci: null,
    receipts: {},
  };
  const gaps = [];

  const readinessPath = path.join(REPO_ROOT, 'builderos-reboot/READINESS_REPORT.json');
  if (fs.existsSync(readinessPath)) {
    sources.readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
  } else {
    gaps.push('READINESS_REPORT.json missing');
  }

  for (const name of ['DETERMINISM_RECEIPT', 'DUPLICATION_RECEIPT', 'FULL_LOOP_PROOF_RECEIPT']) {
    const p = path.join(REPO_ROOT, `builderos-reboot/${name}.json`);
    if (fs.existsSync(p)) {
      sources.receipts[name] = JSON.parse(fs.readFileSync(p, 'utf8'));
    } else {
      gaps.push(`${name}.json missing`);
    }
  }

  const certPath = path.join(REPO_ROOT, 'builderos-reboot/PROJECT_CERTIFICATION.json');
  if (fs.existsSync(certPath)) {
    sources.certification = JSON.parse(fs.readFileSync(certPath, 'utf8'));
    if (sources.certification.levels?.FULLY_MACHINE_READY === true) {
      gaps.push('FULLY_MACHINE_READY overclaim in certification');
    }
  }

  const historianPath = path.join(FACTORY_ROOT, 'data/historian-records.jsonl');
  const tsosPath = path.join(FACTORY_ROOT, 'data/tsos-step-metrics.jsonl');
  sources.local_ledger = {
    historian_exists: fs.existsSync(historianPath),
    tsos_exists: fs.existsSync(tsosPath),
  };

  return {
    ok: gaps.length === 0,
    reconciled_at: new Date().toISOString(),
    sources,
    gaps,
    doctrine: 'GitHub=source, Railway=runtime, Neon=data, local=mirror',
  };
}
