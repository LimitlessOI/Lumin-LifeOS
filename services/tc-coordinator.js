/**
 * tc-coordinator.js
 * Main Transaction Coordinator orchestrator — from contract email to close of escrow.
 *
 * Deps: services/tc-browser-agent.js, services/tc-email-monitor.js, pool (Neon)
 * Exports: createTCCoordinator(deps), startTCDeadlineCron(pool, coordinator)
 */

import { createTCBrowserAgent } from './tc-browser-agent.js';
import { createTCEmailMonitor } from './tc-email-monitor.js';

const REMINDER_DAYS = [3, 1]; // Send reminders at 3 days and 1 day before deadline
const CRON_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function createTCCoordinator({ pool, accountManager, notificationService, callCouncilMember, logger = console }) {
  const browserAgent = createTCBrowserAgent({ accountManager, logger });
  const emailMonitor = createTCEmailMonitor({ notificationService, callCouncilMember, logger });

  // ── DB helpers ─────────────────────────────────────────────────────────────

  async function insertTransaction(tx) {
    const { rows } = await pool.query(
      `INSERT INTO tc_transactions
         (mls_number, address, purchase_price, status, agent_role, key_dates, close_date, parties, notes, source_email_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (mls_number) DO UPDATE SET
         address = EXCLUDED.address,
         key_dates = EXCLUDED.key_dates,
         parties = EXCLUDED.parties,
         updated_at = NOW()
       RETURNING *`,
      [
        tx.mls_number || `MANUAL-${Date.now()}`,
        tx.address || 'Address pending',
        tx.purchase_price || null,
        tx.status || 'active',
        tx.agent_role || 'buyers',
        JSON.stringify(tx.key_dates || {}),
        tx.close_date || tx.key_dates?.coe || null,
        JSON.stringify(tx.parties || {}),
        tx.notes || null,
        tx.source_email_id || null,
      ]
    );
    return rows[0];
  }

  async function logEvent(transactionId, eventType, payload = {}) {
    await pool.query(
      `INSERT INTO tc_transaction_events (transaction_id, event_type, payload) VALUES ($1,$2,$3)`,
      [transactionId, eventType, JSON.stringify(payload)]
    ).catch(err => logger.warn?.({ err: err.message }, '[TC] Event log failed'));
  }

  async function getTransaction(id) {
    const { rows } = await pool.query('SELECT * FROM tc_transactions WHERE id=$1', [id]);
    return rows[0] || null;
  }

  async function getActiveTransactions() {
    const { rows } = await pool.query(
      `SELECT * FROM tc_transactions WHERE status IN ('active','pending') ORDER BY close_date ASC`
    );
    return rows;
  }

  async function wasReminderSent(transactionId, deadlineName) {
    const { rows } = await pool.query(
      `SELECT id FROM tc_transaction_events
       WHERE transaction_id=$1 AND event_type='deadline_reminder_sent'
         AND payload->>'deadline' = $2
         AND created_at > NOW() - INTERVAL '23 hours'`,
      [transactionId, deadlineName]
    );
    return rows.length > 0;
  }

  // ── Core flows ─────────────────────────────────────────────────────────────

  /**
   * Full new-contract flow: parse email → DB → TransactionDesk → party intro.
   * TransactionDesk failures are non-blocking.
   */
  async function processNewContract(emailText, sourceEmailId = null) {
    logger.info?.('[TC] Processing new contract from email');

    // 1. Parse transaction details
    const parsed = await emailMonitor.parseTransactionFromEmail(emailText);
    const keyDates = emailMonitor.computeKeyDates(parsed.acceptance_date, parsed.close_date);

    const txData = {
      ...parsed,
      key_dates: keyDates,
      close_date: keyDates.coe || null,
      source_email_id: sourceEmailId,
    };

    // 2. Store in DB
    const row = await insertTransaction(txData);
    await logEvent(row.id, 'created', { source: 'email', parsed });
    logger.info?.({ id: row.id, address: row.address }, '[TC] Transaction created in DB');

    // 3. Create in TransactionDesk (non-blocking)
    let tdResult = { ok: false, skipped: true };
    try {
      const { session, ok } = await browserAgent.loginToGLVAR();
      if (ok) {
        await browserAgent.navigateToTransactionDesk(session);
        tdResult = await browserAgent.createTransaction(session, txData);
        await session.close?.();
      }

      if (tdResult.transactionDeskId) {
        await pool.query(
          'UPDATE tc_transactions SET transaction_desk_id=$1 WHERE id=$2',
          [tdResult.transactionDeskId, row.id]
        );
        await logEvent(row.id, 'td_created', { transactionDeskId: tdResult.transactionDeskId });
      }
    } catch (err) {
      logger.warn?.({ error: err.message }, '[TC] TransactionDesk creation failed (non-blocking)');
      await logEvent(row.id, 'td_create_failed', { error: err.message });
    }

    // 4. Send party intro emails
    let introResult = [];
    try {
      if (notificationService) {
        const tx = await getTransaction(row.id);
        introResult = await emailMonitor.sendPartyIntro(tx);
        await logEvent(row.id, 'party_intro_sent', { recipients: introResult });
      }
    } catch (err) {
      logger.warn?.({ error: err.message }, '[TC] Party intro email failed');
      await logEvent(row.id, 'party_intro_failed', { error: err.message });
    }

    return { ok: true, transactionId: row.id, address: row.address, tdResult, introResult };
  }

  /**
   * Check all active transactions for upcoming deadlines and send reminders.
   * Runs on cron every 15 minutes.
   */
  async function checkDeadlines() {
    const transactions = await getActiveTransactions();
    let remindersSet = 0;

    for (const tx of transactions) {
      const keyDates = tx.key_dates || {};

      for (const [deadlineName, deadlineDateStr] of Object.entries(keyDates)) {
        if (!deadlineDateStr || deadlineName === 'acceptance') continue;

        const deadlineDate = new Date(deadlineDateStr);
        const now = new Date();
        const daysRemaining = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

        if (REMINDER_DAYS.includes(daysRemaining)) {
          const alreadySent = await wasReminderSent(tx.id, deadlineName);
          if (!alreadySent) {
            try {
              await emailMonitor.sendDeadlineReminder(tx, deadlineName, deadlineDateStr, daysRemaining);
              await logEvent(tx.id, 'deadline_reminder_sent', { deadline: deadlineName, daysRemaining });
              remindersSet++;
            } catch (err) {
              logger.warn?.({ error: err.message, txId: tx.id, deadlineName }, '[TC] Reminder failed');
            }
          }
        }
      }
    }

    logger.info?.({ checked: transactions.length, remindersSet }, '[TC] Deadline check complete');
    return { checked: transactions.length, remindersSet };
  }

  /**
   * Generate a full status report for a transaction.
   */
  async function generateStatusReport(transactionId) {
    const tx = await getTransaction(transactionId);
    if (!tx) return null;

    const { rows: events } = await pool.query(
      `SELECT * FROM tc_transaction_events WHERE transaction_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [transactionId]
    );

    const now = new Date();
    const closeDate = tx.close_date ? new Date(tx.close_date) : null;
    const daysToClose = closeDate ? Math.ceil((closeDate - now) / (1000 * 60 * 60 * 24)) : null;

    const contingencies = Object.entries(tx.key_dates || {})
      .filter(([k]) => k !== 'acceptance')
      .map(([name, dateStr]) => {
        const date = dateStr ? new Date(dateStr) : null;
        const daysRemaining = date ? Math.ceil((date - now) / (1000 * 60 * 60 * 24)) : null;
        return {
          name: name.replace(/_/g, ' '),
          date: dateStr,
          daysRemaining,
          status: daysRemaining === null ? 'unknown' : daysRemaining < 0 ? 'expired' : daysRemaining === 0 ? 'today' : 'upcoming',
        };
      });

    const riskFlags = contingencies
      .filter(c => c.daysRemaining !== null && c.daysRemaining >= 0 && c.daysRemaining <= 3)
      .map(c => `${c.name} deadline in ${c.daysRemaining} day(s) (${c.date})`);

    if (daysToClose !== null && daysToClose <= 7 && daysToClose >= 0) {
      riskFlags.unshift(`Close of escrow in ${daysToClose} day(s)`);
    }

    return {
      transaction: tx,
      daysToClose,
      contingencies,
      missingDocs: getMissingDocs(tx.documents),
      recentEvents: events,
      riskFlags,
    };
  }

  function getMissingDocs(documents) {
    const checklist = documents?.checklist || [];
    return checklist
      .filter(doc => doc.required && !doc.received)
      .map(doc => doc.name);
  }

  /**
   * Dashboard summary stats.
   */
  async function getDashboard() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')  AS active,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'closed')  AS closed_total,
        COUNT(*) FILTER (WHERE close_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status IN ('active','pending')) AS closing_this_week
      FROM tc_transactions
    `);

    const { rows: recent } = await pool.query(
      `SELECT e.*, t.address FROM tc_transaction_events e
       JOIN tc_transactions t ON t.id = e.transaction_id
       ORDER BY e.created_at DESC LIMIT 5`
    );

    return { stats: rows[0], recentEvents: recent };
  }

  return {
    processNewContract,
    checkDeadlines,
    generateStatusReport,
    getDashboard,
    insertTransaction,
    getTransaction,
    logEvent,
  };
}

/**
 * Start the TC deadline cron — runs checkDeadlines() every 15 minutes.
 */
export function startTCDeadlineCron(pool, coordinator) {
  const tick = async () => {
    try {
      await coordinator.checkDeadlines();
    } catch (err) {
      console.warn('[TC-CRON] checkDeadlines error:', err.message);
    }
  };

  // Run once at startup, then on interval
  tick();
  const handle = setInterval(tick, CRON_INTERVAL_MS);
  console.log('✅ [TC-CRON] Deadline monitor started (15min interval)');
  return handle;
}

export default createTCCoordinator;
