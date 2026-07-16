/**
 * SYNOPSIS: Existing content of services/timezone-utils.js
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// Existing content of services/timezone-utils.js

export function getCurrentTimeInUTC() {
    return new Date().toISOString();
}

export function convertToTimezone(date, timezone) {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

export function isPastDue(date, timezone = 'UTC') {
    const now = convertToTimezone(new Date(), timezone);
    return convertToTimezone(date, timezone) < now;
}

// New function to check commitment due dates against Adam's timezone
export function adjustCommitmentDueDates(date) {
    const adamsTimezone = 'America/New_York'; // Assuming Adam is in New York
    return isPastDue(date, adamsTimezone);
}
