/**
 * email-triage.js
 * Scans Adam's inbox every 30 minutes and triages emails into categories:
 *
 *   TC_CONTRACT   — purchase agreements, offers, executed contracts
 *   TC_DEADLINE   — contingency / deadline notices related to active transactions
 *   CLIENT        — buyer/seller/lead messages needing a reply
 *   GLVAR         — MLS, association, violation, dues notices
 *   TIME_SENSITIVE — anything with "urgent", "today", "deadline", "expire", "ASAP"
 *   FYI           — newsletters, receipts, automated — low priority
 *
 * On URGENT or TC_CONTRACT: alerts immediately via email.
 * Daily digest at 7am: everything ACTION_REQUIRED that hasn't been replied to.
 *
 * Deps: imapflow, services/council-service.js (AI categorization)
 * Exports: createEmailTriage(deps)
 *
 * DB table: email_triage_log (see db/migrations/20260323_email_triage.sql)
 */

import { ImapFlow } from 'imapflow';

const SCAN_INTERVAL_MS  = 30 * 60 * 1000; // 30 minutes
const DIGEST_HOUR       = 7;               // 7am daily digest

const CATEGORIES = {
  TC_CONTRACT:    'tc_contract',
  TC_DEADLINE:    'tc_deadline',
  CLIENT:         'client',
  GLVAR:          'glvar',
  TIME_SENSITIVE: 'time_sensitive',
  FYI:            'fyi',
};

// Rule-based fast classification (runs before AI to save tokens)
const RULES = [
  { category: CATEGORIES.TC_CONTRACT,    re: /purchase\s+agreement|fully\s+executed|counter\s+offer|accepted\s+offer|escrow\s+open|contract\s+received/i },
  { category: CATEGORIES.TC_DEADLINE,    re: /contingency|inspection\s+period|appraisal|loan\s+approval|earnest\s+money|due\s+diligence|closing\s+date|extension/i },
  { category: CATEGORIES.GLVAR,          re: /glvar|mls\s+notice|violation|compliance|association\s+dues|membership\s+dues|code\s+of\s+ethics/i },
  { category: CATEGORIES.TIME_SENSITIVE, re: /urgent|asap|today\s+only|expires\s+today|deadline\s+today|time\s+sensitive|respond\s+immediately/i },
  { category: CATEGORIES.FYI,            re: /unsubscribe|newsletter|no.reply|noreply|automated\s+message|receipt|invoice.*paid|bank\s+statement/i },
];

const ALERT_CATEGORIES = new Set([CATEGORIES.TC_CONTRACT, CATEGORIES.TC_DEADLINE, CATEGORIES.TIME_SENSITIVE, CATEGORIES.GLVAR]);

export function createEmailTriage({ pool, notificationService, callCouncilMember, logger = console }) {

  function getImapConfig() {
    return {
      host:   process.env.IMAP_HOST,
      port:   993,
      secure: true,
      auth: {
        user: process.env.IMAP_USER,
        pass: process.env.WORK_EMAIL_APP_PASSWORD || process.env.IMAP_PASS,
      },
      logger: false,
    };
  }

  function isImapConfigured() {
    const cfg = getImapConfig();
    return !!(cfg.host && cfg.auth.user && cfg.auth.pass);
  }

  // Fast rule-based classification
  function classifyByRules(subject = '', from = '', snippet = '') {
    const text = `${subject} ${from} ${snippet}`;
    for (const rule of RULES) {
      if (rule.re.test(text)) return rule.category;
    }
    return null; // needs AI
  }

  // AI classification for ambiguous emails
  async function classifyWithAI(subject, from, snippet) {
    if (!callCouncilMember) return CATEGORIES.CLIENT;
    try {
      const prompt = [
        `Classify this email into exactly one category. Reply with ONLY the category name, nothing else.`,
        `Categories: tc_contract, tc_deadline, client, glvar, time_sensitive, fyi`,
        ``,
        `From: ${from}`,
        `Subject: ${subject}`,
        `Preview: ${snippet?.substring(0, 200) || ''}`,
      ].join('\n');

      const result = await callCouncilMember('anthropic', prompt, { taskType: 'classification', maxTokens: 20 });
      const text = (typeof result === 'string' ? result : result?.content || '').trim().toLowerCase();
      const match = Object.values(CATEGORIES).find(c => text.includes(c));
      return match || CATEGORIES.CLIENT;
    } catch {
      return CATEGORIES.CLIENT;
    }
  }

  /**
   * Scan inbox for emails since last check. Store and alert as needed.
   */
  async function scanInbox() {
    if (!isImapConfigured()) {
      logger.warn?.('[EMAIL-TRIAGE] IMAP not configured — skipping');
      return { ok: false, reason: 'IMAP not configured' };
    }

    const client = new ImapFlow(getImapConfig());
    const newItems = [];

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      // Scan last 12 hours (catches up after any downtime)
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

      for await (const msg of client.fetch(
        { since, seen: false },
        { envelope: true, bodyStructure: true }
      )) {
        const subject = msg.envelope?.subject || '(no subject)';
        const from    = msg.envelope?.from?.[0]?.address || '';
        const uid     = String(msg.uid);
        const date    = msg.envelope?.date || new Date();

        // Dedup — skip if already triaged
        const { rows: existing } = await pool.query(
          `SELECT id FROM email_triage_log WHERE uid=$1`, [uid]
        ).catch(() => ({ rows: [] }));
        if (existing.length) continue;

        // Classify
        let category = classifyByRules(subject, from, '');
        if (!category) {
          category = await classifyWithAI(subject, from, '');
        }

        const actionRequired = ALERT_CATEGORIES.has(category);

        // Store
        const { rows } = await pool.query(
          `INSERT INTO email_triage_log
             (uid, received_at, from_address, subject, category, action_required)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (uid) DO NOTHING
           RETURNING *`,
          [uid, date, from, subject, category, actionRequired]
        ).catch(() => ({ rows: [] }));

        if (!rows[0]) continue;
        newItems.push(rows[0]);

        // Immediate alert for urgent categories
        if (actionRequired) {
          await _sendImmediateAlert(rows[0]);

          // If it's a contract email, also kick off TC pipeline
          if (category === CATEGORIES.TC_CONTRACT) {
            logger.info?.({ uid, subject }, '[EMAIL-TRIAGE] Contract email detected — flagged for TC processing');
            await pool.query(
              `UPDATE email_triage_log SET notes='Flagged for TC processing' WHERE id=$1`, [rows[0].id]
            ).catch(() => {});
          }
        }
      }

      await client.logout();
    } catch (err) {
      logger.error?.({ err: err.message }, '[EMAIL-TRIAGE] Scan failed');
      return { ok: false, error: err.message };
    }

    logger.info?.({ found: newItems.length }, '[EMAIL-TRIAGE] Scan complete');
    return { ok: true, found: newItems.length, items: newItems };
  }

  async function _sendImmediateAlert(item) {
    const categoryLabel = {
      tc_contract:    '📋 CONTRACT — TC Action Required',
      tc_deadline:    '⏰ DEADLINE — TC Action Required',
      time_sensitive: '🚨 TIME SENSITIVE',
      glvar:          '⚠️  GLVAR/MLS Notice',
    }[item.category] || 'Action Required';

    try {
      await notificationService?.sendEmail?.({
        to: process.env.WORK_EMAIL || 'adam.hopkins@exprealty.com',
        subject: `${categoryLabel}: ${item.subject}`,
        text: [
          `An email requires your attention.`,
          ``,
          `Category: ${item.category.replace(/_/g, ' ').toUpperCase()}`,
          `From:     ${item.from_address}`,
          `Subject:  ${item.subject}`,
          `Received: ${new Date(item.received_at).toLocaleString()}`,
          ``,
          `Check your inbox now.`,
        ].join('\n'),
      });

      await pool.query(
        `UPDATE email_triage_log SET alerted_at=NOW() WHERE id=$1`, [item.id]
      ).catch(() => {});

      logger.info?.({ subject: item.subject, category: item.category }, '[EMAIL-TRIAGE] Immediate alert sent');
    } catch (err) {
      logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] Failed to send immediate alert');
    }
  }

  /**
   * 7am daily digest — all unactioned ACTION_REQUIRED emails from last 24h.
   */
  async function sendDailyDigest() {
    const { rows } = await pool.query(
      `SELECT * FROM email_triage_log
       WHERE action_required = true
         AND actioned_at IS NULL
         AND received_at >= NOW() - INTERVAL '24 hours'
       ORDER BY received_at DESC`
    ).catch(() => ({ rows: [] }));

    if (!rows.length) return;

    const lines = rows.map((r, i) =>
      `${i + 1}. [${r.category.replace(/_/g,' ').toUpperCase()}] ${r.subject}\n   From: ${r.from_address} — ${new Date(r.received_at).toLocaleTimeString()}`
    );

    try {
      await notificationService?.sendEmail?.({
        to: process.env.WORK_EMAIL || 'adam.hopkins@exprealty.com',
        subject: `📬 Daily Email Digest — ${rows.length} email${rows.length !== 1 ? 's' : ''} need attention`,
        text: [
          `Good morning. Here are emails that need your attention:`,
          ``,
          ...lines,
          ``,
          `Reply to this email or log in to handle them.`,
        ].join('\n'),
      });
      logger.info?.({ count: rows.length }, '[EMAIL-TRIAGE] Daily digest sent');
    } catch (err) {
      logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] Daily digest failed');
    }
  }

  /**
   * Start the 30-minute scan cron + daily digest at 7am.
   */
  function startTriageCron() {
    // Scan immediately, then every 30 minutes
    setTimeout(async () => {
      await scanInbox();
      setInterval(() => scanInbox(), SCAN_INTERVAL_MS);
    }, 60_000); // 1-min startup delay

    // Daily digest at 7am
    function scheduleDigest() {
      const now = new Date();
      const next = new Date(now);
      next.setHours(DIGEST_HOUR, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      setTimeout(async () => {
        await sendDailyDigest();
        setInterval(() => sendDailyDigest(), 24 * 60 * 60 * 1000);
      }, next.getTime() - now.getTime());
    }
    scheduleDigest();

    logger.info?.('[EMAIL-TRIAGE] Cron started — scanning every 30 min, digest at 7am');
  }

  /**
   * Get triaged emails from DB.
   */
  async function getTriagedEmails({ category, actionRequired, limit = 50, since } = {}) {
    const conditions = ['1=1'];
    const params = [];
    if (category) { conditions.push(`category=$${params.push(category)}`); }
    if (actionRequired !== undefined) { conditions.push(`action_required=$${params.push(actionRequired)}`); }
    if (since) { conditions.push(`received_at >= $${params.push(since)}`); }

    const { rows } = await pool.query(
      `SELECT * FROM email_triage_log
       WHERE ${conditions.join(' AND ')}
       ORDER BY received_at DESC
       LIMIT $${params.push(Math.min(limit, 200))}`,
      params
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  /**
   * Mark an email as actioned (handled).
   */
  async function markActioned(id, notes = null) {
    const { rows } = await pool.query(
      `UPDATE email_triage_log SET actioned_at=NOW(), notes=$2 WHERE id=$1 RETURNING *`,
      [id, notes]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  return {
    scanInbox,
    sendDailyDigest,
    startTriageCron,
    getTriagedEmails,
    markActioned,
  };
}
