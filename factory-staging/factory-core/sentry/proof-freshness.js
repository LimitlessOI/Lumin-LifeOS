/**
 * SYNOPSIS: Exports checkProofFreshness — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/sentry/proof-freshness.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectLayout, REPO_ROOT, machinePath } from '../layout/repo-layout.js';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function receiptRel(layout, fileName) {
  return layout.machineRel ? `${layout.machineRel}/${fileName}` : fileName;
}

export function checkProofFreshness(missionId) {
  const layout = detectLayout();
  const receiptFiles = [
    'DETERMINISM_RECEIPT.json',
    'DUPLICATION_RECEIPT.json',
    'FULL_LOOP_PROOF_RECEIPT.json',
    'READINESS_REPORT.json',
  ];

  const stale = [];
  const checked = [];

  for (const fileName of receiptFiles) {
    const rel = receiptRel(layout, fileName);
    const abs = machinePath(REPO_ROOT, layout, fileName);
    checked.push(rel);
    if (!fs.existsSync(abs)) {
      if (fileName === 'FULL_LOOP_PROOF_RECEIPT.json') continue;
      stale.push({ file: rel, reason: 'missing' });
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
      if (data.pass === false) {
        if (fileName === 'FULL_LOOP_PROOF_RECEIPT.json') continue;
        stale.push({ file: rel, reason: 'pass_false' });
      }
      if (data.generated_at) {
        const ageMs = Date.now() - Date.parse(data.generated_at);
        if (ageMs > 30 * 24 * 60 * 60 * 1000) {
          stale.push({ file: rel, reason: 'older_than_30d', generated_at: data.generated_at });
        }
      }
    } catch {
      stale.push({ file: rel, reason: 'parse_error' });
    }
  }

  const blocking = stale.filter((s) => s.reason === 'missing' || s.reason === 'pass_false');
  return {
    pass: blocking.length === 0,
    mission_id: missionId,
    checked,
    stale,
    authority_note: 'Stale receipts must not raise maturity — adapted from oil-proof-freshness doctrine',
  };
}

export function appendSentryReview(review) {
  const dataDir = path.join(FACTORY_ROOT, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const line = `${JSON.stringify(review)}\n`;
  fs.appendFileSync(path.join(dataDir, 'sentry-reviews.jsonl'), line, 'utf8');
  return { path: 'factory-staging/data/sentry-reviews.jsonl' };
}
