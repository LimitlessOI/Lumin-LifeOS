#!/usr/bin/env node
/**
 * Local Cursor-backed pre-push review.
 *
 * Purpose:
 * - run an AI bug pass on the exact git range being pushed
 * - fail closed only when explicitly configured to do so
 * - save the raw review artifact locally for operator inspection
 *
 * Modes via CURSOR_PRE_PUSH_REVIEW:
 * - off    → skip entirely
 * - warn   → run if possible, never block push on findings/auth issues
 * - strict → block push on review failure or block-level findings
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const REPORT_PATH = path.join(DATA_DIR, 'cursor-pre-push-review.last.json');
const MEMORY_BASE = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ''
).replace(/\/$/, '');
const MEMORY_KEY =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

function argValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function warn(msg) {
  process.stderr.write(`${msg}\n`);
}

function commandExists(cmd) {
  const res = spawnSync('sh', ['-lc', `command -v ${cmd} >/dev/null 2>&1`], { cwd: ROOT });
  return res.status === 0;
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function extractJson(raw) {
  const text = String(raw || '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = text.slice(first, last + 1);
  return JSON.parse(candidate);
}

function normalizeMode(value) {
  const mode = String(value || 'warn').toLowerCase();
  if (mode === 'off' || mode === 'warn' || mode === 'strict') return mode;
  return 'warn';
}

function getChangedFiles(range) {
  return git(['diff', '--name-only', range])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function writeReport(payload) {
  ensureDataDir();
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function printFindings(findings) {
  for (const finding of findings.slice(0, 8)) {
    const sev = String(finding.severity || 'unknown').toUpperCase();
    const file = finding.file || 'unknown-file';
    const issue = finding.issue || 'unspecified issue';
    const hint = finding.line_hint ? ` (${finding.line_hint})` : '';
    warn(`   ${sev}: ${file}${hint} — ${issue}`);
  }
}

function mapSeverity(severity) {
  const value = String(severity || '').toLowerCase();
  if (value === 'critical') return 'critical';
  if (value === 'high') return 'high';
  if (value === 'low') return 'low';
  return 'medium';
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-command-key': MEMORY_KEY,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function sendMemoryReceipts({ status, summary, findings, range, changedFiles }) {
  if (!MEMORY_BASE || !MEMORY_KEY) return { skipped: true, reason: 'missing_base_or_key' };

  const taskType = 'cursor.pre_push_review';
  const agentId = 'cursor-agent';
  const outcome = status === 'block' ? 'incorrect' : findings.length ? 'partial' : 'correct';
  const notes = `${summary} | range=${range} | files=${changedFiles.join(', ')}`.slice(0, 1900);

  const perf = await postJson(`${MEMORY_BASE}/api/v1/memory/agents/performance`, {
    agentId,
    taskType,
    outcome,
    notes,
  });

  const severeFindings = findings.filter((f) => {
    const sev = mapSeverity(f.severity);
    return sev === 'critical' || sev === 'high' || status === 'block';
  });

  const violations = [];
  for (const finding of severeFindings.slice(0, 5)) {
    const sev = mapSeverity(finding.severity);
    const file = finding.file || 'unknown-file';
    const details = `${finding.issue || 'issue'} | ${finding.why || ''}`.slice(0, 1900);
    const evidenceText = `range=${range} file=${file} hint=${finding.line_hint || ''} fix=${finding.fix || ''}`.slice(0, 1900);
    const result = await postJson(`${MEMORY_BASE}/api/v1/memory/agents/violations`, {
      agentId,
      taskType,
      violationType: status === 'block' ? 'blocking_bug_finding' : 'high_risk_bug_finding',
      severity: sev,
      details,
      evidenceText,
      detectedBy: 'cursor_pre_push_review',
      sourceRoute: 'git_hook/pre_push',
      autoAction: sev === 'critical' ? 'watch' : 'none',
      asked: `review range ${range}`,
      delivered: `${file}: ${finding.issue || 'issue'}`,
    });
    violations.push({ file, status: result.status, ok: result.ok });
  }

  return {
    skipped: false,
    performanceOk: perf.ok,
    performanceStatus: perf.status,
    violations,
  };
}

const mode = normalizeMode(process.env.CURSOR_PRE_PUSH_REVIEW || 'warn');
const range = argValue('--range', process.env.CURSOR_PUSH_RANGE || '');
const model = process.env.CURSOR_PRE_PUSH_MODEL || 'gpt-5';

async function main() {
  if (mode === 'off') {
    log('Cursor pre-push review: off');
    process.exit(0);
  }

  if (!range) {
    warn('Cursor pre-push review skipped: missing --range');
    process.exit(0);
  }

  const changedFiles = getChangedFiles(range);
  if (!changedFiles.length) {
    log(`Cursor pre-push review: no changed files in ${range}`);
    process.exit(0);
  }

  if (!commandExists('cursor-agent')) {
    const message = 'Cursor pre-push review skipped: cursor-agent not installed or not in PATH';
    writeReport({
      ts: new Date().toISOString(),
      mode,
      range,
      changedFiles,
      ok: false,
      skipped: true,
      reason: message,
    });
    if (mode === 'strict') {
      warn(message);
      process.exit(1);
    }
    warn(message);
    process.exit(0);
  }

  const prompt = [
    'You are performing a pre-push bug review for the Lumin-LifeOS repository.',
    `Review only the git range: ${range}`,
    `Changed files (${changedFiles.length}): ${changedFiles.join(', ')}`,
    'Focus on correctness, regressions, security, runtime/deploy breakage, SSOT drift, missing wires, and fake green claims.',
    'Ignore style nitpicks unless they create maintainability or correctness risk.',
    'Use the repo rules, CLAUDE.md, and .cursor/BUGBOT.md if present.',
    'Return exactly one JSON object and nothing else.',
    'Schema:',
    '{"status":"pass|warn|block","summary":"short summary","findings":[{"severity":"low|medium|high|critical","file":"path","line_hint":"symbol or line","issue":"what is wrong","why":"why it matters","fix":"smallest safe fix"}]}',
    'Use status="block" only if the push should be stopped for a real defect or production risk.',
  ].join('\n');

  const run = spawnSync(
    'cursor-agent',
    ['-p', '--mode', 'plan', '--model', model, '--output-format', 'text', prompt],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  const raw = `${run.stdout || ''}${run.stderr || ''}`.trim();
  const authFailure = /authentication required|run 'agent login' first|cursor_api_key/i.test(raw);

  if (run.status !== 0 && authFailure) {
    const message = 'Cursor pre-push review skipped: cursor-agent is not authenticated. Run `cursor-agent login` or set `CURSOR_API_KEY`.';
    writeReport({
      ts: new Date().toISOString(),
      mode,
      range,
      changedFiles,
      ok: false,
      skipped: true,
      reason: message,
      raw,
    });
    if (mode === 'strict') {
      warn(message);
      process.exit(1);
    }
    warn(message);
    process.exit(0);
  }

  if (run.status !== 0) {
    writeReport({
      ts: new Date().toISOString(),
      mode,
      range,
      changedFiles,
      ok: false,
      skipped: false,
      reason: 'cursor-agent exited non-zero',
      exitCode: run.status,
      raw,
    });
    warn(`Cursor pre-push review failed (exit ${run.status}).`);
    if (mode === 'strict') process.exit(1);
    process.exit(0);
  }

  let parsed = null;
  try {
    parsed = extractJson(raw);
  } catch (err) {
    writeReport({
      ts: new Date().toISOString(),
      mode,
      range,
      changedFiles,
      ok: false,
      skipped: false,
      reason: `Could not parse Cursor review JSON: ${err.message}`,
      raw,
    });
    warn(`Cursor pre-push review returned non-JSON output: ${err.message}`);
    if (mode === 'strict') process.exit(1);
    process.exit(0);
  }

  const findings = Array.isArray(parsed?.findings) ? parsed.findings : [];
  const status = String(parsed?.status || 'warn').toLowerCase();
  const summary = parsed?.summary || 'No summary provided';
  const blocking = status === 'block';
  const memory = await sendMemoryReceipts({ status, summary, findings, range, changedFiles }).catch((err) => ({
    skipped: true,
    reason: `memory_error:${err.message}`,
  }));

  writeReport({
    ts: new Date().toISOString(),
    mode,
    range,
    changedFiles,
    ok: true,
    report: {
      status,
      summary,
      findings,
    },
    memory,
    raw,
  });

  log(`Cursor pre-push review: ${status.toUpperCase()} — ${summary}`);
  if (findings.length) printFindings(findings);

  if (blocking && mode === 'strict') {
    warn('Push blocked by Cursor pre-push review (strict mode).');
    process.exit(1);
  }

  process.exit(0);
}

await main();
