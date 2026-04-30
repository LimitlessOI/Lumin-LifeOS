#!/usr/bin/env node
/**
 * Daily token-efficiency scorecard for TokenSaverOS supervision.
 *
 * Reads system endpoints and prints:
 * - free-tier remaining % (request-budget weighted)
 * - today's token savings % and cost savings
 * - rolling 7-day trend for average token savings %
 *
 * Writes a compact JSONL receipt for continuity:
 *   data/token-efficiency-log.jsonl
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const DEFAULT_BASE = "http://127.0.0.1:3000";
const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  DEFAULT_BASE
).replace(/\/$/, "");

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  "";
const enforceGrade = process.env.TSOS_ENFORCE_TOKEN_GRADE === "1";
const minGrade = (process.env.TSOS_MIN_TOKEN_GRADE || "D").toUpperCase();
const gradeOrder = ["A", "B", "C", "D", "F"];

function pct(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return (part / total) * 100;
}

function fixedOrNull(n, digits = 1) {
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
}

async function getJson(endpoint) {
  const res = await fetch(`${base}${endpoint}`, {
    headers: {
      accept: "application/json",
      ...(key ? { "x-command-key": key } : {}),
    },
  });
  const txt = await res.text();
  let json = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok && (!json || json.ok !== false), json, text: txt };
}

function computeFreeTierRemaining(freeTierJson) {
  const providers = freeTierJson?.providers || {};
  let used = 0;
  let limit = 0;
  let remaining = 0;
  for (const val of Object.values(providers)) {
    const req = val?.requests;
    if (!req || !Number.isFinite(req.limit) || req.limit <= 0) continue;
    used += Number(req.used || 0);
    limit += Number(req.limit || 0);
    remaining += Math.max(0, Number(req.remaining || 0));
  }
  const usedPct = pct(used, limit);
  const remainingPct = pct(remaining, limit);
  return {
    providerCountTracked: Object.keys(providers).length,
    requestBudgetUsedPct: fixedOrNull(usedPct),
    requestBudgetRemainingPct: fixedOrNull(remainingPct),
    requestBudgetUsed: used,
    requestBudgetLimit: limit,
    requestBudgetRemaining: remaining,
  };
}

function computeTrend(historyJson) {
  const rows = Array.isArray(historyJson?.history) ? historyJson.history : [];
  const latest = rows[0] || null;
  const prev = rows[1] || null;
  const week = rows.slice(0, 7);
  const weekAvg =
    week.length > 0
      ? week.reduce((acc, r) => acc + Number(r.avg_savings_pct || 0), 0) / week.length
      : null;
  const dayDelta =
    latest && prev
      ? Number(latest.avg_savings_pct || 0) - Number(prev.avg_savings_pct || 0)
      : null;
  return {
    todayAvgSavingsPct: fixedOrNull(Number(latest?.avg_savings_pct ?? 0)),
    yesterdayAvgSavingsPct: prev ? fixedOrNull(Number(prev.avg_savings_pct || 0)) : null,
    dayOverDayDeltaPct: fixedOrNull(dayDelta),
    rolling7dAvgSavingsPct: fixedOrNull(weekAvg),
  };
}

function calculateEfficiencyGrade(freeTier, tokens, trend) {
  const todayAvg = Number(tokens?.today?.avgSavingsPct || 0);
  const remaining = Number(freeTier?.requestBudgetRemainingPct || 0);
  const delta = Number(trend?.dayOverDayDeltaPct || 0);

  const savingsComponent = Math.min(60, Math.max(0, (todayAvg / 30) * 60));
  const remainingComponent = Math.min(25, Math.max(0, (remaining / 95) * 25));
  const trendComponent = delta >= 2 ? 15 : delta >= 0 ? 10 : delta >= -2 ? 5 : 0;
  const score = fixedOrNull(savingsComponent + remainingComponent + trendComponent, 1) || 0;

  let grade = "F";
  if (score >= 85) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 55) grade = "C";
  else if (score >= 40) grade = "D";

  return {
    score,
    grade,
    components: {
      savings: fixedOrNull(savingsComponent, 1),
      remaining: fixedOrNull(remainingComponent, 1),
      trend: trendComponent,
    },
  };
}

function gradePasses(grade, minimum) {
  const iGrade = gradeOrder.indexOf(grade);
  const iMin = gradeOrder.indexOf(minimum);
  if (iGrade < 0 || iMin < 0) return false;
  return iGrade <= iMin;
}

function printSummary(freeTier, tokens, trend, efficiency) {
  const today = tokens?.today || {};
  console.log("TokenSaverOS token-efficiency scorecard");
  console.log("==================================");
  console.log(`Base URL: ${base}`);
  console.log(`Auth key loaded: ${key ? "yes (hidden)" : "no"}`);
  console.log("");
  console.log("Free-tier budget");
  console.log(
    `- Remaining: ${freeTier.requestBudgetRemainingPct ?? "n/a"}% (${freeTier.requestBudgetRemaining}/${freeTier.requestBudgetLimit} requests)`
  );
  console.log(
    `- Used:      ${freeTier.requestBudgetUsedPct ?? "n/a"}% (${freeTier.requestBudgetUsed}/${freeTier.requestBudgetLimit} requests)`
  );
  console.log("");
  console.log("Token efficiency (today)");
  console.log(`- Avg token savings: ${fixedOrNull(Number(today.avgSavingsPct || 0)) ?? "n/a"}%`);
  console.log(`- Saved tokens:      ${Number(today.savedTokens || 0)}`);
  console.log(`- Cost saved (USD):  ${fixedOrNull(Number(today.savedCostUSD || 0), 6) ?? "n/a"}`);
  console.log(`- Free calls:        ${Number(today.freeCalls || 0)}`);
  console.log("");
  console.log("Trend");
  console.log(`- 7d avg savings:    ${trend.rolling7dAvgSavingsPct ?? "n/a"}%`);
  console.log(`- Day-over-day:      ${trend.dayOverDayDeltaPct ?? "n/a"}%`);
  console.log("");
  console.log("Efficiency grade");
  console.log(`- Grade:             ${efficiency.grade}`);
  console.log(`- Score:             ${efficiency.score}/100`);
  console.log(
    `- Components:        savings=${efficiency.components.savings} remaining=${efficiency.components.remaining} trend=${efficiency.components.trend}`
  );
  if (enforceGrade) {
    console.log(`- Gate mode:         enforced (minimum ${minGrade})`);
  } else {
    console.log(`- Gate mode:         observe-only (set TSOS_ENFORCE_TOKEN_GRADE=1 to enforce)`);
  }
}

function appendLog(record) {
  const dir = path.join(ROOT, "data");
  const file = path.join(dir, "token-efficiency-log.jsonl");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
  } catch (e) {
    console.warn("[token-efficiency] could not append local log:", e?.message || e);
  }
}

async function main() {
  const freeTierRes = await getJson("/api/v1/twin/free-tier");
  const tokensRes = await getJson("/api/v1/twin/tokens");
  const historyRes = await getJson("/api/v1/twin/tokens/history");

  if (!freeTierRes.ok || !tokensRes.ok || !historyRes.ok) {
    console.error(
      `Token efficiency probes failed: free-tier=${freeTierRes.status} tokens=${tokensRes.status} history=${historyRes.status}`
    );
    process.exit(1);
  }

  const freeTier = computeFreeTierRemaining(freeTierRes.json);
  const trend = computeTrend(historyRes.json);
  const efficiency = calculateEfficiencyGrade(freeTier, tokensRes.json, trend);
  printSummary(freeTier, tokensRes.json, trend, efficiency);

  appendLog({
    ts: new Date().toISOString(),
    base,
    freeTier,
    today: tokensRes.json?.today || {},
    trend,
    efficiency,
    policy: { enforceGrade, minGrade },
  });

  if (enforceGrade && !gradePasses(efficiency.grade, minGrade)) {
    console.error(
      `Token efficiency gate failed: grade ${efficiency.grade} below minimum ${minGrade}.`
    );
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
