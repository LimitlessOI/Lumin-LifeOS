/**
 * SYNOPSIS: LifeOS tier gate middleware — enforces free/core/premium/family tier access at the route level.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const TIER_RANK = { free: 0, core: 1, premium: 2, family: 3 };

/**
 * Returns middleware that blocks users below minTier.
 * Always call requireLifeOSUser first.
 *
 * Usage:
 *   router.get('/feature', requireLifeOSUser, requireTier('core'), handler)
 */
export function requireTier(minTier) {
  return function lifeosTierGuard(req, res, next) {
    const user = req.lifeosUser;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    const admin = ['admin', 'founder_admin'].includes(String(user.role || '').toLowerCase());
    if (admin) return next();

    const userRank = TIER_RANK[user.tier] ?? -1;
    const minRank  = TIER_RANK[minTier] ?? 0;
    if (userRank < minRank) {
      return res.status(403).json({
        ok: false,
        error: `This feature requires ${minTier} tier or above`,
        required_tier: minTier,
        current_tier: user.tier,
        upgrade_url: '/overlay/lifeos-billing.html',
      });
    }

    next();
  };
}

/**
 * Attaches tier metadata to req without blocking.
 * Useful for personalizing responses for different tiers.
 */
export function injectTierContext(req, res, next) {
  if (req.lifeosUser) {
    req.tierRank = TIER_RANK[req.lifeosUser.tier] ?? 0;
    req.isAdmin  = ['admin', 'founder_admin'].includes(String(req.lifeosUser.role || '').toLowerCase());
  }
  next();
}
