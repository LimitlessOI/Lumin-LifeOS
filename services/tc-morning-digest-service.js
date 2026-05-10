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
const statusEngine =