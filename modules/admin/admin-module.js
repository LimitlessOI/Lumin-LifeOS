import { requireKey } from "../../src/server/auth/requireKey.js";
import {
  checkHumanAttentionBudget,
  getActorLabel,
  getAiStatus,
  setAiEnabled,
  ensureExpectedRealityHash,
  generateRealitySnapshot,
  setExpectedRealityHash,
  getExpectedRealityState,
} from "../../services/ai-guard.js";

export class AdminModule {
  constructor({
    pool,
    getDailySpend,
    incomeDroneSystem,
    executionQueue,
    autoBuilder,
    ollamaEndpoint,
  } = {}) {
    this.pool = pool;
    this.getDailySpend = getDailySpend;
    this.incomeDroneSystem = incomeDroneSystem;
    this.executionQueue = executionQueue;
    this.autoBuilder = autoBuilder;
    this.ollamaEndpoint = ollamaEndpoint;
    this.routes = [
      {
        path: "/health",
        method: "GET",
        handler: this.handleSimpleHealth.bind(this),
      },
      {
        path: "/api/v1/system/auto-install",
        method: "POST",
        middleware: [requireKey],
        handler: this.handleAutoInstall.bind(this),
      },
      {
        path: "/api/v1/health-check",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleHealthCheck.bind(this),
      },
      {
        path: "/healthz",
        method: "GET",
        handler: this.handleHealthz.bind(this),
      },
      {
        path: "/api/health",
        method: "GET",
        handler: this.handleApiHealth.bind(this),
      },
      {
        path: "/api/v1/reality/snapshot",
        method: "GET",
        handler: this.handleSnapshot.bind(this),
      },
      {
        path: "/api/v1/admin/ai/status",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleAiStatus.bind(this),
      },
      {
        path: "/api/v1/admin/ai/disable",
        method: "POST",
        middleware: [requireKey, checkHumanAttentionBudget],
        handler: this.handleAiDisable.bind(this),
      },
      {
        path: "/api/v1/admin/ai/enable",
        method: "POST",
        middleware: [requireKey, checkHumanAttentionBudget],
        handler: this.handleAiEnable.bind(this),
      },
      {
        path: "/api/v1/admin/reality/expected",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleRealityExpectedGet.bind(this),
      },
      {
        path: "/api/v1/admin/reality/expected",
        method: "POST",
        middleware: [requireKey, checkHumanAttentionBudget],
        handler: this.handleRealityExpectedPost.bind(this),
      },
      {
        path: "/api/v1/admin/reality/reset",
        method: "POST",
        middleware: [requireKey, checkHumanAttentionBudget],
        handler: this.handleRealityReset.bind(this),
      },
      {
        path: "/admin/status",
        method: "GET",
        handler: this.handleAdminStatus.bind(this),
      },
    ];
  }

  handleSimpleHealth(req, res) {
    return res.send("OK");
  }

  async handleAutoInstall(req, res) {
    try {
      const { AutoInstaller } = await import("../../core/auto-installer.js");
      const installer = new AutoInstaller();
      const { packages } = req.body;

      if (!Array.isArray(packages)) {
        return res.status(400).json({ error: "packages array required" });
      }

      const results = await installer.installPackages(packages);
      res.json({ ok: true, results });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleHealthCheck(req, res) {
    res.json({
      ok: true,
      message: "Command Center Key verified",
      timestamp: new Date().toISOString(),
    });
  }

  handleHealthz(req, res) {
    console.log("✅ Health check hit");
    res.status(200).send("OK");
  }

  async handleApiHealth(req, res) {
    const health = {
      status: "OK",
      timestamp: new Date().toISOString(),
      ollama: this.ollamaEndpoint ? "Connected" : "Not configured",
      version: "26.1",
      uptime: process.uptime(),
    };

    if (this.ollamaEndpoint) {
      try {
        const ollamaRes = await fetch(`${this.ollamaEndpoint}/api/tags`);
        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          health.ollama = {
            status: "ok",
            endpoint: this.ollamaEndpoint,
            models: data.models?.map((m) => m.name) || [],
          };
        }
      } catch (error) {
        health.ollama = { status: "error", message: error.message };
      }
    }

    if (this.autoBuilder) {
      try {
        health.build = this.autoBuilder.getStatus();
      } catch (error) {
        health.build = { status: "error", message: error.message };
      }
    } else {
      health.build = { status: "not_initialized" };
    }

    res.json(health);
  }

  handleSnapshot(req, res) {
    res.json(generateRealitySnapshot());
  }

  handleAiStatus(req, res) {
    res.json(getAiStatus());
  }

  handleAiDisable(req, res) {
    const reason = String(req.body?.reason || "manual-disable").trim() || "manual-disable";
    const actor = getActorLabel(req);
    const status = setAiEnabled(false, reason, actor);
    res.json({ ok: true, ...status, message: "AI disabled" });
  }

  handleAiEnable(req, res) {
    const reason = String(req.body?.reason || "manual-enable").trim() || "manual-enable";
    const actor = getActorLabel(req);
    const status = setAiEnabled(true, reason, actor);
    res.json({ ok: true, ...status, message: "AI enabled" });
  }

  handleRealityExpectedGet(req, res) {
    ensureExpectedRealityHash();
    res.json(getExpectedRealityState());
  }

  handleRealityExpectedPost(req, res) {
    const { expectedHash } = req.body || {};
    if (!expectedHash || typeof expectedHash !== "string") {
      return res.status(400).json({
        error: "INVALID_HASH",
        message: "expectedHash must be a string",
      });
    }

    const actor = getActorLabel(req);
    setExpectedRealityHash(expectedHash, actor);
    res.json({
      ok: true,
      expectedHash,
      ...getExpectedRealityState(),
      message: "Expected reality hash updated",
    });
  }

  handleRealityReset(req, res) {
    const snapshot = generateRealitySnapshot();
    const actor = getActorLabel(req);
    setExpectedRealityHash(snapshot.hash, actor);
    res.json({
      ok: true,
      ...getExpectedRealityState(),
      message: "Expected reality hash reset to current snapshot",
    });
  }

  async handleAdminStatus(req, res) {
    try {
      await this.pool.query("SELECT NOW()");
      const spendStatus = this.getDailySpend
        ? await this.getDailySpend()
        : { daily_spend: null, max_daily_spend: null, spend_percentage: null };
      const droneStatus = this.incomeDroneSystem
        ? await this.incomeDroneSystem.getStatus()
        : null;
      const taskStatus = this.executionQueue
        ? this.executionQueue.getStatus()
        : null;

      res.json({
        ok: true,
        version: "v26.1-no-claude",
        summary: {
          daily_spend: spendStatus?.daily_spend ?? null,
          max_daily_spend: spendStatus?.max_daily_spend ?? null,
          spend_percentage: spendStatus?.spend_percentage ?? null,
          drones: droneStatus ?? null,
          tasks: taskStatus ?? null,
        },
      });
    } catch (error) {
      console.error("Error in /admin/status:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  }
}
