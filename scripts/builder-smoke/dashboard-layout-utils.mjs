/**
 * Clamps a given count to be within the range of 1 to 6, inclusive.
 * Useful for limiting the number of mobile widgets displayed.
 * @param {number} count - The raw widget count.
 * @returns {number} The clamped widget count (1-6).
 */
export function clampMobileWidgetCount(count) {
  return Math.max(1, Math.min(6, count));
}

/**
 * Resolves a theme mode string to one of "light", "dark", or "system".
 * Handles case-insensitivity and defaults to "system" for unknown inputs.
 * @param {string} value - The raw theme mode input.
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
 * Determines the appropriate dashboard density based on viewport characteristics.
 * @param {object} params - Parameters for density calculation.
 * @param {number} params.viewportWidth - The current viewport width in pixels.
 * @param {number} params.widgetCount - The number of widgets currently displayed.
 * @param {boolean} params.hasPinnedRail - True if a navigation rail is pinned.
 * @returns {"compact" | "balanced" | "airy"} The recommended dashboard density.
 */
export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  // Rule 1: compact when viewportWidth < 640 and widgetCount >= 4
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }
  // Rule 2: compact when hasPinnedRail is true and widgetCount >= 5
  if (hasPinnedRail && widgetCount >= 5) {
    return 'compact';
  }
  // Rule 3: airy when viewportWidth >= 1280 and widgetCount <= 3 and hasPinnedRail is false
  if (viewportWidth >= 1280 && widgetCount <= 3 && !hasPinnedRail) {
    return 'airy';
  }
  // Otherwise return "balanced"
  return 'balanced';
}