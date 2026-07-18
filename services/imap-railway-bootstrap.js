/**
 * SYNOPSIS: IMAP readiness + optional dry-run for Railway/TC bootstrap.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { isTCImapConfigured, resolveTCImapConfig } from './tc-imap-config.js';

export async function verifyImapAndDryRun(deps = {}, { forceDryRun = false } = {}) {
  const logger = deps.logger || console;
  const accountManager = deps.accountManager || null;

  const configured = await isTCImapConfigured({ accountManager, logger });
  if (!configured) {
    const cfg = await resolveTCImapConfig({ accountManager, logger });
    const missing = [];
    if (!cfg.host) missing.push('TC_IMAP_HOST|IMAP_HOST');
    if (!cfg.auth?.user) missing.push('TC_IMAP_USER|IMAP_USER');
    if (!cfg.auth?.pass) missing.push('TC_IMAP_APP_PASSWORD|TC_IMAP_APP_Adam_PASSWORD|IMAP_PASS');
    return { ready: false, missing };
  }

  const cfg = await resolveTCImapConfig({ accountManager, logger });
  const shouldScan = forceDryRun || Boolean(deps.imapClient?.scan);
  if (!shouldScan) {
    return {
      ready: true,
      configured: true,
      host: cfg.host,
      user: cfg.auth.user,
      scannedCount: 0,
      sample: [],
      note: 'IMAP credentials resolved via TC aliases; dry-run scan skipped (no imapClient).',
    };
  }

  if (!deps.imapClient || typeof deps.imapClient.scan !== 'function') {
    return {
      ready: true,
      configured: true,
      host: cfg.host,
      user: cfg.auth.user,
      scannedCount: 0,
      sample: [],
      note: 'IMAP credentials resolved; dry-run requires deps.imapClient.scan.',
    };
  }

  const result = await deps.imapClient.scan({ dryRun: true });
  const items = Array.isArray(result)
    ? result
    : Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.emails)
        ? result.emails
        : [];
  const scannedCount = typeof result?.scannedCount === 'number'
    ? result.scannedCount
    : typeof result?.count === 'number'
      ? result.count
      : items.length;

  const sample = items
    .slice(0, 3)
    .map((item) => item?.subject)
    .filter((subject) => typeof subject === 'string' && subject.length > 0);

  return {
    ready: true,
    configured: true,
    host: cfg.host,
    user: cfg.auth.user,
    scannedCount,
    sample,
  };
}
