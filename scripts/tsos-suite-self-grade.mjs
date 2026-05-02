#!/usr/bin/env node
/**
 * Deterministic 1–10 self-grade helpers for `npm run tsos:builder` (builder-operator-suite).
 * Not an LLM opinion — maps exit codes + JSON receipts (doctor / tokens / operational / daemon state).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from "node:fs";
import path from "node:path";

/** Map child exit code to 1–10 when no richer receipt exists. */
export function gradeFromExitSimple(code) {
  if (code === 0) return { grade10: 10, basis: "exit_0" };
  if (code === 2) return { grade10: 2, basis: "exit_2" };
  return { grade10: 4, basis: `exit_${code}` };
}

/** Scale 0–100 score to 1–10 (same semantics as “X/100 → tenths”). */
export function score100ToGrade10(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return { grade10: 1, basis: "invalid_score" };
  const g = Math.min(10, Math.max(1, Math.round(n / 10)));
  return { grade10: g, basis: `score_${Math.round(n)}_of_100` };
}

/**
 * @param {string} root - repo root
 * @returns {{ grade10: number, basis: string } | null}
 */
export function doctorGradeFromReceipt(root) {
  const p = path.join(root, "data", "tsos-doctor-last-run.json");
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const s = Number(j.score);
    if (!Number.isFinite(s)) return null;
    return score100ToGrade10(s);
  } catch {
    return null;
  }
}

/**
 * Last JSONL line from token-efficiency run (written by tsos-token-efficiency.mjs).
 */
export function tokenEfficiencyGradeFromLog(root) {
  const p = path.join(root, "data", "token-efficiency-log.jsonl");
  if (!fs.existsSync(p)) return null;
  try {
    const lines = fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
    if (!lines.length) return null;
    const j = JSON.parse(lines[lines.length - 1]);
    const s = Number(j.efficiency?.score);
    if (!Number.isFinite(s)) return null;
    return score100ToGrade10(s);
  } catch {
    return null;
  }
}

export function operationalGradeFromReceipt(root) {
  const p = path.join(root, "data", "lifeos-operational-grade-last-run.json");
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const s = Number(j.score);
    if (!Number.isFinite(s)) return null;
    return score100ToGrade10(s);
  } catch {
    return null;
  }
}

/**
 * Daemon leg — prefers **recent** cycle outcomes from JSONL (rolling window) when enough events exist.
 * Lifetime totals alone punish ancient failures forever; rolling reflects **current** autonomy health (honest, not amnesia).
 *
 * Env: `TSOS_DAEMON_GRADE_WINDOW` — max cycle_ok/cycle_failed events to scan from end of log (default **40**).
 */
export function daemonObservabilityGrade(statePath, root) {
  const windowCap = Math.min(80, Math.max(8, parseInt(process.env.TSOS_DAEMON_GRADE_WINDOW || "40", 10) || 40));
  let resolvedLog = null;
  if (root) {
    const p = path.join(root, "data", "builder-daemon-log.jsonl");
    if (fs.existsSync(p)) resolvedLog = p;
  }

  let rollOk = 0;
  let rollFail = 0;
  if (resolvedLog) {
    try {
      const lines = fs.readFileSync(resolvedLog, "utf8").trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0 && rollOk + rollFail < windowCap; i--) {
        try {
          const e = JSON.parse(lines[i]);
          if (e.event === "cycle_ok") rollOk++;
          else if (e.event === "cycle_failed") rollFail++;
        } catch {
          /* skip bad line */
        }
      }
    } catch {
      /* fall through to lifetime */
    }
  }

  const rollTotal = rollOk + rollFail;
  if (rollTotal >= 8) {
    const ratio = rollOk / rollTotal;
    const grade10 = Math.min(10, Math.max(1, Math.round(ratio * 10)));
    return {
      grade10,
      basis: `daemon_recent_${rollTotal}x_ok_${(ratio * 100).toFixed(0)}pct`,
    };
  }

  if (!fs.existsSync(statePath)) {
    return { grade10: 8, basis: "no_local_daemon_state" };
  }
  try {
    const st = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const ok = Number(st.cyclesOk || 0);
    const fail = Number(st.cyclesFailed || 0);
    const total = ok + fail;
    if (total <= 0) return { grade10: 9, basis: "daemon_state_empty_cycles" };
    const ratio = ok / total;
    const grade10 = Math.min(10, Math.max(1, Math.round(ratio * 10)));
    return {
      grade10,
      basis: `daemon_lifetime_ok_${(ratio * 100).toFixed(0)}pct`,
    };
  } catch {
    return { grade10: 5, basis: "daemon_state_unreadable" };
  }
}

export function printStepSelfGrade(stepLabel, { grade10, basis }) {
  console.log(`\n→ Step self-grade (1–10): ${grade10}/10 — ${stepLabel} (${basis})\n`);
}

export function averageGrade10(grades) {
  const g = grades.filter((x) => Number.isFinite(x));
  if (!g.length) return null;
  const sum = g.reduce((a, b) => a + b, 0);
  return Math.round((sum / g.length) * 10) / 10;
}
