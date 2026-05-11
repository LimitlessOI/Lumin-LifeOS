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