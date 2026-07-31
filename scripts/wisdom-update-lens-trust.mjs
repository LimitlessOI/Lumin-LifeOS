/**
 * SYNOPSIS: CLI to update Lens Registry trust scores from reality outcomes.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import {
  updateLensRegistryFromOutcomes,
  readOutcomesFromLedger,
  readOutcomesFromSentryReceipts,
  readOutcomesFromReceiptAuditor,
  DEFAULT_REGISTRY_PATH,
  DEFAULT_LEDGER_PATH,
  DEFAULT_RECEIPT_DIR,
} from '../services/wisdom-reality-update.mjs';

const dryRun = process.argv.includes('--dry-run');
const registryPath = process.env.LENS_REGISTRY_PATH || DEFAULT_REGISTRY_PATH;
const ledgerPath = process.env.ROI_LEDGER_PATH || DEFAULT_LEDGER_PATH;
const receiptDir = process.env.SENTRY_RECEIPT_DIR || DEFAULT_RECEIPT_DIR;
const auditPath = process.env.RECEIPT_AUDITOR_PATH || undefined;

const outcomes = [
  ...readOutcomesFromLedger(ledgerPath),
  ...readOutcomesFromSentryReceipts(receiptDir),
  ...readOutcomesFromReceiptAuditor(auditPath),
];

const result = updateLensRegistryFromOutcomes({ outcomes, registryPath, dryRun });
console.log(JSON.stringify({
  dry_run: result.dryRun,
  registry_path: registryPath,
  update_count: result.updates.length,
  updates: result.updates,
}, null, 2));

process.exit(result.updates.length > 0 || dryRun ? 0 : 1);
