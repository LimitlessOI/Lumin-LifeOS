#!/usr/bin/env node
/**
 * SYNOPSIS: Audits every blueprint in the BP_PRIORITY scheduler queue for
 * internal consistency and manufacturing readiness.
 *
 * Why this exists: BP_PRIORITY.json is the ordered queue the factory schedules
 * from, and nothing verified its own entries. Each item asserts a blueprint
 * path, an acceptance command, a receipt path, a receipt verdict, and a git
 * sha -- five claims that can each rot independently. A queue that says
 * TECHNICAL_PASS while pointing at a receipt that says otherwise, or at an
 * acceptance command whose script was deleted, is a false green at the top of
 * the manufacturing funnel: every downstream gate inherits it.
 *
 * This audits claims against evidence on disk. It does not judge whether a
 * product is good; it judges whether the queue is telling the truth about it.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_REL = 'builderos-reboot/BP_PRIORITY.json';
const asJson = process.argv.includes('--json');
const ciMode = process.argv.includes('--ci');

const abs = (rel) => path.join(ROOT, rel);
const exists = (rel) => Boolean(rel) && fs.existsSync(abs(rel));

function readJson(rel) {
  try { return JSON.parse(fs.readFileSync(abs(rel), 'utf8')); } catch { return null; }
}

const queue = readJson(QUEUE_REL);
if (!queue || !Array.isArray(queue.items)) {
  console.error(`FAIL: ${QUEUE_REL} missing or has no items array`);
  process.exit(1);
}

const packageJson = readJson('package.json') || {};
const npmScripts = packageJson.scripts || {};

/**
 * An acceptance command that cannot run is an unfalsifiable pass claim: the
 * verdict can never be re-proven, so it survives on trust alone. Resolves the
 * two real forms in this repo (`npm run <name>` and `node scripts/<file>`) and
 * declines to guess about anything else rather than inventing a verdict.
 */
function checkAcceptanceCommand(command) {
  if (!command || !String(command).trim()) {
    return { ok: false, severity: 'error', detail: 'no acceptance_command -- the verdict can never be re-proven' };
  }
  const cmd = String(command).trim();
  const npmMatch = cmd.match(/npm run ([\w:.-]+)/);
  if (npmMatch) {
    const name = npmMatch[1];
    return npmScripts[name]
      ? { ok: true, severity: 'ok', detail: `npm run ${name} exists` }
      : { ok: false, severity: 'error', detail: `npm script "${name}" does not exist in package.json` };
  }
  const nodeMatch = cmd.match(/node\s+((?:scripts|tests)\/[\w./-]+)/);
  if (nodeMatch) {
    const file = nodeMatch[1];
    return exists(file)
      ? { ok: true, severity: 'ok', detail: `${file} exists` }
      : { ok: false, severity: 'error', detail: `acceptance script ${file} does not exist` };
  }
  return { ok: true, severity: 'unknown', detail: `not statically resolvable: ${cmd.slice(0, 60)}` };
}

/** Pulls a verdict-ish string out of a receipt without assuming one schema. */
function receiptVerdictOf(receipt) {
  if (!receipt || typeof receipt !== 'object') return null;
  const candidates = [
    receipt.verdict, receipt.receipt_verdict, receipt.pass_fail, receipt.result,
    receipt.status, receipt?.objective_verdict?.verdict, receipt?.summary?.verdict,
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim());
  return found ? found.trim() : null;
}

function shaResolvesLocally(sha) {
  if (!sha || !/^[0-9a-f]{7,40}$/i.test(String(sha))) return null;
  const res = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: ROOT });
  return res.status === 0;
}

const rows = [];
const findings = [];

function flag(severity, missionId, kind, message, proposedSolution) {
  findings.push({ severity, mission_id: missionId, kind, message, proposed_solution: proposedSolution });
}

for (const item of queue.items) {
  const id = item.mission_id || item.product_id || '(unnamed)';
  const rank = item.rank ?? '-';
  const blueprintRel = item.blueprint_path;
  const blueprint = exists(blueprintRel) ? readJson(blueprintRel) : null;

  const row = {
    rank,
    mission_id: id,
    queue_verdict: item.verdict || '-',
    founder_usability_pass: item.founder_usability_pass === true,
    blueprint_file: exists(blueprintRel),
    steps: 0,
    acceptance: '-',
    receipt: '-',
    sha: '-',
    ready: false,
  };

  if (!exists(blueprintRel)) {
    flag('error', id, 'blueprint_missing',
      `queue rank ${rank} points at ${blueprintRel || '(no path)'} which does not exist`,
      'Restore the blueprint file or remove the queue entry -- a scheduler cannot dispatch a blueprint that is not there');
  } else if (!blueprint) {
    flag('error', id, 'blueprint_unparseable', `${blueprintRel} is not valid JSON`,
      'Repair the JSON; the factory reads this file directly');
  } else {
    const steps = Array.isArray(blueprint.steps) ? blueprint.steps : [];
    row.steps = steps.length;
    if (steps.length === 0) {
      flag('error', id, 'no_steps', `${blueprintRel} declares no steps`,
        'A blueprint with no steps cannot be manufactured; either decompose it or move it out of the active queue');
    }

    const allowed = Array.isArray(blueprint.allowed_action_types) ? blueprint.allowed_action_types : null;
    if (allowed) {
      const illegal = steps
        .map((s) => s.action_type)
        .filter((t) => t && !allowed.includes(t));
      if (illegal.length) {
        flag('error', id, 'illegal_action_type',
          `steps use action types outside allowed_action_types: ${[...new Set(illegal)].join(', ')}`,
          'Either widen allowed_action_types deliberately, or correct the steps -- an out-of-contract action type is unauthorized execution');
      }
    }

    // Blueprint-level vs queue-level verdict must not disagree; two sources of
    // truth for the same claim means one of them is already wrong.
    if (blueprint.receipt_verdict && item.receipt_verdict &&
        String(blueprint.receipt_verdict) !== String(item.receipt_verdict)) {
      flag('error', id, 'verdict_disagreement',
        `blueprint says receipt_verdict=${blueprint.receipt_verdict} but the queue says ${item.receipt_verdict}`,
        'Reconcile against the receipt on disk and correct whichever of the two is stale');
    }
  }

  const acceptance = checkAcceptanceCommand(item.acceptance_command || blueprint?.acceptance_command);
  row.acceptance = acceptance.severity === 'ok' ? 'runnable' : acceptance.severity;
  if (!acceptance.ok) {
    flag(acceptance.severity, id, 'acceptance_unrunnable', acceptance.detail,
      'Point acceptance_command at a command that exists, or mark the item as not re-provable');
  }

  const receiptRel = item.receipt_path || blueprint?.receipt_path;
  if (!receiptRel) {
    row.receipt = 'none';
    flag('warn', id, 'no_receipt_path', 'no receipt_path declared',
      'Declare the receipt that carries the verdict, so the claim has an evidence file behind it');
  } else if (!exists(receiptRel)) {
    row.receipt = 'MISSING';
    flag('error', id, 'receipt_missing',
      `receipt_path ${receiptRel} does not exist while the queue claims verdict=${item.verdict || '-'}`,
      'A verdict with no receipt on disk is an unbacked claim -- restore the receipt or drop the verdict');
  } else {
    const receipt = readJson(receiptRel);
    const declared = receiptVerdictOf(receipt);
    if (!receipt) {
      row.receipt = 'unparseable';
      flag('error', id, 'receipt_unparseable', `${receiptRel} is not valid JSON`, 'Repair the receipt JSON');
    } else if (!declared) {
      row.receipt = 'no_verdict';
      flag('warn', id, 'receipt_has_no_verdict',
        `${receiptRel} carries no recognizable verdict field`,
        'Add an explicit verdict/pass_fail so the receipt can be compared to the queue claim');
    } else {
      const queueClaim = String(item.receipt_verdict || item.verdict || '').toUpperCase();
      const receiptClaim = declared.toUpperCase();
      const agrees = !queueClaim || queueClaim === receiptClaim ||
        receiptClaim.includes(queueClaim) || queueClaim.includes(receiptClaim);
      row.receipt = agrees ? 'agrees' : `CONFLICT(${declared})`;
      if (!agrees) {
        flag('error', id, 'receipt_conflict',
          `queue claims ${queueClaim} but ${receiptRel} says ${declared}`,
          'The receipt is the evidence and the queue is the claim -- correct the queue to match the receipt');
      }
    }
  }

  const sha = item.git_sha || blueprint?.git_sha;
  const resolved = shaResolvesLocally(sha);
  if (!sha) {
    row.sha = 'none';
    flag('warn', id, 'no_git_sha', 'no git_sha recorded for a completed blueprint',
      'Record the commit the work landed in, so the claim is anchored to real history');
  } else if (resolved === null) {
    row.sha = 'malformed';
    flag('error', id, 'git_sha_malformed', `git_sha "${sha}" is not a valid sha`, 'Record the real commit sha');
  } else if (resolved === false) {
    // Not an error: this repo ships via the GitHub API, so main can legitimately
    // hold commits the local clone has not fetched.
    row.sha = 'not_local';
  } else {
    row.sha = 'resolves';
  }

  const errorsForItem = findings.filter((f) => f.mission_id === id && f.severity === 'error');
  row.ready = errorsForItem.length === 0 && row.blueprint_file && row.steps > 0;
  rows.push(row);
}

const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');
const unknowns = findings.filter((f) => f.severity === 'unknown');
const founderPassed = rows.filter((r) => r.founder_usability_pass);
const structurallyReady = rows.filter((r) => r.ready);

const summary = {
  schema: 'blueprint_queue_audit_v1',
  queue: QUEUE_REL,
  queue_id: queue.queue_id || null,
  queue_updated_at: queue.updated_at || null,
  audited_at: new Date().toISOString(),
  total_blueprints: rows.length,
  structurally_ready: structurallyReady.length,
  founder_usability_pass: founderPassed.length,
  error_findings: errors.length,
  warn_findings: warnings.length,
  unresolvable_acceptance_commands: unknowns.length,
  ok: errors.length === 0,
};

if (asJson) {
  console.log(JSON.stringify({ summary, rows, findings }, null, 2));
} else {
  console.log(`BLUEPRINT QUEUE AUDIT — ${QUEUE_REL} (${queue.queue_id || 'no id'}, updated ${queue.updated_at || '?'})\n`);
  const header = ['rank', 'mission', 'queue verdict', 'steps', 'acceptance', 'receipt', 'sha', 'founder', 'ready'];
  console.log(header.join('\t'));
  for (const r of rows) {
    console.log([
      r.rank, r.mission_id, r.queue_verdict, r.steps, r.acceptance, r.receipt, r.sha,
      r.founder_usability_pass ? 'PASS' : 'no', r.ready ? 'ready' : 'BLOCKED',
    ].join('\t'));
  }
  console.log(`\n${'='.repeat(70)}`);
  console.log(`total=${summary.total_blueprints}  structurally_ready=${summary.structurally_ready}  founder_usability_pass=${summary.founder_usability_pass}`);
  console.log(`errors=${errors.length}  warnings=${warnings.length}  unresolvable_acceptance=${unknowns.length}`);
  if (errors.length) {
    console.log(`\nERRORS (each carries the fix, per SO-002):`);
    for (const f of errors) console.log(`  [${f.kind}] ${f.mission_id}: ${f.message}\n      → ${f.proposed_solution}`);
  }
  if (warnings.length) {
    console.log(`\nWARNINGS:`);
    for (const f of warnings) console.log(`  [${f.kind}] ${f.mission_id}: ${f.message}`);
  }
}

if (ciMode && errors.length) process.exit(1);
