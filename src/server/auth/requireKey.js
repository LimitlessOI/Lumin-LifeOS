/**
 * SYNOPSIS: Shared command-key gate for operator routes (builder, Railway env, etc.).
 * Shared command-key gate for operator routes (builder, Railway env, etc.).
 * Accepts only operator-grade LifeOS account JWTs (Bearer) when it is not the operator command key.
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import { verifyToken } from '../../../services/lifeos-auth.js';

const DEFAULT_OPERATOR_JWT_ROLES = Object.freeze(["founder_admin", "operator", "admin"]);

/** Railway / shell / .env often include a trailing newline — without trim, `includes()` fails and clients see 401. */
function normalizeKey(value) {
  if (value == null) return "";
  return String(value).trim();
}

export function createRequireKey(options = {}) {
  const header = options.header || "x-api-key";
  const envVar = options.envVar || "API_KEY";
  const queryKeys = options.queryKeys || ["api_key", "apiKey"];
  const headerAliases = options.headerAliases || [
    header,
    "x-lifeos-key",
    "x-command-key",
    "x-command-center-key",
  ];
  const envVars = options.envVars || [
    envVar,
    "LIFEOS_KEY",
    "COMMAND_CENTER_KEY",
  ];
  const nodeEnv = String(options.nodeEnv || process.env.NODE_ENV || "").toLowerCase();
  const productionLike = ["production", "prod"].includes(nodeEnv);
  const allowedJwtRoles = new Set(
    (options.allowedJwtRoles || DEFAULT_OPERATOR_JWT_ROLES)
      .map((role) => String(role || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return function requireKeyMiddleware(req, res, next) {
    try {
      // Open access mode — set LIFEOS_OPEN_ACCESS=true in Railway to bypass auth for testing.
      // Remove this env var when done testing.
      if (process.env.LIFEOS_OPEN_ACCESS === 'true') {
        if (!productionLike) return next();
        return res.status(503).json({
          ok: false,
          error: "OPEN_ACCESS_DISABLED_IN_PRODUCTION",
        });
      }

      const configuredValues = envVars
        .map((name) => normalizeKey(process.env[name]))
        .filter(Boolean);

      // Allow unkeyed access only outside production-like runtimes.
      if (configuredValues.length === 0) {
        if (!productionLike) return next();
        return res.status(503).json({
          ok: false,
          error: "AUTH_KEY_NOT_CONFIGURED",
        });
      }

      const providedHeader = headerAliases
        .map((name) =>
          (typeof req.get === "function" ? req.get(name) : null) ||
          req?.headers?.[name]
        )
        .find(Boolean) || null;
      const providedQuery =
        (req && req.query && queryKeys.map(k => req.query[k]).find(Boolean)) || null;

      const authHeader =
        (typeof req.get === "function" ? req.get("authorization") : null) ||
        req?.headers?.authorization ||
        "";
      let bearerToken = "";
      if (/^Bearer\s+/i.test(authHeader)) {
        bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
      }

      const raw = providedHeader || providedQuery || bearerToken;
      const provided = normalizeKey(raw);

      if (provided && configuredValues.includes(provided)) return next();

      // Founder app shell: operator-grade account JWT (not the operator command key).
      if (bearerToken && !configuredValues.includes(bearerToken)) {
        try {
          const account = verifyToken(bearerToken);
          const role = String(account?.role || "").trim().toLowerCase();
          if (!allowedJwtRoles.has(role)) {
            return res.status(403).json({ ok: false, error: "Operator access required" });
          }
          req.lifeosUser = account;
          req.auth_mode = 'account_jwt';
          return next();
        } catch { /* fall through */ }
      }

      return res.status(401).json({ ok: false, error: "Unauthorized" });
    } catch (e) {
      return next(e);
    }
  };
}

// Default export: a ready-to-use middleware (works with `import requireKey from ...`)
export const requireKey = createRequireKey();
export default requireKey;
