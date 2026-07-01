/**
 * SYNOPSIS: Minimal server routes for founder-builder runtime.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import process from "node:process";

export function registerFounderServerRoutes(app, deps) {
  const { pool, getStartupHealthState } = deps;

  async function computeFounderHealth() {
    const health = {
      server: "ok",
      timestamp: new Date().toISOString(),
    };

    try {
      await pool.query("SELECT 1");
      health.database = { status: "ok" };
    } catch (e) {
      health.database = { status: "error", message: e.message };
    }

    const dbOk = health.database?.status === "ok";
    return {
      ok: dbOk,
      status: dbOk ? "healthy" : "degraded",
      canonical_health_path: "/api/v1/lifeos/system/health",
      health,
    };
  }

  app.get("/api/health", async (_req, res) => {
    const result = await computeFounderHealth();
    res.status(result.ok ? 200 : 503).json({
      ...result,
      ...result.health,
    });
  });

  app.get("/healthz", async (_req, res) => {
    const startup = typeof getStartupHealthState === "function"
      ? getStartupHealthState()
      : {
          phase: "unknown",
          ready: false,
          db: "unknown",
          runtime_routes: "unknown",
          deferred_services: "unknown",
          runtime_profile: process.env.LIFEOS_RUNTIME_PROFILE || "unknown",
          last_error: null,
        };

    res.status(200).json({
      ok: true,
      live: true,
      ready: startup.ready === true,
      status: startup.ready === true ? "healthy" : "starting",
      checks: {
        server: "ok",
        db: startup.db,
        runtime_routes: startup.runtime_routes,
        deferred_services: startup.deferred_services,
        runtime_profile: startup.runtime_profile,
        last_error: startup.last_error || null,
        ai: process.env.ANTHROPIC_API_KEY ? "configured" : "missing_key",
        email: process.env.POSTMARK_SERVER_TOKEN ? "configured" : "not_configured",
      },
      startup,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health", async (_req, res) => {
    const result = await computeFounderHealth();
    res.status(result.ok ? 200 : 503).json({
      ...result,
      ...result.health,
    });
  });
}
