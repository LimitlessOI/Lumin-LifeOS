/**
 * SYNOPSIS: Council is imported byte-for-byte but NOT live-wired in factory-staging.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CANON_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const RECEIPT_PATH = path.join(CANON_DIR, 'COUNCIL_IMPORT_RECEIPT.json');
const SERVICE_PATH = path.join(CANON_DIR, 'council-service.js');

/**
 * Council is imported byte-for-byte but NOT live-wired in factory-staging.
 * This adapter is the only supported entry point for council status checks.
 */
export function getCouncilAdapterStatus() {
  const receipt = fs.existsSync(RECEIPT_PATH)
    ? JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'))
    : null;

  return {
    adapter_mode: 'QUARANTINE_READ_ONLY',
    live_wiring: false,
    imported: fs.existsSync(SERVICE_PATH),
    receipt,
    allowed_operations: ['status', 'health_check'],
    forbidden_operations: ['callCouncilMember', 'live_dispatch', 'auto_route'],
  };
}

export function assertCouncilQuarantine() {
  if (process.env.COUNCIL_LIVE === '1' || process.env.COUNCIL_LIVE_WIRING === '1') {
    throw new Error('Council live wiring is forbidden in factory-staging quarantine mode');
  }
  return true;
}
