import { createTCStatusEngine } from './tc-status-engine.js';
import { createTCAlertService } from './tc-alert-service.js';

// Re-implementing necessary helpers from tc-status-engine.js and tc-alert-service.js
// to avoid direct dependency on their internal state/deps and ensure self-containment.
function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function diffInDays(future, now) {
    if (!future || !now) return null;
    const diffTime = future.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));