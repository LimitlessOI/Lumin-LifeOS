export class HealthModule {
  constructor({ systemHealthChecker = null } = {}) {
    this.systemHealthChecker = systemHealthChecker;
    this.routes = [
      {
        path: "/api/v1/system/health",
        method: "GET",
        handler: this.handleHealth.bind(this),
      },
    ];
  }

  setHealthChecker(systemHealthChecker) {
    this.systemHealthChecker = systemHealthChecker;
  }

  async handleHealth(req, res) {
    try {
      if (!this.systemHealthChecker) {
        return res.status(503).json({
          ok: false,
          error: "System Health Checker not initialized",
          status: "degraded",
        });
      }

      const health = await this.systemHealthChecker.runFullHealthCheck();
      const statusCode = health.overall === "unhealthy" ? 503 : 200;
      return res.status(statusCode).json({ ok: true, ...health });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message,
        status: "error",
      });
    }
  }

  async health() {
    if (!this.systemHealthChecker) {
      return {
        status: "degraded",
        error: "System Health Checker not initialized",
      };
    }

    try {
      const health = await this.systemHealthChecker.runFullHealthCheck();
      return {
        status: health.overall || "unknown",
        lastChecked: new Date().toISOString(),
        ...health,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
      };
    }
  }
}
