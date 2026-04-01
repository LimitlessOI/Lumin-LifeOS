/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * email-triage.js
 * Full inbox intelligence — reads every email, classifies it, and acts:
 *
 *   SPAM         — moved to Trash automatically, sender added to block list
 *   TC_CONTRACT  — purchase agreements, executed contracts, settlement statements
 *   TC_DEADLINE  — contingency / deadline / extension / HOA notices
 *   TC_DOCUMENT  — inspection reports, disclosures, title, EMD, attachments
 *   CLIENT       — buyer/seller/lead messages needing Adam's reply
 *   GLVAR        — MLS, association, violation, dues notices
 *   TIME_SENSITIVE — anything with a hard deadline this week
 *   FYI          — newsletters, receipts, marketing — marked read automatically
 *
 * For every non-spam, non-FYI email Adam gets:
 *   - urgency_score 1-10 (10 = drop everything now)
 *   - brief: one sentence what the email is
 *   - why_adam: why HE must personally deal with it (null = system handles)
 *   - negotiation_intel: any leverage or advantage spotted (null = none)
 *
 * TC emails → TC pipeline auto-triggered (attachments downloaded + processed)
 * FYI emails → marked read so inbox stays clean
 * Spam → moved to Trash + sender blocked
 *
 * Deps: imapflow, services/tc-imap-config.js, services/council-service.js
 * Exports: createEmailTriage(deps)
 */

import { ImapFlow } from 'imapflow';
import { isTCImapConfigured, resolveTCImapConfig } from './tc-imap-config.js';

const SCAN_INTERVAL_MS = 10 * 60 * 1000;  // 10 minutes
const DIGEST_HOUR      = 7;               // 7am daily digest

export const CATEGORIES = {
  SPAM:           'spam',
  TC_CONTRACT:    'tc_contract',
  TC_DEADLINE:    'tc_deadline',
  TC_DOCUMENT:    'tc_document',
  CLIENT:         'client',
  GLVAR:          'glvar',
  TIME_SENSITIVE: 'time_sensitive',
  FYI:            'fyi',
};

// Categories where Adam must personally act (not handled by system)
const ADAM_MUST_ACT = new Set([CATEGORIES.CLIENT, CATEGORIES.TIME_SENSITIVE, CATEGORIES.GLVAR]);
// Categories that generate an immediate alert
const ALERT_CATEGORIES = new Set([
  CATEGORIES.TC_CONTRACT, CATEGORIES.TC_DEADLINE, CATEGORIES.TC_DOCUMENT,
  CATEGORIES.CLIENT, CATEGORIES.TIME_SENSITIVE, CATEGORIES.GLVAR,
]);
// TC categories that trigger the attachment pipeline
const TC_CATEGORIES = new Set([CATEGORIES.TC_CONTRACT, CATEGORIES.TC_DEADLINE, CATEGORIES.TC_DOCUMENT]);

// ── Spam patterns ──────────────────────────────────────────────────────────
// These are high-confidence spam signals — no AI needed.
const SPAM_SENDER_PATTERNS = [
  /noreply|no-reply|donotreply|do-not-reply|mailer-daemon/i,
  /@.*bulk|@.*mass|@.*blast/i,
  /unsubscribe@|optout@|list-unsubscribe/i,
];
const SPAM_SUBJECT_PATTERNS = [
  /\b(you('ve| have) won|you are (selected|chosen)|congratulations.*prize|claim your (reward|prize|gift))\b/i,
  /\b(hot leads|fresh leads|motivated sellers|absentee owners|distress list)\b/i,
  /\b(quick move.?in|new construction.*deals|builder (incentive|special))\b/i,
  /\b(payday|fast cash|instant approval|bad credit ok|no credit check)\b/i,
  /\b(grow your (business|pipeline|income) fast|double your (income|leads|sales))\b/i,
  /\b(deals.*quick move|contact sasha|contact.*@702|@702.*contact)\b/i,
];

// FYI/auto patterns — safe to auto-mark read, no alert needed
const FYI_SENDER_PATTERNS = [
  /noreply@.*exprealty|no-reply.*exprealty/i,
  /notifications@|alerts@|digest@|automated@/i,
  /receipts@|billing@|invoices@/i,
];
const FYI_SUBJECT_PATTERNS = [
  /unsubscribe|newsletter|no.reply|automated.?message/i,
  /receipt|invoice.*paid|bank.*statement|account.*statement/i,
  /remittance.*payment.*on the way|payment.*sent/i,
  /new.?on.?market|property.*alert|fresh.*listings|property.*notification/i,
  /today's.*alert|daily.*alert|market.*update/i,
];

// Rule-based fast classification (free — runs before AI)
const CLASSIFICATION_RULES = [
  { category: CATEGORIES.TC_CONTRACT,    re: /purchase\s+agreement|fully\s+executed|accepted\s+offer|escrow\s+open|contract\s+received|new\s+escrow|under\s+contract|offer.*accepted/i },
  { category: CATEGORIES.TC_DEADLINE,    re: /contingency|inspection\s+period|due\s+diligence|appraisal|loan\s+approval|earnest\s+money|closing\s+date|extension|hoa.*payment\s+required|action\s+required.*hoa/i },
  { category: CATEGORIES.TC_DOCUMENT,    re: /inspection\s+report|seller\s+disclosure|title\s+report|settlement\s+statement|preliminary.*alta|broker\s+opening|opening\s+package|signing\s+complete|rfr|r4r|repair.*request|response.*repair|binsr/i },
  { category: CATEGORIES.GLVAR,          re: /glvar|mls\s+notice|violation|compliance|association\s+dues|membership\s+dues|code\s+of\s+ethics/i },
  { category: CATEGORIES.TIME_SENSITIVE, re: /\burgent\b|\basap\b|today\s+only|expires\s+today|deadline\s+today|time\s+sensitive|respond\s+immediately|respond\s+by\s+(today|tonight|\d)/i },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function extractPreview(source) {
  const raw = Buffer.isBuffer(source) ? source.toString('utf8') : String(source || '');
  const body = raw.split(/\r?\n\r?\n/).slice(1).join('\n');
  return body
    .replace(/=\r?\n/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function isDefiniteSpam(subject, from) {
  const fromLc = String(from || '').toLowerCase();
  const subLc  = String(subject || '').toLowerCase();
  for (const p of SPAM_SENDER_PATTERNS) if (p.test(fromLc)) return true;
  for (const p of SPAM_SUBJECT_PATTERNS) if (p.test(subLc) || p.test(subLc + ' ' + fromLc)) return true;
  return false;
}

function isDefinitelyFYI(subject, from) {
  const fromLc = String(from || '').toLowerCase();
  const subLc  = String(subject || '').toLowerCase();
  for (const p of FYI_SENDER_PATTERNS) if (p.test(fromLc)) return true;
  for (const p of FYI_SUBJECT_PATTERNS) if (p.test(subLc)) return true;
  return false;
}

function classifyByRules(subject, from, snippet) {
  const text = `${subject} ${from} ${snippet}`;
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.re.test(text)) return rule.category;
  }
  return null;
}

// ── Main factory ───────────────────────────────────────────────────────────

export function createEmailTriage({ pool, notificationService, callCouncilMember, accountManager, logger = console }) {
  let enrichmentV2Supported = null;

  // ── DB schema detection ──────────────────────────────────────────────────

  async function supportsV2Columns() {
    if (enrichmentV2Supported !== null) return enrichmentV2Supported;
    try {
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name='email_triage_log'
           AND column_name IN ('urgency_score','brief','why_adam','negotiation_intel','spam_deleted','auto_tc_queued')`
      );
      const cols = new Set(rows.map(r => r.column_name));
      enrichmentV2Supported = cols.has('urgency_score') && cols.has('brief');
    } catch {
      enrichmentV2Supported = false;
    }
    return enrichmentV2Supported;
  }

  async function isSpamBlocked(address) {
    try {
      const { rows } = await pool.query(
        `SELECT id FROM email_spam_senders WHERE address=$1 LIMIT 1`, [String(address || '').toLowerCase()]
      );
      return rows.length > 0;
    } catch { return false; }
  }

  async function blockSender(address, reason = 'spam') {
    try {
      await pool.query(
        `INSERT INTO email_spam_senders (address, reason) VALUES ($1,$2) ON CONFLICT (address) DO NOTHING`,
        [String(address || '').toLowerCase(), reason]
      );
    } catch { /* ignore */ }
  }

  // ── AI classification ────────────────────────────────────────────────────
  // Returns a rich object: { category, urgency, brief, why_adam, negotiation_intel, spam }
  // One AI call per ambiguous email — keeps token spend low.

  async function classifyWithAI(subject, from, snippet, hasAttachments = false) {
    if (!callCouncilMember) {
      return {
        category: CATEGORIES.CLIENT,
        urgency: 5,
        brief: subject,
        why_adam: 'Requires your review',
        negotiation_intel: null,
        spam: false,
      };
    }

    const prompt = [
      `You are Adam's email intelligence system. Adam is a real estate agent/broker and TC.`,
      `Analyze this email and reply with ONLY a JSON object — no explanation, no markdown.`,
      ``,
      `From: ${from}`,
      `Subject: ${subject}`,
      `Has attachments: ${hasAttachments}`,
      `Body preview: ${snippet?.slice(0, 350) || '(none)'}`,
      ``,
      `Return JSON:`,
      `{`,
      `  "category": one of: spam | tc_contract | tc_deadline | tc_document | client | glvar | time_sensitive | fyi`,
      `  "urgency": integer 1-10 (10=drop everything, 1=ignore, 5=handle today, 7=handle within hours),`,
      `  "brief": "one sentence — what this email actually is",`,
      `  "why_adam": "one sentence why Adam must personally act, or null if system can handle",`,
      `  "negotiation_intel": "one sentence about any negotiation leverage/advantage seen, or null",`,
      `  "spam": true or false`,
      `}`,
      ``,
      `urgency guide: 10=legal/financial deadline today, 9=contract/offer needs response, 8=TC document or inspection`,
      `7=client question, 6=GLVAR notice, 5=general action, 3=FYI worth reading, 1=spam/noise`,
      `why_adam=null means the TC system handles it automatically without Adam.`,
    ].join('\n');

    try {
      const raw = await callCouncilMember('anthropic', prompt, { taskType: 'classification', maxTokens: 200 });
      const text = typeof raw === 'string' ? raw : (raw?.content || '');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category:          Object.values(CATEGORIES).includes(parsed.category) ? parsed.category : CATEGORIES.CLIENT,
        urgency:           Math.min(10, Math.max(1, parseInt(parsed.urgency, 10) || 5)),
        brief:             String(parsed.brief || subject).slice(0, 300),
        why_adam:          parsed.why_adam ? String(parsed.why_adam).slice(0, 300) : null,
        negotiation_intel: parsed.negotiation_intel ? String(parsed.negotiation_intel).slice(0, 400) : null,
        spam:              parsed.spam === true,
      };
    } catch (err) {
      logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] AI classification parse failed — defaulting');
      return {
        category: CATEGORIES.CLIENT,
        urgency: 5,
        brief: subject,
        why_adam: 'Requires your review',
        negotiation_intel: null,
        spam: false,
      };
    }
  }

  // ── IMAP actions ─────────────────────────────────────────────────────────

  async function resolveTrashPath(client) {
    try {
      const list = await client.list();
      const paths = (list || []).map(b => b.path).filter(Boolean);
      return paths.find(p => /\[gmail\]\/trash/i.test(p))
        || paths.find(p => /trash|deleted/i.test(p))
        || '[Gmail]/Trash';
    } catch { return '[Gmail]/Trash'; }
  }

  async function moveToTrash(client, uid, trashPath) {
    try {
      await client.messageMove(uid, trashPath, { uid: true });
      logger.info?.({ uid, trashPath }, '[EMAIL-TRIAGE] Spam moved to trash');
    } catch (e) {
      // Fallback: mark deleted + expunge
      try {
        await client.messageFlagsAdd(uid, ['\\Deleted', '\\Seen'], { uid: true });
      } catch { /* ignore */ }
      logger.warn?.({ uid, err: e.message }, '[EMAIL-TRIAGE] moveToTrash fallback to \\Deleted flag');
    }
  }

  async function markRead(client, uid) {
    try {
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
    } catch { /* ignore */ }
  }

  // ── DB operations ─────────────────────────────────────────────────────────

  async function upsertTriageItem({ uid, date, from, subject, category, actionRequired,
    messageId, previewText, urgency, brief, why_adam, negotiation_intel,
    spam_deleted, auto_tc_queued }) {

    const v2 = await supportsV2Columns();

    if (v2) {
      const { rows } = await pool.query(
        `INSERT INTO email_triage_log
           (uid, received_at, from_address, subject, category, action_required,
            message_id, preview_text, urgency_score, brief, why_adam, negotiation_intel,
            spam_deleted, auto_tc_queued)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (uid) DO NOTHING
         RETURNING *`,
        [uid, date, from, subject, category, actionRequired,
         messageId || null, previewText || null,
         urgency || null, brief || null, why_adam || null, negotiation_intel || null,
         spam_deleted || false, auto_tc_queued || false]
      ).catch(() => ({ rows: [] }));
      return rows[0] || null;
    }

    // Legacy schema (v1 columns only)
    const { rows } = await pool.query(
      `INSERT INTO email_triage_log
         (uid, received_at, from_address, subject, category, action_required, message_id, preview_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (uid) DO NOTHING
       RETURNING *`,
      [uid, date, from, subject, category, actionRequired, messageId || null, previewText || null]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  // ── TC auto-pipeline trigger ──────────────────────────────────────────────
  // When a TC email arrives with attachments, queue it into the TC attachment pipeline
  // for every active transaction. The pipeline will match by address in subject/body.

  async function triggerTCPipeline(item, hasAttachments) {
    if (!hasAttachments) return false;
    try {
      const { rows: txRows } = await pool.query(
        `SELECT id, address FROM tc_transactions WHERE status='active' LIMIT 20`
      );
      if (!txRows.length) return false;

      // Log and flag — the next tc-email-document-service scan will pick this up
      // automatically because we've updated the triage record and the IMAP scan window covers it.
      logger.info?.({ uid: item.uid, subject: item.subject, transactions: txRows.length },
        '[EMAIL-TRIAGE] TC email with attachments — flagged for TC pipeline');

      await pool.query(
        `UPDATE email_triage_log SET auto_tc_queued=true,
          notes=COALESCE(notes||' | ','') || 'TC pipeline queued'
         WHERE id=$1`, [item.id]
      ).catch(() => {});

      return true;
    } catch (err) {
      logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] TC auto-queue failed');
      return false;
    }
  }

  // ── Main scan ─────────────────────────────────────────────────────────────

  async function scanInbox() {
    if (!(await isTCImapConfigured({ accountManager, logger }))) {
      logger.warn?.('[EMAIL-TRIAGE] IMAP not configured — skipping scan');
      return { ok: false, reason: 'IMAP not configured' };
    }

    const cfg  = await resolveTCImapConfig({ accountManager, logger });
    const client = new ImapFlow(cfg);
    const results = { spam: 0, tc: 0, attention: 0, fyi: 0, total: 0 };
    const newItems = [];

    try {
      await client.connect();
      const trashPath = await resolveTrashPath(client);
      const lock = await client.getMailboxLock('INBOX');

      try {
        const since = new Date(Date.now() - 12 * 60 * 60 * 1000); // last 12h
        const seenUids = new Set();

        for await (const msg of client.fetch(
          { since, seen: false },
          { envelope: true, bodyStructure: true, source: true }
        )) {
          const uid       = String(msg.uid);
          if (seenUids.has(uid)) continue;
          seenUids.add(uid);

          const subject   = msg.envelope?.subject || '(no subject)';
          const from      = msg.envelope?.from?.[0]?.address || '';
          const date      = msg.envelope?.date || new Date();
          const messageId = msg.envelope?.messageId || null;
          const preview   = extractPreview(msg.source);
          const hasAttach = !!(msg.bodyStructure?.childNodes?.length ||
            msg.bodyStructure?.disposition === 'attachment');

          results.total++;

          // Dedup — skip if already processed
          const { rows: existing } = await pool.query(
            `SELECT id FROM email_triage_log WHERE uid=$1`, [uid]
          ).catch(() => ({ rows: [] }));
          if (existing.length) continue;

          // ── Classify ──

          let category, urgency, brief, why_adam, negotiation_intel, spam_deleted = false;

          // Check block list first
          const blocked = await isSpamBlocked(from);

          if (blocked || isDefiniteSpam(subject, from)) {
            // Confirmed spam — delete it
            category = CATEGORIES.SPAM;
            urgency  = 1;
            brief    = `Spam from ${from}`;
            why_adam = null;
            negotiation_intel = null;
            spam_deleted = true;
            await moveToTrash(client, uid, trashPath);
            await blockSender(from, blocked ? 'already blocked' : 'auto-detected spam');
            results.spam++;

          } else if (isDefinitelyFYI(subject, from)) {
            // FYI — mark read, low urgency, no alert
            category = CATEGORIES.FYI;
            urgency  = 2;
            brief    = subject;
            why_adam = null;
            negotiation_intel = null;
            await markRead(client, uid);
            results.fyi++;

          } else {
            // Rule-based fast path
            const ruleCategory = classifyByRules(subject, from, preview);

            if (ruleCategory && ruleCategory !== CATEGORIES.CLIENT) {
              // Confident rule match — still get brief + urgency from AI for TC/urgent
              category = ruleCategory;

              if (TC_CATEGORIES.has(category) || category === CATEGORIES.TIME_SENSITIVE || hasAttach) {
                // Rich AI analysis for anything that matters
                const ai = await classifyWithAI(subject, from, preview, hasAttach);
                urgency  = ai.urgency;
                brief    = ai.brief;
                why_adam = TC_CATEGORIES.has(category) ? null : ai.why_adam;  // TC = system handles
                negotiation_intel = ai.negotiation_intel;
              } else {
                urgency  = category === CATEGORIES.GLVAR ? 6 : 4;
                brief    = subject;
                why_adam = category === CATEGORIES.GLVAR ? 'GLVAR notices require your personal response' : null;
                negotiation_intel = null;
              }
            } else {
              // Full AI analysis
              const ai = await classifyWithAI(subject, from, preview, hasAttach);
              if (ai.spam) {
                category = CATEGORIES.SPAM;
                urgency  = 1;
                brief    = `Possible spam: ${subject}`;
                why_adam = null;
                negotiation_intel = null;
                spam_deleted = true;
                await moveToTrash(client, uid, trashPath);
                await blockSender(from, 'AI-detected spam');
                results.spam++;
              } else {
                category = ruleCategory || ai.category;
                urgency  = ai.urgency;
                brief    = ai.brief;
                why_adam = TC_CATEGORIES.has(category) ? null : ai.why_adam;
                negotiation_intel = ai.negotiation_intel;
              }
            }
          }

          // ── Store ──

          const actionRequired = ALERT_CATEGORIES.has(category) && !spam_deleted;
          const auto_tc_queued = TC_CATEGORIES.has(category) && hasAttach && !spam_deleted;

          const row = await upsertTriageItem({
            uid, date, from, subject, category, actionRequired,
            messageId, previewText: preview,
            urgency, brief, why_adam, negotiation_intel,
            spam_deleted, auto_tc_queued,
          });

          if (!row) continue;
          newItems.push(row);

          if (TC_CATEGORIES.has(category) && !spam_deleted) results.tc++;
          if (actionRequired && ADAM_MUST_ACT.has(category)) results.attention++;

          // ── Alert + auto-actions ──

          if (negotiation_intel) {
            await _sendNegotiationAlert(row, negotiation_intel);
          }

          if (actionRequired && !spam_deleted) {
            await _sendAttentionAlert(row);
          }

          if (auto_tc_queued) {
            await triggerTCPipeline(row, hasAttach);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err) {
      logger.error?.({ err: err.message }, '[EMAIL-TRIAGE] Scan failed');
      return { ok: false, error: err.message };
    }

    logger.info?.({ ...results }, '[EMAIL-TRIAGE] Scan complete');
    return { ok: true, ...results, items: newItems };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  async function _sendAttentionAlert(item) {
    const urgencyLabel = item.urgency_score >= 9 ? '🚨 URGENT'
      : item.urgency_score >= 7 ? '⚡ HIGH PRIORITY'
      : item.urgency_score >= 5 ? '📋 ACTION NEEDED'
      : '📬 FYI';

    const categoryLabel = {
      tc_contract:    'Contract',
      tc_deadline:    'Deadline Notice',
      tc_document:    'TC Document',
      client:         'Client Message',
      glvar:          'GLVAR/MLS Notice',
      time_sensitive: 'Time Sensitive',
    }[item.category] || item.category;

    const lines = [
      `${urgencyLabel} — ${categoryLabel}`,
      ``,
      `From:     ${item.from_address}`,
      `Subject:  ${item.subject}`,
      `Urgency:  ${item.urgency_score || '?'}/10`,
      ``,
      `What:     ${item.brief || item.subject}`,
    ];

    if (item.why_adam) {
      lines.push(`Why you:  ${item.why_adam}`);
    }
    if (item.negotiation_intel) {
      lines.push(``, `📊 Negotiation: ${item.negotiation_intel}`);
    }

    try {
      await notificationService?.sendEmail?.({
        to: process.env.WORK_EMAIL || 'adam@hopkinsgroup.org',
        subject: `[${item.urgency_score || '?'}/10] ${urgencyLabel}: ${item.subject}`,
        text: lines.join('\n'),
      });
      await pool.query(`UPDATE email_triage_log SET alerted_at=NOW() WHERE id=$1`, [item.id]).catch(() => {});
      logger.info?.({ subject: item.subject, urgency: item.urgency_score }, '[EMAIL-TRIAGE] Attention alert sent');
    } catch (err) {
      logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] Alert send failed');
    }
  }

  async function _sendNegotiationAlert(item, intel) {
    try {
      await notificationService?.sendEmail?.({
        to: process.env.WORK_EMAIL || 'adam@hopkinsgroup.org',
        subject: `💡 Negotiation Intel: ${item.subject}`,
        text: [
          `Opportunity spotted in email from ${item.from_address}:`,
          ``,
          intel,
          ``,
          `Subject: ${item.subject}`,
        ].join('\n'),
      });
      logger.info?.({ subject: item.subject }, '[EMAIL-TRIAGE] Negotiation intel alert sent');
    } catch { /* non-critical */ }
  }

  // ── Daily digest ──────────────────────────────────────────────────────────

  async function sendDailyDigest() {
    const { rows } = await pool.query(
      `SELECT * FROM email_triage_log
       WHERE action_required = true
         AND spam_deleted IS NOT TRUE
         AND actioned_at IS NULL
         AND received_at >= NOW() - INTERVAL '48 hours'
       ORDER BY COALESCE(urgency_score, 5) DESC, received_at DESC
       LIMIT 30`
    ).catch(() => ({ rows: [] }));

    if (!rows.length) return;

    const lines = rows.map((r, i) => {
      const urgency = r.urgency_score ? `[${r.urgency_score}/10]` : '';
      const cat = (r.category || '').replace(/_/g, ' ').toUpperCase();
      const brief = r.brief || r.subject;
      const why = r.why_adam ? `\n   → ${r.why_adam}` : '';
      return `${i + 1}. ${urgency} [${cat}] ${brief}\n   From: ${r.from_address}${why}`;
    });

    try {
      await notificationService?.sendEmail?.({
        to: process.env.WORK_EMAIL || 'adam@hopkinsgroup.org',
        subject: `📬 Daily Digest — ${rows.length} email${rows.length !== 1 ? 's' : ''} need attention`,
        text: [
          `Good morning. Sorted by urgency:`,
          ``,
          ...lines,
          ``,
          `TC emails with attachments were auto-processed. You only see what needs you personally.`,
        ].join('\n'),
      });
      logger.info?.({ count: rows.length }, '[EMAIL-TRIAGE] Daily digest sent');
    } catch (err) {
      logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] Daily digest failed');
    }
  }

  // ── Cron ─────────────────────────────────────────────────────────────────

  function startTriageCron() {
    setTimeout(async () => {
      await scanInbox();
      setInterval(() => scanInbox(), SCAN_INTERVAL_MS);
    }, 60_000); // 1-min startup delay

    function scheduleDigest() {
      const now  = new Date();
      const next = new Date(now);
      next.setHours(DIGEST_HOUR, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      setTimeout(async () => {
        await sendDailyDigest();
        setInterval(() => sendDailyDigest(), 24 * 60 * 60 * 1000);
      }, next.getTime() - now.getTime());
    }
    scheduleDigest();

    logger.info?.('[EMAIL-TRIAGE] Cron started — scanning every 10 min, digest at 7am');
  }

  // ── Query API ─────────────────────────────────────────────────────────────

  async function getTriagedEmails({ category, actionRequired, limit = 50, since, minUrgency } = {}) {
    const conditions = ['spam_deleted IS NOT TRUE'];
    const params = [];
    if (category)            conditions.push(`category=$${params.push(category)}`);
    if (actionRequired !== undefined) conditions.push(`action_required=$${params.push(actionRequired)}`);
    if (since)               conditions.push(`received_at >= $${params.push(since)}`);
    if (minUrgency)          conditions.push(`urgency_score >= $${params.push(minUrgency)}`);

    const { rows } = await pool.query(
      `SELECT * FROM email_triage_log
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(urgency_score, 5) DESC, received_at DESC
       LIMIT $${params.push(Math.min(limit, 200))}`,
      params
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function getTriagedEmail(id) {
    const { rows } = await pool.query(
      `SELECT * FROM email_triage_log WHERE id=$1 LIMIT 1`, [id]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  async function getAttentionQueue({ limit = 20 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM email_triage_log
       WHERE action_required = true
         AND spam_deleted IS NOT TRUE
         AND actioned_at IS NULL
       ORDER BY COALESCE(urgency_score, 5) DESC, received_at DESC
       LIMIT $1`,
      [Math.min(limit, 100)]
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function markActioned(id, notes = null) {
    const { rows } = await pool.query(
      `UPDATE email_triage_log SET actioned_at=NOW(), notes=$2 WHERE id=$1 RETURNING *`,
      [id, notes]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  async function getSpamSenders({ limit = 100 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM email_spam_senders ORDER BY blocked_at DESC LIMIT $1`, [limit]
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function unblockSender(address) {
    await pool.query(
      `DELETE FROM email_spam_senders WHERE address=$1`, [address.toLowerCase()]
    ).catch(() => {});
  }

  return {
    scanInbox,
    sendDailyDigest,
    startTriageCron,
    getTriagedEmail,
    getTriagedEmails,
    getAttentionQueue,
    markActioned,
    getSpamSenders,
    unblockSender,
    blockSender,
  };
}
