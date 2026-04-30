/**
 * @fileoverview Tiny deterministic utility module for the dashboard shell.
 * This module provides pure functions for UI-related calculations,
 * intended for use in the LifeOS dashboard.
 */

/**
 * Clamps a widget count to be within the valid range for mobile dashboards (1 to 6).
 * @param {number} count - The raw widget count.
 * @returns {number} The clamped widget count.
 */
export function clampMobileWidgetCount(count) {
  return Math.max(1, Math.min(6, count));
}

/**
 * Resolves a theme mode value to a canonical "light", "dark", or "system".
 * Unknown or invalid inputs default to "system".
 * @param {string}