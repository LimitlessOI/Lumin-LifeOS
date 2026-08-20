/**
 * SYNOPSIS: ReceiptLedger role per blueprint §14a — append-only, immutable-
 * original evidence record. Real implementation: uses the shared runtime
 * store, real generated IDs, real retrieval. Previously returned a
 * hardcoded fake ID ("simulated_receipt_id_123") regardless of input —
 * replaced with genuine per-call state.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

export function createReceiptLedgerService({ store, logger }) {
  if (!store) {
    throw new Error('createReceiptLedgerService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createReceiptLedgerService: Missing required dependency: logger');
  }

  return {
    /**
     * Records a new receipt. Real append — every call produces a distinct,
     * retrievable record; nothing is simulated.
     */
    async recordReceipt(receiptData) {
      if (!receiptData || typeof receiptData !== 'object') {
        return { success: false, error: 'receiptData must be an object' };
      }
      const receipt = store.appendReceipt(receiptData);
      logger.info('Receipt recorded', { receiptId: receipt.id, task_id: receiptData.task_id });
      return { success: true, receiptId: receipt.id, receipt };
    },

    async getReceipt(receiptId) {
      const receipt = store.getReceipt(receiptId);
      if (!receipt) {
        logger.warn('Receipt not found', { receiptId });
        return { id: receiptId, found: false };
      }
      return { ...receipt, found: true };
    },

    async getReceiptsForTask(taskId) {
      return store.getReceiptsForTask(taskId);
    },
  };
}

export default createReceiptLedgerService;
