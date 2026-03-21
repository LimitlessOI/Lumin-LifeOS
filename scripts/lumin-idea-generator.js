#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
const CONTEXT_FILE = path.join(ROOT, "• Lumin-Memory", "00_INBOX", "raw", "system-ideas.txt");
const OUTPUT_DIR = path.join(ROOT, "knowledge", "extracted-ideas");
const THREAD_OUTPUT_DIR = path.join(ROOT, "docs", "THREAD_REALITY", "outputs");
const LATEST_RUN_PATH = path.join(ROOT, "docs", "THREAD_REALITY", "latest-run.json");

function sanitizeResponse(text) {
  if (!text || typeof text !== "string") return text;
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  return jsonMatch ? jsonMatch[0] : cleaned;
}

async function loadContext() {
  try {
    const raw = await fs.readFile(CONTEXT_FILE, "utf8");
    return raw.trim();
  } catch (err) {
    return "Context: No supplemental idea dump available.";
  }
}

async function writeLatestRun(record) {
  await fs.writeFile(LATEST_RUN_PATH, JSON.stringify(record, null, 2) + "\n", "utf8");
}

async function runTruthGuard() {
  const guard = spawnSync(
    "node",
    ["scripts/truth-guard-preflight.js", LATEST_RUN_PATH],
    { cwd: ROOT, stdio: "inherit" }
  );
  if (guard.status !== 0) {
    throw new Error("Truth guard preflight failed");
  }
}

async function main() {
  const context = await loadContext();
  const prompt = `You are LUMIN, the open-source AI council running on Ollama.
Your mission is to inspect the available capabilities (web building, marketing, automations, membership services, midwife offerings, concierge, and Lumin's builder/autonomy stack) and output the **25 highest-probability, low-hanging fruit revenue plays** you can build *right now* using the existing tools.

Use the "low-hanging fruit" algorithm: score each idea (1-100) based on ROI / effort ratio, favoring tasks you can ship quickly with proof and automation.

Provide a JSON array of 25 objects with the following fields:
{
  "id": "unique-id",
  "title": "Short idea title",
  "summary": "What the idea is",
  "score": number (higher is better),
  "effort": number (e.g. 1-10, lower is easier),
  "impact": number (1-10),
  "ease": number (1-10),
  "revenueModel": "How it makes money",
  "nextSteps": ["Step 1", "Step 2"],
  "assets": ["web", "automation", ...],
  "proofPaths": ["docs/THREAD_REALITY/..."] // optional suggestions
}

Reference this context block:
${context}

Return only the JSON array.`;

const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.2:1b",
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
      num_ctx: 8192,
      num_predict: 4096
    }
  })
});

if (!response.ok) {
  throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
}

const payload = await response.json();
const sanitized = sanitizeResponse(payload.response || "");
let ideas;
try {
  ideas = JSON.parse(sanitized);
} catch (error) {
  throw new Error(`Failed to parse JSON: ${error.message}`);
}

if (!Array.isArray(ideas) || ideas.length !== 25) {
  throw new Error("Expected 25 ideas; got " + (ideas.length || 0));
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(path.join(THREAD_OUTPUT_DIR, timestamp), { recursive: true });

const outputPath = path.join(OUTPUT_DIR, `lumin-ideas-${timestamp}.json`);
await fs.writeFile(outputPath, JSON.stringify(ideas, null, 2) + "\n", "utf8");
const threadPath = path.join(THREAD_OUTPUT_DIR, timestamp, "lumin-ideas.json");
await fs.writeFile(threadPath, JSON.stringify(ideas, null, 2) + "\n", "utf8");

const runRecord = {
  runId: timestamp,
  whatWasAttempted: "Lumin low-hanging fruit idea extraction",
  result: "UNVERIFIED",
  proofPaths: [path.relative(ROOT, outputPath), path.relative(ROOT, threadPath)],
  runDir: "",
  blocker: ""
};
await writeLatestRun(runRecord);
await runTruthGuard();

console.log("✅ Lumin idea batch saved:", outputPath);
console.log("Proof artifact:", threadPath);
}

main().catch((err) => {
  console.error("❌ Lumin idea generator failed:", err.message);
  process.exit(1);
});
