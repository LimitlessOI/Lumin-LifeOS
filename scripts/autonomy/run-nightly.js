#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, "scripts", "autonomy", "queue.json");
const REPORT_PATH = path.join(ROOT, "scripts", "autonomy", "proof-report.md");
const LOG_DIR = path.join(ROOT, "scripts", "autonomy", "logs");

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const LOG_PATH = path.join(LOG_DIR, `${TIMESTAMP}.log`);

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logLine(line) {
  const text = `[${new Date().toISOString()}] ${line}`;
  console.log(text);
  fs.appendFileSync(LOG_PATH, text + "\n");
}

function readQueue() {
  const raw = fs.readFileSync(QUEUE_PATH, "utf8");
  return JSON.parse(raw);
}

function writeQueue(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n");
}

function runCommand(command, env = {}) {
  logLine(`COMMAND: ${command}`);
  const result = spawnSync(command, {
    shell: true,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.stdout) logLine(result.stdout.trim());
  if (result.stderr) logLine(result.stderr.trim());
  logLine(`EXIT:${result.status ?? 1}`);
  return result.status ?? 1;
}

function runPrecheck() {
  const results = [];
  results.push({
    name: "ssot:validate",
    exit: runCommand("npm run ssot:validate"),
  });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    results.push({
      name: "test:smoke",
      exit: 1,
      note: "DATABASE_URL missing",
    });
    return { ok: false, results, reason: "DATABASE_URL missing" };
  }

  const smokeExit = runCommand("npm run test:smoke", {
    DATABASE_URL: databaseUrl,
    COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY || "smoke_test_key",
  });
  results.push({ name: "test:smoke", exit: smokeExit });

  const ok = results.every((r) => r.exit === 0);
  return { ok, results, reason: ok ? null : "Precheck failed" };
}

function writeReport({ tasksRan, filesChanged, verifications }) {
  const lines = [];
  lines.push("# Autonomy Proof Report");
  lines.push("");
  lines.push(`- Status: ${tasksRan.length ? "COMPLETED" : "NO TASKS"}`);
  lines.push(`- Last run: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Tasks Executed");
  if (tasksRan.length === 0) {
    lines.push("- None");
  } else {
    for (const task of tasksRan) {
      lines.push(`- ${task.id}: ${task.status}${task.reason ? ` (${task.reason})` : ""}`);
    }
  }
  lines.push("");
  lines.push("## Files Changed");
  if (filesChanged.length === 0) {
    lines.push("- None");
  } else {
    for (const file of filesChanged) {
      lines.push(`- ${file}`);
    }
  }
  lines.push("");
  lines.push("## Verification Commands + Exit Codes");
  if (verifications.length === 0) {
    lines.push("- None");
  } else {
    for (const v of verifications) {
      lines.push(`- ${v.name}: EXIT:${v.exit}${v.note ? ` (${v.note})` : ""}`);
    }
  }
  lines.push("");
  lines.push("## Proof Artifacts");
  lines.push("- UI: /overlay/website-audit");
  lines.push("- API: POST /api/v1/website/audit");
  lines.push("");
  lines.push("## Logs");
  lines.push(`- ${path.relative(ROOT, LOG_PATH)}`);
  lines.push("");
  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n");
}

function getFilesChanged() {
  const result = spawnSync("git diff --name-only", { shell: true, encoding: "utf8" });
  if (result.status !== 0) return [];
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function runQueue() {
  ensureLogDir();
  logLine("Autonomy runner starting.");

  const queue = readQueue();
  const tasksRan = [];
  const verifications = [];

  for (const item of queue.queue) {
    if (item.status !== "todo") continue;

    item.status = "doing";
    writeQueue(queue);

    logLine(`Starting task ${item.id}`);
    const requireWork = item.requireWork !== false;
    const hasCommands = Array.isArray(item.commands) && item.commands.length > 0;
    if (requireWork && !hasCommands) {
      item.status = "blocked";
      item.reason = "No commands defined for task";
      tasksRan.push({ id: item.id, status: item.status, reason: item.reason });
      writeQueue(queue);
      continue;
    }

    const precheck = runPrecheck();
    verifications.push(...precheck.results);

    if (!precheck.ok) {
      item.status = "blocked";
      item.reason = precheck.reason;
      tasksRan.push({ id: item.id, status: item.status, reason: item.reason });
      writeQueue(queue);
      continue;
    }

    const commandResults = [];
    if (Array.isArray(item.commands)) {
      for (const command of item.commands) {
        const exit = runCommand(command);
        commandResults.push({ name: command, exit });
      }
    }

    const acceptanceResults = [];
    if (Array.isArray(item.acceptance_tests)) {
      for (const test of item.acceptance_tests) {
        const exit = runCommand(test);
        acceptanceResults.push({ name: test, exit });
      }
    }

    verifications.push(...commandResults, ...acceptanceResults);

    const failed = [...commandResults, ...acceptanceResults].find((r) => r.exit !== 0);
    if (failed) {
      item.status = "blocked";
      item.reason = `Failed: ${failed.name}`;
    } else {
      item.status = "done";
      item.reason = null;
    }

    tasksRan.push({ id: item.id, status: item.status, reason: item.reason });
    writeQueue(queue);
  }

  const filesChanged = getFilesChanged();
  writeReport({ tasksRan, filesChanged, verifications });
  logLine("Autonomy runner finished.");
}

try {
  runQueue();
} catch (error) {
  ensureLogDir();
  logLine(`Runner failed: ${error.message}`);
  process.exit(1);
}
