/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * Open TransactionDesk → scrape party emails → merge into tc_transactions.parties.
 */

export async function runTransactionDeskPartySync({
  coordinator,
  tcBrowser,
  logger = console,
  transactionId,
  dryRun = false,
  overwriteParties = false,
  addressSearch = null,
}) {
  const tx = await coordinator.getTransaction(transactionId);
  if (!tx) return { ok: false, error: 'Transaction not found' };
  if (!tx.transaction_desk_id && !addressSearch && !tx.address) {
    return { ok: false, error: 'Need transaction_desk_id on file and/or addressSearch / tx.address to open TD' };
  }

  const { session } = await tcBrowser.loginToGLVAR(false);
  try {
    await tcBrowser.ensureOnTransactionDesk(session);
    await tcBrowser.openTransactionDeskFile(session, {
      transactionDeskId: tx.transaction_desk_id,
      addressSearch: addressSearch || tx.address,
    });
    const scraped = await tcBrowser.scrapeTransactionDeskParties(session);
    const keys = Object.keys(scraped.normalized || {});
    let merged = null;
    if (!dryRun && keys.length) {
      merged = await coordinator.mergeTransactionParties(transactionId, scraped.normalized, {
        overwrite: overwriteParties,
        source: 'transaction_desk_scrape',
      });
    }
    await coordinator.logEvent(transactionId, 'td_parties_sync', {
      dry_run: dryRun,
      normalized_keys: keys,
      mailto_count: (scraped.raw?.mailtos || []).length,
    });
    return {
      ok: true,
      scraped,
      transaction: merged || (await coordinator.getTransaction(transactionId)),
      persisted: !dryRun && keys.length > 0,
    };
  } catch (err) {
    logger.warn?.({ err: err.message }, '[TC-TD-SYNC] party sync failed');
    return { ok: false, error: err.message };
  } finally {
    await session?.close?.();
  }
}

export default runTransactionDeskPartySync;
