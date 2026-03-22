import { requireKey } from "../../src/server/auth/requireKey.js";
import {
  checkCommandPresence,
  checkNodeModule,
  fetchOllamaModels,
} from "../../services/tools-status.js";

export class ToolsModule {
  constructor({ ollamaEndpoint } = {}) {
    this.ollamaEndpoint = ollamaEndpoint;
    this.cachedStatus = this.buildDefaultStatus();
    this.refreshInProgress = false;
    this.refreshStatus().catch((error) =>
      console.warn("[TOOLS STATUS] initial refresh failed:", error.message)
    );
    this.routes = [
      {
        path: "/api/v1/tools/status",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleToolsStatus.bind(this),
      },
    ];
  }

  buildDefaultStatus() {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      commands: [],
      ollama: {
        endpoint: this.ollamaEndpoint,
        available: false,
        models: [],
      },
      tool_checks: {
        ffmpeg: false,
        python_modules: {},
        python_version: "not-checked",
        puppeteer: false,
        playwright: false,
      },
    };
  }

  async handleToolsStatus(req, res) {
    if (!this.cachedStatus) {
      this.cachedStatus = this.buildDefaultStatus();
    }

    res.json({
      ...this.cachedStatus,
      timestamp: new Date().toISOString(),
    });

    this.refreshStatus().catch((error) => {
      console.warn("[TOOLS STATUS] refresh failed:", error.message);
    });
  }

  async refreshStatus() {
    if (this.refreshInProgress) return;
    this.refreshInProgress = true;

    try {
      const [
        ffmpegOutcome,
        puppeteerOutcome,
        playwrightOutcome,
        ollamaStatus,
      ] = await Promise.allSettled([
        checkCommandPresence("ffmpeg"),
        checkNodeModule("puppeteer"),
        checkNodeModule("playwright"),
        fetchOllamaModels(this.ollamaEndpoint),
      ]);

      const commands = [];
      const toolChecks = {
        ffmpeg: false,
        python_modules: {},
        python_version: "not-checked",
        puppeteer: false,
        playwright: false,
      };

      const ffmpegPresent =
        ffmpegOutcome.status === "fulfilled" ? ffmpegOutcome.value : false;
      commands.push({ cmd: "command -v ffmpeg", success: ffmpegPresent });
      toolChecks.ffmpeg = ffmpegPresent;

      commands.push({
        cmd: "python3 - <<'PY' (module check)",
        success: false,
        error: "skipped",
      });

      const puppeteerPresent =
        puppeteerOutcome.status === "fulfilled" ? puppeteerOutcome.value : false;
      commands.push({
        cmd: "node -e \"require.resolve('puppeteer')\"",
        success: puppeteerPresent,
      });
      toolChecks.puppeteer = puppeteerPresent;

      const playwrightPresent =
        playwrightOutcome.status === "fulfilled" ? playwrightOutcome.value : false;
      commands.push({
        cmd: "node -e \"require.resolve('playwright')\"",
        success: playwrightPresent,
      });
      toolChecks.playwright = playwrightPresent;

      const ollamaData =
        ollamaStatus.status === "fulfilled"
          ? ollamaStatus.value
          : { endpoint: this.ollamaEndpoint, available: false, models: [] };

      commands.push({
        cmd: `curl ${this.ollamaEndpoint || "http://localhost:11434"}/api/tags`,
        success: ollamaData.available,
      });

      this.cachedStatus = {
        ok: true,
        timestamp: new Date().toISOString(),
        commands,
        ollama: {
          endpoint: ollamaData.endpoint,
          available: ollamaData.available,
          models: ollamaData.models,
        },
        tool_checks: toolChecks,
      };
    } catch (error) {
      console.warn("[TOOLS STATUS] refresh error:", error.message);
    } finally {
      this.refreshInProgress = false;
    }
  }
}
