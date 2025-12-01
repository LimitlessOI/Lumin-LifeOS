// ===FILE:core/governance.js===
import dayjs from "dayjs";
import { pool } from "./database.js"; // Requires core/database.js to be present
import process from "node:process";

// ==================== GLOBAL STATE (Transferred from server.js) ====================
// NOTE: activeConnections, overlayStates, conversationHistory are left in server.js
// as they manage volatile runtime connections, but metrics are moved here.

export let aiPerformanceScores = new Map();
export let dailyIdeas = [];
export let systemSnapshots = [];

export const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  micro_compression_saves: 0,
  roi_ratio: 0,
  revenue_per_task: 0,
  last_reset: dayjs().format("YYYY-MM-DD"),
};

export const compressionMetrics = {
  v2_0_compressions: 0,
  v3_compressions: 0,
  total_bytes_saved: 0,
  total_cost_saved: 0,
};

export const systemMetrics = {
  selfModificationsAttempted: 0,
  selfModificationsSuccessful: 0,
  deploymentsTrigger: 0,
  improvementCyclesRun: 0,
  lastImprovement: null,
  consensusDecisionsMade: 0,
  blindSpotsDetected: 0,
  rollbacksPerformed: 0,
  dailyIdeasGenerated: 0,
};

// ==================== ROI & FINANCIAL TRACKING ====================
export async function loadROIFromDatabase() {
  try {
    const result = await pool.query(
      `SELECT SUM(usd) as total FROM daily_spend WHERE date = $1`,
      [dayjs().format("YYYY-MM-DD")]
    );
    if (result.rows[0]?.total) {
      roiTracker.daily_ai_cost = parseFloat(result.rows[0].total);
    }
  } catch (error) {
    console.error("ROI load error:", error.message);
  }
}

export function updateROI(
  revenue = 0,
  cost = 0,
  tasksCompleted = 0,
  tokensSaved = 0
) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0;
    roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0;
    roiTracker.total_tokens_saved = 0;
    roiTracker.micro_compression_saves = 0;
    roiTracker.last_reset = today;
  }
  roiTracker.daily_revenue += revenue;
  roiTracker.daily_ai_cost += cost;
  roiTracker.daily_tasks_completed += tasksCompleted;
  roiTracker.total_tokens_saved += tokensSaved;
  if (roiTracker.daily_tasks_completed > 0) {
    roiTracker.revenue_per_task =
      roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  }
  if (roiTracker.daily_ai_cost > 0) {
    roiTracker.roi_ratio =
      roiTracker.daily_revenue / roiTracker.daily_ai_cost;
  }
  return roiTracker;
}

export async function getDailySpend(date = dayjs().format("YYYY-MM-DD")) {
  try {
    const result = await pool.query(
      `SELECT usd FROM daily_spend WHERE date = $1`,
      [date]
    );
    return result.rows.length > 0 ? parseFloat(result.rows[0].usd) : 0;
  } catch (error) {
    return 0;
  }
}

export async function updateDailySpend(
  amount,
  date = dayjs().format("YYYY-MM-DD")
) {
  try {
    const current = await getDailySpend(date);
    const newSpend = current + amount;
    await pool.query(
      `INSERT INTO daily_spend (date, usd, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (date) DO UPDATE SET usd = $2, updated_at = now()`,
      [date, newSpend]
    );
    return newSpend;
  } catch (error) {
    return 0;
  }
}

// ==================== MEMORY SYSTEM ====================
export async function storeConversationMemory(
  orchestratorMessage,
  aiResponse,
  context = {}
) {
  try {
    const memId = `mem_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await pool.query(
      `INSERT INTO conversation_memory 
       (memory_id, orchestrator_msg, ai_response, context_metadata, memory_type, ai_member, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        memId,
        orchestratorMessage,
        aiResponse,
        JSON.stringify(context),
        context.type || "conversation",
        context.ai_member || "system",
      ]
    );
    return { memId };
  } catch (error) {
    console.error("❌ Memory store error:", error.message);
    return null;
  }
}

export async function recallConversationMemory(query, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT memory_id, orchestrator_msg, ai_response, ai_member, created_at 
       FROM conversation_memory
       WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
       ORDER BY created_at DESC LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  } catch (error) {
    return [];
  }
}

// ==================== LOSS TRACKING ====================
export async function trackLoss(
  severity,
  whatWasLost,
  whyLost,
  context = {},
  prevention = ""
) {
  try {
    await pool.query(
      `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, prevention_strategy, timestamp)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [severity, whatWasLost, whyLost, JSON.stringify(context), prevention]
    );
    if (severity === "critical") {
      console.error(`🚨 [${severity.toUpperCase()}] ${whatWasLost}`);
      // Snapshot creation must be imported or handled externally
    }
  } catch (error) {
    console.error("Loss tracking error:", error.message);
  }
}

// NOTE: broadcastToAll remains in server.js for now as it manages web sockets (activeConnections)
// but will eventually be moved into a communication module.
// ===END===
