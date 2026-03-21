#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, "scripts", "autonomy", "queue.json");
const REPORT_PATH = path.join(ROOT, "scripts", "autonomy", "proof-report.md");
const LOG_DIR = path.join(ROOT, "scripts", "autonomy", "logs");
const REGISTRY_PATH = path.join(ROOT, "scripts", "autonomy", "task-registry.json");
const PROOF_ROOT = path.join(ROOT, "scripts", "autonomy", "proof");

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const LOG_PATH = path.join(LOG_DIR, `${TIMESTAMP}.log`);
const LATEST_RUN_PATH = path.join(ROOT, "docs", "THREAD_REALITY", "latest-run.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function logLine(line) {
  const text = `[${new Date().toISOString()}] ${line}`;
  console.log(text);
  fs.appendFileSync(LOG_PATH, text + "\n");
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n");
}

function runCommand(command, env = {}) {
  logLine(`COMMAND: ${command}`);
  const result = spawnSync(command, {
    shell: true,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (stdout.trim()) logLine(stdout.trim());
  if (stderr.trim()) logLine(stderr.trim());
  const status = result.status ?? 1;
  logLine(`EXIT:${status}`);
  return { status, stdout, stderr };
}

function readQueue() {
  return readJson(QUEUE_PATH);
}

function writeQueue(queue) {
  writeJson(QUEUE_PATH, queue);
}

function readRegistry() {
  return readJson(REGISTRY_PATH);
}

function validateTask(item) {
  const errors = [];
  if (!Array.isArray(item.commands) || item.commands.length === 0) {
    errors.push("commands[] is required and must be non-empty");
  }
  if (!Array.isArray(item.env)) {
    errors.push("env[] is required");
  }
  if (!Array.isArray(item.verifiers) || item.verifiers.length === 0) {
    errors.push("verifiers[] is required and must be non-empty");
  }
  if (!Array.isArray(item.proof_artifacts)) {
    errors.push("proof_artifacts[] is required");
  }
  if (!Array.isArray(item.ssot_refs)) {
    errors.push("ssot_refs[] is required");
  }
  return errors;
}

function resolveCommand(commandId, registry) {
  const entry = registry[commandId];
  if (!entry) {
    throw new Error(`Command '${commandId}' is not in task registry`);
  }
  return entry;
}

function envArrayToObject(envArray) {
  const env = {};
  for (const pair of envArray) {
    if (!pair || typeof pair.key !== "string") continue;
    env[pair.key] = String(pair.value ?? "");
  }
  return env;
}

function verifyJsonOutput(stdout) {
  try {
    JSON.parse(stdout);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function writeProofBundle(taskId, proof, proofPaths) {
  const proofDir = path.join(PROOF_ROOT, taskId);
  ensureDir(proofDir);
  fs.writeFileSync(path.join(proofDir, "stdout.log"), proof.stdout.join("\n") + "\n");
  fs.writeFileSync(path.join(proofDir, "stderr.log"), proof.stderr.join("\n") + "\n");
  writeJson(path.join(proofDir, "exit.json"), proof.exitJson);
  fs.writeFileSync(path.join(proofDir, "diff.patch"), proof.diffPatch);
  writeJson(path.join(proofDir, "ssot_refs.json"), proof.ssotRefs);
  const files = ["stdout.log", "stderr.log", "exit.json", "diff.patch", "ssot_refs.json"];
  for (const file of files) {
    proofPaths.add(path.relative(ROOT, path.join(proofDir, file)));
  }
}

function getDiffPatch() {
  const result = spawnSync("git diff", { shell: true, encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout || "";
}

function runSteps(stepIds, registry, env, expectsJson) {
  const steps = [];
  const stdoutLines = [];
  const stderrLines = [];

  for (const stepId of stepIds) {
    const entry = resolveCommand(stepId, registry);
    const requiredEnv = Array.isArray(entry.requiredEnv) ? entry.requiredEnv : [];
    for (const key of requiredEnv) {
      if (!env[key]) {
        steps.push({
          id: stepId,
          command: entry.command,
          exit: 1,
          ok: false,
          error: `Missing required env: ${key}`,
        });
        return { steps, stdoutLines, stderrLines, failed: true };
      }
    }

    const result = runCommand(entry.command, env);
    stdoutLines.push(`[${stepId}] ${result.stdout}`.trim());
    stderrLines.push(`[${stepId}] ${result.stderr}`.trim());

    let ok = result.status === 0;
    let jsonError = null;
    if (ok && expectsJson) {
      const jsonCheck = verifyJsonOutput(result.stdout.trim());
      ok = jsonCheck.ok;
      jsonError = jsonCheck.ok ? null : jsonCheck.error;
    }

    steps.push({
      id: stepId,
      command: entry.command,
      exit: result.status,
      ok,
      jsonError,
    });

    if (!ok) {
      return { steps, stdoutLines, stderrLines, failed: true };
    }
  }

  return { steps, stdoutLines, stderrLines, failed: false };
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
      const jsonNote = v.jsonError ? ` JSON_ERROR:${v.jsonError}` : "";
      lines.push(`- ${v.id}: EXIT:${v.exit}${jsonNote}`);
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

function writeLatestRun(record) {
  fs.writeFileSync(LATEST_RUN_PATH, JSON.stringify(record, null, 2) + "\n");
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
  ensureDir(LOG_DIR);
  ensureDir(PROOF_ROOT);
  logLine("Autonomy runner starting.");
  const proofPaths = new Set([path.relative(ROOT, LOG_PATH)]);

  const queue = readQueue();
  const registry = readRegistry();
  const tasksRan = [];
  const verifications = [];

  for (const item of queue.queue) {
    if (item.status !== "todo") continue;

    item.status = "doing";
    writeQueue(queue);

    logLine(`Starting task ${item.id}`);

    const validationErrors = validateTask(item);
    if (validationErrors.length > 0) {
      item.status = "blocked";
      item.reason = `Invalid task schema: ${validationErrors.join("; ")}`;
      tasksRan.push({ id: item.id, status: item.status, reason: item.reason });
      writeQueue(queue);
      continue;
    }

    const taskEnv = envArrayToObject(item.env);
    const proof = {
      stdout: [],
      stderr: [],
      exitJson: {
        taskId: item.id,
        startedAt: new Date().toISOString(),
        steps: [],
        status: "running",
      },
      diffPatch: "",
      ssotRefs: item.ssot_refs,
    };

    const commandRun = runSteps(item.commands, registry, taskEnv, false);
    proof.stdout.push(...commandRun.stdoutLines);
    proof.stderr.push(...commandRun.stderrLines);
    proof.exitJson.steps.push(...commandRun.steps.map((step) => ({
      phase: "command",
      ...step,
    })));

    if (commandRun.failed) {
      item.status = "blocked";
      item.reason = "Command failed";
      proof.exitJson.status = "blocked";
      proof.exitJson.finishedAt = new Date().toISOString();
      proof.diffPatch = getDiffPatch();
      writeProofBundle(item.id, proof, proofPaths);
      tasksRan.push({ id: item.id, status: item.status, reason: item.reason });
      writeQueue(queue);
      continue;
    }

    const verifierRun = runSteps(item.verifiers, registry, taskEnv, true);
    proof.stdout.push(...verifierRun.stdoutLines);
    proof.stderr.push(...verifierRun.stderrLines);
    proof.exitJson.steps.push(...verifierRun.steps.map((step) => ({
      phase: "verifier",
      ...step,
    })));
    verifications.push(...verifierRun.steps.map((step) => ({
      id: step.id,
      exit: step.exit,
      jsonError: step.jsonError,
    })));

    if (verifierRun.failed) {
      item.status = "blocked";
      item.reason = "Verifier failed or returned non-JSON";
      proof.exitJson.status = "blocked";
    } else {
      item.status = "done";
      item.reason = null;
      proof.exitJson.status = "done";
    }

    proof.exitJson.finishedAt = new Date().toISOString();
    proof.diffPatch = getDiffPatch();
    writeProofBundle(item.id, proof, proofPaths);

    tasksRan.push({ id: item.id, status: item.status, reason: item.reason });
    writeQueue(queue);
  }

  const filesChanged = getFilesChanged();
  writeReport({ tasksRan, filesChanged, verifications });
  logLine("Autonomy runner finished.");

  const runId = TIMESTAMP.replace(/[:.]/g, "");
  const attemptSummary =
    tasksRan.length > 0
      ? tasksRan.map((t) => `${t.id}:${t.status}`).join(", ")
      : "no tasks";
  const record = {
    runId,
    whatWasAttempted: attemptSummary,
    result: "UNVERIFIED",
    proofPaths: Array.from(proofPaths),
    runDir: "",
    blocker: proofPaths.size === 0 ? "No proof artifacts recorded" : "",
  };
  writeLatestRun(record);
  const guardResult = runCommand(
    `node scripts/truth-guard-preflight.js ${LATEST_RUN_PATH}`
  );
  if (guardResult.status !== 0) {
    logLine("Truth guard preflight failed");
    process.exit(guardResult.status);
  }
}

try {
  runQueue();
} catch (error) {
  ensureDir(LOG_DIR);
  logLine(`Runner failed: ${error.message}`);
  process.exit(1);
}
