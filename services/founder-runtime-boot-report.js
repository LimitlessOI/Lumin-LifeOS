/**
 * SYNOPSIS: Aggregate founder-lane boot degraded-state report (Wave 0 item 4).
 * Soft degrade + loud STARTUP_DEGRADED — never kills Railway liveness alone.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * @param {object} input
 * @returns {{ ok: boolean, status: string, degraded: boolean, reasons: string[], modules_errored: string[], routes_missing: string[], migrations_failed: string[] }}
 */
export function buildStartupDegradedReport({
  migrationFailed = [],
  moduleHealth = {},
  routeAssert = null,
  unhandledRejections = 0,
  lastError = null,
} = {}) {
  const reasons = [];
  const modulesErrored = [];
  const routesMissing = [];
  const migrationsFailed = [...(migrationFailed || [])].filter(Boolean);

  if (migrationsFailed.length) {
    reasons.push(`migrations_failed:${migrationsFailed.length}`);
  }

  const rawModules = moduleHealth?.modules ?? moduleHealth;
  if (Array.isArray(rawModules)) {
    for (const row of rawModules) {
      if (row?.status === 'error' || row?.error) {
        modulesErrored.push(row.module || row.path || row.register || 'unknown');
      }
    }
  } else if (rawModules && typeof rawModules === 'object') {
    for (const [key, row] of Object.entries(rawModules)) {
      if (row?.status === 'error' || row?.error) {
        modulesErrored.push(key);
      }
    }
  }
  if (modulesErrored.length) {
    reasons.push(`modules_errored:${modulesErrored.length}`);
  }

  const missingCritical = routeAssert?.missing_critical || [];
  const missing = routeAssert?.missing || [];
  routesMissing.push(...(missingCritical.length ? missingCritical : missing));
  if (missingCritical.length) {
    reasons.push(`routes_missing_critical:${missingCritical.length}`);
  } else if (missing.length) {
    reasons.push(`routes_missing:${missing.length}`);
  }

  if (unhandledRejections > 0) {
    reasons.push(`unhandled_rejections:${unhandledRejections}`);
  }
  if (lastError) {
    reasons.push('last_error');
  }

  const degraded = reasons.length > 0;
  return {
    ok: !degraded || (missingCritical.length === 0 && migrationsFailed.length === 0),
    status: degraded ? 'degraded' : 'healthy',
    degraded,
    reasons,
    modules_errored: modulesErrored,
    routes_missing: routesMissing,
    migrations_failed: migrationsFailed,
  };
}

export function formatStartupDegradedLog(report = {}) {
  return {
    tag: 'STARTUP_DEGRADED',
    status: report.status,
    reasons: report.reasons || [],
    modules_errored: report.modules_errored || [],
    routes_missing: report.routes_missing || [],
    migrations_failed: report.migrations_failed || [],
  };
}
