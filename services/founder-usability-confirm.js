/**
 * SYNOPSIS: Founder usability confirm — only Adam can set founder_usability_pass true.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBpItem, writeJson, BP_PRIORITY_REL } from './bp-priority-sync.js';
import { loadBpPriority } from './bp-priority-queue.js';
import { createAdfPredictionLedger } from './adf-prediction-ledger.js';
import { syncFounderUsabilityArtifacts } from './builderos-artifact-sync.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');

function readJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function confirmFounderUsability({
  missionId,
  pass,
  quote = '',
  actor = 'founder',
  root = REPO_ROOT,
} = {}) {
  const id = String(missionId || '').trim();
  if (!id) {
    return { ok: false, error: 'mission_id required' };
  }
  if (typeof pass !== 'boolean') {
    return { ok: false, error: 'pass must be boolean' };
  }
  const trimmedQuote = String(quote || '').trim();
  if (pass && trimmedQuote.length < 12) {
    return {
      ok: false,
      error: 'founder_quote required (min 12 chars) when pass=true — verbal agreement is the scoreboard',
    };
  }

  const bp = loadBpPriority({ root });
  const item = findBpItem(bp, id);
  if (!item) {
    return { ok: false, error: `mission ${id} not in BP_PRIORITY active queue` };
  }

  const verdictPath = path.join(MISSIONS_ROOT, id, 'OBJECTIVE_VERDICT.json');
  const verdict = readJson(verdictPath);
  if (!verdict) {
    return { ok: false, error: `OBJECTIVE_VERDICT.json missing for ${id}` };
  }

  const technicalOk = ['TECHNICAL_PASS', 'PASS', 'OBJECTIVE_COMPLETE'].includes(
    String(verdict.verdict || '').toUpperCase(),
  );
  if (pass && !technicalOk) {
    return {
      ok: false,
      error: 'Cannot founder-pass before technical acceptance — run acceptance first',
      verdict: verdict.verdict,
    };
  }

  const now = new Date().toISOString();
  verdict.founder_usability_pass = pass;
  verdict.founder_usability_at = now;
  verdict.founder_usability_quote = pass ? trimmedQuote : (trimmedQuote || null);
  verdict.founder_usability_actor = actor;
  fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`);

  item.founder_usability_pass = pass;
  if (pass) {
    item.founder_usability_at = now;
    item.verdict = 'FOUNDER_PASS';
  }
  bp.updated_at = now.slice(0, 10);
  writeJson(BP_PRIORITY_REL, bp, { root });

  const receiptPath = path.join(MISSIONS_ROOT, id, 'FOUNDER_USABILITY_CONFIRM.json');
  const receipt = {
    schema: 'founder_usability_confirm_v1',
    mission_id: id,
    pass,
    quote: trimmedQuote || null,
    actor,
    at: now,
    objective_verdict: verdictPath.replace(`${root}/`, '').replace(/\\/g, '/'),
    founder_success_test: verdict.founder_success_test || item.founder_success_test || null,
  };
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  const artifactSync = syncFounderUsabilityArtifacts({
    missionId: id,
    pass,
    root,
    at: now,
  });

  return {
    ok: true,
    mission_id: id,
    founder_usability_pass: pass,
    receipt_path: receiptPath.replace(`${root}/`, '').replace(/\\/g, '/'),
    point_b_reached: artifactSync.point_b_complete === true,
    artifact_sync: {
      mode: artifactSync.mode,
      readiness_report: artifactSync.readiness?.path || null,
      freshness_status: artifactSync.freshness?.item?.artifact_sync?.status || null,
    },
  };
}

export async function scorePredictionsForMissionUsability(missionId, { pass, quote, root = REPO_ROOT } = {}) {
  const ledger = createAdfPredictionLedger({ rootDir: root });
  const open = await ledger.listPredictions({ status: 'open' });
  const actual = await ledger.listPredictions({ status: 'actual_recorded' });
  const candidates = [...open, ...actual].filter(
    ({ receipt }) => receipt.context?.mission_id === missionId,
  );
  const scored = [];
  const verdict = pass ? 'APPROVE' : 'REJECT';
  for (const { receipt } of candidates) {
    if (receipt.status === 'scored') continue;
    try {
      if (receipt.status === 'open') {
        await ledger.recordActual(receipt.prediction_id, {
          recorder: 'founder_usability_confirm',
          adam_verdict: verdict,
          adam_quote: quote || `Founder usability ${pass ? 'PASS' : 'FAIL'} for ${missionId}`,
        });
      }
      const result = await ledger.scorePrediction(receipt.prediction_id, {
        variance_notes: pass ? 'Founder usability confirmed' : 'Founder usability rejected',
      });
      scored.push(result.receipt.prediction_id);
    } catch {
      // skip predictions that cannot be scored yet
    }
  }
  return { scored_count: scored.length, prediction_ids: scored };
}
