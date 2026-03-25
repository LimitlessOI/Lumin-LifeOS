/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * tc-imap-config.js
 * Canonical IMAP config resolver for TC/GLVAR inbox-driven workflows.
 *
 * Prefers TC-specific env vars, then shared IMAP vars, then a vault lookup.
 */

function parsePort(value, fallback = 993) {
  const port = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(port) ? port : fallback;
}

export async function resolveTCImapConfig({ accountManager, logger = console } = {}) {
  const user =
    process.env.TC_IMAP_USER ||
    process.env.TC_IMAP_EMAIL ||
    process.env.IMAP_USER ||
    process.env.WORK_EMAIL ||
    "LifeOS@hopkinsgroup.org";

  let pass =
    process.env.TC_IMAP_APP_PASSWORD ||
    process.env.WORK_EMAIL_APP_PASSWORD ||
    process.env.IMAP_PASS ||
    null;

  if (!pass && accountManager?.getAccount) {
    const lookupKeys = [
      ["email_imap", user],
      ["email_imap", process.env.IMAP_USER || null],
      ["email_imap", process.env.WORK_EMAIL || null],
      ["email_imap", "adam@hopkinsgroup.org"],
      ["email_imap", "LifeOS@hopkinsgroup.org"],
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
    host: process.env.TC_IMAP_HOST || process.env.IMAP_HOST || "imap.gmail.com",
    port: parsePort(process.env.TC_IMAP_PORT || process.env.IMAP_PORT || 993),
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
