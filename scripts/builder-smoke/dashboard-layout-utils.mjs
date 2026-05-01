export function clampMobileWidgetCount(count) {
  return Math.max(1, Math.min(6, Math.floor(count)));
}

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

export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }
  if (hasPinnedRail && widgetCount >= 5) {
    return 'compact';
  }
  if (viewportWidth >= 1280 && widgetCount <= 3 && hasPinnedRail === false) {
    return 'airy';
  }
  return 'balanced';
}