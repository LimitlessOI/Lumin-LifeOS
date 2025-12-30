export function createRequireKey(options = {}) {
  const header = options.header || "x-api-key";
  const envVar = options.envVar || "API_KEY";
  const queryKeys = options.queryKeys || ["api_key", "apiKey"];

  return function requireKeyMiddleware(req, res, next) {
    try {
      const configured = process.env[envVar];

      // If no key is configured, do not block requests (avoids breaking deploys).
      if (!configured) return next();

      const providedHeader = (typeof req.get === "function" ? req.get(header) : null) || null;
      const providedQuery =
        (req && req.query && queryKeys.map(k => req.query[k]).find(Boolean)) || null;

      const provided = providedHeader || providedQuery;

      if (provided && provided === configured) return next();
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    } catch (e) {
      return next(e);
    }
  };
}

// Default export: a ready-to-use middleware (works with `import requireKey from ...`)
export const requireKey = createRequireKey();
export default requireKey;
