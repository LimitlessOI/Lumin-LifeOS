/**
 * @file Utility functions for the dashboard shell.
 * This module provides deterministic helpers for UI state management.
 */

/**
 * Clamps a given count to be within the range of 1 to 6, inclusive.
 * Rounds the input to the nearest integer before clamping.
 * @param {number} count - The number to clamp.
 * @returns {number} The clamped integer count.
 */
export function clampMobileWidgetCount(count) {
  return Math.max(1, Math.min(6, Math.round(count)));
}

/**
 * Resolves a theme mode string to one of "light", "dark", or "system".
 * Handles case-insensitive input. Unknown or invalid inputs default to "system".
 * @param {string} value - The input theme mode string.
 * @returns {"light" | "dark" | "system"} The resolved theme mode.
 */
export function resolveThemeMode(value) {
  const lowerValue = String(value).toLowerCase();
  if (lowerValue === 'light') {
    return 'light';
  }
  if (lowerValue === 'dark') {
    return 'dark';
  }
  return 'system';
}

/**
 * Determines the dashboard density based on viewport characteristics and widget count.
 * @param {object} params - The parameters for density calculation.
 * @param {number} params.viewportWidth - The current width of the viewport in pixels.
 * @param {number} params.widgetCount - The number of widgets currently displayed.
 * @param {boolean} params.hasPinnedRail - True if a pinned rail is present, false otherwise.
 * @returns {"compact" | "balanced" | "airy"} The recommended dashboard density.
 */
export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  // Rule: return "compact" when viewportWidth < 640 and widgetCount >= 4
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }

  // Rule: return "compact" when hasPinnedRail is true and widgetCount >= 5
  if (hasPinnedRail && widgetCount >= 5) {
    return 'compact';
  }

  // Rule: return "airy" when viewportWidth >= 1280 and widgetCount <= 3 and hasPinnedRail is false
  if (viewportWidth >= 1280 && widgetCount <= 3 && !hasPinnedRail) {
    return 'airy';
  }

  // Default: otherwise return "balanced"
  return 'balanced';
}