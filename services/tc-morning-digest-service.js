import { createTCStatusEngine } from './tc-status-engine.js'; // For consistency, though its internal constants are re-declared for self-containment.

// Re-declaring constants from tc-status-engine.js for self-containment as per spec.
// These are not exported by tc-status-engine.js, so direct import is not possible.
const CLIENT_UPDATE_EVENTS = new Set([
    'party_intro_sent',
    'deadline_reminder_sent',
    'welcome_sent',
    'client_update_sent',
    'seller_update_sent',
    'approval_request_sent',
]);

/**
 * Helper to safely parse a date string or Date object.
 * @param {string|Date} value
 * @returns {Date|null}
 */
function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calculates the difference in days between two dates.
 * @param {Date} future
 * @param {Date} now
 * @returns {number|null}
 */
function diffInDays(future, now) {
    if (!future || !now) return null;
    const diffTime = future.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generates a structured daily briefing for Adam.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<object>} Structured digest.
 */
export async function getTCMorningDigest(pool) {
    const generated_at = new Date().toISOString();
    const now = new Date();
    const digest = {
        generated_at,
        urgent_deadlines: [],
        critical_alerts: [],
        pending_approvals: { total: 0, critical: 0, urgent: 0, normal: 0 },
        stale_client_updates: [],
        missing_docs: [],
        summary: "",
    };

    // 1. Transactions with deadlines today or within 3 days
    try {
        const { rows: transactions } = await pool.query(`
            SELECT id, address, key_dates, close_date
            FROM tc_transactions
            WHERE status IN ('active', 'pending');
        `);

        for (const tx of transactions) {
            const keyDates = tx.key_dates || {};
            const allDeadlines = { ...keyDates, coe: tx.close_date }; // Include close_date as a deadline

            for (const [label, dateStr] of Object.entries(allDeadlines)) {
                if (!dateStr || label === 'acceptance') continue; // Skip acceptance date and nulls
                const deadlineDate = asDate(dateStr);
                if (!deadlineDate) continue;

                const daysOut = diffInDays(deadlineDate, now);

                if (daysOut !== null && daysOut >= 0 && daysOut <= 3) {
                    digest.urgent_deadlines.push({
                        tx_id: tx.id,
                        address: tx.address,
                        deadline_label: label.replace(/_/g, ' '),
                        days_out: daysOut,
                    });
                }
            }
        }
        digest.urgent_deadlines.sort((a, b) => a.days_out - b.days_out);
    } catch (err) {
        if (err.code === '42P01') { /* tc_transactions table missing, return empty array */ } else { throw err; }
    }

    // 2. Open critical/urgent alerts with their prepared next steps
    try {
        const { rows: alerts } = await pool.query(`
            SELECT
                a.transaction_id AS tx_id,
                t.address,
                a.title,
                a.summary,
                a.severity,
                a.prepared_action
            FROM tc_alerts a
            JOIN tc_transactions t ON a.transaction_id = t.id
            WHERE a.status = 'open' AND a.severity IN ('critical', 'urgent')
            ORDER BY a.severity DESC, a.created_at ASC;
        `);

        digest.critical_alerts = alerts.map(alert => {
            const preparedActionLabel = alert.prepared_action?.label ? `Next: ${alert.prepared_action.label}` : '';
            const message = `${alert.title}${alert.summary ? ` - ${alert.summary}` : ''}${preparedActionLabel ? ` (${preparedActionLabel})` : ''}`;
            return {
                tx_id: alert.tx_id,
                address: alert.address,
                message: message.trim(),
                severity: alert.severity,
            };
        });
    } catch (err) {
        if (err.code === '42P01') { /* tc_alerts or tc_transactions table missing, return empty array */ } else { throw err; }
    }

    // 3. Pending approvals count by priority level (assuming all open alerts are "pending approvals" for digest purposes)
    try {
        const { rows: approvalCounts } = await pool.query(`
            SELECT severity, COUNT(*) AS count
            FROM tc_alerts
            WHERE status = 'open'
            GROUP BY severity;
        `);

        for (const row of approvalCounts) {
            const severity = row.severity.toLowerCase();
            if (digest.pending_approvals.hasOwnProperty(severity)) {
                digest.pending_approvals[severity] = parseInt(row.count, 10);
                digest.pending_approvals.total += parseInt(row.count, 10);
            } else {
                // Handle other severities if they exist, or add to total
                digest.pending_approvals.total += parseInt(row.count, 10);
            }
        }
    } catch (err) {
        if (err.code === '42P01') { /* tc_alerts table missing, return zero counts */ } else { throw err; }
    }

    // 4. Files where a client update is overdue (last_client_update_at > 3 days ago)
    try {
        const clientUpdateEventsArray = Array.from(CLIENT_UPDATE_EVENTS);
        const { rows: staleUpdates } = await pool.query(`
            SELECT
                t.id AS tx_id,
                t.address,
                EXTRACT(DAY FROM (NOW() - MAX(e.created_at))) AS days_since_update
            FROM tc_transactions t
            JOIN tc_transaction_events e ON t.id = e.transaction_id
            WHERE t.status IN ('active', 'pending')
              AND e.event_type = ANY($1::text[])
            GROUP BY t.id, t.address
            HAVING MAX(e.created_at) < NOW() - INTERVAL '3 days'
            ORDER BY days_since_update DESC;
        `, [clientUpdateEventsArray]);

        digest.stale_client_updates = staleUpdates.map(row => ({
            tx_id: row.tx_id,
            address: row.address,
            days_since_update: parseInt(row.days_since_update, 10),
        }));
    } catch (err) {
        if (err.code === '42P01') { /* tc_transactions or tc_transaction_events table missing, return empty array */ } else { throw err; }
    }

    // 5. Missing document counts per active file
    try {
        const { rows: missingDocs } = await pool.query(`
            SELECT
                t.id AS tx_id,
                t.address,
                COUNT(dr.id) AS count
            FROM tc_transactions t
            JOIN tc_document_requests dr ON t.id = dr.transaction_id
            WHERE t.status IN ('active', 'pending')
              AND dr.status = 'pending'
              AND dr.required = TRUE
            GROUP BY t.id, t.address
            HAVING COUNT(dr.id) > 0
            ORDER BY count DESC;
        `);
        digest.missing_docs = missingDocs.map(row => ({
            tx_id: row.tx_id,
            address: row.address,
            count: parseInt(row.count, 10),
        }));
    } catch (err) {
        if (err.code === '42P01') { /* tc_transactions or tc_document_requests table missing, return empty array */ } else { throw err; }
    }

    // Generate summary string
    const parts = [];
    if (digest.urgent_deadlines.length > 0) {
        parts.push(`${digest.urgent_deadlines.length} urgent deadline${digest.urgent_deadlines.length === 1 ? '' : 's'}`);
    }
    if (digest.critical_alerts.length > 0) {
        parts.push(`${digest.critical_alerts.length} critical alert${digest.critical_alerts.length === 1 ? '' : 's'}`);
    }
    if (digest.pending_approvals.total > 0) {
        parts.push(`${digest.pending_approvals.total} pending approval${digest.pending_approvals.total === 1 ? '' : 's'}`);
    }
    if (digest.stale_client_updates.length > 0) {
        parts.push(`${digest.stale_client_updates.length} stale client update${digest.stale_client_updates.length === 1 ? '' : 's'}`);
    }
    if (digest.missing_docs.length > 0) {
        const totalMissingDocs = digest.missing_docs.reduce((sum, item) => sum + item.count, 0);
        parts.push(`${totalMissingDocs} missing doc${totalMissingDocs === 1 ? '' : 's'}`);
    }

    if (parts.length === 0) {
        digest.summary = "All clear! No urgent items in your TC morning digest.";
    } else {
        digest.summary = `Morning Digest: ${parts.join(', ')}.`;
    }

    return digest;
}

/**
 * Formats the TC digest for SMS (under 320 characters).
 * @param {object} digest - The structured digest object.
 * @returns {string} SMS-friendly string.
 */
export function formatTCDigestForSMS(digest) {
    const lines = [];
    lines.push("TC Morning Digest:");

    if (digest.urgent_deadlines.length > 0) {
        lines.push(`- ${digest.urgent_deadlines.length} urgent deadline${digest.urgent_deadlines.length === 1 ? '' : 's'}.`);
    }
    if (digest.critical_alerts.length > 0) {
        lines.push(`- ${digest.critical_alerts.length} critical alert${digest.critical_alerts.length === 1 ? '' : 's'}.`);
    }
    if (digest.pending_approvals.total > 0) {
        lines.push(`- ${digest.pending_approvals.total} pending approval${digest.pending_approvals.total === 1 ? '' : 's'}.`);
    }
    if (digest.stale_client_updates.length > 0) {
        lines.push(`- ${digest.stale_client_updates.length} stale client update${digest.stale_client_updates.length === 1 ? '' : 's'}.`);
    }
    if (digest.missing_docs.length > 0) {
        const totalMissingDocs = digest.missing_docs.reduce((sum, item) => sum + item.count, 0);
        lines.push(`- ${totalMissingDocs} missing doc${totalMissingDocs === 1 ? '' : 's'}.`);
    }

    if (lines.length === 1) { // Only the "TC Morning Digest:" line
        lines.push("All clear! No urgent items.");
    }

    let sms = lines.join('\n');
    if (sms.length > 320) {
        // Truncate and add a "..." if too long
        sms = sms.substring(0, 317) + '...';
    }
    return sms;
}

/**
 * Formats the TC digest for email (subject + html + text).
 * @param {object} digest - The structured digest object.
 * @returns {{subject: string, html: string, text: string}} Email-friendly object.
 */
export function formatTCDigestForEmail(digest) {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(digest.generated_at).toLocaleDateString('en-US', dateOptions);
    const subject = `TC Morning Digest - ${formattedDate}`;

    let htmlContent = `
        <p>Hello Adam,</p>
        <p>Here is your Transaction Coordinator morning digest for <strong>${formattedDate}</strong>:</p>
        <p><strong>Summary:</strong> ${digest.summary}</p>
    `;

    let textContent = `
        Hello Adam,

        Here is your Transaction Coordinator morning digest for ${formattedDate}:

        Summary: ${digest.summary}
    `;

    if (digest.urgent_deadlines.length > 0) {
        htmlContent += `
            <h3>Urgent Deadlines (within 3 days)</h3>
            <ul>
                ${digest.urgent_deadlines.map(d => `<li><strong>${d.address}</strong>: ${d.deadline_label} in ${d.days_out} day${d.days_out === 1 ? '' : 's'}</li>`).join('')}
            </ul>
        `;
        textContent += `
            Urgent Deadlines (within 3 days):
            ${digest.urgent_deadlines.map(d => `- ${d.address}: ${d.deadline_label} in ${d.days_out} day${d.days_out === 1 ? '' : 's'}`).join('\n')}
        `;
    }

    if (digest.critical_alerts.length > 0) {
        htmlContent += `
            <h3>Critical/Urgent Alerts</h3>
            <ul>
                ${digest.critical_alerts.map(a => `<li><strong>${a.address}</strong>: ${a.message} (Severity: ${a.severity})</li>`).join('')}
            </ul>
        `;
        textContent += `
            Critical/Urgent Alerts:
            ${digest.critical_alerts.map(a => `- ${a.address}: ${a.message} (Severity: ${a.severity})`).join('\n')}
        `;
    }

    if (digest.pending_approvals.total > 0) {
        htmlContent += `
            <h3>Pending Approvals</h3>
            <ul>
                <li>Total: ${digest.pending_approvals.total}</li>
                ${digest.pending_approvals.critical > 0 ? `<li>Critical: ${digest.pending_approvals.critical}</li>` : ''}
                ${digest.pending_approvals.urgent > 0 ? `<li>Urgent: ${digest.pending_approvals.urgent}</li>` : ''}
                ${digest.pending_approvals.normal > 0 ? `<li>Normal: ${digest.pending_approvals.normal}</li>` : ''}
            </ul>
        `;
        textContent += `
            Pending Approvals:
            Total: ${digest.pending_approvals.total}
            ${digest.pending_approvals.critical > 0 ? `Critical: ${digest.pending_approvals.critical}\n` : ''}
            ${digest.pending_approvals.urgent > 0 ? `Urgent: ${digest.pending_approvals.urgent}\n` : ''}
            ${digest.pending_approvals.normal > 0 ? `Normal: ${digest.pending_approvals.normal}\n` : ''}
        `;
    }

    if (digest.stale_client_updates.length > 0) {
        htmlContent += `
            <h3>Stale Client Updates (over 3 days)</h3>
            <ul>
                ${digest.stale_client_updates.map(s => `<li><strong>${s.address}</strong>: Last update ${s.days_since_update} day${s.days_since_update === 1 ? '' : 's'} ago</li>`).join('')}
            </ul>
        `;
        textContent += `
            Stale Client Updates (over 3 days):
            ${digest.stale_client_updates.map(s => `- ${s.address}: Last update ${s.days_since_update} day${s.days_since_update === 1 ? '' : 's'} ago`).join('\n')}
        `;
    }

    if (digest.missing_docs.length > 0) {
        htmlContent += `
            <h3>Missing Documents</h3>
            <ul>
                ${digest.missing_docs.map(m => `<li><strong>${m.address}</strong>: ${m.count} document${m.count === 1 ? '' : 's'} missing</li>`).join('')}
            </ul>
        `;
        textContent += `
            Missing Documents:
            ${digest.missing_docs.map(m => `- ${m.address}: ${m.count} document${m.count === 1 ? '' : 's'} missing`).join('\n')}
        `;
    }

    htmlContent += `<p>Best regards,<br>The TC Service Team</p>`;
    textContent += `\nBest regards,\nThe TC Service Team`;

    return {
        subject,
        html: htmlContent.trim(),
        text: textContent.trim(),
    };
}