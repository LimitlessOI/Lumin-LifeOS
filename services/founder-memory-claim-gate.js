/**
 * SYNOPSIS: Receipt-linked founder claim verification — no citation => UNVERIFIED.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo-root.js';
import { createFounderMemoryStore } from './founder-memory-store.js';

function readGovernanceEntry(receiptId) {
  const dir = path.join(REPO_ROOT, 'builderos-reboot/governance/decisions');
  if (!fs.existsSync(dir)) return null;
  const match = fs.readdirSync(dir).find((name) => name.includes(receiptId));
  if (!match) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, match), 'utf8'));
  } catch {
    return null;
  }
}

export async function verifyFounderClaim({ claim, receiptId, pool } = {}) {
  const text = String(claim || '').trim();
  if (!text) {
    return { ok: false, label: 'UNVERIFIED', reason: 'empty_claim' };
  }
  if (!receiptId) {
    return { ok: false, label: 'UNVERIFIED', reason: 'missing_receipt_citation' };
  }

  const store = createFounderMemoryStore(pool);
  let row = await store.getByReceipt(receiptId);
  if (!row) row = readGovernanceEntry(receiptId);
  if (!row) {
    return { ok: false, label: 'UNVERIFIED', reason: 'receipt_not_found', receipt_id: receiptId };
  }

  const content = String(row.content || row.content_preview || '').toLowerCase();
  const claimLower = text.toLowerCase();
  const tokens = claimLower.split(/\W+/).filter((w) => w.length > 4).slice(0, 8);
  const matched = tokens.filter((t) => content.includes(t));
  const supported = matched.length >= Math.min(2, tokens.length) || content.includes(claimLower.slice(0, 40));

  if (!supported && row.classification !== 'decision') {
    return {
      ok: false,
      label: 'UNVERIFIED',
      reason: 'receipt_does_not_support_claim',
      receipt_id: receiptId,
      entry: row,
    };
  }

  return {
    ok: true,
    label: row.classification === 'decision' ? 'KNOW' : 'THINK',
    receipt_id: receiptId,
    entry: row,
    matched_tokens: matched,
  };
}

export function downgradeClaimWithoutReceipt(claimPayload = {}) {
  if (claimPayload.receipt_id || claimPayload.citation_receipt_id) {
    return claimPayload;
  }
  return {
    ...claimPayload,
    label: 'UNVERIFIED',
    verified: false,
    reason: 'founder_claim_missing_receipt_citation',
  };
}
