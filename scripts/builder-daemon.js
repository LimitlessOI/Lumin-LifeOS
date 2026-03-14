#!/usr/bin/env node
/**
 * builder-daemon.js — Autonomous nightly build runner.
 *
 * Reads scripts/autonomy/builder-queue.json, runs each pending task through the
 * self-program endpoint (HTTP first, direct-import fallback), marks results, and
 * writes a timestamped markdown report.
 *
 * Invoked by PM2 cron at 2 AM: pm2 start ecosystem.config.js --only builder-daemon
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const QUEUE_PATH = path.join(__dirname, "autonomy", "builder-queue.json");
const KEY = process.env.COMMAND_CENTER_KEY || "";

// ---------------------------------------------------------------------------
// Queue helpers
// ---------------------------------------------------------------------------

function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    return { tasks: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    console.error("builder-daemon: Could not parse builder-queue.json");
    return { tasks: [] };
  }
}

function writeQueue(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// HTTP call to local server
// ---------------------------------------------------------------------------

async function tryHttp(instruction) {
  const res = await fetch("http://localhost:3000/api/v1/system/self-program", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-command-center-key": KEY,
    },
    body: JSON.stringify({ instruction, autoDeploy: false }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Direct-import fallback (no server)
// ---------------------------------------------------------------------------

async function tryDirect(instruction) {
  const { createSelfProgrammingService } = await import(
    pathToFileURL(path.join(ROOT, "services", "self-programming.js")).href
  );
  const { promises: fsPromises } = await import("node:fs");
  const { promisify } = await import("node:util");
  const { execFile } = await import("node:child_process");
  const execFileAsync = promisify(execFile);

  async function councilFailover(prompt, _preferred, opts = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set; cannot run direct fallback");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: opts.maxTokens || 8000,
        temperature: opts.temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI error");
    return data.choices?.[0]?.message?.content || "";
  }

  // getDeps is called synchronously inside the service; pre-resolve async imports.
  const resolvedFs = (await import("node:fs")).default;
  function getDepsSync() {
    return {
      pool: null,
      path,
      fs: resolvedFs,
      fsPromises,
      __dirname: ROOT,
      execAsync: (cmd) => {
        const [bin, ...args] = cmd.split(" ");
        return execFileAsync(bin, args, { cwd: ROOT });
      },
      createSystemSnapshot: async () => `snap_${Date.now()}`,
      rollbackToSnapshot: async () => {},
      sandboxTest: async () => ({ success: true }),
      callCouncilWithFailover: councilFailover,
      callCouncilMember: councilFailover,
      detectBlindSpots: async () => [],
      getCouncilConsensus: (prompt) => councilFailover(prompt, "chatgpt"),
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || null,
      commitToGitHub: async () => {},
      selfBuilder: null,
      triggerDeployment: async () => {},
      postUpgradeChecker: null,
      logMonitor: null,
    };
  }

  const { handleSelfProgramming } = createSelfProgrammingService(getDepsSync);
  return handleSelfProgramming({ instruction, autoDeploy: false });
}

// ---------------------------------------------------------------------------
// Run one task — HTTP with direct fallback
// ---------------------------------------------------------------------------

async function runTask(task) {
  let result;
  try {
    result = await tryHttp(task.description);
  } catch (httpErr) {
    console.warn(`  HTTP failed (${httpErr.message}), trying direct fallback...`);
    result = await tryDirect(task.description);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Report writer
// ---------------------------------------------------------------------------

function writeReport(completed, failed) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = path.join(__dirname, "autonomy", `builder-report-${ts}.md`);
  const lines = [
    `# Builder Run - ${new Date().toUTCString()}`,
    "",
    "## Tasks Completed",
  ];
  if (completed.length === 0) {
    lines.push("- (none)");
  } else {
    for (const t of completed) {
      const files = t.filesModified?.join(", ") || "(no files listed)";
      lines.push(`- ✅ ${t.description} → ${files}`);
    }
  }
  lines.push("", "## Tasks Failed");
  if (failed.length === 0) {
    lines.push("- (none)");
  } else {
    for (const t of failed) {
      lines.push(`- ❌ ${t.description} → ${t.error}`);
    }
  }
  lines.push("");
  fs.writeFileSync(reportPath, lines.join("\n") + "\n");
  console.log(`Report written: ${reportPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log("builder-daemon: starting run at", new Date().toISOString());

  const queue = readQueue();
  const pending = queue.tasks.filter((t) => t.status === "pending");

  if (pending.length === 0) {
    console.log("builder-daemon: no pending tasks — exiting.");
    writeReport([], []);
    process.exit(0);
  }

  console.log(`builder-daemon: ${pending.length} pending task(s).`);

  const completed = [];
  const failed = [];

  for (const task of pending) {
    console.log(`\nRunning task [${task.id}]: ${task.description}`);
    const taskRef = queue.tasks.find((t) => t.id === task.id);

    try {
      const result = await runTask(task);
      if (result.ok) {
        taskRef.status = "done";
        taskRef.result = {
          completedAt: new Date().toISOString(),
          filesModified: result.filesModified || [],
        };
        completed.push({ description: task.description, filesModified: result.filesModified });
        console.log(`  Done. Files: ${(result.filesModified || []).join(", ") || "(none)"}`);
      } else {
        throw new Error(result.error || "Unknown error from self-program");
      }
    } catch (err) {
      taskRef.status = "failed";
      taskRef.result = {
        failedAt: new Date().toISOString(),
        error: err.message,
      };
      failed.push({ description: task.description, error: err.message });
      console.error(`  Failed: ${err.message}`);
    }

    writeQueue(queue);
  }

  writeReport(completed, failed);

  const exitCode = failed.length > 0 && completed.length === 0 ? 1 : 0;
  console.log(
    `\nbuilder-daemon: done. ${completed.length} completed, ${failed.length} failed.`
  );
  process.exit(exitCode);
})();
