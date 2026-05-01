/**
 * @fileoverview Utility functions for the LifeOS dashboard shell.
 * This module provides deterministic helpers for UI state management.
 */

/**
 * Clamps a given count to be within the valid range for mobile widgets (1 to 6).
 * @param {number} count - The raw widget count to clamp.
 * @returns {number} The clamped integer count, guaranteed to be between 1 and 6.
 */
export function clampMobileWidgetCount(count) {
  return Math.max(1, Math.min(6, count));
}

/**
 * Resolves a raw theme mode string to one of the canonical values: "light", "dark", or "system".
 * The comparison is case-insensitive. Any unrecognized input defaults to "system".
 * @param {string} value - The raw theme mode string (e.g., "Light", "DARK", "auto").
 * @returns {"light" | "dark" | "system"} The resolved canonical theme mode.
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
 * Determines the optimal dashboard density based on various UI parameters.
 * @param {object} options - Configuration options for density calculation.
 * @param {number} options.viewportWidth - The current width of the viewport in pixels.
 * @param {number} options.widgetCount - The total number of widgets currently displayed.
 * @param {boolean} options.hasPinnedRail - Indicates if the navigation rail is currently pinned.
 * @returns {"compact" | "balanced" | "airy"} The recommended dashboard density.
 */
export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  // Return "compact" when viewportWidth < 640 and widgetCount >= 4
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }

  // Return "compact" when hasPinnedRail is true and widgetCount >= 5
  if (hasPinnedRail && widgetCount >= 5) {
    return 'compact';
  }

  // Return "airy" when viewportWidth >= 1280 and widgetCount <= 3 and hasPinnedRail is false
  if (viewportWidth >= 1280 && widgetCount <= 3 && hasPinnedRail === false) {
    return 'airy';
  }

  // Otherwise return "balanced"
  return 'balanced';
}