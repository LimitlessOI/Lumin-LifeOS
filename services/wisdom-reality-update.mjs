/**
 * SYNOPSIS: Wisdom reality update — adjusts Lens Registry trust scores and
 * performs_well / performs_poorly / disagreement_profile from SENTRY and Receipt
 * Auditor outcomes. Does not touch user-specific cognitive-core-judgment tables.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_REGISTRY_PATH = path.join(ROOT, 'data', 'lenses', 'LENS_REGISTRY.json');
export const DEFAULT_RECEIPT_DIR = path.join(ROOT, 'products', 'receipts');
export const DEFAULT_LEDGER_PATH = path.join(ROOT, 'data', 'model-roi-ledger.jsonl');

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function computeTrustUpdate(current, outcome, learningRate = 0.05) {
  if (outcome === 'pass') return clamp(current + learningRate, 0, 1);
  if (outcome === 'fail') return clamp(current - learningRate, 0, 1);
  return current;
}

export function readOutcomesFromLedger(ledgerPath = DEFAULT_LEDGER_PATH) {
  if (!fs.existsSync(ledgerPath)) return [];
  return fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean).map((e) => ({
    lens_id: e.lens_id,
    model: e.model,
    outcome: e.outcome,
    source: 'model-roi-ledger',
    ts: e.ts,
  }));
}

export function readOutcomesFromSentryReceipts(receiptDir = DEFAULT_RECEIPT_DIR) {
  if (!fs.existsSync(receiptDir)) return [];
  const files = fs.readdirSync(receiptDir).filter((f) => f.startsWith('SENTRY_') && f.endsWith('.json'));
  const outcomes = [];
  for (const f of files) {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(receiptDir, f), 'utf8'));
      const meta = r.step_id ? String(r.step_id) : '';
      const lensMatch = meta.match(/lens-([a-z0-9-]+)/);
      outcomes.push({
        lens_id: r.lens_id || (lensMatch ? lensMatch[1] : 'unknown'),
        model: r.verified_by || 'sentry-reality-station',
        outcome: r.passed === true ? 'pass' : 'fail',
        source: 'sentry-reality-station',
        ts: r.run_at,
      });
    } catch {}
  }
  return outcomes;
}

export function readOutcomesFromReceiptAuditor(auditPath) {
  if (!auditPath || !fs.existsSync(auditPath)) return [];
  try {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    const outcomes = [];
    if (audit.results && Array.isArray(audit.results)) {
      for (const r of audit.results) {
        outcomes.push({
          lens_id: r.lens_id || 'unknown',
          model: r.model || 'receipt-auditor',
          outcome: r.verdict === 'PASS' ? 'pass' : (r.verdict === 'FAIL' ? 'fail' : 'unknown'),
          source: 'receipt-auditor',
          ts: r.checked_at,
        });
      }
    }
    return outcomes;
  } catch {
    return [];
  }
}

/**
 * Apply reality outcomes to the Lens Registry. Trust scores and confidence move
 * toward pass/fail evidence; performs_well/poorly track which models succeeded or
 * failed per lens; disagreement_profile captures repeated conflicts.
 */
export function updateLensRegistryFromOutcomes({
  outcomes = [],
  registryPath = DEFAULT_REGISTRY_PATH,
  dryRun = false,
  learningRate = 0.05,
} = {}) {
  const raw = fs.readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(raw);
  const updates = [];

  for (const o of outcomes) {
    if (!o.lens_id || o.lens_id === 'unknown') continue;
    const lens = registry.lenses?.find((l) => l.lens_id === o.lens_id);
    if (!lens) continue;

    const oldTrust = typeof lens.trust_score === 'number' ? lens.trust_score : 0.5;
    const newTrust = computeTrustUpdate(oldTrust, o.outcome, learningRate);
    const delta = newTrust - oldTrust;
    lens.trust_score = newTrust;
    lens.confidence = clamp((lens.confidence ?? 0.5) + delta, 0, 1);

    if (o.outcome === 'pass') {
      lens.performs_well = [...new Set([...(lens.performs_well || []), o.model])].slice(-10);
    } else if (o.outcome === 'fail') {
      lens.performs_poorly = [...new Set([...(lens.performs_poorly || []), o.model])].slice(-10);
    }

    if (!Array.isArray(lens.disagreement_profile)) lens.disagreement_profile = [];
    if (o.outcome === 'fail') {
      lens.disagreement_profile.push({ lens_id: o.lens_id, typical_conflict: `model ${o.model} failed reality check at ${o.ts || new Date().toISOString()}` });
      if (lens.disagreement_profile.length > 20) lens.disagreement_profile = lens.disagreement_profile.slice(-20);
    }

    updates.push({ lens_id: o.lens_id, model: o.model, old_trust: oldTrust, new_trust: newTrust, delta, outcome: o.outcome, source: o.source });
  }

  if (!dryRun) {
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  }

  return { registry, updates, dryRun, learningRate };
}
