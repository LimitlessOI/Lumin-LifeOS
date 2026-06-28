/**
 * SYNOPSIS: Append-only Reality Record store — one object type for institutional memory.
 * @ssot docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REALITY_LEDGER_PATH = path.join(ROOT, 'data/reality-ledger/records.jsonl');

const REQUIRED_FIELDS = Object.freeze([
  'id',
  'type',
  'statement',
  'owner',
  'expected_outcome',
  'actual_outcome',
  'lifecycle',
]);

function ensureLedgerDir() {
  fs.mkdirSync(path.dirname(REALITY_LEDGER_PATH), { recursive: true });
}

export function buildRealityRecord({
  type,
  statement,
  owner,
  expected_outcome,
  actual_outcome,
  evidence = [],
  confidence = null,
  lifecycle = 'open',
  cause_of_death = null,
  id = null,
} = {}) {
  const record = {
    id: id || `rr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    type: String(type || 'observation'),
    statement: String(statement || ''),
    evidence: Array.isArray(evidence) ? evidence : [evidence].filter(Boolean),
    confidence,
    owner: String(owner || 'system'),
    expected_outcome: expected_outcome ?? null,
    actual_outcome: actual_outcome ?? null,
    lifecycle: String(lifecycle || 'open'),
    cause_of_death: cause_of_death ?? null,
    recorded_at: new Date().toISOString(),
  };
  for (const field of REQUIRED_FIELDS) {
    if (record[field] == null || record[field] === '') {
      throw new Error(`Reality Record missing required field: ${field}`);
    }
  }
  return record;
}

export function appendRealityRecord(record, { ledgerPath = REALITY_LEDGER_PATH } = {}) {
  const normalized = buildRealityRecord(record);
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(normalized)}\n`, 'utf8');
  return normalized;
}

export function appendRealityRecordFromReceipt(receiptPath, {
  type = 'receipt',
  owner = 'system',
  expected_outcome = null,
  actual_outcome = null,
  statement = null,
} = {}) {
  const rel = String(receiptPath || '').replace(/^\//, '');
  const abs = path.isAbsolute(receiptPath) ? receiptPath : path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`Receipt not found for Reality Record mirror: ${rel}`);
  }
  const receipt = JSON.parse(fs.readFileSync(abs, 'utf8'));
  return appendRealityRecord({
    type,
    owner,
    expected_outcome: expected_outcome ?? receipt.expected_outcome ?? 'receipt_written',
    actual_outcome: actual_outcome ?? (receipt.verdict || (receipt.ok ? 'PASS' : 'FAIL') || receipt.transport_status || 'unknown'),
    statement: statement || `Receipt ${path.basename(abs)} at ${receipt.at || receipt.completed_at || new Date().toISOString()}`,
    evidence: [{ kind: 'receipt', path: rel, schema: receipt.schema || null }],
    confidence: receipt.ok === true || receipt.verdict === 'PASS' ? 1 : 0.5,
    lifecycle: receipt.ok === true || receipt.verdict === 'PASS' ? 'closed' : 'open',
  });
}
