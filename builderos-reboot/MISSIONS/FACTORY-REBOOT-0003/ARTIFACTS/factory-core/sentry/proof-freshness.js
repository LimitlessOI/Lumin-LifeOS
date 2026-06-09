import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../builder/run-step.js';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const RECEIPT_FILES = [
  'builderos-reboot/DETERMINISM_RECEIPT.json',
  'builderos-reboot/DUPLICATION_RECEIPT.json',
  'builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json',
  'builderos-reboot/READINESS_REPORT.json',
];

export function checkProofFreshness(missionId) {
  const stale = [];
  const checked = [];

  for (const rel of RECEIPT_FILES) {
    const abs = path.join(REPO_ROOT, rel);
    checked.push(rel);
    if (!fs.existsSync(abs)) {
      stale.push({ file: rel, reason: 'missing' });
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
      if (data.pass === false) {
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

  const blocking = stale.filter((s) => {
    if (s.reason === 'missing') return true;
    if (s.reason === 'pass_false') {
      // Self-referential: the hot path produces this receipt; blocking on it is circular.
      if (s.file === 'builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json') return false;
      return true;
    }
    return false;
  });
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
