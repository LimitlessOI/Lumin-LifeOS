import fs from "fs";
import path from "path";
import process from "node:process";
import { promises as fsPromises } from "fs";

export function registerServerRoutes(app, deps) {
  const {
    express,
    memoryRoutes,
    stripeRoutes,
    requireKey,
    getAllFlags,
    OLLAMA_ENDPOINT,
    pool,
    autoBuilder,
    syncStripeRevenue,
    financialDashboard,
    roiTracker,
    logger,
    commitToGitHub,
    getAllQueueStats,
    rootDir,
    telemetry,
    podManager,
  } = deps;

  app.use("/api", memoryRoutes);

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    try {
      const stripeAutomation = await import("../core/stripe-automation.js");
      await stripeAutomation.handleWebhook(req.body, sig, { pool });
      res.json({ received: true });
    } catch (error) {
      logger.error("❌ [STRIPE] Webhook error:", { error: error.message });
      res.status(400).json({ error: error.message });
    }
  });

  app.use("/api/stripe", stripeRoutes);

  app.get("/api/v1/flags", requireKey, (req, res) => {
    telemetry?.recordMetric?.("endpoint.flags");
    res.json({ ok: true, flags: getAllFlags() });
  });

  app.get("/api/v1/ops/pods", requireKey, (req, res) => {
    const pods = podManager?.listPods() || [];
    res.json({ ok: true, pods });
  });

  app.get("/api/v1/ops/telemetry", requireKey, (req, res) => {
    res.json({ ok: true, telemetry: telemetry?.snapshot?.() || {} });
  });

  app.get("/api/health", async (req, res) => {
    const health = {
      server: "ok",
      timestamp: new Date().toISOString(),
    };

    try {
      const ollamaEndpoint = OLLAMA_ENDPOINT || "http://localhost:11434";
      const ollamaRes = await fetch(`${ollamaEndpoint}/api/tags`);
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        health.ollama = {
          status: "ok",
          endpoint: ollamaEndpoint,
          models: data.models?.map((m) => m.name) || [],
        };
      } else {
        health.ollama = { status: "error", message: `HTTP ${ollamaRes.status}` };
      }
    } catch (e) {
      health.ollama = { status: "error", message: e.message };
    }

    try {
      await pool.query("SELECT 1");
      health.database = { status: "ok" };
    } catch (e) {
      health.database = { status: "error", message: e.message };
    }

    try {
      health.build = autoBuilder.getStatus();
    } catch (e) {
      health.build = { status: "error", message: e.message };
    }

    telemetry?.recordMetric?.("endpoint.healthz", allOk ? 1 : 0);
    res.json(health);
  });

  app.post("/api/v1/stripe/sync-revenue", requireKey, async (req, res) => {
    try {
      await syncStripeRevenue();
      const dashboard = await financialDashboard.getDashboard();
      res.json({ ok: true, dashboard, roi: roiTracker });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/overlay", (req, res) => {
    res.sendFile(path.join(rootDir, "public", "overlay", "index.html"));
  });

  app.get("/overlay/index.html", (req, res) => {
    res.sendFile(path.join(rootDir, "public", "overlay", "index.html"));
  });

  app.post("/api/v1/dev/commit", requireKey, async (req, res) => {
    try {
      const { path: filePath, content, message } = req.body;

      if (!filePath || !content) {
        return res.status(400).json({ error: "Path and content required" });
      }

      await commitToGitHub(filePath, content, message || `Update ${filePath}`);

      res.json({
        ok: true,
        committed: filePath,
        message: message || `Update ${filePath}`,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/system/replace-file", requireKey, async (req, res) => {
    try {
      const { filePath, fullContent, backup = true } = req.body;

      if (!filePath || !fullContent) {
        return res.status(400).json({ error: "filePath and fullContent required" });
      }

      const allowedFiles = [
        ".js",
        "public/overlay/command-center.js",
        "public/overlay/command-center.html",
        "package.json",
      ];

      if (!allowedFiles.includes(filePath)) {
        return res.status(403).json({ error: "File not allowed for replacement" });
      }

      const fullPath = path.join(rootDir, filePath);

      if (backup && fs.existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await fsPromises.copyFile(fullPath, backupPath);
        logger.info(`📦 Backed up to: ${backupPath}`);
      }

      await fsPromises.writeFile(fullPath, fullContent, "utf-8");

      logger.info(`✅ Completely replaced: ${filePath}`);

      res.json({
        ok: true,
        message: `File ${filePath} completely replaced`,
        backup: backup ? `Created backup with timestamp` : "No backup",
        size: fullContent.length,
      });
    } catch (error) {
      logger.error("File replacement error:", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/healthz", async (req, res) => {
    const checks = {
      server: "ok",
      db: "unknown",
      ai: process.env.ANTHROPIC_API_KEY ? "configured" : "missing_key",
      email: process.env.POSTMARK_SERVER_TOKEN ? "configured" : "not_configured",
    };

    try {
      await pool.query("SELECT 1");
      checks.db = "ok";
    } catch (e) {
      checks.db = "error: " + e.message;
    }

    const allOk = checks.db === "ok" && checks.ai === "configured";
    res.status(allOk ? 200 : 503).json({
      status: allOk ? "healthy" : "degraded",
      checks,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/v1/queue/stats", requireKey, async (req, res) => {
    try {
      const stats = await getAllQueueStats();
      res.json({ ok: true, queues: stats });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}
