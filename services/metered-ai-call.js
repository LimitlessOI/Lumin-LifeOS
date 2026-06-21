/**
 * SYNOPSIS: Metered AI call helper — delegates to Token Accounting OS.
 * Metered AI call helper — delegates to Token Accounting OS.
 * @ssot docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md
 */

export function createMeteredAICall({ tokenAccounting, savingsLedger, logger = console }) {
  async function recordMeteredUsage(payload) {
    if (tokenAccounting?.recordMeteredCall) {
      return tokenAccounting.recordMeteredCall({ source: 'council', ...payload });
    }
    if (savingsLedger?.record) {
      try {
        const id = await savingsLedger.record({
          ...payload,
          qualityMethod: payload.qualityMethod || 'metered-ai-call-fallback',
        });
        return { ok: Boolean(id), ledger_id: id };
      } catch (err) {
        logger.warn?.('[METERED-AI] fallback ledger failed:', err.message);
        return { ok: false, error: err.message };
      }
    }
    return { ok: false, error: 'no ledger available' };
  }

  return { recordMeteredUsage };
}
