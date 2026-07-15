/**
 * SYNOPSIS: Benchmark chair communication models against a founder-style prompt.
 *
 * Tests each configured council member on a realistic mixed-intent founder message,
 * scores the response for commitment extraction, build-intent recognition,
 * daily-activity handling, and natural tone, and writes a winner recommendation.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDbPool } from "../services/db.js";
import { createCouncilService } from "../services/council-service.js";
import {
  COUNCIL_ALIAS_MAP,
  createCouncilMembers,
} from "../config/council-members.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEMBERS = ["openai_gpt", "deepseek", "gemini_flash", "claude_sonnet"];

const PROMPT =
  "I told Jordan I'd call him at 3pm tomorrow and I want to build a habit tracker in LifeOS so I don't forget. Also, what have I actually gotten done today?";

function envNum(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

function envStr(name, fallback) {
  return process.env[name] ?? fallback;
}

function scoreResponse(text = "") {
  const t = text.toLowerCase();
  return {
    commitment_extracted: /jordan/.test(t) && /(3pm|3 pm|tomorrow|call)/.test(t),
    build_intent_recognized: /habit tracker/.test(t) || /build|create|add|make/.test(t),
    daily_activity_asked_or_answered:
      /done today|gotten done|worked on|accomplished|today/.test(t),
    natural_tone: !/(mission|priority|point b|blueprint|strategic brief)/.test(t),
  };
}

function aggregateScore({ rubric, latencyMs, costUSD }) {
  const hits = Object.values(rubric).filter(Boolean).length;
  let s = hits * 25;
  s -= Math.min(latencyMs / 1000, 20); // up to -20 for slow responses
  s -= Math.min((costUSD || 0) * 100, 10); // up to -10 for expensive responses
  return Math.max(0, Math.round(s));
}

async function main() {
  const outputPath = process.argv[2] || "data/benchmark-chair-communication.json";
  const pool = createDbPool({
    validatedDatabaseUrl: process.env.DATABASE_URL,
    DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
  });

  const councilService = createCouncilService({
    pool,
    COUNCIL_MEMBERS: createCouncilMembers({
      DEEPSEEK_BRIDGE_ENABLED: process.env.DEEPSEEK_BRIDGE_ENABLED,
    }),
    COUNCIL_ALIAS_MAP,
    MAX_DAILY_SPEND: envNum("MAX_DAILY_SPEND", 1000),
    COST_SHUTDOWN_THRESHOLD: envNum("COST_SHUTDOWN_THRESHOLD", 900),
    NODE_ENV: envStr("NODE_ENV", "development"),
    RAILWAY_ENVIRONMENT: envStr("RAILWAY_ENVIRONMENT", ""),
    COUNCIL_TIMEOUT_MS: envNum("COUNCIL_TIMEOUT_MS", 60000),
    COUNCIL_PING_TIMEOUT_MS: envNum("COUNCIL_PING_TIMEOUT_MS", 10000),
    compressionMetrics: {},
    roiTracker: {},
    systemMetrics: {},
    getOpenSourceCouncil: () => null,
    providerCooldowns: new Map(),
    getSourceOfTruthManager: () => null,
    updateROI: () => {},
    trackAIPerformance: async () => {},
    notifyCriticalIssue: async () => {},
    savingsLedger: null,
    tokenAccounting: null,
  });

  const { callCouncilMember } = councilService;
  const results = [];

  for (const member of MEMBERS) {
    const startedAt = Date.now();
    let result = null;
    let error = null;
    try {
      result = await callCouncilMember(member, PROMPT, {
        taskType: "conversation",
        founderComms: true,
        returnObject: true,
        maxOutputTokens: 600,
      });
    } catch (err) {
      error = { message: err.message, code: err.code };
    }
    const latencyMs = Date.now() - startedAt;
    const actualMember = result?.member || member;
    const cascaded = actualMember !== member;
    const text = result?.text || result?.content || "";
    const usage = result?.usage || {};
    const costUSD = result?.estimated_usd ?? result?.usage?.estimated_usd ?? 0;
    const realError = cascaded
      ? { message: `requested ${member} but provider cascaded to ${actualMember}`, code: "CASCADED" }
      : error;
    const rubric = realError ? {} : scoreResponse(text);
    const row = {
      member,
      actual_member: actualMember,
      cascaded,
      ok: Boolean(result) && !realError,
      error: realError,
      latency_ms: latencyMs,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      estimated_usd: costUSD,
      text,
      rubric,
      score: realError ? 0 : aggregateScore({ rubric, latencyMs, costUSD }),
    };
    results.push(row);
    console.log(`[BENCH] ${member}: actual=${actualMember} ok=${row.ok} score=${row.score} latency=${latencyMs}ms tokens=${row.total_tokens} cost=$${row.estimated_usd.toFixed(6)}`);
    if (realError) {
      console.log(`        error: ${realError.message}`);
    }
  }

  // Rank by score, then latency, then cost. Only members that ran on their own
  // provider (not cascaded) count for the recommendation.
  const successful = results.filter((r) => r.ok && !r.cascaded);
  const ranked = [...successful].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.latency_ms !== b.latency_ms) return a.latency_ms - b.latency_ms;
    return a.estimated_usd - b.estimated_usd;
  });

  const failed = results.filter((r) => !r.ok);
  const recommendedCascade = [
    ...ranked.map((r) => r.member),
    ...failed.map((r) => r.member),
  ];

  const recommendation = {
    winner: ranked[0]?.member || null,
    recommended_cascade: recommendedCascade,
    prompt: PROMPT,
    run_at: new Date().toISOString(),
    results,
    ranked,
    recommendation_text: ranked.length
      ? `For chair communication, the recommended working cascade is ${recommendedCascade.join(
          " → "
        )}. Set CHAIR_DIRECT_AGENT_CASCADE to this order. Members after the first failure marker are not currently reachable and should be fixed (add API key/credits) before relying on them.`
      : "No council members succeeded. Check API keys, credits, and network connectivity.",
  };

  await fs.mkdir(path.dirname(path.resolve(ROOT, outputPath)), { recursive: true });
  await fs.writeFile(
    path.resolve(ROOT, outputPath),
    JSON.stringify(recommendation, null, 2),
    "utf8"
  );

  console.log("\n" + recommendation.recommendation_text);
  console.log(`Benchmark written to ${outputPath}`);

  await pool.end?.().catch(() => {});
}

main().catch((err) => {
  console.error("[BENCH] fatal:", err.message);
  process.exit(1);
});
