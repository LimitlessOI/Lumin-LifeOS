// tc-morning-digest.js
// @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md

import { createTCStatusEngine } from './tc-status-engine.js';

// Helper functions for date calculations, copied from tc-status-engine.js patterns
function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffInDays(future, now) {
  if (!future || !now) return null;
  const diffTime = future.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Initialize status engine once
const statusEngine = createTCStatusEngine();

/**
 * Generates a structured daily briefing for Adam.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<object>} Structured digest.
 */
export async function getTCMorningDigest(pool) {
  const generated_at = new Date().toISOString();
  const now = new Date();

  let urgent_deadlines = [];
  let critical_alerts = [];
  let pending_approvals = { total: 0, critical: 0, urgent: 0, normal: 0 };
  let stale_client_updates = [];
  let missing_docs = [];
  let summary = "TC Morning Digest:";

  try {
    // 1. Fetch all active/pending transactions and their events
    const { rows: transactions } = await pool.query(
      `SELECT id, address, key_dates, close_date, documents, status FROM tc_transactions WHERE status IN ('active', 'pending')`
    );

    const transactionIds = transactions.map(tx => tx.id);
    let allEvents = [];
    if (transactionIds.length > 0) {
      const { rows: events } = await pool.query(
        `SELECT transaction_id, event_type, created_at, payload FROM tc_transaction_events WHERE transaction_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
        [transactionIds]
      );
      allEvents = events;
    }

    const eventsByTxId = allEvents.reduce((acc, event) => {
      acc[event.transaction_id] = acc[event.transaction_id] || [];
      acc[event.transaction_id].push(event);
      return acc;
    }, {});

    for (const tx of transactions) {
      const txEvents = eventsByTxId[tx.id] || [];
      const derivedState = statusEngine.deriveTransactionState({ transaction: tx, events: txEvents });

      // (1) Transactions with deadlines today or within 3 days
      const relevantContingencies = derivedState.contingencies.filter(
        (c) => c.daysRemaining !== null && c.daysRemaining >= 0 && c.daysRemaining <= 3
      );
      if (derivedState.days_to_close !== null && derivedState.days_to_close >= 0 && derivedState.days_to_close <= 3) {
        relevantContingencies.push({
          name: 'close_of_escrow',
          label: 'Close of Escrow',
          date: tx.close_date,
          daysRemaining: derivedState.days_to_close,
        });
      }

      for (const c of relevantContingencies) {
        urgent_deadlines.push({
          tx_id: tx.id,
          address: tx.address,
          deadline_label: c.label,
          days_out: c.daysRemaining,
        });
      }

      // (4) Files where a client update is overdue (last_client_update_at > 3 days ago)
      if (derivedState.last_client_update_at) {
        const daysSinceUpdate = diffInDays(now, asDate(derivedState.last_client_update_at));
        if (daysSinceUpdate !== null && daysSinceUpdate > 3) {
          stale_client_updates.push({
            tx_id: tx.id,
            address: tx.address,
            days_since_update: daysSinceUpdate,
          });
        }
      }

      // (5) Missing document counts per active file
      if (derivedState.missing_doc_count > 0) {
        missing_docs.push({
          tx_id: tx.id,
          address: tx.address,
          count: derivedState.missing_doc_count,
        });
      }
    }

    urgent_deadlines.sort((a, b) => a.days_out - b.days_out);
    stale_client_updates.sort((a, b) => b.days_since_update - a.days_since_update);
    missing_docs.sort((a, b) => b.count - a.count);

  } catch (error) {
    console.warn(`[TC-DIGEST] Error fetching transaction data: ${error.message}`);
    // Return empty arrays/defaults as per spec for graceful handling
  }

  try {
    // (2) Open critical/urgent alerts with their prepared next steps
    const { rows: alerts } = await pool.query(
      `SELECT ta.id, ta.transaction_id, ta.severity, ta.title, ta.summary, ta.prepared_action, tt.address
       FROM tc_alerts ta
       JOIN tc_transactions tt ON ta.transaction_id = tt.id
       WHERE ta.status = 'open' AND ta.severity IN ('critical', 'urgent')
       ORDER BY ta.severity DESC, ta.created_at ASC`
    );

    critical_alerts = alerts.map(alert => ({
      tx_id: alert.transaction_id,
      address: alert.address,
      message: `${alert.title}${alert.summary ? ` - ${alert.summary}` : ''}${alert.prepared_action?.label ? ` (Next: ${alert.prepared_action.label})` : ''}`,
      severity: alert.severity,
    }));

    // (3) Pending approvals count by priority level
    const { rows: approvalCounts } = await pool.query(
      `SELECT severity, COUNT(*) as count
       FROM tc_alerts
       WHERE status = 'open' AND target_type = 'approval'
       GROUP BY severity`
    );

    for (const row of approvalCounts) {
      pending_approvals[row.severity] = parseInt(row.count, 10);
      pending_approvals.total += parseInt(row.count, 10);
    }

  } catch (error) {
    console.warn(`[TC-DIGEST] Error fetching alert data: ${error.message}`);
    // Return empty arrays/defaults as per spec for graceful handling
  }

  // Generate summary string
  const parts = [];
  if (urgent_deadlines.length > 0) parts.push(`${urgent_deadlines.length} urgent deadline(s)`);
  if (critical_alerts.length > 0) parts.push(`${critical_alerts.length} critical/urgent alert(s)`);
  if (pending_approvals.total > 0) parts.push(`${pending_approvals.total} pending approval(s)`);
  if (stale_client_updates.length > 0) parts.push(`${stale_client_updates.length} stale client update(s)`);
  if (missing_docs.length > 0) parts.push(`${missing_docs.length} file(s) with missing docs`);

  summary += parts.length > 0 ? ` ${parts.join(', ')}.` : " All clear!";

  return {
    generated_at,
    urgent_deadlines,
    critical_alerts,
    pending_approvals,
    stale_client_updates,
    missing_docs,
    summary,
  };
}

/**
 * Formats the TC digest for SMS (under 320 chars).
 * @param {object} digest - The structured digest object.
 * @returns {string} SMS-friendly string.
 */
export function formatTCDigestForSMS(digest) {
  let sms = `TC Digest: `;
  const parts = [];

  if (digest.urgent_deadlines.length > 0) {
    const nextDeadline = digest.urgent_deadlines[0];
    parts.push(`DL: ${nextDeadline.address} (${nextDeadline.days_out}d)`);
  }
  if (digest.critical_alerts.length > 0) {
    parts.push(`Alerts: ${digest.critical_alerts.length}`);
  }
  if (digest.pending_approvals.total > 0) {
    parts.push(`Approvals: ${digest.pending_approvals.total}`);
  }
  if (digest.stale_client_updates.length > 0) {
    parts.push(`Stale: ${digest.stale_client_updates.length}`);
  }
  if (digest.missing_docs.length > 0) {
    parts.push(`Missing Docs: ${digest.missing_docs.length}`);
  }

  sms += parts.join(' | ');
  if (sms.length > 320) {
    sms = sms.substring(0, 317) + '...';
  }
  return sms;
}

/**
 * Formats the TC digest for email.
 * @param {object} digest - The structured digest object.
 * @returns {{subject: string, html: string, text: string}} Email-friendly object.
 */
export function formatTCDigestForEmail(digest) {
  const subject = `Daily TC Digest - ${new Date(digest.generated_at).toLocaleDateString()}`;

  let textBody = `Good morning Adam,\n\nHere's your daily Transaction Coordinator briefing:\n\n`;
  let htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        h2 { color: #0056b3; }
        h3 { color: #0056b3; margin-top: 20px; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 8px; }
        .critical { color: #d9534f; font-weight: bold; }
        .urgent { color: #f0ad4e; font-weight: bold; }
        .normal { color: #5cb85c; }
        .summary { margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Daily TC Digest</h2>
        <p>Generated: ${new Date(digest.generated_at).toLocaleString()}</p>
        <div class="summary">
            <p><strong>Summary:</strong> ${digest.summary}</p>
        </div>
`;

  // Urgent Deadlines
  if (digest.urgent_deadlines.length > 0) {
    textBody += `\n--- Urgent Deadlines (${digest.urgent_deadlines.length}) ---\n`;
    htmlBody += `<h3>Urgent Deadlines (${digest.urgent_deadlines.length})</h3><ul>`;
    digest.urgent_deadlines.forEach(dl => {
      const label = `${dl.address} - ${dl.deadline_label} in ${dl.days_out} day(s)`;
      textBody += `- ${label}\n`;
      htmlBody += `<li>${label}</li>`;
    });
    htmlBody += `</ul>`;
  }

  // Critical/Urgent Alerts
  if (digest.critical_alerts.length > 0) {
    textBody += `\n--- Critical/Urgent Alerts (${digest.critical_alerts.length}) ---\n`;
    htmlBody += `<h3>Critical/Urgent Alerts (${digest.critical_alerts.length})</h3><ul>`;
    digest.critical_alerts.forEach(alert => {
      const alertClass = alert.severity === 'critical' ? 'critical' : 'urgent';
      const label = `${alert.address} (${alert.severity.toUpperCase()}): ${alert.message}`;
      textBody += `- ${label}\n`;
      htmlBody += `<li class="${alertClass}">${label}</li>`;
    });
    htmlBody += `</ul>`;
  }

  // Pending Approvals
  if (digest.pending_approvals.total > 0) {
    textBody += `\n--- Pending Approvals (${digest.pending_approvals.total}) ---\n`;
    htmlBody += `<h3>Pending Approvals (${digest.pending_approvals.total})</h3><ul>`;
    if (digest.pending_approvals.critical > 0) {
      textBody += `- Critical: ${digest.pending_approvals.critical}\n`;
      htmlBody += `<li class="critical">Critical: ${digest.pending_approvals.critical}</li>`;
    }
    if (digest.pending_approvals.urgent > 0) {
      textBody += `- Urgent: ${digest.pending_approvals.urgent}\n`;
      htmlBody += `<li class="urgent">Urgent: ${digest.pending_approvals.urgent}</li>`;
    }
    if (digest.pending_approvals.normal > 0) {
      textBody += `- Normal: ${digest.pending_approvals.normal}\n`;
      htmlBody += `<li class="normal">Normal: ${digest.pending_approvals.normal}</li>`;
    }
    htmlBody += `</ul>`;
  }

  // Stale Client Updates
  if (digest.stale_client_updates.length > 0) {
    textBody += `\n--- Stale Client Updates (${digest.stale_client_updates.length}) ---\n`;
    htmlBody += `<h3>Stale Client Updates (${digest.stale_client_updates.length})</h3><ul>`;