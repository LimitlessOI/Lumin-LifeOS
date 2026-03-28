/**
 * services/tc-inspection-service.js
 *
 * Inspection workflow for TC transactions.
 *
 * Flow:
 *   1. schedule()    — record inspector + scheduled date
 *   2. receiveReport() — mark report received, log findings
 *   3. decide()      — accept_as_is | repair_request | reject_and_cancel
 *
 * Rejection fast path (reject_and_cancel):
 *   - Computes days remaining in inspection contingency
 *   - Drafts a cancellation notice immediately
 *   - Fires a CRITICAL alert to agent if contingency expires < 48h
 *   - Updates transaction status to 'cancelled'
 *   - Logs full audit trail to tc_transaction_events
 *
 * Nevada default: 10 calendar days from acceptance date for inspection contingency.
 *
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 */

const INSPECTION_CONTINGENCY_DAYS = 10; // Nevada default
const URGENT_HOURS_THRESHOLD = 48;       // fire CRITICAL alert when this close to deadline

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysRemaining(deadlineDate) {
  if (!deadlineDate) return null;
  const now = Date.now();
  const deadline = new Date(deadlineDate).getTime();
  return Math.round(((deadline - now) / (1000 * 60 * 60 * 24)) * 10) / 10;
}

function getInspectionDeadline(transaction) {
  const keyDates = transaction.key_dates || {};
  if (keyDates.inspection_contingency) return new Date(keyDates.inspection_contingency);

  // Derive from acceptance date + default days
  if (keyDates.acceptance) {
    const acceptance = new Date(keyDates.acceptance);
    acceptance.setDate(acceptance.getDate() + INSPECTION_CONTINGENCY_DAYS);
    return acceptance;
  }
  return null;
}

function draftCancellationNotice(transaction, inspection, daysLeft) {
  const address = transaction.address || '(address not on file)';
  const mlsNumber = transaction.mls_number || '';
  const buyerName = transaction.parties?.buyer?.name || 'Buyer';
  const sellerName = transaction.parties?.seller?.name || 'Seller';
  const agentName = transaction.parties?.buyer_agent?.name || 'Buyer\'s Agent';
  const deadline = getInspectionDeadline(transaction);
  const deadlineStr = deadline
    ? deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '(see contract)';

  const urgencyNote = daysLeft !== null && daysLeft < 1
    ? '⚠️  CONTINGENCY DEADLINE HAS PASSED — confirm earnest money disposition with escrow immediately.'
    : daysLeft !== null && daysLeft < 2
    ? `⚠️  CONTINGENCY EXPIRES IN LESS THAN ${Math.round(daysLeft * 24)} HOURS — send immediately.`
    : '';

  return `BUYER'S NOTICE OF CANCELLATION DURING INSPECTION PERIOD
${urgencyNote ? `\n${urgencyNote}\n` : ''}
Property Address: ${address}
MLS #: ${mlsNumber}
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

To: ${sellerName} and Listing Agent
From: ${buyerName} (represented by ${agentName})

Pursuant to the Inspection Contingency in the Residential Purchase Agreement dated ${
  transaction.key_dates?.acceptance
    ? new Date(transaction.key_dates.acceptance).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '(see contract)'
}, Buyer hereby exercises their right to cancel this transaction within the inspection contingency period (deadline: ${deadlineStr}).

Buyer's decision is based on the results of the property inspection completed on ${
  inspection.completed_at
    ? new Date(inspection.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : inspection.scheduled_at
    ? new Date(inspection.scheduled_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '(date of inspection)'
}${inspection.findings_summary ? `:\n\n${inspection.findings_summary}` : '.'}

Buyer requests the immediate return of all earnest money deposited per the contract terms.

${inspection.decision_notes ? `Buyer's notes: ${inspection.decision_notes}` : ''}

This notice is delivered within the contractual inspection contingency window and cancels the Agreement without penalty to Buyer.

_______________________________
${buyerName} — Buyer

_______________________________
${agentName} — Buyer's Agent
`.trim();
}

// ── Service factory ────────────────────────────────────────────────────────────

export function createTCInspectionService({ pool, coordinator, alertService, logger = console }) {

  async function getTransaction(transactionId) {
    const { rows } = await pool.query(
      'SELECT * FROM tc_transactions WHERE id = $1',
      [transactionId]
    );
    if (!rows.length) throw new Error(`Transaction ${transactionId} not found`);
    return rows[0];
  }

  async function getInspection(transactionId) {
    const { rows } = await pool.query(
      'SELECT * FROM tc_inspections WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1',
      [transactionId]
    );
    return rows[0] || null;
  }

  // ── schedule ────────────────────────────────────────────────────────────────
  /**
   * Record that an inspection has been scheduled.
   */
  async function schedule(transactionId, {
    inspectorName,
    inspectorCompany = null,
    inspectorPhone = null,
    inspectorEmail = null,
    scheduledAt,
  }) {
    await getTransaction(transactionId); // verify exists

    const existing = await getInspection(transactionId);
    let row;

    if (existing && !existing.decision) {
      // Update existing pending inspection
      const { rows } = await pool.query(
        `UPDATE tc_inspections SET
           inspector_name = $2, inspector_company = $3, inspector_phone = $4,
           inspector_email = $5, scheduled_at = $6, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [existing.id, inspectorName, inspectorCompany, inspectorPhone, inspectorEmail, scheduledAt]
      );
      row = rows[0];
    } else {
      // Create new inspection record
      const { rows } = await pool.query(
        `INSERT INTO tc_inspections
           (transaction_id, inspector_name, inspector_company, inspector_phone, inspector_email, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [transactionId, inspectorName, inspectorCompany, inspectorPhone, inspectorEmail, scheduledAt]
      );
      row = rows[0];
    }

    await coordinator.logEvent(transactionId, 'inspection_scheduled', {
      inspection_id: row.id,
      inspector: inspectorName,
      scheduled_at: scheduledAt,
    });

    logger.info?.(`[TC-INSPECT] tx-${transactionId} inspection scheduled: ${inspectorName} @ ${scheduledAt}`);
    return row;
  }

  // ── receiveReport ────────────────────────────────────────────────────────────
  /**
   * Mark inspection report received and log findings.
   */
  async function receiveReport(transactionId, {
    completedAt = new Date().toISOString(),
    reportUrl = null,
    findingsSummary = null,
    findingsItems = [],
  }) {
    let inspection = await getInspection(transactionId);
    if (!inspection) {
      // Create on the fly if schedule() was skipped
      const { rows } = await pool.query(
        `INSERT INTO tc_inspections (transaction_id, completed_at) VALUES ($1, $2) RETURNING *`,
        [transactionId, completedAt]
      );
      inspection = rows[0];
    }

    const { rows } = await pool.query(
      `UPDATE tc_inspections SET
         completed_at = $2, report_received_at = NOW(), report_url = $3,
         findings_summary = $4, findings_items = $5, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [inspection.id, completedAt, reportUrl, findingsSummary, JSON.stringify(findingsItems)]
    );

    await coordinator.logEvent(transactionId, 'inspection_report_received', {
      inspection_id: inspection.id,
      report_url: reportUrl,
      findings_count: findingsItems.length,
    });

    logger.info?.(`[TC-INSPECT] tx-${transactionId} report received, ${findingsItems.length} findings`);
    return rows[0];
  }

  // ── decide ───────────────────────────────────────────────────────────────────
  /**
   * Record buyer's decision: accept_as_is | repair_request | reject_and_cancel
   *
   * Rejection triggers the fast path:
   *   - computes days remaining in contingency
   *   - drafts cancellation notice
   *   - fires CRITICAL alert to agent
   *   - cancels the transaction in DB
   */
  async function decide(transactionId, {
    decision,           // 'accept_as_is' | 'repair_request' | 'reject_and_cancel'
    decisionNotes = null,
    repairRequestItems = [],   // for repair_request: [{ item, amount_requested, type }]
    repairResponseDeadline = null,
  }) {
    const VALID = ['accept_as_is', 'repair_request', 'reject_and_cancel'];
    if (!VALID.includes(decision)) {
      throw new Error(`Invalid decision. Must be one of: ${VALID.join(', ')}`);
    }

    const transaction = await getTransaction(transactionId);
    let inspection = await getInspection(transactionId);
    if (!inspection) {
      // Allow decision even without prior schedule/report (edge case)
      const { rows } = await pool.query(
        `INSERT INTO tc_inspections (transaction_id) VALUES ($1) RETURNING *`,
        [transactionId]
      );
      inspection = rows[0];
    }

    const deadline = getInspectionDeadline(transaction);
    const daysLeft = daysRemaining(deadline);

    // ── Build update patch ─────────────────────────────────────────────────────
    const patch = {
      decision,
      decision_made_at: new Date().toISOString(),
      decision_notes: decisionNotes,
      contingency_days_remaining: daysLeft,
    };

    if (decision === 'repair_request') {
      patch.repair_request_items = JSON.stringify(repairRequestItems);
      patch.repair_response = 'pending';
      if (repairResponseDeadline) patch.repair_response_deadline = repairResponseDeadline;
    }

    if (decision === 'reject_and_cancel') {
      // Draft cancellation notice
      patch.cancellation_notice_text = draftCancellationNotice(transaction, inspection, daysLeft);
    }

    const { rows } = await pool.query(
      `UPDATE tc_inspections SET
         decision = $2, decision_made_at = $3, decision_notes = $4,
         contingency_days_remaining = $5,
         repair_request_items = COALESCE($6, repair_request_items),
         repair_response = COALESCE($7, repair_response),
         repair_response_deadline = COALESCE($8::date, repair_response_deadline),
         cancellation_notice_text = COALESCE($9, cancellation_notice_text),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [
        inspection.id,
        patch.decision,
        patch.decision_made_at,
        patch.decision_notes,
        patch.contingency_days_remaining,
        decision === 'repair_request' ? patch.repair_request_items : null,
        decision === 'repair_request' ? 'pending' : null,
        repairResponseDeadline || null,
        decision === 'reject_and_cancel' ? patch.cancellation_notice_text : null,
      ]
    );
    const updated = rows[0];

    await coordinator.logEvent(transactionId, 'inspection_decision', {
      inspection_id: inspection.id,
      decision,
      days_remaining: daysLeft,
    });

    // ── Rejection fast path ────────────────────────────────────────────────────
    if (decision === 'reject_and_cancel') {
      await _handleRejection(transaction, updated, daysLeft);
    }

    // ── Accept as-is: log and move on ─────────────────────────────────────────
    if (decision === 'accept_as_is') {
      await coordinator.logEvent(transactionId, 'inspection_accepted_as_is', { inspection_id: inspection.id });
      logger.info?.(`[TC-INSPECT] tx-${transactionId} accepted as-is — continuing to close`);
    }

    // ── Repair request: create approval item for agent review ─────────────────
    if (decision === 'repair_request' && repairRequestItems.length > 0) {
      const total = repairRequestItems.reduce((s, r) => s + (Number(r.amount_requested) || 0), 0);
      await coordinator.logEvent(transactionId, 'repair_request_submitted', {
        inspection_id: inspection.id,
        items: repairRequestItems.length,
        total_requested: total,
      });
      logger.info?.(`[TC-INSPECT] tx-${transactionId} repair request: ${repairRequestItems.length} items, $${total.toLocaleString()}`);
    }

    return updated;
  }

  // ── Rejection fast path ─────────────────────────────────────────────────────
  async function _handleRejection(transaction, inspection, daysLeft) {
    const txId = transaction.id;
    const hoursLeft = daysLeft !== null ? daysLeft * 24 : null;

    // Determine alert severity based on time left
    let severity = 'urgent';
    let title = `INSPECTION REJECTION — ${transaction.address}`;
    let summary = `Buyer is cancelling. Cancellation notice drafted and ready to send.`;

    if (daysLeft !== null && daysLeft < 0) {
      severity = 'critical';
      title = `⚠️ INSPECTION REJECTION — CONTINGENCY EXPIRED — ${transaction.address}`;
      summary = `Buyer cancelled AFTER contingency deadline. Confirm earnest money disposition with escrow IMMEDIATELY.`;
    } else if (hoursLeft !== null && hoursLeft < URGENT_HOURS_THRESHOLD) {
      severity = 'critical';
      title = `🚨 INSPECTION REJECTION — ${Math.round(hoursLeft)}h LEFT — ${transaction.address}`;
      summary = `Contingency expires in ${Math.round(hoursLeft)} hours. Send cancellation notice NOW to protect earnest money.`;
    }

    // Cancel the transaction
    await pool.query(
      `UPDATE tc_transactions SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [txId]
    );

    await coordinator.logEvent(txId, 'status_changed', {
      from: transaction.status,
      to: 'cancelled',
      reason: 'inspection_rejection',
      inspection_id: inspection.id,
    });

    // Mark alert fired on inspection record
    await pool.query(
      `UPDATE tc_inspections SET urgent_alert_fired_at = NOW() WHERE id = $1`,
      [inspection.id]
    );

    // Fire alert through alert service
    if (alertService) {
      try {
        await alertService.createAlert(txId, {
          severity,
          title,
          summary,
          target_type: 'inspection',
          target_id: String(inspection.id),
          next_escalation_at: new Date().toISOString(), // fire immediately
          prepared_action: {
            label: 'Send cancellation notice to listing agent',
            endpoint: `/api/v1/tc/transactions/${txId}/inspection/send-cancellation`,
            method: 'POST',
          },
          metadata: {
            days_remaining: daysLeft,
            cancellation_notice_ready: true,
            mls_number: transaction.mls_number,
          },
        });
      } catch (alertErr) {
        logger.warn?.(`[TC-INSPECT] alert fire failed: ${alertErr.message}`);
      }
    }

    logger.info?.(`[TC-INSPECT] tx-${txId} REJECTED — transaction cancelled, alert fired (severity: ${severity}, ${daysLeft}d remaining)`);
  }

  // ── recordRepairResponse ─────────────────────────────────────────────────────
  /**
   * Record seller's response to a repair request.
   */
  async function recordRepairResponse(transactionId, {
    response,         // 'accepted' | 'counter' | 'rejected'
    counterOffer = null,
    responseNotes = null,
  }) {
    const VALID_RESPONSES = ['accepted', 'counter', 'rejected'];
    if (!VALID_RESPONSES.includes(response)) {
      throw new Error(`Invalid repair response. Must be: ${VALID_RESPONSES.join(', ')}`);
    }

    const inspection = await getInspection(transactionId);
    if (!inspection) throw new Error(`No inspection found for transaction ${transactionId}`);
    if (inspection.decision !== 'repair_request') throw new Error('Transaction is not in repair_request state');

    const { rows } = await pool.query(
      `UPDATE tc_inspections SET
         repair_response = $2, repair_response_at = NOW(),
         repair_counter_offer = $3, decision_notes = COALESCE($4, decision_notes),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [inspection.id, response, counterOffer ? JSON.stringify(counterOffer) : null, responseNotes]
    );

    await coordinator.logEvent(transactionId, 'repair_response_received', {
      inspection_id: inspection.id,
      response,
      has_counter: !!counterOffer,
    });

    // If seller rejected repair request, buyer now needs to decide: accept as-is or cancel
    if (response === 'rejected') {
      if (alertService) {
        const transaction = await getTransaction(transactionId);
        const deadline = getInspectionDeadline(transaction);
        const daysLeft = daysRemaining(deadline);
        const hoursLeft = daysLeft !== null ? daysLeft * 24 : null;
        const severity = hoursLeft !== null && hoursLeft < URGENT_HOURS_THRESHOLD ? 'critical' : 'urgent';

        await alertService.createAlert(transactionId, {
          severity,
          title: `Seller rejected repair request — ${transaction.address}`,
          summary: `Buyer must decide: accept as-is or cancel. ${daysLeft !== null ? `${daysLeft.toFixed(1)} days left in contingency.` : ''}`,
          target_type: 'inspection',
          target_id: String(inspection.id),
          next_escalation_at: new Date().toISOString(),
          prepared_action: {
            label: 'Record buyer final decision',
            endpoint: `/api/v1/tc/transactions/${transactionId}/inspection/decision`,
            method: 'POST',
          },
          metadata: { days_remaining: daysLeft, mls_number: transaction.mls_number },
        }).catch(() => {});
      }
    }

    logger.info?.(`[TC-INSPECT] tx-${transactionId} repair response: ${response}`);
    return rows[0];
  }

  // ── sendCancellationNotice ───────────────────────────────────────────────────
  /**
   * Mark cancellation notice as sent and log the event.
   * (Actual sending is handled by the email/communication service.)
   */
  async function markCancellationNoticeSent(transactionId) {
    const inspection = await getInspection(transactionId);
    if (!inspection) throw new Error(`No inspection found for transaction ${transactionId}`);
    if (!inspection.cancellation_notice_text) throw new Error('No cancellation notice drafted — run decide() with reject_and_cancel first');

    const { rows } = await pool.query(
      `UPDATE tc_inspections SET
         cancellation_notice_sent_at = NOW(),
         earnest_money_return_requested_at = NOW(),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [inspection.id]
    );

    await coordinator.logEvent(transactionId, 'cancellation_notice_sent', {
      inspection_id: inspection.id,
      sent_at: new Date().toISOString(),
    });

    logger.info?.(`[TC-INSPECT] tx-${transactionId} cancellation notice marked sent`);
    return rows[0];
  }

  // ── getStatus ───────────────────────────────────────────────────────────────
  /**
   * Returns full inspection state for a transaction, with contingency time remaining.
   */
  async function getStatus(transactionId) {
    const transaction = await getTransaction(transactionId);
    const inspection = await getInspection(transactionId);
    const deadline = getInspectionDeadline(transaction);
    const daysLeft = daysRemaining(deadline);

    return {
      transaction_id: transactionId,
      address: transaction.address,
      mls_number: transaction.mls_number,
      inspection_contingency_deadline: deadline?.toISOString() || null,
      contingency_days_remaining: daysLeft,
      contingency_expired: daysLeft !== null ? daysLeft < 0 : null,
      inspection,
    };
  }

  return {
    schedule,
    receiveReport,
    decide,
    recordRepairResponse,
    markCancellationNoticeSent,
    getStatus,
  };
}

export default createTCInspectionService;
