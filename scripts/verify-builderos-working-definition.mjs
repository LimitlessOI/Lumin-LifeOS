#!/usr/bin/env node
/**
 * SYNOPSIS: BuilderOS working definition — STRUCTURAL vs OPERATIONAL (honest 10/10).
 * Structural = modules wired. Operational = live proof (ready, gaps, canonical dry-run, compound prod entries).
 * @ssot builderos-reboot/BUILDEROS_WORKING_DEFINITION.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  CODEGEN_REPAIR_PLAYBOOKS,
  classifyCodegenFailure,
} from '../services/builderos-codegen-self-repair.js';
import { getCanonicalExecutorManifest } from '../services/builderos-canonical-executor.js';
import { getCompoundImprovementSummary } from '../services/builderos-compound-improvement.js';
import { auditHarnessToolWiring } from '../services/builderos-harness-toolkit.js';
import { executeCanonicalBlueprintStep, loadMissionBlueprint } from '../services/builderos-canonical-executor.js';
import { classifyBuilderGap, summarizeGapFamilies } from '../services/builderos-gap-classifier.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const operationalMode =
  process.argv.includes('--operational') ||
  String(process.env.BUILDEROS_WORKING_OPERATIONAL || '').trim() === '1';

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: ok ? detail || 'PASS' : detail };
}

function scoreChecks(checks) {
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.ok).length;
  return Math.round((passed / checks.length) * 100) / 10;
}

function runNodeCheck(files) {
  const r = spawnSync(process.execPath, ['--check', ...files.map((f) => path.join(ROOT, f))], {
    encoding: 'utf8',
  });
  return r.status === 0;
}

function resolveBaseUrl() {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.BUILDER_BASE_URL ||
    process.env.LUMIN_SMOKE_BASE_URL ||
    ''
  ).replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

function readCompoundLogProductionEntries() {
  const logPath = path.join(ROOT, 'data/builderos-compound-improvement-log.jsonl');
  if (!fs.existsSync(logPath)) return [];
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((row) => row.source && row.source !== 'test');
}

function pillarEnvisionedWorkflowStructural() {
  const manifest = getCanonicalExecutorManifest();
  return [
    check('EW-S01', exists('builderos-reboot/BUILDEROS_WORKING_DEFINITION.json'), 'working definition missing'),
    check('EW-S02', exists('services/builderos-canonical-executor.js'), 'canonical executor missing'),
    check('EW-S03', manifest.canonical_path_id === 'builderos_canonical_v1', 'canonical path id'),
    check('EW-S04', exists('builderos-reboot/governance/BUILDEROS_EXECUTION_TIER.json'), 'execution tier missing'),
    check('EW-S05', exists('scripts/builderos-run-mission-step.mjs'), 'mission step runner missing'),
    check('EW-S06', exists('builderos-reboot/BP_PRIORITY.json'), 'BP_PRIORITY missing'),
    check('EW-S07', exists('builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json'), 'harness tools manifest'),
    check('EW-S08', exists('services/builderos-harness-toolkit.js'), 'harness toolkit module'),
    check('EW-S09', exists('scripts/builderos-run-mission.mjs'), 'canonical mission runner'),
  ];
}

function pillarRealProgrammingStructural() {
  const governed = read('services/builderos-governed-loop-executor.js');
  const routes = exists('routes/lifeos-council-builder-routes.js')
    ? read('routes/lifeos-council-builder-routes.js')
    : '';
  const syntaxOk = runNodeCheck([
    'services/builderos-canonical-executor.js',
    'services/builderos-codegen-self-repair.js',
    'services/builderos-compound-improvement.js',
    'services/builderos-gap-classifier.js',
    'services/builderos-governed-loop-executor.js',
  ]);
  return [
    check('RP-S01', exists('services/builderos-routing-policy.js'), 'routing policy missing'),
    check('RP-S02', CODEGEN_REPAIR_PLAYBOOKS.length >= 6, `playbooks=${CODEGEN_REPAIR_PLAYBOOKS.length}`),
    check(
      'RP-S03',
      classifyCodegenFailure({ blocker: 'html too short truncated output' }).playbook === 'TRUNCATED_OUTPUT',
      'classifier truncation',
    ),
    check('RP-S04', governed.includes('builderos-codegen-self-repair'), 'governed loop wired'),
    check('RP-S05', routes.includes('/builder/build') || routes.includes("'/build'"), 'builder route'),
    check('RP-S06', syntaxOk, 'node --check new modules'),
    check('RP-S07', routes.includes('builderos-gap-classifier'), 'gap classifier wired in routes'),
  ];
}

function pillarSelfRepairStructural() {
  const governed = read('services/builderos-governed-loop-executor.js');
  return [
    check('SR-S01', exists('services/self-repair-executor.js'), 'self-repair executor'),
    check('SR-S02', exists('services/oil-self-repair-detector.js'), 'oil detector'),
    check('SR-S03', exists('services/founder-build-self-repair.js'), 'founder build self-repair'),
    check('SR-S04', exists('services/self-repair-prevention-registry.js'), 'prevention registry'),
    check('SR-S05', governed.includes('recordCompoundImprovement'), 'governed records failures'),
    check(
      'SR-S06',
      classifyCodegenFailure({ blocker: 'BUILDEROS_DONE_BLOCKED missing_proof' }).playbook === 'DONE_GATE_BLOCKED',
      'done gate classifier',
    ),
  ];
}

function pillarCompoundImprovementStructural() {
  const summary = getCompoundImprovementSummary();
  const prodEntries = readCompoundLogProductionEntries();
  return [
    check('CI-S01', exists('services/builderos-compound-improvement.js'), 'compound module'),
    check('CI-S02', exists('docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md'), 'compound doc'),
    check('CI-S03', exists('data/builderos-compound-improvement-state.json'), 'compound state file'),
    check('CI-S04', typeof summary.unique_levers === 'number', 'summary API'),
    check('CI-S05', exists('scripts/lib/builder-failure-memory.mjs'), 'failure memory'),
    check('CI-S06', exists('data/builderos-compound-improvement-log.jsonl'), 'compound log exists'),
    check('CI-S07', prodEntries.length >= 1, `production compound entries=${prodEntries.length} (not test-only)`),
  ];
}

async function fetchReady(baseUrl, commandKey) {
  const paths = ['/api/v1/lifeos/builder/ready', '/ready'];
  for (const p of paths) {
    const res = await fetch(`${baseUrl}${p}`, {
      headers: commandKey ? { 'x-command-key': commandKey } : {},
    });
    if (res.status === 404) continue;
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, path: p };
  }
  return { ok: false, status: 404, json: null, path: null };
}

async function fetchBuilderGaps(baseUrl, commandKey) {
  const res = await fetch(`${baseUrl}/api/v1/lifeos/builder/gaps?limit=50`, {
    headers: commandKey ? { 'x-command-key': commandKey } : {},
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

async function fetchBuilderHistory(baseUrl, commandKey) {
  const res = await fetch(`${baseUrl}/api/v1/lifeos/builder/history?limit=50`, {
    headers: commandKey ? { 'x-command-key': commandKey } : {},
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

function analyzeGapBucket(gapsJson) {
  const rows = gapsJson?.gaps || gapsJson?.records || gapsJson?.items || [];
  if (!Array.isArray(rows) || !rows.length) {
    return { total: 0, otherPct: 100, buckets: {} };
  }
  const enriched = rows.map((row) => {
    if (row.failure_family && row.failure_family !== 'other') return row;
    return { ...row, ...classifyBuilderGap(row) };
  });
  return summarizeGapFamilies(enriched);
}

async function pillarEnvisionedWorkflowOperational() {
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();
  const checks = [];

  if (!baseUrl) {
    checks.push(check('EW-O01', false, 'PUBLIC_BASE_URL missing — cannot prove live workflow'));
  } else {
    const ready = await fetchReady(baseUrl, commandKey);
    checks.push(
      check('EW-O01', ready.ok, ready.ok ? `GET ${ready.path} 200` : `ready probe failed ${ready.status}`),
    );
  }

  let missionId = 'BUILDEROS-HARNESS-PROOF-0001';
  try {
    const bp = JSON.parse(read('builderos-reboot/BP_PRIORITY.json'));
    const harness = (bp.items || []).find((i) => i.mission_id === 'BUILDEROS-HARNESS-PROOF-0001');
    const first = harness || (bp.items || []).find((i) => i.blueprint_path);
    if (first?.mission_id) missionId = first.mission_id;
  } catch {
    /* keep default */
  }

  try {
    const blueprint = loadMissionBlueprint(missionId);
    const step = blueprint.steps?.[0];
    checks.push(check('EW-O02', Boolean(step?.target_file), `${missionId} step0 has target_file`));
    const dry = await executeCanonicalBlueprintStep({ missionId, stepId: step?.step_id, dryRun: true });
    checks.push(check('EW-O03', dry.ok === true && dry.dry_run === true, 'canonical dry-run plans step'));
  } catch (err) {
    checks.push(check('EW-O02', false, err.message));
    checks.push(check('EW-O03', false, 'canonical dry-run failed'));
  }

  const harnessAudit = auditHarnessToolWiring();
  checks.push(
    check(
      'EW-O05',
      harnessAudit.ok,
      harnessAudit.ok
        ? `harness tools wired (${harnessAudit.summary.wired}/${harnessAudit.summary.total})`
        : `harness tools missing=${harnessAudit.summary.required_missing} partial=${harnessAudit.summary.required_partial}`,
    ),
  );

  const doctrine = spawnSync(process.execPath, ['scripts/verify-lifeos-service-doctrine.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  checks.push(check('EW-O04', doctrine.status === 0, 'service doctrine verify'));

  return checks;
}

async function pillarRealProgrammingOperational(gapStats) {
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();
  const checks = [];

  if (!baseUrl || !commandKey) {
    checks.push(check('RP-O01', false, 'base URL or command key missing — cannot probe builder'));
    checks.push(check('RP-O02', false, 'skipped'));
    checks.push(check('RP-O03', false, 'skipped'));
    return checks;
  }

  const ready = await fetchReady(baseUrl, commandKey);
  const builderReady = ready.json?.builder || ready.json || {};
  checks.push(
    check(
      'RP-O01',
      builderReady.commitToGitHub === true &&
        (builderReady.callCouncilMember === true || ready.json?.council === true),
      'ready shows commitToGitHub + council',
    ),
  );

  const gaps = await fetchBuilderGaps(baseUrl, commandKey);
  checks.push(check('RP-O02', gaps.ok, gaps.ok ? 'GET /builder/gaps OK' : `gaps HTTP ${gaps.status}`));

  const maxOtherPct = Number(process.env.BUILDEROS_MAX_GAP_OTHER_PCT || 25);
  checks.push(
    check(
      'RP-O03',
      gapStats.total > 0 && gapStats.otherPct <= maxOtherPct,
      gapStats.total > 0
        ? `other bucket ${gapStats.otherPct}% (max ${maxOtherPct}%)`
        : 'no gap records to score',
    ),
  );

  const history = await fetchBuilderHistory(baseUrl, commandKey);
  const committedRows = (history.json?.history || []).filter(
    (r) => r.committed === true || r.status === 'committed',
  );
  const minSuccessHint = Number(process.env.BUILDEROS_MIN_RECENT_COMMITS || 1);
  checks.push(
    check(
      'RP-O04',
      committedRows.length >= minSuccessHint,
      `recent committed rows in builder history=${committedRows.length} (need ${minSuccessHint})`,
    ),
  );

  return checks;
}

async function pillarSelfRepairOperational() {
  const prodEntries = readCompoundLogProductionEntries();
  const repaired = prodEntries.filter((r) => r.success === true);
  const checks = [
    check(
      'SR-O01',
      prodEntries.some((r) => r.classification?.repairable === true),
      'compound log shows classified repairable failure',
    ),
    check(
      'SR-O02',
      repaired.length >= 1,
      `production repair success entries=${repaired.length} (need 1+ live)`,
    ),
    check(
      'SR-O03',
      exists('data/self-repair-execution-log.jsonl') || exists('services/self-repair-executor.js'),
      'self-repair execution path exists',
    ),
  ];
  return checks;
}

async function pillarCompoundImprovementOperational(gapStats) {
  const prodEntries = readCompoundLogProductionEntries();
  const summary = getCompoundImprovementSummary();
  const uniqueLevers = new Set(prodEntries.map((r) => r.lever).filter(Boolean));

  return [
    check('CI-O01', prodEntries.length >= 3, `production compound rows=${prodEntries.length} (need 3+)`),
    check('CI-O02', uniqueLevers.size >= 2, `unique levers from live failures=${uniqueLevers.size} (need 2+)`),
    check(
      'CI-O03',
      summary.last_improvement_at != null,
      summary.last_improvement_at ? `last improvement ${summary.last_improvement_at}` : 'no improvement timestamp',
    ),
    check(
      'CI-O04',
      gapStats.total === 0 || gapStats.otherPct < 72,
      gapStats.total === 0
        ? 'no gaps baseline'
        : `other bucket improved below 72% baseline (now ${gapStats.otherPct}%)`,
    ),
  ];
}

function scorePillar(name, structuralChecks, operationalChecks) {
  const structural_score = scoreChecks(structuralChecks);
  const operational_score = scoreChecks(operationalChecks);
  return {
    structural: { checks: structuralChecks, score: structural_score },
    operational: { checks: operationalChecks, score: operational_score },
    score: operational_score,
  };
}

async function main() {
  const def = JSON.parse(read('builderos-reboot/BUILDEROS_WORKING_DEFINITION.json'));
  const minScore = Number(process.env.BUILDEROS_WORKING_MIN_SCORE || def.min_score_each_pillar || 10);

  const baseUrl = resolveBaseUrl();
  let gapStats = { total: 0, otherPct: 100, buckets: {} };
  if (baseUrl && resolveCommandKey()) {
    const gaps = await fetchBuilderGaps(baseUrl, resolveCommandKey());
    if (gaps.ok) gapStats = analyzeGapBucket(gaps.json);
  }

  const ewOp = await pillarEnvisionedWorkflowOperational();
  const rpOp = await pillarRealProgrammingOperational(gapStats);
  const srOp = await pillarSelfRepairOperational();
  const ciOp = await pillarCompoundImprovementOperational(gapStats);

  const pillars = {
    envisioned_workflow: scorePillar('envisioned_workflow', pillarEnvisionedWorkflowStructural(), ewOp),
    real_programming: scorePillar('real_programming', pillarRealProgrammingStructural(), rpOp),
    self_repair: scorePillar('self_repair', pillarSelfRepairStructural(), srOp),
    compound_improvement: scorePillar('compound_improvement', pillarCompoundImprovementStructural(), ciOp),
  };

  const structuralScores = Object.values(pillars).map((p) => p.structural.score);
  const operationalScores = Object.values(pillars).map((p) => p.operational.score);
  const structuralOverall = Math.round((structuralScores.reduce((a, b) => a + b, 0) / 4) * 10) / 10;
  const operationalOverall = Math.round((operationalScores.reduce((a, b) => a + b, 0) / 4) * 10) / 10;

  const structuralTen = structuralScores.every((s) => s >= minScore);
  const operationalTen = operationalScores.every((s) => s >= minScore);

  const report = {
    schema: 'builderos_working_definition_report_v2',
    generated_at: new Date().toISOString(),
    honesty: {
      structural_10: 'modules wired — necessary not sufficient',
      operational_10: 'live proof — the honest benchmark Adam asked for',
      previous_v1_was: 'structural only (theater if called operational 10)',
    },
    min_score_each_pillar: minScore,
    gap_receipt: gapStats,
    pillars,
    structural_overall: structuralOverall,
    operational_overall: operationalOverall,
    structural_all_ten: structuralTen,
    operational_all_ten: operationalTen,
    ok: operationalMode ? operationalTen : structuralTen,
    mode: operationalMode ? 'operational' : 'structural_default',
    scope: 'BuilderOS machine only — not LifeRE founder usability',
  };

  console.log(JSON.stringify(report, null, 2));

  const failSet = operationalMode ? operationalScores : structuralScores;
  const label = operationalMode ? 'operational' : 'structural';
  if (!failSet.every((s) => s >= minScore)) {
    for (const [name, p] of Object.entries(pillars)) {
      const bucket = operationalMode ? p.operational : p.structural;
      if (bucket.score < minScore) {
        for (const c of bucket.checks.filter((x) => !x.ok)) {
          console.error(`FAIL ${label} ${name} ${c.id}: ${c.detail}`);
        }
      }
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
