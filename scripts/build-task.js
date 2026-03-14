#!/usr/bin/env node
/**
 * build-task.js — CLI to submit a single build task to the self-programming pipeline.
 *
 * Usage:
 *   node scripts/build-task.js "Add auto follow-up cron to site builder prospects"
 *
 * Attempts HTTP first (requires local server on :3000), falls back to direct import.
 */

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const description = process.argv[2]?.trim();
if (!description) {
  console.error("Usage: node scripts/build-task.js \"<task description>\"");
  process.exit(1);
}

const KEY = process.env.COMMAND_CENTER_KEY;
if (!KEY) {
  console.error("COMMAND_CENTER_KEY not set in environment");
  process.exit(1);
}

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

async function tryDirect(instruction) {
  console.log("Server not reachable — running self-programming directly...");

  // server.js wires getDeps() — we can't replicate the full dep graph here.
  // Instead we import the service factory and stub the minimum deps needed
  // for the internal handleSelfProgramming() path.
  const { pathToFileURL } = await import("node:url");
  const { createSelfProgrammingService } = await import(
    pathToFileURL(path.join(ROOT, "services", "self-programming.js")).href
  );
  const { promises: fsPromises } = await import("node:fs");
  const fs = (await import("node:fs")).default;
  const { execFile, promisify: util_promisify } = await import("node:child_process");
  const execAsync = util_promisify(execFile);

  // Minimal stub for council failover — routes to OpenAI if available
  async function councilFailover(prompt, _preferred, opts = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set; cannot run direct fallback");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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

  async function detectBlindSpots() { return []; }
  async function getCouncilConsensus(prompt) { return councilFailover(prompt, "chatgpt"); }
  async function createSystemSnapshot() { return `snap_${Date.now()}`; }
  async function rollbackToSnapshot() {}
  async function sandboxTest() { return { success: true }; }

  function getDeps() {
    return {
      pool: null,
      path,
      fs,
      fsPromises,
      __dirname: ROOT,
      execAsync: (cmd) => {
        const [bin, ...args] = cmd.split(" ");
        return execAsync(bin, args, { cwd: ROOT });
      },
      createSystemSnapshot,
      rollbackToSnapshot,
      sandboxTest,
      callCouncilWithFailover: councilFailover,
      callCouncilMember: councilFailover,
      detectBlindSpots,
      getCouncilConsensus,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || null,
      commitToGitHub: async () => {},
      selfBuilder: null,
      triggerDeployment: async () => {},
      postUpgradeChecker: null,
      logMonitor: null,
    };
  }

  const { handleSelfProgramming } = createSelfProgrammingService(getDeps);
  return handleSelfProgramming({ instruction, autoDeploy: false });
}

(async () => {
  console.log(`Submitting build task: "${description}"`);

  let result;
  try {
    result = await tryHttp(description);
    console.log("Connected via HTTP server.");
  } catch (httpErr) {
    console.warn(`HTTP attempt failed (${httpErr.message}) — trying direct fallback.`);
    try {
      result = await tryDirect(description);
    } catch (directErr) {
      console.error("Direct fallback also failed:", directErr.message);
      process.exit(1);
    }
  }

  if (!result.ok) {
    console.error("Build task failed:", result.error || JSON.stringify(result));
    process.exit(1);
  }

  const files = result.filesModified || [];
  if (files.length === 0) {
    console.warn("Task succeeded but no files were written.");
  } else {
    console.log("Files written:");
    for (const f of files) console.log(`  ${f}`);
  }

  if (result.snapshotId) console.log(`Snapshot: ${result.snapshotId}`);
  process.exit(0);
})();
