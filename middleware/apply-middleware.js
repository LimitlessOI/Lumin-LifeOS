/**
 * Apply Middleware — registers all Express middleware for the app: body parsers,
 * static file serving, and CORS with same-origin + allowlist enforcement.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 *
 * Rate limiting is intentionally disabled. The system uses free-tier providers
 * (Groq, Gemini, Cerebras, etc.) and exhausts them in order rather than
 * stopping. Token efficiency is tracked post-session, not enforced at runtime.
 *
 * Dependencies: express, path
 *               (injected: express, path, __dirname, ALLOWED_ORIGINS_LIST, isSameOrigin)
 * Exports: applyMiddleware(app, deps)
 */
export function applyMiddleware(app, {
  express,
  path,
  __dirname,
  ALLOWED_ORIGINS_LIST,
  isSameOrigin,
}) {
  // ==================== MIDDLEWARE ====================
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(express.text({ type: "text/plain", limit: "50mb" }));

  // TC portal assets: explicit mount so JS/HTML get no-store (general static runs before the global no-cache middleware below).
  const publicDir = path.join(__dirname, "public");
  app.use(
    "/tc",
    express.static(path.join(publicDir, "tc"), {
      etag: true,
      maxAge: 0,
      setHeaders(res, filePath) {
        if (/\.(js|html|css)$/i.test(filePath)) {
          res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate"
          );
          res.setHeader("Pragma", "no-cache");
        }
      },
    })
  );

  // Serve static files (after specific routes)
  app.use(express.static(publicDir));

  // SECURE CORS Middleware with NO-CACHE headers
  app.use((req, res, next) => {
    // PREVENT CACHING
    res.header(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    res.header("Surrogate-Control", "no-store");

    const origin = req.headers.origin;

    if (isSameOrigin(req)) {
      res.header("Access-Control-Allow-Origin", origin || "*");
      res.header("Access-Control-Allow-Credentials", "true");
    } else if (origin && ALLOWED_ORIGINS_LIST.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    } else if (!origin) {
      res.header("Access-Control-Allow-Origin", "*");
    }

    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, x-command-key, Authorization"
    );

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
