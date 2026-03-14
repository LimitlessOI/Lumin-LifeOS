/**
 * Apply Middleware — registers all Express middleware for the app: body parsers,
 * static file serving, general + AI-specific rate limiters, and CORS with
 * same-origin + allowlist enforcement.
 *
 * Dependencies: express, express-rate-limit (rateLimit), path
 *               (all injected: express, path, __dirname, rateLimit, ALLOWED_ORIGINS_LIST, isSameOrigin)
 * Exports: applyMiddleware(app, deps)
 */
export function applyMiddleware(app, {
  express,
  path,
  __dirname,
  rateLimit,
  ALLOWED_ORIGINS_LIST,
  isSameOrigin,
}) {
  // ==================== MIDDLEWARE ====================
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(express.text({ type: "text/plain", limit: "50mb" }));

  // Serve static files (after specific routes)
  app.use(express.static(path.join(__dirname, "public")));

  // ==================== RATE LIMITING ====================
  // General API rate limiter: 100 requests per 15 minutes per IP
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { ok: false, error: "Too many requests, please try again later." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Stricter limiter for AI-heavy endpoints: 20 requests per 15 minutes per IP
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: { ok: false, error: "Too many AI requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general limiter to all API routes
  app.use("/api/", generalLimiter);

  // Apply stricter limiter to AI-heavy endpoints
  app.use("/api/v1/chat", aiLimiter);
  app.use("/api/council/chat", aiLimiter);
  app.use("/api/v1/architect/chat", aiLimiter);
  app.use("/api/v1/architect/command", aiLimiter);
  app.use("/api/v1/ai-council/test", aiLimiter);
  app.use("/api/coach/chat", aiLimiter);

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
