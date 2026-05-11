const CLIENT_UPDATE_EVENTS = new Set([
    'party_intro_sent', 'deadline_reminder_sent', 'welcome_sent',
    'client_update_sent', 'seller_update_sent', 'approval_request_sent',
]);

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

export async function getTCMorningDigest(pool) {
    const generated_at = new