/**
 * SYNOPSIS: TC morning digest service — daily briefing aggregator for Adam.
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * TC morning digest service — daily briefing aggregator for Adam.
 */

const CLIENT_UPDATE_EVENTS = new Set([
    'party_intro_sent', 'deadline_reminder_sent', 'welcome_sent',
    'client_update_sent', 'seller_update_sent', 'approval_request_sent',
]);

/**
 * Converts a value to a Date object, handling null/invalid inputs.
 * @param {*} value
 * @returns {Date|null}
 */
function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calculates the difference in days between two dates (future - now).
 * @param {Date|string|null} future
 * @param {Date|string|null} now
 * @returns {number|null}
 */
function diffInDays(future, now) {
    const futureDate = asDate(future);
    const nowDate = asDate(now);
    if (!futureDate || !nowDate) return null;
    const diffTime = futureDate.getTime() - nowDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes a transaction's documents checklist.
 * @param {object} documents - The documents JSONB object from tc_transactions.
 * @returns {Array<object>} Normalized checklist items.
 */
function normalizeChecklist(documents) {
    const checklist = Array.isArray(documents?.checklist) ? documents.checklist : [];
    return checklist.map((item, index) => ({
        id: item.id || index + 1,
        name: item.name || item.title || `Document ${index + 1}`,
        required: Boolean(item.required),
        received: Boolean(item.received || item.complete),
        owner: item.owner || item.requestedFrom || null,
        dueDate: item.dueDate || item.due_date || null,
    }));
}

/**
 * Generates a structured daily briefing for Adam.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<object>} Structured digest data.
 */
export async function getTCMorningDigest(pool) {
    const generated_at = new Date().toISOString();
    const now = new Date();
    const urgent_deadlines = [];
    const critical_alerts = [];
    const pending_approvals = { total: 0, critical: 0, urgent: 0, normal: 0 };
    const stale_client_updates = [];
    const missing_docs = [];
    let summary = "TC Morning Digest:\n";

    // 1. Transactions with deadlines today or within 3 days
    try {
        const { rows: transactions } = await pool.query(
            `SELECT id, address, key_dates, close_date FROM tc_transactions WHERE status IN ('active', 'pending')`
        );

        for (const tx of transactions) {
            const keyDates = tx.key_dates || {};
            const allDeadlines = [];

            // Add key_dates
            for (const [name, dateStr] of Object.entries(keyDates)) {
                if (!dateStr || name === 'acceptance') continue;
                const deadlineDate = asDate(dateStr);
                const daysOut = diffInDays(deadlineDate, now);
                if (daysOut !== null && daysOut >= 0 && daysOut <= 3) {
                    allDeadlines.push({
                        tx_id: tx.id,
                        address: tx.address,
                        deadline_label: name.replace(/_/g, ' '),
                        days_out: daysOut,
                        deadline_date: deadlineDate,
                    });
                }
            }

            // Add close_date
            if (tx.close_date) {
                const closeDate = asDate(tx.close_date);
                const daysOut = diffInDays(closeDate, now);
                if (daysOut !== null && daysOut >= 0 && daysOut <= 3) {
                    allDeadlines.push({
                        tx_id: tx.id,
                        address: tx.address,
                        deadline_label: 'Close of Escrow',
                        days_out: daysOut,
                        deadline_date: closeDate,
                    });
                }
            }
            urgent_deadlines.push(...allDeadlines);
        }
        urgent_deadlines.sort((a, b) => a.days_out - b.days_out);
        if (urgent_deadlines.length > 0) {
            summary += `🚨 ${urgent_deadlines.length} urgent deadlines. `;
        }
    } catch (error) {
        console.error("Error fetching urgent deadlines:", error.message);
        // Return empty array as per spec for graceful handling
    }

    // 2. Open critical/urgent alerts with their prepared next steps
    try {
        const { rows: alerts } = await pool.query(
            `SELECT
                a.id,
                a.transaction_id,
                t.address,
                a.title,
                a.summary,
                a.severity,
                a.prepared_action
            FROM tc_alerts a
            JOIN tc_transactions t ON a.transaction_id = t.id
            WHERE a.status = 'open' AND a.severity IN ('critical', 'urgent')
            ORDER BY a.severity DESC, a.created_at ASC`
        );

        for (const alert of alerts) {
            const messageParts = [alert.title];
            if (alert.summary) messageParts.push(alert.summary);
            if (alert.prepared_action?.label) messageParts.push(`Next: ${alert.prepared_action.label}`);
            critical_alerts.push({
                tx_id: alert.transaction_id,
                address: alert.address,
                message: messageParts.join(' - '),
                severity: alert.severity,
            });
        }
        if (critical_alerts.length > 0) {
            summary += `⚠️ ${critical_alerts.length} critical/urgent alerts. `;
        }
    } catch (error) {
        console.error("Error fetching critical/urgent alerts:", error.message);
    }

    // 3. Pending approvals count by priority level
    try {
        const { rows: approvalAlerts } = await pool.query(
            `SELECT severity, COUNT(*) as count
            FROM tc_alerts
            WHERE status = 'open' AND severity IN ('critical', 'urgent', 'action_required')
            GROUP BY severity`
        );

        for (const row of approvalAlerts) {
            pending_approvals.total += parseInt(row.count, 10);
            if (row.severity === 'critical') {
                pending_approvals.critical += parseInt(row.count, 10);
            } else if (row.severity === 'urgent') {
                pending_approvals.urgent += parseInt(row.count, 10);
            } else if (row.severity === 'action_required') {
                pending_approvals.normal += parseInt(row.count, 10);
            }
        }
        if (pending_approvals.total > 0) {
            summary += `✅ ${pending_approvals.total} approvals pending. `;
        }
    } catch (error) {
        console.error("Error fetching pending approvals:", error.message);
    }

    // 4. Files where a client update is overdue (last_client_update_at > 3 days ago)
    try {
        const { rows: activeTransactions } = await pool.query(
            `SELECT id, address FROM tc_transactions WHERE status IN ('active', 'pending')`
        );

        for (const tx of activeTransactions) {
            const { rows: lastUpdateEvents } = await pool.query(
                `SELECT created_at FROM tc_transaction_events
                WHERE transaction_id = $1 AND event_type = ANY($2)
                ORDER BY created_at DESC LIMIT 1`,
                [tx.id, Array.from(CLIENT_UPDATE_EVENTS)]
            );

            const lastClientUpdate = lastUpdateEvents[0]?.created_at;
            if (lastClientUpdate) {
                const daysSinceUpdate = diffInDays(now, lastClientUpdate);
                if (daysSinceUpdate !== null && daysSinceUpdate > 3) {
                    stale_client_updates.push({
                        tx_id: tx.id,
                        address: tx.address,
                        days_since_update: daysSinceUpdate,
                    });
                }
            }
        }
        if (stale_client_updates.length > 0) {
            summary += `⏳ ${stale_client_updates.length} client updates overdue. `;
        }
    } catch (error) {
        console.error("Error fetching stale client updates:", error.message);
    }

    // 5. Missing document counts per active file
    try {
        const { rows: docsTransactions } = await pool.query(
            `SELECT id, address, documents FROM tc_transactions WHERE status IN ('active', 'pending')`
        );

        for (const tx of docsTransactions) {
            const checklist = normalizeChecklist(tx.documents);
            const missing = checklist.filter(doc => doc.required && !doc.received);
            if (missing.length > 0) {
                missing_docs.push({
                    tx_id: tx.id,
                    address: tx.address,
                    count: missing.length,
                });
            }
        }
        if (missing_docs.length > 0) {
            summary += `📄 ${missing_docs.length} files with missing documents.`;
        }
    } catch (error) {
        console.error("Error fetching missing documents:", error.message);
    }

    if (summary === "TC Morning Digest:\n") {
        summary += "All clear! No urgent items to report.";
    }

    return {
        generated_at,
        urgent_deadlines,
        critical_alerts,
        pending_approvals,
        stale_client_updates,
        missing_docs,
        summary: summary.trim(),
    };
}

/**
 * Formats the digest for SMS (under 320 chars).
 * @param {object} digest
 * @returns {string}
 */
export function formatTCDigestForSMS(digest) {
    let sms = "TC Digest:\n";
    if (digest.urgent_deadlines.length > 0) {
        sms += `🚨 ${digest.urgent_deadlines.length} deadlines (${digest.urgent_deadlines[0].address} in ${digest.urgent_deadlines[0].days_out}d). `;
    }
    if (digest.critical_alerts.length > 0) {
        sms += `⚠️ ${digest.critical_alerts.length} critical alerts. `;
    }
    if (digest.pending_approvals.total > 0) {
        sms += `✅ ${digest.pending_approvals.total} approvals. `;
    }
    if (digest.stale_client_updates.length > 0) {
        sms += `⏳ ${digest.stale_client_updates.length} client updates overdue. `;
    }
    if (digest.missing_docs.length > 0) {
        sms += `📄 ${digest.missing_docs.length} files missing docs.`;
    }

    if (sms === "TC Digest:\n") {
        sms += "All clear! No urgent items.";
    }

    // Truncate to fit SMS limit (approx 320 chars)
    return sms.trim().substring(0, 320);
}

/**
 * Formats the digest for email (subject + html + text).
 * @param {object} digest
 * @returns {{subject: string, html: string, text: string}}
 */
export function formatTCDigestForEmail(digest) {
    const subject = `TC Morning Digest - ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;

    let htmlContent = `
        <p>Good morning, Adam!</p>
        <p>Here's your Transaction Coordinator morning digest for <strong>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>:</p>
    `;

    if (digest.urgent_deadlines.length > 0) {
        htmlContent += `<h3>Urgent Deadlines</h3><ul>${digest.urgent_deadlines.map(d => `<li>${d.address} — ${d.deadline_label} (${d.days_out}d)</li>`).join('')}</ul>`;
    }
    if (digest.critical_alerts.length > 0) {
        htmlContent += `<h3>Critical Alerts</h3><ul>${digest.critical_alerts.map(a => `<li>${a.address}: ${a.message}</li>`).join('')}</ul>`;
    }
    if (digest.pending_approvals.total > 0) {
        htmlContent += `<p><strong>Pending Approvals:</strong> ${digest.pending_approvals.total} (${digest.pending_approvals.critical} critical)</p>`;
    }
    if (digest.stale_client_updates.length > 0) {
        htmlContent += `<h3>Overdue Client Updates</h3><ul>${digest.stale_client_updates.map(s => `<li>${s.address} — ${s.days_since_update}d ago</li>`).join('')}</ul>`;
    }
    if (digest.missing_docs.length > 0) {
        htmlContent += `<h3>Missing Documents</h3><ul>${digest.missing_docs.map(m => `<li>${m.address} — ${m.count} missing</li>`).join('')}</ul>`;
    }

    htmlContent += `<p><em>${digest.summary}</em></p>`;

    const text = formatTCDigestForSMS(digest);
    return { subject, html: htmlContent, text };
}