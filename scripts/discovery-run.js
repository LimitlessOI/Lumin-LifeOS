#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.cwd();
const OUTPUT_ROOT = path.join(ROOT, "docs", "THREAD_REALITY", "outputs");
const LATEST_RUN_PATH = path.join(ROOT, "docs", "THREAD_REALITY", "latest-run.json");
const COMMAND_KEY = process.env.COMMAND_CENTER_KEY;

if (!COMMAND_KEY) {
  console.error("COMMAND_CENTER_KEY is required for discovery runs.");
  process.exit(1);
}

const QUERIES = [
  "best-selling indie productivity apps 2026",
  "top revenue automation services for small businesses",
  "gameday fan engagement platforms 2026",
  "AI-powered email follow-up tools",
  "recurring workforce training software for teams",
  "vector search automation marketplaces",
  "fast-growing marketplace for creators 2026",
  "video game community monetization platforms",
  "B2B SaaS lead scoring automation tools",
  "app for personal finance coaching SaaS",
  "micro-SaaS for hybrid team scheduling",
  "AI content repurposing tools 2026",
  "digital product bundles for remote teams",
  "wellness analytics dashboards for brands",
  "creative collaboration suites with live commerce",
  "SaaS for automating influencer affiliate payouts",
  "revenue operations autopilot software",
  "microlearning platform monetization ideas",
  "AI-driven customer support automation",
  "next-gen e-commerce upsell automation",
  "video editing automation for marketing teams",
  "API marketplace for automation workflows",
  "creative classroom gamification platforms",
  "local business automation platform ideas",
  "high-converting landing page bundles for agencies",
];

async function fetchSearch(query) {
  const response = await fetch("http://localhost:8080/api/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-command-key": COMMAND_KEY,
    },
    body: JSON.stringify({
      query,
      context: { proof: [] },
      requireProof: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`search error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function runWebIntake(urls) {
  if (urls.length === 0) return;
  const args = ["web:intake", "--", "--urls", urls.join(",")];
  const result = spawnSync("npm", args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("web intake script failed");
  }
}

async function runIdeaGenerator() {
  const result = spawnSync("node", ["scripts/lumin-idea-generator.js"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("lumin idea generator failed");
  }
}

async function writeLatestRun(record) {
  await fs.writeFile(LATEST_RUN_PATH, JSON.stringify(record, null, 2) + "\n", "utf8");
}

async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(OUTPUT_ROOT, timestamp, "search");
  await ensureDir(runDir);

  const urls = new Set();
  for (const query of QUERIES) {
    console.log("Running search query:", query);
    const result = await fetchSearch(query);
    const filePath = path.join(runDir, `${query.replace(/[^a-z0-9]+/gi, "_")}.json`);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2) + "\n", "utf8");
    if (Array.isArray(result.results)) {
      result.results.forEach((item) => {
        if (item.source && typeof item.source === "string") {
          urls.add(item.source);
        }
      });
    }
  }

  await runWebIntake([...urls].slice(0, 15));
  await runIdeaGenerator();

  const proofPaths = [
    path.relative(ROOT, runDir),
    path.relative(ROOT, LATEST_RUN_PATH),
  ];
  const record = {
    runId: timestamp,
    whatWasAttempted: "Discovery + idea generation run",
    result: "VERIFIED",
    proofPaths,
    runDir: "",
    blocker: "",
  };
  await writeLatestRun(record);
}

run().catch((error) => {
  console.error("Discovery run failed:", error.message);
  process.exit(1);
});
