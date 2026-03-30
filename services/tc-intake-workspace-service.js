/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-intake-workspace-service.js
 * Agent-facing workspace for TC access readiness, inbox triage, and
 * transaction intake matching before live filing runs.
 */

import { createTCStatusEngine } from './tc-status-engine.js';

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && token.length > 2 && !['the', 'and', 'for', 'with', 'from', 're', 'fwd', 'your'].includes(token));
}

function pickImportantTokens(address = '') {
  const raw = String(address || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return raw.filter((token) => /\d/.test(token) || token.length > 3);
}

function scoreEmailToTransaction(email, transaction) {
  const emailText = `${email.subject || ''} ${email.from_address || ''} ${email.preview_text || ''} ${email.notes || ''}`.toLowerCase();
  const addressTokens = pickImportantTokens(transaction.address || '');
  const partyTokens = Object.values(transaction.parties || {})
    .flatMap((party) => tokenize(typeof party === 'object' ? Object.values(party).join(' ') : party));
  let score = 0;

  for (const token of addressTokens) {
    if (emailText.includes(token)) score += /\d/.test(token) ? 5 : 2;
  }
  if (transaction.mls_number && emailText.includes(String(transaction.mls_number).toLowerCase())) score += 6;
  for (const token of partyTokens.slice(0, 10)) {
    if (emailText.includes(token)) score += 1;
  }

  if (score <= 0) return null;
  return {
    transaction_id: transaction.id,
    address: transaction.address,
    score,
    confidence: score >= 8 ? 'high' : score >= 4 ? 'medium' : 'low',
  };
}

export function createTCIntakeWorkspaceService({ pool, coordinator, accessService, logger = console }) {
  const statusEngine = createTCStatusEngine();

  async function listActiveTransactions(limit = 25) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_transactions
       WHERE status IN ('active', 'pending')
       ORDER BY close_date ASC NULLS LAST, created_at DESC
       LIMIT $1`,
      [limit]
    );

    const ids = rows.map((r) => r.id);
    let approvalCounts = new Map();
    let alertCounts = new Map();
    if (ids.length) {
      try {
        const [approvalsRes, alertsRes] = await Promise.all([
          pool.query(
            `SELECT transaction_id, COUNT(*)::int AS c
             FROM tc_approval_items
             WHERE transaction_id = ANY($1::bigint[])
               AND status IN ('pending','awaiting_review')
             GROUP BY transaction_id`,
            [ids]
          ),
          pool.query(
            `SELECT transaction_id, COUNT(*)::int AS c
             FROM tc_alerts
             WHERE transaction_id = ANY($1::bigint[])
               AND status = 'open'
               AND severity IN ('action_required','urgent','critical')
             GROUP BY transaction_id`,
            [ids]
          ),
        ]);
        approvalCounts = new Map(approvalsRes.rows.map((r) => [Number(r.transaction_id), r.c]));
        alertCounts = new Map(alertsRes.rows.map((r) => [Number(r.transaction_id), r.c]));
      } catch (err) {
        logger.warn?.({ err: err.message }, '[tc-workspace] approval/alert counts skipped');
      }
    }

    return Promise.all(rows.map(async (transaction) => {
      const events = await coordinator.getTransactionEvents(transaction.id, 20).catch(() => []);
      const status = statusEngine.deriveTransactionState({ transaction, events });
      return {
        id: transaction.id,
        address: transaction.address,
        status: transaction.status,
        agent_role: transaction.agent_role,
        mls_number: transaction.mls_number,
        source_email_id: transaction.source_email_id,
        transaction_desk_id: transaction.transaction_desk_id,
        stage: status.stage,
        health_status: status.health_status,
        next_action: status.next_action,
        next_action_owner: status.next_action_owner,
        waiting_on: status.waiting_on,
        missing_doc_count: status.missing_doc_count,
        missing_docs: status.missing_docs,
        blocker_count: status.blocker_count,
        blockers: status.blockers,
        risk_flags: status.risk_flags,
        days_to_close: status.days_to_close,
        last_client_update_at: status.last_client_update_at,
        next_client_update_due_at: status.next_client_update_due_at,
        portal_sync_status: status.portal_sync_status,
        contingencies: status.contingencies,
        parties: transaction.parties || {},
        pending_approvals: approvalCounts.get(Number(transaction.id)) || 0,
        open_operator_alerts: alertCounts.get(Number(transaction.id)) || 0,
      };
    }));
  }

  async function listActionableEmails(limit = 40) {
    const { rows } = await pool.query(
      `SELECT *
       FROM email_triage_log
       WHERE action_required = true
         AND category IN ('tc_contract', 'tc_deadline', 'client')
       ORDER BY actioned_at NULLS FIRST, received_at DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function listRecentIntakeActivity(limit = 20) {
    const { rows } = await pool.query(
      `SELECT e.created_at, e.event_type, e.payload, t.id AS transaction_id, t.address
       FROM tc_transaction_events e
       JOIN tc_transactions t ON t.id = e.transaction_id
       WHERE e.event_type IN ('created', 'triage_email_linked', 'td_created', 'td_create_failed', 'party_intro_sent')
       ORDER BY e.created_at DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }));

    return rows.map((row) => ({
      created_at: row.created_at,
      event_type: row.event_type,
      transaction_id: row.transaction_id,
      address: row.address,
      payload: row.payload || {},
    }));
  }

  function buildQueue(emails, transactions) {
    return emails.map((email) => {
      const matches = transactions
        .map((transaction) => scoreEmailToTransaction(email, transaction))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
      const best = matches[0] || null;
      const nextStep = email.actioned_at
        ? 'Already handled'
        : email.category === 'tc_contract'
          ? best
            ? 'Review attachments, validate docs, and file to the matched transaction'
            : 'Review and create or match a transaction before filing'
          : email.category === 'tc_deadline'
            ? best
              ? 'Review matched transaction and send/update deadline communication'
              : 'Review manually and match to a transaction'
            : 'Review and route manually';

      return {
        id: email.id,
        received_at: email.received_at,
        from_address: email.from_address,
        subject: email.subject,
        category: email.category,
        action_required: email.action_required,
        actioned_at: email.actioned_at,
        notes: email.notes,
        preview_text: email.preview_text || '',
        suggested_transaction: best,
        match_candidates: matches.slice(0, 3),
        next_step: nextStep,
      };
    });
  }

  async function getWorkspace() {
    const [readiness, transactions, triageEmails, recentActivity] = await Promise.all([
      accessService.getAccessReadiness(),
      listActiveTransactions(),
      listActionableEmails(),
      listRecentIntakeActivity(),
    ]);

    const intakeQueue = buildQueue(triageEmails, transactions);
    const matched = intakeQueue.filter((item) => item.suggested_transaction).length;
    const unmatchedContracts = intakeQueue.filter((item) => item.category === 'tc_contract' && !item.suggested_transaction).length;
    const summary = {
      active_transactions: transactions.length,
      actionable_emails: triageEmails.filter((item) => !item.actioned_at).length,
      matched_candidates: matched,
      unmatched_contract_emails: unmatchedContracts,
      access_ready: Object.values(readiness.readiness || {}).every(Boolean),
    };

    const nextActions = [];
    if (!readiness.readiness?.imap_ready) nextActions.push('Enter TC mailbox credentials so email monitoring can run');
    if (!readiness.readiness?.glvar_ready) nextActions.push('Store GLVAR credentials so TransactionDesk access is available');
    if (!readiness.readiness?.skyslope_ready) nextActions.push('Store eXp Okta credentials so SkySlope access is available');
    if (unmatchedContracts > 0) nextActions.push(`Review ${unmatchedContracts} unmatched contract email(s) and create or match transactions`);
    if (summary.actionable_emails > 0 && matched > 0) nextActions.push('Process matched intake candidates into validated filing work');

    return {
      generated_at: new Date().toISOString(),
      summary,
      readiness,
      active_transactions: transactions,
      intake_queue: intakeQueue,
      recent_activity: recentActivity,
      next_actions: nextActions,
    };
  }

  return {
    getWorkspace,
  };
}

export default createTCIntakeWorkspaceService;
