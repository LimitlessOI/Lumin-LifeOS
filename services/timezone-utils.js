/**
 * SYNOPSIS: New function to check commitment due dates against Adam's timezone
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export function getCurrentTimeInUTC() {
    return new Date().toISOString();
}

export function convertToTimezone(date, timezone) {
    // Use Intl.DateTimeFormat for robust timezone conversion without changing the underlying UTC time
    // This creates a date object that represents* the time in the target timezone
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        timeZone: timezone,
    };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    return new Date(formattedDate);
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

// CURRENT_DATE timezone check: compare due date to current UTC date
export function checkTodayCommitmentsTimezone(dueDate) {
    const currentDateUTC = new Date().toISOString().split('T')[0]; // Get only the date part
    const dueDateUTC = convertToTimezone(dueDate, 'UTC').toISOString().split('T')[0];
    return currentDateUTC === dueDateUTC;
}
