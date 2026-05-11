export function clampMobileWidgetCount(count) {
  const num = Math.round(count);
  return Math.max(1, Math.min(6, num));
}

export function resolveThemeMode(value) {
  if (typeof value !== 'string') {
    return 'system';
  }
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'light') {
    return 'light';
  }
  if (lowerValue === 'dark') {
    return 'dark';
  }
  return 'system';
}

export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  // return "compact" when viewportWidth < 640 and widgetCount >= 4
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }
  // return "compact" when hasPinnedRail is true and widgetCount >= 5
  if (hasPinnedRail && widgetCount >= 5) {
    return 'compact';
  }
  // return "airy" when viewportWidth >= 1280 and widgetCount <= 3 and hasPinnedRail is false
  if (viewportWidth >= 1280 && widgetCount <= 3 && !hasPinnedRail) {
    return 'airy';
  }
  // otherwise return "balanced"
  return 'balanced';
}