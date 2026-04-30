/**
 * Dashboard layout utilities
 * Pure ESM, zero dependencies, deterministic.
 */

/**
 * Clamps widget count to mobile-safe range [1..6]
 */
export function clampMobileWidgetCount(count) {
  const n = parseInt(count, 10);
  // Treat non-numeric input as the smallest safe mobile layout.
  if (isNaN(n)) return 1;
  return Math.max(1, Math.min(6, n));
}

/**
 * Resolves theme mode to canonical value
 * @returns {"light"|"dark"|"system"}
 */
export function resolveThemeMode(value) {
  if (typeof value !== 'string') return 'system';
  const normalized = value.toLowerCase().trim();
  if (normalized === 'light') return 'light';
  if (normalized === 'dark') return 'dark';
  return 'system';
}

/**
 * Picks dashboard density based on viewport and widget state
 * @returns {"compact"|"balanced"|"airy"}
 */
export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  // Compact: small viewport with many widgets
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }

  // Compact: pinned rail with many widgets
  if (hasPinnedRail === true && widgetCount >= 5) {
    return 'compact';
  }

  // Airy: large viewport, few widgets, no pinned rail
  if (viewportWidth >= 1280 && widgetCount <= 3 && hasPinnedRail === false) {
    return 'airy';
  }

  // Default
  return 'balanced';
}
