/**
 * SYNOPSIS: STEP 5 governed-factory enforcement fence. Single source of truth for
 * whether the ungoverned autonomous shipping path (the legacy never-stop product
 * loop that calls POST /api/v1/lifeos/builder/build directly) is allowed to ship.
 *
 * Once the governed factory (BPB → Builder → SENTRY → TSOS → Historian via
 * /factory/execute-step) is the shipping path, NOTHING may ship code outside the
 * fence. This module is the ONE chokepoint every legacy/side-channel ship call
 * consults, so "no bypass remains" is provable rather than asserted: flip
 * GOVERNED_FACTORY_ONLY=1 and every ungoverned ship call fails closed.
 *
 * Default is OFF so the running loop does not regress before the governed
 * shipping runner is proven; turning the env var on IS the cutover switch.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const GOVERNED_FACTORY_ONLY_ENV = 'GOVERNED_FACTORY_ONLY';

// True when the governed factory is the ONLY sanctioned shipping path.
export function governedFactoryOnly() {
  const v = String(process.env[GOVERNED_FACTORY_ONLY_ENV] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/**
 * The fail-closed assertion every ungoverned ship call makes before touching the
 * legacy builder / a deploy. Returns { allowed, reason } — never throws — so
 * callers can record a blocked receipt instead of crashing the loop.
 *
 * @param {string} source label of the caller (e.g. 'postBuilderBuild')
 */
export function assertUngovernedShippingAllowed(source = 'unknown') {
  if (governedFactoryOnly()) {
    return {
      allowed: false,
      reason: 'governed_factory_only',
      source,
      detail:
        'GOVERNED_FACTORY_ONLY is active — the ungoverned autonomous shipping '
        + 'path is fenced off. Ship code through the governed factory '
        + '(POST /factory/execute-step: BPB → Builder → SENTRY → TSOS → Historian).',
    };
  }
  return { allowed: true, reason: 'ungoverned_shipping_permitted', source };
}
