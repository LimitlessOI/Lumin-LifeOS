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

    return Promise.all(rows.map(async (transaction) => {
      const events = await coordinator.getTransactionEvents(transaction.id, 20).catch(() => []);
      const status = statusEngine.deriveTransactionState({ transaction, events });
      return {
        id: transaction.id,
        address: transaction.address,
        status: transaction.status,
        mls_number: transaction.mls_number,
        source_email_id: transaction.source_email_id,
        transaction_desk_id: transaction.transaction_desk_id,
        stage: status.stage,
        health_status: status.health_status,
        next_action: status.next_action,
        missing_doc_count: status.missing_doc_count,
        blocker_count: status.blocker_count,
        parties: transaction.parties || {},
      };
    }));
  }

  async function listActionableEmails(limit = 40) {
    const { rows } = await pool.query(
      `SELECT *
       FROM email_triage_log
       WHERE action_required = true
       ORDER BY actioned_at NULLS FIRST, received_at DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }));
    return rows;
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
        next_step: nextStep,
      };
    });
  }

  async function getWorkspace() {
    const [readiness, transactions, triageEmails] = await Promise.all([
      accessService.getAccessReadiness(),
      listActiveTransactions(),
      listActionableEmails(),
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
      next_actions: nextActions,
    };
  }

  return {
    getWorkspace,
  };
}

export default createTCIntakeWorkspaceService;
