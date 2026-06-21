#!/usr/bin/env node
/**
 * SYNOPSIS: S6 — Founder Decoder / Calm Console v0
 * S6 — Founder Decoder / Calm Console v0
 *
 * Reads existing runtime data and renders plain-English operator modes.
 * No new schema, no new daemon, no governance logic.
 *
 * Modes:
 *   --calm       One-sentence-per-item. Good for: "is anything on fire?"
 *   --strategic  Progress in the big picture. Good for: "what should I work on?"
 *   --engineer   Raw counts and system signals. Good for: "what is the system doing?"
 *   --crisis     Lead with what's wrong. Good for: "something looks bad, what is it?"
 *
 * Usage:
 *   node scripts/founder-decoder.mjs --calm
 *   npm run founder:calm
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Data readers ──────────────────────────────────────────────────────────────

async function readJSON(rel) {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, rel), 'utf8'));
  } catch {
    return null;
  }
}

async function readJSONL(rel) {
  try {
    const raw = await fs.readFile(path.join(ROOT, rel), 'utf8');
    return raw.split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

async function gatherState() {
  const [
    daemonMain,
    daemonSite,
    daemonTc,
    lastRun,
    quarantined,
    quarantineCleared,
    failurePatterns,
    runtimeReality,
    predLines,
  ] = await Promise.all([
    readJSON('data/builder-daemon-state.json'),
    readJSON('data/builder-daemon-state.site-builder-autonomous-queue.json'),
    readJSON('data/builder-daemon-state.tc-service-builder-queue.json'),
    readJSON('data/builder-continuous-queue-last-run.json'),
    readJSON('data/quarantined-tasks.json'),
    readJSON('data/quarantine-cleared-tasks.json'),
    readJSON('data/builder-failure-patterns.json'),
    readJSON('data/runtime-reality-snapshot.json'),
    readJSONL('data/prediction-loop.jsonl'),
  ]);

  // Daemon health
  const daemons = [
    { name: 'site-builder', state: daemonSite },
    { name: 'tc-service', state: daemonTc },
    { name: 'main', state: daemonMain },
  ].filter((d) => d.state);

  const daemonsDegraded = daemons.filter((d) => d.state.status === 'degraded');
  const daemonsOk = daemons.filter((d) => d.state.status !== 'degraded');

  // Detect if all degraded daemons share the same root cause (same failure signature prefix)
  const degradedSigs = daemonsDegraded.map((d) => (d.state.lastFailureSignature || '').slice(0, 80));
  const allSameRootCause = daemonsDegraded.length > 1 && new Set(degradedSigs).size === 1;

  // Quarantine — handles both list and object formats
  const quarantineList = Array.isArray(quarantined)
    ? quarantined
    : quarantined ? Object.values(quarantined) : [];
  const clearedIds = new Set((Array.isArray(quarantineCleared) ? quarantineCleared : []).map((e) => e.task_id));
  const quarantineActive = quarantineList.filter((e) => !clearedIds.has(e.task_id));
  const quarantineClearedCount = quarantineList.filter((e) => clearedIds.has(e.task_id)).length;

  // Failure patterns (escalation levels) — handles object format
  const failureEntries = failurePatterns ? Object.values(failurePatterns) : [];
  const highEscalation = failureEntries.filter((e) => !e.resolved && (e.escalationLevel || 0) >= 2);
  const level3 = failureEntries.filter((e) => !e.resolved && (e.escalationLevel || 0) >= 3);

  // Prediction loop
  const predRecorded = predLines.filter((l) => l.event === 'prediction_recorded');
  const predEvaluated = predLines.filter((l) => l.event === 'prediction_evaluated');
  const predMatches = predEvaluated.filter((l) => l.prediction_match === true);
  const predMisses = predEvaluated.filter((l) => l.prediction_match === false);
  const predMatchPct = predEvaluated.length > 0 ? Math.round((predMatches.length / predEvaluated.length) * 100) : null;

  // Last run
  const lastRunOk = lastRun?.ok === true;
  const lastRunLane = lastRun?.lane || 'unknown';
  const lastRunCommits = lastRun?.build_commits || 0;
  const lastRunIdleSlice = lastRun?.idle_slice === true;
  const lastRunFinishedAt = lastRun?.finished_at || null;
  const minutesSinceLastRun = lastRunFinishedAt
    ? Math.round((Date.now() - new Date(lastRunFinishedAt).getTime()) / 60000)
    : null;

  // Git sync
  const gitSync = runtimeReality?.GIT_SYNC;
  const gitBehind = gitSync?.behind_origin_main === true;

  // Daemon failure signature (what's causing repeated failures)
  const worstDaemon = daemonsDegraded.sort((a, b) => (b.state.failureSignatureStreak || 0) - (a.state.failureSignatureStreak || 0))[0];
  const failureSignature = worstDaemon?.state?.lastFailureSignature || null;
  const failureStreak = worstDaemon?.state?.failureSignatureStreak || 0;

  return {
    daemons, daemonsDegraded, daemonsOk, allSameRootCause,
    quarantineActive, quarantineClearedCount,
    failureEntries, highEscalation, level3,
    predRecorded, predEvaluated, predMatches, predMisses, predMatchPct,
    lastRunOk, lastRunLane, lastRunCommits, lastRunIdleSlice, minutesSinceLastRun,
    gitBehind,
    worstDaemon, failureSignature, failureStreak,
    runtimeReality,
  };
}

// ── Mode renderers ────────────────────────────────────────────────────────────

function renderCalm(s) {
  const lines = ['╔══════════════════════════════════════╗',
                 '║  FOUNDER DECODER — CALM MODE         ║',
                 '╚══════════════════════════════════════╝', ''];

  // Health headline
  if (s.daemonsDegraded.length === 0) {
    lines.push('✅  All daemons running normally.');
  } else if (s.allSameRootCause && s.failureSignature) {
    // All degraded daemons share the same root cause — describe once
    const sig = s.failureSignature.slice(0, 120).replace(/\n/g, ' ');
    lines.push(`⚠   All daemons cycling through one shared issue (streak ${s.failureStreak}): "${sig}..."`);
    lines.push('    The queue is still advancing — tasks are completing.');
  } else if (s.daemonsDegraded.length === 1 && s.failureSignature) {
    const sig = s.failureSignature.slice(0, 120).replace(/\n/g, ' ');
    lines.push(`⚠   One daemon is cycling through a known issue (${s.worstDaemon?.name}, streak ${s.failureStreak}): "${sig}..."`);
    lines.push('    The queue is still advancing — tasks are completing.');
  } else {
    lines.push(`⚠   ${s.daemonsDegraded.length} daemons are degraded. Run --crisis for details.`);
  }

  // Last activity
  if (s.minutesSinceLastRun !== null) {
    lines.push(`⏱   Last queue run: ${s.minutesSinceLastRun} minute${s.minutesSinceLastRun !== 1 ? 's' : ''} ago (${s.lastRunLane}).`);
  }

  // Prediction signal
  if (s.predMatchPct !== null) {
    lines.push(`🎯  Prediction accuracy: ${s.predMatchPct}% (${s.predMatches.length}/${s.predEvaluated.length} outcomes matched expectation).`);
  }

  // Quarantine
  if (s.quarantineActive.length > 0) {
    lines.push(`📦  ${s.quarantineActive.length} task${s.quarantineActive.length !== 1 ? 's' : ''} quarantined (auto-skipped by queue, ${s.quarantineClearedCount} cleared).`);
  } else {
    lines.push(`📦  No tasks in active quarantine (${s.quarantineClearedCount} cleared).`);
  }

  // Git
  if (s.gitBehind) {
    lines.push('⚠   Repo is behind origin/main — run git pull.');
  }

  lines.push('');
  lines.push('For more detail: --strategic | --engineer | --crisis');
  return lines.join('\n');
}

function renderStrategic(s) {
  const lines = ['╔══════════════════════════════════════╗',
                 '║  FOUNDER DECODER — STRATEGIC MODE    ║',
                 '╚══════════════════════════════════════╝', ''];

  lines.push('## Build sequence (Brainstorm Phase 2)');
  lines.push('  C21  ✅  Autonomy write lock — self-collision prevented');
  lines.push('  S2   ✅  Memory bootstrap — lessons_learned seeded, cold-start reader wired');
  lines.push('  S3   ✅  Build closure contract — every task exit is typed + provable');
  lines.push('  S4   ✅  Task DNA v0 — queue tasks have optional lineage fields');
  lines.push('  S5   ✅  Prediction loop — prediction→outcome→evaluation live (95% match)');
  lines.push('  S6   ✅  Founder Decoder — operator console (you are reading it)');
  lines.push('  S7   —   Next: Adam to confirm scope');
  lines.push('');

  lines.push('## Prediction loop signal');
  if (s.predMatchPct !== null) {
    lines.push(`  ${s.predEvaluated.length} evaluations | ${s.predMatchPct}% match rate`);
    if (s.predMisses.length > 0) {
      const reasonCounts = {};
      for (const m of s.predMisses) { const r = m.miss_reason || 'unknown'; reasonCounts[r] = (reasonCounts[r] || 0) + 1; }
      for (const [r, c] of Object.entries(reasonCounts)) lines.push(`    ${c}x miss: ${r.slice(0, 80)}`);
    }
  } else {
    lines.push('  No prediction data yet — run a queue cycle first.');
  }
  lines.push('');

  lines.push('## Queue health');
  lines.push(`  Last run: ${s.lastRunLane}, ${s.minutesSinceLastRun ?? '?'}m ago, ${s.lastRunOk ? 'ok' : 'FAILED'}`);
  if (s.quarantineActive.length > 0) {
    lines.push(`  Quarantine: ${s.quarantineActive.length} active (auto-skipped), ${s.quarantineClearedCount} cleared`);
  } else {
    lines.push(`  Quarantine: clean (${s.quarantineClearedCount} cleared)`);
  }
  lines.push('');

  lines.push('## System posture');
  const allOk = s.daemonsDegraded.length === 0 && !s.gitBehind && s.quarantineActive.length < 5;
  lines.push(allOk
    ? '  POSTURE: BUILDING — system is executing the approved backlog.'
    : '  POSTURE: RECOVERING — some signals need attention before pushing new scope.');

  return lines.join('\n');
}

function renderEngineer(s) {
  const lines = ['╔══════════════════════════════════════╗',
                 '║  FOUNDER DECODER — ENGINEER MODE     ║',
                 '╚══════════════════════════════════════╝', ''];

  lines.push('## Daemons');
  for (const d of s.daemons) {
    const st = d.state;
    const pct = st.cyclesTotal > 0 ? Math.round((st.cyclesOk / st.cyclesTotal) * 100) : 0;
    const streak = st.failureSignatureStreak || 0;
    lines.push(`  ${d.name}: ${st.status} | cycles ${st.cyclesOk}/${st.cyclesTotal} ok (${pct}%)${streak > 0 ? ` | streak ${streak}` : ''}`);
  }
  lines.push('');

  lines.push('## Queue last run');
  lines.push(`  lane: ${s.lastRunLane}`);
  lines.push(`  ok: ${s.lastRunOk} | idle: ${s.lastRunIdleSlice} | commits: ${s.lastRunCommits} | ${s.minutesSinceLastRun ?? '?'}m ago`);
  lines.push('');

  lines.push('## Quarantine');
  const quarantineTotal = s.quarantineActive.length + s.quarantineClearedCount;
  lines.push(`  total: ${quarantineTotal} | active: ${s.quarantineActive.length} | cleared: ${s.quarantineClearedCount}`);
  if (s.quarantineActive.length > 0) {
    for (const e of s.quarantineActive.slice(0, 5)) {
      lines.push(`    ${e.task_id} | ${e.lane} | count ${e.failure_count || '?'}`);
    }
    if (s.quarantineActive.length > 5) lines.push(`    ... and ${s.quarantineActive.length - 5} more`);
  }
  lines.push('');

  lines.push('## Failure patterns (escalation)');
  if (s.failureEntries.length === 0) {
    lines.push('  none');
  } else {
    const active = s.failureEntries.filter((e) => !e.resolved);
    const byLevel = [0, 1, 2, 3].map((l) => active.filter((e) => (e.escalationLevel || 0) === l).length);
    lines.push(`  active: ${active.length} | L0: ${byLevel[0]} L1: ${byLevel[1]} L2: ${byLevel[2]} L3: ${byLevel[3]}`);
    for (const e of s.highEscalation.slice(0, 3)) {
      lines.push(`    ${e.taskId} L${e.escalationLevel} count=${e.count}`);
    }
  }
  lines.push('');

  lines.push('## Prediction loop');
  lines.push(`  recorded: ${s.predRecorded.length} | evaluated: ${s.predEvaluated.length} | matches: ${s.predMatches.length} | misses: ${s.predMisses.length}`);
  if (s.predMatchPct !== null) lines.push(`  match rate: ${s.predMatchPct}%`);
  lines.push('');

  lines.push('## Git / runtime');
  const sha = s.runtimeReality?.COMMIT_SHA?.slice(0, 8) || '?';
  lines.push(`  commit: ${sha} | behind origin: ${s.gitBehind} | drift: ${s.runtimeReality?.DRIFT_SEVERITY_HINT || '?'}`);
  if (s.worstDaemon && s.failureStreak > 0) {
    lines.push(`  worst failure sig: "${(s.failureSignature || '').slice(0, 100)}..."`);
  }

  return lines.join('\n');
}

function renderCrisis(s) {
  const lines = ['╔══════════════════════════════════════╗',
                 '║  FOUNDER DECODER — CRISIS MODE       ║',
                 '╚══════════════════════════════════════╝', ''];

  const issues = [];

  // Daemons
  for (const d of s.daemonsDegraded) {
    const streak = d.state.failureSignatureStreak || 0;
    const sig = (d.state.lastFailureSignature || '').replace(/\n/g, ' ').slice(0, 140);
    issues.push({ severity: streak > 20 ? 'HIGH' : 'WARN', text: `Daemon ${d.name} DEGRADED (streak ${streak}): ${sig}...` });
  }

  // Level-3 failures
  for (const e of s.level3) {
    issues.push({ severity: 'HIGH', text: `L3 failure pattern: ${e.taskId} (${e.count} cumulative, auto-quarantined)` });
  }

  // Quarantine
  if (s.quarantineActive.length >= 5) {
    issues.push({ severity: 'WARN', text: `${s.quarantineActive.length} tasks in active quarantine — queue is skipping them (${s.quarantineClearedCount} cleared)` });
  }

  // Git
  if (s.gitBehind) {
    issues.push({ severity: 'WARN', text: 'Repo is behind origin/main — local tools may act on stale data' });
  }

  // Prediction misses > 20%
  if (s.predMatchPct !== null && s.predMatchPct < 80 && s.predEvaluated.length >= 10) {
    issues.push({ severity: 'WARN', text: `Prediction accuracy low: ${s.predMatchPct}% (${s.predMisses.length} misses) — builder outcome less predictable than expected` });
  }

  // Last run failed
  if (!s.lastRunOk) {
    issues.push({ severity: 'HIGH', text: `Last queue run FAILED (${s.lastRunLane})` });
  }

  if (issues.length === 0) {
    lines.push('✅  No crisis signals. System appears stable.');
    lines.push('    Run --engineer for full technical detail.');
    return lines.join('\n');
  }

  for (const issue of issues) {
    const icon = issue.severity === 'HIGH' ? '🔴' : '🟡';
    lines.push(`${icon}  [${issue.severity}] ${issue.text}`);
  }
  lines.push('');

  // What is NOT broken
  lines.push('## What is still working:');
  if (s.daemonsOk.length > 0) lines.push(`  ✅ ${s.daemonsOk.map((d) => d.name).join(', ')} daemon${s.daemonsOk.length > 1 ? 's' : ''} ok`);
  if (s.lastRunOk) lines.push(`  ✅ Queue last run ok (${s.lastRunLane})`);
  if (s.predMatchPct !== null && s.predMatchPct >= 80) lines.push(`  ✅ Prediction accuracy ${s.predMatchPct}%`);
  if (!s.gitBehind) lines.push('  ✅ Repo in sync with origin/main');
  if (s.quarantineActive.length < 5) lines.push(`  ✅ Active quarantine low (${s.quarantineActive.length}, ${s.quarantineClearedCount} cleared)`);

  return lines.join('\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.find((a) => ['--calm', '--strategic', '--engineer', '--crisis'].includes(a));

if (!mode) {
  console.log('Usage: node scripts/founder-decoder.mjs --calm | --strategic | --engineer | --crisis');
  console.log('');
  console.log('  --calm       "Is anything on fire?"');
  console.log('  --strategic  "What should I work on next?"');
  console.log('  --engineer   "What is the system actually doing?"');
  console.log('  --crisis     "Something looks wrong — what is it?"');
  process.exit(0);
}

const state = await gatherState();

switch (mode) {
  case '--calm':      console.log(renderCalm(state)); break;
  case '--strategic': console.log(renderStrategic(state)); break;
  case '--engineer':  console.log(renderEngineer(state)); break;
  case '--crisis':    console.log(renderCrisis(state)); break;
}
