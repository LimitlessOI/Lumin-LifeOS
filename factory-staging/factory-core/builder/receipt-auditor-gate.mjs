/**
 * SYNOPSIS: Receipt Auditor factory gate — replay a step's PASS receipt and,
 * if the verdict is FAIL or UNREPRODUCIBLE, reset the step status so it cannot
 * be falsely marked done.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { auditReceipt } from '../../../services/receipt-auditor.mjs';

export { auditReceipt } from '../../../services/receipt-auditor.mjs';

export async function auditStepReceipt(step, receipt, options = {}) {
  const result = await auditReceipt(receipt, options);
  if (result.verdict === 'FAIL' || result.verdict === 'UNREPRODUCIBLE') {
    return {
      ok: false,
      verdict: result.verdict,
      reason: result.summary || 'receipt audit failed',
      reset_status: 'pending',
      receipt_path: result.receipt_path || null,
    };
  }
  return { ok: true, verdict: result.verdict, result };
}

export async function resetStepIfReceiptFails(step, receipt, options = {}) {
  const audit = await auditStepReceipt(step, receipt, options);
  if (!audit.ok) {
    return {
      ...audit,
      step: { ...(step || {}), status: audit.reset_status, receipt_audit: audit },
    };
  }
  return { ...audit, step };
}
