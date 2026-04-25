/**
 * Shared command-key gate for operator routes (builder, Railway env, etc.).
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

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

  return function requireKeyMiddleware(req, res, next) {
    try {
      // Open access mode — set LIFEOS_OPEN_ACCESS=true in Railway to bypass auth for testing.
      // Remove this env var when done testing.
      if (process.env.LIFEOS_OPEN_ACCESS === 'true') return next();

      const configuredValues = envVars
        .map((name) => normalizeKey(process.env[name]))
        .filter(Boolean);

      // If no key is configured, do not block requests (avoids breaking deploys).
      if (configuredValues.length === 0) return next();

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
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    } catch (e) {
      return next(e);
    }
  };
}

// Default export: a ready-to-use middleware (works with `import requireKey from ...`)
export const requireKey = createRequireKey();
export default requireKey;
