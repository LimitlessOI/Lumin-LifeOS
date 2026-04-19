/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * tc-imap-config.js
 * Canonical IMAP config resolver for TC/GLVAR inbox-driven workflows.
 *
 * Prefers TC-specific env vars, then shared IMAP vars, then a vault lookup.
 */

import {
  getTCImapHost,
  getTCImapPassword,
  getTCImapPort,
  getTCImapUser,
} from './credential-aliases.js';

const DEFAULT_TC_MAILBOX = 'adam@hopkinsgroup.org';

function parsePort(value, fallback = 993) {
  const port = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(port) ? port : fallback;
}

export async function resolveTCImapConfig({ accountManager, logger = console } = {}) {
  const user = getTCImapUser() || DEFAULT_TC_MAILBOX;

  let pass = getTCImapPassword() || process.env.SMTP_PASS || null;

  if (!pass && accountManager?.getAccount) {
    const lookupKeys = [
      ["email_imap", user],
      ["email_imap", getTCImapUser() || null],
      ["email_imap", process.env.IMAP_USER || null],
      ["email_imap", process.env.WORK_EMAIL || null],
      ["email_imap", DEFAULT_TC_MAILBOX],
      ["email_imap", process.env.GMAIL_SIGNUP_EMAIL || null],
    ].filter(([, email]) => !!email);

    for (const [serviceName, emailUsed] of lookupKeys) {
      try {
        const account = await accountManager.getAccount(serviceName, emailUsed);
        pass = account?.password || account?.apiKey || null;
        if (pass) break;
      } catch (err) {
        logger.debug?.(
          { err: err.message, serviceName, emailUsed },
          "[TC-IMAP] Vault lookup failed"
        );
      }
    }
  }

  return {
    host: getTCImapHost(),
    port: parsePort(getTCImapPort(), 993),
    secure: true,
    auth: { user, pass },
    logger: false,
    tls: { rejectUnauthorized: false },
  };
}

export async function isTCImapConfigured({ accountManager, logger = console } = {}) {
  const cfg = await resolveTCImapConfig({ accountManager, logger });
  return !!(cfg.host && cfg.auth.user && cfg.auth.pass);
}
