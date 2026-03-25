/**
 * glvar-monitor.js
 * Two monitoring tracks for GLVAR membership:
 *
 *   1. Dues — browser-scrapes billing page once a month.
 *      Sends email reminder at 30 days out, urgent at 7 days.
 *
 *   2. Violations — scans email inbox 4× per day for GLVAR/MLS
 *      violation or compliance notices. Alerts immediately.
 *
 * Deps: services/tc-browser-agent.js, core/notification-service.js
 * Exports: createGLVARMonitor(deps)
 *
 * DB tables:
 *   glvar_dues_log       — see db/migrations/20260323_glvar_dues.sql
 *   glvar_violations_log — see db/migrations/20260323_glvar_dues.sql
 */

import { ImapFlow } from 'imapflow';
import { resolveTCImapConfig } from './tc-imap-config.js';

const DUES_WARN_DAYS   = 30;
const DUES_URGENT_DAYS = 7;

// Email subjects/senders that indicate a GLVAR violation notice
const VIOLATION_KEYWORDS = [
  /violation/i,
  /compliance\s+notice/i,
  /mls\s+notice/i,
  /code\s+of\s+ethics/i,
  /disciplinary/i,
  /citation/i,
  /fine.*glvar/i,
  /glvar.*fine/i,
  /listing\s+deficiency/i,
];

export function createGLVARMonitor({ pool, tcBrowser, accountManager, notificationService, logger = console }) {

  // ── Helpers ───────────────────────────────────────────────────────────────

  function parseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function isViolationEmail(subject = '', from = '') {
    const text = `${subject} ${from}`;
    return VIOLATION_KEYWORDS.some(re => re.test(text));
  }

  // ── Dues monitoring ───────────────────────────────────────────────────────

  async function checkDues() {
    logger.info?.('[GLVAR-MONITOR] Starting monthly dues check');
    let session;
    try {
      const loginResult = await tcBrowser.loginToGLVAR(false);
      session = loginResult.session;
      const duesResult = await tcBrowser.checkGLVARDues(session);

      const scrapedAt = new Date();
      const stored = [];

      for (const item of duesResult.dueItems || []) {
        const dueDate = parseDate(item.dueDate);
        const amount  = item.amount ? parseFloat(item.amount.replace(/[$,]/g, '')) : null;

        const { rows } = await pool.query(
          `INSERT INTO glvar_dues_log
             (scraped_at, description, amount, due_date, status, raw_text)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (description, due_date) DO UPDATE SET
             status     = EXCLUDED.status,
             scraped_at = EXCLUDED.scraped_at
           RETURNING *`,
          [scrapedAt, item.description || 'Unknown', amount, dueDate, item.status || null, JSON.stringify(item)]
        ).catch(() => ({ rows: [] }));

        if (rows[0]) stored.push(rows[0]);
      }

      const alerts = await _sendDuesReminders(stored);
      logger.info?.({ found: stored.length, alerts }, '[GLVAR-MONITOR] Dues check complete');
      return { ok: true, found: stored.length, dueItems: stored, alerts, screenshots: duesResult.screenshots };
    } catch (err) {
      logger.error?.({ err: err.message }, '[GLVAR-MONITOR] Dues check failed');
      return { ok: false, error: err.message };
    } finally {
      await session?.close?.().catch(() => {});
    }
  }

  async function _sendDuesReminders(items) {
    const alerts = [];
    const now = Date.now();

    for (const item of items) {
      if (!item.due_date || item.paid_at) continue;
      const daysUntilDue = Math.ceil((new Date(item.due_date).getTime() - now) / 86_400_000);
      if (daysUntilDue < 0 || daysUntilDue > DUES_WARN_DAYS) continue;

      const urgency = daysUntilDue <= DUES_URGENT_DAYS ? 'URGENT' : 'REMINDER';

      // Skip non-urgent if already reminded
      if (urgency !== 'URGENT') {
        const { rows } = await pool.query(
          `SELECT id FROM glvar_dues_log WHERE id=$1 AND reminder_sent_at IS NOT NULL`, [item.id]
        ).catch(() => ({ rows: [] }));
        if (rows.length) continue;
      }

      const subject = `${urgency}: GLVAR dues due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
      const text = [
        `GLVAR Membership Dues Reminder`,
        ``,
        `Description:    ${item.description}`,
        `Amount:         ${item.amount != null ? `$${item.amount}` : 'Unknown'}`,
        `Due Date:       ${new Date(item.due_date).toLocaleDateString()}`,
        `Days Until Due: ${daysUntilDue}`,
        `Status:         ${item.status || 'Unknown'}`,
        ``,
        `Pay at: https://glvar.clareityiam.net/idp/login`,
      ].join('\n');

      try {
        await notificationService?.sendEmail?.({
          to: process.env.WORK_EMAIL || 'adam.hopkins@exprealty.com',
          subject,
          text,
        });
        await pool.query(
          `UPDATE glvar_dues_log SET reminder_sent_at=NOW() WHERE id=$1`, [item.id]
        ).catch(() => {});
        alerts.push({ id: item.id, urgency, daysUntilDue });
        logger.info?.({ subject }, '[GLVAR-MONITOR] Dues reminder sent');
      } catch (err) {
        logger.warn?.({ err: err.message }, '[GLVAR-MONITOR] Failed to send dues reminder');
      }
    }
    return alerts;
  }

  /**
   * Monthly cron — 1st of each month at 8am.
   */
  function startDuesCron() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0);
    const initialDelay = Math.max(next.getTime() - now.getTime(), 60_000);
    const MONTH_MS = 30 * 24 * 60 * 60 * 1000; // approximate

    setTimeout(async () => {
      await checkDues();
      setInterval(() => checkDues(), MONTH_MS);
    }, initialDelay);

    logger.info?.({ nextRun: next.toISOString() }, '[GLVAR-MONITOR] Monthly dues cron scheduled');
  }

  // ── Violation monitoring ──────────────────────────────────────────────────

  /**
   * Scan inbox for GLVAR/MLS violation or compliance emails.
   * Stores new ones in glvar_violations_log and alerts immediately.
   */
  async function checkViolationEmails() {
    const imapConfig = await resolveTCImapConfig({ accountManager, logger });
    if (!imapConfig.host || !imapConfig.auth.user || !imapConfig.auth.pass) {
      logger.warn?.('[GLVAR-MONITOR] IMAP not configured — skipping violation scan');
      return { ok: false, reason: 'IMAP not configured' };
    }

    const client = new ImapFlow(imapConfig);

    const found = [];
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      // Search last 24 hours for unread
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for await (const msg of client.fetch(
        { since, seen: false },
        { envelope: true, source: false }
      )) {
        const subject = msg.envelope?.subject || '';
        const from    = msg.envelope?.from?.[0]?.address || '';

        if (!isViolationEmail(subject, from)) continue;

        // Store in DB (dedup by message uid + subject)
        const { rows } = await pool.query(
          `INSERT INTO glvar_violations_log
             (detected_at, subject, from_address, uid, alerted)
           VALUES (NOW(),$1,$2,$3,false)
           ON CONFLICT (uid) DO NOTHING
           RETURNING *`,
          [subject, from, String(msg.uid)]
        ).catch(() => ({ rows: [] }));

        if (rows[0]) {
          found.push(rows[0]);
          await _alertViolation(rows[0]);
        }
      }

      await client.logout();
    } catch (err) {
      logger.error?.({ err: err.message }, '[GLVAR-MONITOR] Violation email scan failed');
      return { ok: false, error: err.message };
    }

    logger.info?.({ found: found.length }, '[GLVAR-MONITOR] Violation scan complete');
    return { ok: true, found: found.length, violations: found };
  }

  async function _alertViolation(violation) {
    try {
      await notificationService?.sendEmail?.({
        to: process.env.WORK_EMAIL || 'adam.hopkins@exprealty.com',
        subject: `ACTION REQUIRED: GLVAR Violation Notice Detected`,
        text: [
          `A GLVAR/MLS violation or compliance notice was detected in your inbox.`,
          ``,
          `Subject: ${violation.subject}`,
          `From:    ${violation.from_address}`,
          `Detected: ${new Date(violation.detected_at).toLocaleString()}`,
          ``,
          `Check your email and respond promptly to avoid fines or disciplinary action.`,
          ``,
          `Log into GLVAR: https://glvar.clareityiam.net/idp/login`,
        ].join('\n'),
      });

      await pool.query(
        `UPDATE glvar_violations_log SET alerted=true WHERE id=$1`, [violation.id]
      ).catch(() => {});

      logger.info?.({ subject: violation.subject }, '[GLVAR-MONITOR] Violation alert sent');
    } catch (err) {
      logger.warn?.({ err: err.message }, '[GLVAR-MONITOR] Failed to send violation alert');
    }
  }

  /**
   * Violations cron — 4× per day (every 6 hours).
   */
  function startViolationsCron() {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    // Start first check in 2 minutes, then every 6 hours
    setTimeout(async () => {
      await checkViolationEmails();
      setInterval(() => checkViolationEmails(), SIX_HOURS);
    }, 2 * 60 * 1000);

    logger.info?.('[GLVAR-MONITOR] Violations cron scheduled (every 6 hours)');
  }

  // ── Status reads (no browser) ─────────────────────────────────────────────

  async function getDuesStatus() {
    const { rows } = await pool.query(
      `SELECT * FROM glvar_dues_log
       WHERE due_date >= NOW() - INTERVAL '30 days'
       ORDER BY due_date ASC`
    ).catch(() => ({ rows: [] }));

    const now = Date.now();
    return rows.map(r => ({
      ...r,
      daysUntilDue: r.due_date
        ? Math.ceil((new Date(r.due_date).getTime() - now) / 86_400_000)
        : null,
    }));
  }

  async function getViolationsLog({ limit = 50 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM glvar_violations_log ORDER BY detected_at DESC LIMIT $1`, [limit]
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  return {
    checkDues,
    getDuesStatus,
    startDuesCron,
    checkViolationEmails,
    getViolationsLog,
    startViolationsCron,
  };
}
