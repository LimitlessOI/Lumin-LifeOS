/**
 * SYNOPSIS: New function to check commitment due dates against Adam's timezone
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
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

// Function to check if the due date falls on the current date in Railway's UTC timezone
export function checkTodayCommitmentsTimezone(dueDate) {
    const currentDateUTC = new Date().toISOString().split('T')[0]; // Get only the date part
    const dueDateUTC = convertToTimezone(dueDate, 'UTC').toISOString().split('T')[0];
    return currentDateUTC === dueDateUTC;
}
