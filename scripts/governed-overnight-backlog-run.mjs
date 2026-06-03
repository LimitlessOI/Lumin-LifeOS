#!/usr/bin/env node
/**
 * Overnight BuilderOS backlog runner — blueprint-first, C2-governed, never idle.
 *
 * Operating law: prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md
 * — maximize verified founder value, not commits or queue consumption.
 *
 * Canonical workflow:
 * SSOT / Amendment / Blueprint
 *   -> PBB expansion
 *   -> ranked build task
 *   -> C2 job
 *   -> BuilderOS build
 *   -> verify
 *   -> receipts
 *   -> update continuity
 *   -> next highest-value mission (redirect when blocked)
 *
 * Gap/contradiction verifier scripts are fallback support work only. They are
 * not the primary queue while blueprint work exists.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  filterAndRankTasks,
  scoreTask,
  shouldSkipKnownBadTask,
} from '../services/founder-value-engine.js';
import {
  analyzeFactoryHealth,
  writeFactoryHealthReport,
} from '../services/builder-operations-director.js';

const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, 'docs', 'projects');
const LOG_PATH = path.join(ROOT, 'data', 'governed-autonomy-overnight-log.jsonl');
const STATE_PATH = path.join(ROOT, 'data', 'governed-autonomy-backlog-state.json');
const LOCK_PATH = path.join(ROOT, 'data', 'governed-autonomy-backlog.lock');

const DRY_RUN = process.argv.includes('--dry-run');
const checkpointArg = process.argv.indexOf('--run-for-min') >= 0
  ? process.argv.indexOf('--run-for-min')
  : process.argv.indexOf('--report-every-min');
const CHECKPOINT_EVERY_MIN = Math.max(
  10,
  Number(checkpointArg >= 0 ? process.argv[checkpointArg + 1] : process.env.CHECKPOINT_EVERY_MIN || 60) || 60,
);
const BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

const HARD_BLOCKERS = new Set([
  'GLOBAL_HALT',
  'MISSING_SECRET_CREDENTIAL',
  'SERVICE_OUTAGE',
  'SAFETY_BOUNDARY',
  'REPO_CORRUPTION',
  'CAPACITY_EXHAUSTED',
]);
// MISSION ADVANCEMENT DOCTRINE: Active is not enough. Productive work is required.
// Low thresholds ensure Railway degradation redirects to local-only work quickly,
// preventing the HTTP_502 → support-task → HTTP_502 circular churn that burns tokens
// without advancing any mission.
const MAX_CONSECUTIVE_502 = 6;
const INFRA_REDIRECT_AT_502 = 3;
const INFRA_RECOVERY_BACKOFF_MS = [30_000, 60_000, 120_000, 300_000];
let consecutive502s = 0;
let infraBackoffIndex = 0;

const NO_RETRY_BLOCKERS = new Set([
  'HTTP_502',
  'SERVICE_OUTAGE',
  'LIFEOS_PRODUCT_DRIFT',
  'ZONE3_PATCH_REQUIRED',
]);

// Builder Reliability Initiative — product-only factory by default.
// Set BUILDER_ALLOW_PROOF_DOCS=1 to re-enable proof-doc / enhancement memo churn.
const FOUNDER_VALUE_CHURN_PAUSE = 10;
const PRODUCT_ONLY_FACTORY = process.env.BUILDER_ALLOW_PROOF_DOCS !== '1';
const CHURN_BLOCKER_FAMILIES = new Set(['infrastructure', 'governance', 'test_failure']);
const PROOF_DOC_TARGET_RE = /builderos-remediation\/.*-proof-g\d+/;
const SUPPORT_TASK_CATEGORY_RE = /^support_|^blueprint_enhancement$|^blueprint_proof$/;
const JOB_EXECUTE_POLL_MS = Number(process.env.BUILDER_JOB_POLL_MS || 2500);
const JOB_EXECUTE_POLL_MAX_MS = Number(process.env.BUILDER_JOB_POLL_MAX_MS || 120_000);

function hasExplicitProductBlockerReceipt(state = {}) {
  return Object.values(state.blocked_attempts || {}).some((entry) => {
    const cat = String(entry?.category || '');
    const blocker = String(entry?.blocker || '');
    return cat === 'blueprint_build'
      || cat === 'blueprint_patch_plan'
      || blocker === 'ZONE3_PATCH_REQUIRED'
      || blocker.startsWith('HTTP_5');
  });
}

function recycleRetryableProductKeys(attemptedKeys, state) {
  if (!PRODUCT_ONLY_FACTORY) return 0;
  let removed = 0;
  for (const entry of Object.values(state.blocked_attempts || {})) {
    const target = entry?.target_file;
    const blocker = String(entry?.blocker || '');
    if (!target || (!blocker.includes('502') && !blocker.startsWith('HTTP_5'))) continue;
    for (const key of [...attemptedKeys]) {
      if (key.includes(target)) {
        attemptedKeys.delete(key);
        removed++;
      }
    }
  }
  return removed;
}

async function estimateRemainingProductTasks(attemptedKeys) {
  const blueprints = await readProjectBlueprints();
  let remaining = 0;
  for (const blueprint of blueprints) {
    if (blueprint.firstExactTask) {
      const targetMatch = blueprint.firstExactTask.match(
        /`((?:routes|services|scripts|public\/overlay|db\/migrations|config|prompts|docs\/projects\/builderos-remediation)\/[^`]+)`/,
      );
      const targetFile = targetMatch?.[1];
      if (targetFile) {
        const key = buildBlueprintQueueKey(blueprint.path, `exact:${targetFile}`);
        if (!attemptedKeys.has(key)) remaining++;
      }
    }
    for (const row of blueprint.buildOrderRows) {
      if (!row.file) continue;
      if (!/^(routes|services|scripts|public\/overlay|db\/migrations|config|prompts|docs\/projects\/builderos-remediation)\//.test(row.file)) continue;
      const key = buildBlueprintQueueKey(blueprint.path, `row:${row.file}`);
      if (!attemptedKeys.has(key)) remaining++;
    }
  }
  return remaining;
}

function shouldPauseBlueprintGeneration(state) {
  return (state.consecutive_no_founder_value || 0) >= FOUNDER_VALUE_CHURN_PAUSE;
}

function isLowValueProofDocTask(task) {
  const target = String(task?.target_file || '');
  return task?.category === 'blueprint_proof' || PROOF_DOC_TARGET_RE.test(target);
}

function applyValueEngineToBatch(tasks, state) {
  const allowProofDocs = (state.consecutive_no_founder_value || 0) < 3;
  const ranked = filterAndRankTasks(tasks, {
    minNoticeability: 3,
    allowProofDocs,
  });
  if (ranked.length === 0 && tasks.length > 0) {
    const fallback = filterAndRankTasks(tasks, { minNoticeability: 1, allowProofDocs: false });
    return fallback.length > 0 ? fallback : tasks.map((task) => ({ task, score: scoreTask(task) }));
  }
  return ranked;
}

function isKnownChurnBlocker(code) {
  const cat = blockerCategory(code);
  return CHURN_BLOCKER_FAMILIES.has(cat) || NO_RETRY_BLOCKERS.has(code);
}

function blockerCategory(code) {
  const c = String(code || '');
  if (c.startsWith('HTTP_5') || c === 'SERVICE_OUTAGE' || c === 'fetch failed') return 'infrastructure';
  if (c === 'ZONE3_PATCH_REQUIRED' || c === 'LIFEOS_PRODUCT_DRIFT') return 'governance';
  if (c === 'syntax' || c.includes('validation')) return 'test_failure';
  if (c.includes('Council')) return 'council';
  if (c.includes('Commit failed')) return 'deployment';
  return 'other';
}

function taskBaseId(taskId) {
  return String(taskId || '').replace(/_retry\d*$/, '').replace(/_retry$/, '');
}

async function runLocalVerificationBurst(state) {
  const checks = [
    { name: 'platform:coverage', cmd: 'npm run platform:coverage' },
    { name: 'ai:bypasses', cmd: 'npm run ai:bypasses' },
  ];
  state.local_verifications = state.local_verifications || [];
  for (const check of checks) {
    try {
      const out = execSync(check.cmd, { cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
      await appendLog('local_verification_ok', {
        check: check.name,
        output_preview: String(out).slice(0, 400),
      });
      state.local_verifications.push({ check: check.name, ok: true, at: new Date().toISOString() });
    } catch (error) {
      await appendLog('local_verification_fail', {
        check: check.name,
        error: (error.stderr?.toString?.() || error.message || 'failed').slice(0, 200),
      });
      state.local_verifications.push({ check: check.name, ok: false, at: new Date().toISOString() });
    }
  }
}

// Work classification for Mission Advancement Doctrine.
// mission_advancing = committed + oil + token verified (real founder value)
// mission_supporting = committed but not fully verified
// blocker_reduction  = local work: health checks, syntax audits
// learning           = gap/OC verification, analysis docs
// churn              = same blocker class repeated with no new capability
function classifyWorkAdvancement(task, result) {
  if (result.local) return 'blocker_reduction';
  if (result.ok && result.committed && result.oil_verified) return 'mission_advancing';
  if (result.ok && result.committed) return 'mission_supporting';
  const code = result.blocker || '';
  if (code.startsWith('HTTP_5') || code === 'HTTP_502') return 'churn';
  if (task.category === 'support_open_contradiction' || task.category === 'support_platform_gap') return 'learning';
  return 'learning';
}

// Local task executor — runs tasks that do NOT require the Railway API.
// Used when infrastructure_degraded=true to avoid the HTTP_502 → support-task →
// HTTP_502 loop. Never calls callApi(). Always returns { local: true }.
async function runLocalTask(task, state) {
  const t0 = Date.now();
  await appendLog('local_task_start', { task_id: task.id, action_type: task.action_type });

  if (task.action_type === 'railway_health_check') {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/lifeos/builder/ready`, {
        headers: { 'x-command-key': KEY },
        signal: AbortSignal.timeout(10_000),
      });
      const ok = res.status === 200;
      if (ok) {
        consecutive502s = 0;
        infraBackoffIndex = 0;
        state.infrastructure_degraded = false;
        state.productive_work = true;
        await appendLog('railway_health_recovered', {
          status: res.status,
          action: 'infrastructure_degraded cleared — blueprint work resumes next generation',
        });
      } else {
        await appendLog('railway_health_still_degraded', { status: res.status, consecutive_502s: consecutive502s });
      }
      return { ok, local: true, action_type: 'railway_health_check', status: res.status, wall_ms: Date.now() - t0 };
    } catch (error) {
      await appendLog('railway_health_error', { error: error.message, wall_ms: Date.now() - t0 });
      return { ok: false, local: true, action_type: 'railway_health_check', error: error.message, wall_ms: Date.now() - t0 };
    }
  }

  if (task.action_type === 'syntax_audit') {
    const dirs = ['routes', 'services', 'scripts', 'config', 'startup', 'core'];
    let passed = 0;
    let failed = 0;
    const errors = [];
    for (const dir of dirs) {
      try {
        const files = execSync(`find ${JSON.stringify(path.join(ROOT, dir))} -name "*.js" -o -name "*.mjs" 2>/dev/null`, {
          encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        }).split('\n').filter(Boolean);
        for (const f of files.slice(0, 30)) {
          const result = syntaxCheck(f);
          if (result.ok) { passed++; } else { failed++; errors.push(`${path.relative(ROOT, f)}: ${result.error}`); }
        }
      } catch { /* dir may not exist */ }
    }
    await appendLog('local_syntax_audit', { passed, failed, errors: errors.slice(0, 5), wall_ms: Date.now() - t0 });
    state.productive_work = true;
    return { ok: failed === 0, local: true, action_type: 'syntax_audit', passed, failed, wall_ms: Date.now() - t0 };
  }

  if (task.action_type === 'status_summary') {
    const summaryPath = path.join(ROOT, 'data', 'governed-autonomy-status-summary.json');
    const factoryReport = await analyzeFactoryHealth({ root: ROOT, sinceHours: 24 });
    const factoryPath = path.join(ROOT, 'data', 'builder-factory-health.json');
    await writeFactoryHealthReport({ ...factoryReport, runner_generation: state.generation_count }, factoryPath);

    const summary = {
      ts: new Date().toISOString(),
      generation: state.generation_count,
      tasks_done: state.tasks_done,
      successes: state.successes.length,
      failures: state.failures.length,
      founder_value_deliveries: state.founder_value_deliveries,
      infrastructure_degraded: state.infrastructure_degraded,
      consecutive_502s: consecutive502s,
      infra_backoff_index: infraBackoffIndex,
      consecutive_infra_failures: state.consecutive_infra_failures || 0,
      churn_count: state.churn_count || 0,
      productive_work: state.productive_work || false,
      work_classification_last: state.work_classification_last || null,
      factory_score: factoryReport.factory_score ?? null,
      factory_product_only: PRODUCT_ONLY_FACTORY,
      factory_24h: factoryReport.layers ?? null,
      law: 'ACTIVE IS NOT ENOUGH. PRODUCTIVE WORK IS REQUIRED.',
      initiative: 'Builder Reliability Initiative',
      directive: 'prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md',
    };
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
    await appendLog('status_summary_written', {
      path: summaryPath,
      founder_value_deliveries: summary.founder_value_deliveries,
      churn_count: summary.churn_count,
      wall_ms: Date.now() - t0,
    });
    state.productive_work = true;
    return { ok: true, local: true, action_type: 'status_summary', wall_ms: Date.now() - t0 };
  }

  await appendLog('local_task_unknown_type', { task_id: task.id, action_type: task.action_type });
  return { ok: false, local: true, error: `unknown action_type: ${task.action_type}`, wall_ms: Date.now() - t0 };
}

const SAFE_TARGET_PREFIXES = Object.freeze([
  'routes/',
  'services/',
  'config/',
  'db/migrations/',
  'prompts/',
  'public/overlay/',
  'scripts/',
  'docs/projects/builderos-remediation/',
]);

const BLOCKED_TARGET_PREFIXES = Object.freeze([
  'server.js',
  'startup/',
  'middleware/',
  'core/',
  '.env',
  '.github/',
  'docs/SSOT_NORTH_STAR.md',
  'docs/SSOT_COMPANION.md',
]);

// Founder directive 2026-05-31: SocialMediaOS/MarketingOS is priority 1.
// C2/Command Control is priority 2 (support when needed to run MarketingOS).
// LifeOS only if directly needed by MarketingOS.
// No generic verifier churn unless all blueprint/product work is blocked.
const PRIORITY_RULES = Object.freeze([
  {
    lane: 'socialmediaos',
    rank: 1,
    patterns: [/AMENDMENT_41_MARKETINGOS/i, /SOCIALMEDIAOS/i, /MARKETINGOS/i],
  },
  {
    lane: 'c2_command_control',
    rank: 2,
    patterns: [/AMENDMENT_46_BUILDEROS_CONTROL_PLANE/i, /AMENDMENT_12_COMMAND_CENTER/i, /BUILDEROS_ALPHA_BLUEPRINT/i],
  },
  {
    lane: 'lifeos_limitlessos',
    rank: 3,
    patterns: [/LIFEOS/i, /LIMITLESSOS/i],
  },
  {
    lane: 'tc',
    rank: 4,
    patterns: [/AMENDMENT_17_TC_SERVICE/i, /\bTC SERVICE\b/i, /TRANSACTION COORDINATOR/i],
  },
  {
    lane: 'tsos_platform',
    rank: 5,
    patterns: [/TSOS/i, /TOKEN_ACCOUNTING_OS/i, /CCL/i, /PLATFORM KERNEL/i],
  },
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function clampSummary(text, max = 220) {
  const normalized = normalizeText(text).replace(/\s+/g, ' ');
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

function isBuilderSafeTarget(targetFile) {
  const normalized = normalizeText(targetFile).replace(/^\//, '');
  if (!normalized) return false;
  for (const blocked of BLOCKED_TARGET_PREFIXES) {
    if (normalized === blocked || normalized.startsWith(blocked)) return false;
  }
  return SAFE_TARGET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function targetLineCount(targetFile) {
  try {
    const resolved = path.resolve(ROOT, targetFile);
    const content = execSync(`wc -l < ${JSON.stringify(resolved)}`, { stdio: 'pipe', shell: '/bin/zsh' }).toString().trim();
    return Number(content) || 0;
  } catch {
    return 0;
  }
}

function classifyLocalTarget(targetFile) {
  if (!targetFile) return { zone: 0, safe: false, exists: false, lineCount: 0 };
  const normalized = normalizeText(targetFile).replace(/^\//, '');
  const resolved = path.resolve(ROOT, normalized);
  let exists = false;
  try {
    execSync(`test -f ${JSON.stringify(resolved)}`, { stdio: 'pipe', shell: '/bin/zsh' });
    exists = true;
  } catch {
    exists = false;
  }
  const lineCount = exists ? targetLineCount(normalized) : 0;
  if (!isBuilderSafeTarget(normalized)) {
    return { zone: 4, safe: false, exists, lineCount, reason: 'outside builder safe scope' };
  }
  if (!exists) {
    return { zone: 1, safe: true, exists, lineCount, reason: 'new file in safe scope' };
  }
  if (lineCount > 150) {
    return { zone: 3, safe: true, exists, lineCount, reason: 'large file update likely to trip patch-mode guard' };
  }
  if (lineCount >= 50) {
    return { zone: 2, safe: true, exists, lineCount, reason: 'medium file update; verify immediately' };
  }
  return { zone: 1, safe: true, exists, lineCount, reason: 'small safe target' };
}

function extractSectionAfterHeading(markdown, headingPattern) {
  const lines = markdown.split('\n');
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i])) {
      startIndex = i + 1;
      break;
    }
  }
  if (startIndex < 0) return '';

  let endIndex = lines.length;
  for (let i = startIndex; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) || /^###\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }
  return normalizeText(lines.slice(startIndex, endIndex).join('\n'));
}

function extractOpenDecisionSection(markdown) {
  return extractSectionAfterHeading(markdown, /^### OPEN — Still requires Adam decision before code starts/i);
}

function extractFirstExactCodingTask(markdown) {
  return extractSectionAfterHeading(markdown, /^## \d+\. First exact coding task(?: \(next\))?/i);
}

function extractBuildOrderRows(markdown) {
  const rows = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (!match) continue;
    rows.push({
      order: Number(match[1]),
      file: normalizeText(match[2]),
      purpose: clampSummary(match[3], 120),
      dependency: clampSummary(match[4], 80),
      verification: clampSummary(match[5], 120),
      doneCriteria: clampSummary(match[6], 140),
    });
  }
  return rows;
}

function extractUncheckedChecklistItems(markdown) {
  const items = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/^\s*[-*]\s+\[\s\]\s+(.+)$/);
    if (!match) continue;
    items.push(clampSummary(match[1], 220));
  }
  return items;
}

function extractNextStepSignals(markdown) {
  const signals = [];
  for (const line of markdown.split('\n')) {
    const normalized = normalizeText(line);
    if (!normalized) continue;
    if (/^[-*]\s+\*\*→ NEXT:/.test(normalized) || /^[-*]\s+\*\*Current blocker:/.test(normalized)) {
      signals.push(clampSummary(normalized.replace(/^[-*]\s+/, ''), 240));
      continue;
    }
    if (/^Remaining operational next step:/i.test(normalized) || /^Exact next step:/i.test(normalized)) {
      signals.push(clampSummary(normalized, 240));
    }
  }
  return signals;
}

function detectLane(fileName, content) {
  const haystack = `${fileName}\n${content.slice(0, 5000)}`;
  for (const rule of PRIORITY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) return rule;
  }
  return { lane: 'other', rank: 9, patterns: [] };
}

function buildBlueprintQueueKey(blueprintPath, label) {
  return `${blueprintPath}::${label}`;
}

function buildPatchPlanTask(blueprint, sourceTask, generation, reason) {
  const targetFile = `docs/projects/builderos-remediation/${slugify(path.basename(blueprint.path, '.md'))}-${slugify(path.basename(sourceTask.target_file || 'unknown'))}-patch-plan-g${generation}.md`;
  return {
    id: `${sourceTask.id}-patch-plan-g${generation}`,
    priority: sourceTask.priority + 1,
    category: 'blueprint_patch_plan',
    lane: blueprint.lane,
    ref: blueprint.path,
    zone: 'Z1',
    target_file: targetFile,
    blueprint_path: blueprint.path,
    blueprint_title: blueprint.title,
    blueprint_section: sourceTask.blueprint_section || 'build task',
    instruction: [
      `Write ${targetFile}.`,
      `Source blueprint: ${blueprint.path}.`,
      `Source section: ${sourceTask.blueprint_section || 'build task'}.`,
      `Blocked target: ${sourceTask.target_file}.`,
      `Reason: ${reason}.`,
      'Create a blueprint-first patch plan in markdown with these sections:',
      '1. Goal in plain English.',
      '2. Why the original target is blocked or high-risk.',
      '3. Exact controlling blueprint excerpt summary.',
      '4. Smallest safe helper-extraction or surgical patch strategy.',
      '5. Required verifier checks.',
      '6. What BuilderOS should attempt next through C2.',
      '7. What must not be changed.',
      'Do not touch product features. 60-120 lines. Include @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md in the opening note.',
    ].join(' '),
  };
}

function buildEnhancementTask(blueprint, generation, reason, sectionSummary, suffix = 'enhancement') {
  const safeSuffix = slugify(suffix) || 'enhancement';
  const targetFile = `docs/projects/builderos-remediation/${slugify(path.basename(blueprint.path, '.md'))}-${safeSuffix}-g${generation}.md`;
  return {
    id: `${slugify(path.basename(blueprint.path, '.md'))}-${safeSuffix}-g${generation}`,
    priority: blueprint.rank * 100 + 80,
    category: 'blueprint_enhancement',
    lane: blueprint.lane,
    ref: blueprint.path,
    zone: 'Z1',
    target_file: targetFile,
    blueprint_path: blueprint.path,
    blueprint_title: blueprint.title,
    blueprint_section: 'enhancement',
    instruction: [
      `Write ${targetFile}.`,
      `Source blueprint: ${blueprint.path}.`,
      `Reason this blueprint is not yet directly buildable: ${reason}.`,
      sectionSummary ? `Relevant section summary: ${sectionSummary}.` : '',
      'Produce a builder-ready blueprint enhancement memo with:',
      '1. blocking ambiguity or founder decision list,',
      '2. already-settled constraints,',
      '3. the smallest buildable next slice that does not violate the blueprint,',
      '4. exact safe-scope files BuilderOS should touch first,',
      '5. required verifier/runtime checks,',
      '6. stop conditions.',
      'Keep it implementation-oriented, not marketing. 60-120 lines.',
    ].filter(Boolean).join(' '),
  };
}

function buildBlueprintProofTask(blueprint, generation, signal, index = 0) {
  const targetFile = `docs/projects/builderos-remediation/${slugify(path.basename(blueprint.path, '.md'))}-proof-g${generation}-${index + 1}.md`;
  return {
    id: `${slugify(path.basename(blueprint.path, '.md'))}-proof-g${generation}-${index + 1}`,
    priority: blueprint.rank * 100 + 70 + index,
    category: 'blueprint_proof',
    lane: blueprint.lane,
    ref: blueprint.path,
    zone: 'Z1',
    target_file: targetFile,
    blueprint_path: blueprint.path,
    blueprint_title: blueprint.title,
    blueprint_section: 'proof_next_step',
    instruction: [
      `Write ${targetFile}.`,
      `Source blueprint: ${blueprint.path}.`,
      `Signal requiring follow-through: ${signal}.`,
      'Produce a proof-closing blueprint note with:',
      '1. the exact missing implementation or proof gap,',
      '2. the smallest safe build slice to close it,',
      '3. exact safe-scope files to touch first,',
      '4. verifier/runtime checks,',
      '5. stop conditions if runtime truth disagrees.',
      'Keep it implementation-first and ready for the next C2 build pass.',
    ].join(' '),
  };
}

function buildBlueprintBuildTask(blueprint, label, sectionText, targetFile, priorityOffset = 0) {
  const classification = classifyLocalTarget(targetFile);
  const safeTarget = classification.safe ? targetFile : `docs/projects/builderos-remediation/${slugify(path.basename(blueprint.path, '.md'))}-${slugify(path.basename(targetFile))}-redirect.md`;
  const instructionParts = [
    `Blueprint-first BuilderOS task from ${blueprint.path}.`,
    `Blueprint title: ${blueprint.title}.`,
    `Founder priority lane: ${blueprint.lane}.`,
    `Section: ${label}.`,
  ];

  if (classification.safe) {
    instructionParts.push(
      `Implement the blueprint work in ${targetFile}.`,
      `Target classification: Zone ${classification.zone} (${classification.reason}).`,
      'Use the controlling blueprint section below as the source of truth. Do not broaden scope.',
      `Blueprint section summary: ${clampSummary(sectionText, 900)}.`,
      'Return only the requested file implementation. Preserve BuilderOS governance, receipts, and verifier compatibility.',
    );
  } else {
    instructionParts.push(
      `The natural target ${targetFile} is outside Builder safe scope.`,
      `Instead write ${safeTarget} with a build-ready implementation plan that maps the blueprint to safe files and exact next actions.`,
      `Why redirected: ${classification.reason}.`,
      `Blueprint section summary: ${clampSummary(sectionText, 900)}.`,
    );
  }

  return {
    id: `${slugify(path.basename(blueprint.path, '.md'))}-${slugify(label)}-${slugify(safeTarget)}`,
    priority: blueprint.rank * 100 + 10 + priorityOffset,
    category: classification.safe ? 'blueprint_build' : 'blueprint_enhancement',
    lane: blueprint.lane,
    ref: blueprint.path,
    zone: classification.safe ? `Z${classification.zone}` : 'Z1',
    target_file: safeTarget,
    expected_blocker: classification.zone === 3 ? 'ZONE3_PATCH_REQUIRED' : null,
    blueprint_path: blueprint.path,
    blueprint_title: blueprint.title,
    blueprint_section: label,
    blueprint_source_target: targetFile,
    instruction: instructionParts.join(' '),
  };
}

async function readProjectBlueprints() {
  const entries = await fs.readdir(PROJECTS_DIR);
  const candidates = entries
    .filter((name) => name.endsWith('.md'))
    .filter((name) => name !== 'INDEX.md')
    .filter((name) => !name.endsWith('.manifest.json'))
    .sort((a, b) => a.localeCompare(b));

  const blueprints = [];
  for (const fileName of candidates) {
    const fullPath = path.join(PROJECTS_DIR, fileName);
    const text = await fs.readFile(fullPath, 'utf8');
    const laneRule = detectLane(fileName, text);
    const titleMatch = text.match(/^#\s+(.+)$/m);
    blueprints.push({
      path: `docs/projects/${fileName}`,
      fileName,
      title: titleMatch?.[1]?.trim() || fileName,
      lane: laneRule.lane,
      rank: laneRule.rank,
      text,
      firstExactTask: extractFirstExactCodingTask(text),
      openDecisionSection: extractOpenDecisionSection(text),
      buildOrderRows: extractBuildOrderRows(text),
      uncheckedChecklistItems: extractUncheckedChecklistItems(text),
      nextStepSignals: extractNextStepSignals(text),
    });
  }

  blueprints.sort((a, b) => a.rank - b.rank || a.fileName.localeCompare(b.fileName));
  return blueprints;
}

function pickBuildableRows(blueprint, attemptedKeys, generation) {
  const tasks = [];
  for (const row of blueprint.buildOrderRows) {
    if (!row.file) continue;
    const key = buildBlueprintQueueKey(blueprint.path, `row:${row.file}`);
    if (attemptedKeys.has(key)) continue;
    if (!row.file.includes('/')) continue;
    if (!/^(routes|services|scripts|public\/overlay|db\/migrations|config|prompts|docs\/projects\/builderos-remediation)\//.test(row.file)) continue;
    const classification = classifyLocalTarget(row.file);
    if (classification.zone === 3) {
      const patchKey = buildBlueprintQueueKey(blueprint.path, `zone3-patch:${row.file}`);
      if (!attemptedKeys.has(patchKey)) {
        const stubTask = buildBlueprintBuildTask(
          blueprint,
          `Build Order Task ${row.order}`,
          `${row.purpose}. Dependency: ${row.dependency}.`,
          row.file,
          row.order,
        );
        tasks.push(buildPatchPlanTask(
          blueprint,
          stubTask,
          generation,
          `Zone 3 target ${row.file} — queue patch plan only, not full-file builder job`,
        ));
        attemptedKeys.add(patchKey);
        attemptedKeys.add(key);
      }
      continue;
    }
    tasks.push(buildBlueprintBuildTask(
      blueprint,
      `Build Order Task ${row.order}`,
      `${row.purpose}. Dependency: ${row.dependency}. Verification: ${row.verification}. Done when: ${row.doneCriteria}.`,
      row.file,
      row.order,
    ));
    if (tasks.length >= 3) break;
  }
  return tasks;
}

async function generateBlueprintTaskBatch(generation, attemptedKeys, state = {}) {
  const blueprints = await readProjectBlueprints();
  const tasks = [];
  const skipProofDocs = PRODUCT_ONLY_FACTORY || shouldPauseBlueprintGeneration(state);
  const skipMemos = PRODUCT_ONLY_FACTORY && process.env.BUILDER_ALLOW_ENHANCEMENT_DOCS !== '1';

  // Pass 1 — product builds only (Builder Reliability Initiative / Layer 2)
  for (const blueprint of blueprints) {
    if (tasks.length >= 10) break;

    if (blueprint.firstExactTask) {
      const targetMatch = blueprint.firstExactTask.match(/`((?:routes|services|scripts|public\/overlay|db\/migrations|config|prompts|docs\/projects\/builderos-remediation)\/[^`]+)`/);
      const targetFile = targetMatch?.[1];
      if (targetFile) {
        const key = buildBlueprintQueueKey(blueprint.path, `exact:${targetFile}`);
        if (!attemptedKeys.has(key)) {
          tasks.push(buildBlueprintBuildTask(
            blueprint,
            'First Exact Coding Task',
            blueprint.firstExactTask,
            targetFile,
          ));
          attemptedKeys.add(key);
          continue;
        }
      }
    }

    const rowTasks = pickBuildableRows(blueprint, attemptedKeys, generation);
    for (const task of rowTasks) {
      tasks.push(task);
      attemptedKeys.add(buildBlueprintQueueKey(blueprint.path, `row:${task.blueprint_source_target || task.target_file}`));
      if (tasks.length >= 10) break;
    }
  }

  if (tasks.length > 0 || PRODUCT_ONLY_FACTORY) {
    return tasks.sort((a, b) => a.priority - b.priority);
  }

  // Legacy memo/proof path — only when BUILDER_ALLOW_PROOF_DOCS=1
  for (const blueprint of blueprints) {
    if (tasks.length >= 10) break;
    let addedForBlueprint = 0;

    if (!skipMemos && blueprint.openDecisionSection && blueprint.lane === 'socialmediaos') {
      const key = buildBlueprintQueueKey(blueprint.path, 'open-decisions');
      if (!attemptedKeys.has(key)) {
        tasks.push(buildEnhancementTask(
          blueprint,
          generation,
          'founder decisions still block direct code start',
          clampSummary(blueprint.openDecisionSection, 900),
          'open-decisions',
        ));
        attemptedKeys.add(key);
        addedForBlueprint += 1;
        continue;
      }
    }

    if (blueprint.firstExactTask) {
      const targetMatch = blueprint.firstExactTask.match(/`((?:routes|services|scripts|public\/overlay|db\/migrations|config|prompts|docs\/projects\/builderos-remediation)\/[^`]+)`/);
      const targetFile = targetMatch?.[1];
      if (targetFile) {
        const key = buildBlueprintQueueKey(blueprint.path, `exact:${targetFile}`);
        if (!attemptedKeys.has(key)) {
          tasks.push(buildBlueprintBuildTask(
            blueprint,
            'First Exact Coding Task',
            blueprint.firstExactTask,
            targetFile,
          ));
          attemptedKeys.add(key);
          addedForBlueprint += 1;
          continue;
        }
      } else {
        const key = buildBlueprintQueueKey(blueprint.path, 'exact-enhancement');
        if (!attemptedKeys.has(key)) {
          tasks.push(buildEnhancementTask(
            blueprint,
            generation,
            'first exact coding task section exists but no safe target file could be inferred',
            clampSummary(blueprint.firstExactTask, 900),
            'exact-enhancement',
          ));
          attemptedKeys.add(key);
          addedForBlueprint += 1;
          continue;
        }
      }
    }

    const rowTasks = pickBuildableRows(blueprint, attemptedKeys, generation);
    if (rowTasks.length > 0) {
      for (const task of rowTasks) {
        tasks.push(task);
        attemptedKeys.add(buildBlueprintQueueKey(blueprint.path, `row:${task.blueprint_source_target || task.target_file}`));
        addedForBlueprint += 1;
        if (tasks.length >= 10) break;
        if (addedForBlueprint >= 3) break;
      }
      if (tasks.length >= 10 || addedForBlueprint >= 3) continue;
    }

    if (!skipMemos) {
      for (let i = 0; i < blueprint.uncheckedChecklistItems.length; i += 1) {
        const item = blueprint.uncheckedChecklistItems[i];
        const key = buildBlueprintQueueKey(blueprint.path, `todo:${item}`);
        if (attemptedKeys.has(key)) continue;
        tasks.push(buildEnhancementTask(
          blueprint,
          generation,
          'unchecked blueprint task remains open',
          item,
          `todo-${i + 1}`,
        ));
        attemptedKeys.add(key);
        addedForBlueprint += 1;
        if (tasks.length >= 10) break;
        if (addedForBlueprint >= 3) break;
      }
    }
    if (tasks.length >= 10 || addedForBlueprint >= 3) continue;

    for (let i = 0; i < blueprint.nextStepSignals.length; i += 1) {
      const signal = blueprint.nextStepSignals[i];
      const key = buildBlueprintQueueKey(blueprint.path, `next:${signal}`);
      if (attemptedKeys.has(key)) continue;
      if (skipProofDocs) continue;
      tasks.push(buildBlueprintProofTask(blueprint, generation, signal, i));
      attemptedKeys.add(key);
      addedForBlueprint += 1;
      if (tasks.length >= 10) break;
      if (addedForBlueprint >= 3) break;
    }
    if (tasks.length >= 10 || addedForBlueprint >= 3) continue;

    if (
      !skipProofDocs &&
      (blueprint.firstExactTask ||
      blueprint.buildOrderRows.length ||
      blueprint.uncheckedChecklistItems.length ||
      blueprint.nextStepSignals.length)
    ) {
      tasks.push(buildBlueprintProofTask(
        blueprint,
        generation,
        blueprint.firstExactTask || blueprint.buildOrderRows[0]?.purpose || 'derive the next smallest blueprint-backed build slice',
        99,
      ));
      addedForBlueprint += 1;
    }
  }

  return tasks.sort((a, b) => a.priority - b.priority);
}

function buildOCVerifyInstruction(oc, targetFile) {
  const safe = oc.id.replace('-', '');
  const fnName = `run${safe}StatusVerification`;
  return `Write ${targetFile}. Export async function ${fnName}({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health and GET /api/v1/builderos/control-plane/health with x-command-key header using Promise.all. Handle fetch errors with try/catch and return { ok: false, error: e.message } on failure. On success return { ok: true, contradiction_id: '${oc.id}', title: ${JSON.stringify(oc.title.slice(0, 80))}, current_status: ${JSON.stringify(oc.status.slice(0, 60))}, resolution_needed: true, kernel_status: kernelData.health?.status || 'unknown', control_plane_status: cpData.status || 'unknown', builds_today: cpData.build?.builds_today || 0, checked_at: new Date().toISOString() }. Use native fetch only. No npm imports. No DB. No process.argv or CLI scaffolding. 40-60 lines total.`;
}

function buildGapVerifyInstruction(gap, targetFile) {
  const safe = gap.id.replace('-', '');
  const fnName = `run${safe}GapVerification`;
  return `Write ${targetFile}. Export async function ${fnName}({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health and GET /api/v1/builderos/control-plane/health with x-command-key header using Promise.all. Handle fetch errors with try/catch and return { ok: false, error: e.message } on failure. On success return { ok: true, gap_id: '${gap.id}', gap_description: ${JSON.stringify(gap.desc.slice(0, 100))}, gap_priority: ${JSON.stringify(gap.priority)}, gap_status: ${JSON.stringify(gap.label.slice(0, 40))}, resolution_required: true, kernel_status: kernelData.health?.status || 'unknown', token_accounting: kernelData.health?.token_accounting?.status || 'unknown', checked_at: new Date().toISOString() }. Use native fetch only. No npm imports. No DB. No process.argv. 40-60 lines total.`;
}

function buildSelfImprovementInstruction(generation, state, targetFile) {
  const fnName = `runRunnerTelemetryG${generation}Verification`;
  return `Write ${targetFile}. Export async function ${fnName}({ baseUrl, commandKey }) that fetches GET /api/v1/builderos/control-plane/health and GET /api/v1/lifeos/autonomous-telemetry/efficiency with x-command-key header using Promise.all. Handle fetch errors with try/catch. On success return { ok: true, generation: ${generation}, session_tasks_done: ${state.tasks_done}, session_successful: ${state.successful_repairs}, session_failed: ${state.failed_repairs}, session_governance_blocks: ${state.governance_prevented_drift}, builds_today: cpData.build?.builds_today || 0, without_proof: cpData.build?.without_proof || 0, efficiency_summary: effData.efficiency?.summary || null, runner_assessment: 'continuous_autonomous_operation_verified', checked_at: new Date().toISOString() }. Use native fetch only. No npm imports. No DB. No process.argv. 50-65 lines total.`;
}

async function readOpenContradictions() {
  try {
    const text = await fs.readFile(path.join(ROOT, 'docs/architecture/OPEN_CONTRADICTIONS.md'), 'utf8');
    const sections = text.split(/(?=^### OC-)/m).filter((section) => section.startsWith('### OC-'));
    return sections.map((section) => {
      const hdr = section.match(/^### (OC-\d+) — (.+)/m);
      if (!hdr) return null;
      const statusRow = section.match(/\|\s*\*\*Status\*\*\s*\|\s*\*\*([^*]+)\*\*/);
      const rawStatus = statusRow?.[1]?.trim() || '';
      if (rawStatus.toUpperCase().includes('RESOLVED')) return null;
      return { id: hdr[1], title: hdr[2].trim(), status: rawStatus };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function readOpenGaps() {
  try {
    const text = await fs.readFile(path.join(ROOT, 'docs/architecture/PLATFORM_GAP_REGISTER.md'), 'utf8');
    const rows = text.match(/\|\s*(GAP-\d+)\s*\|([^|]+)\|([^|]+)\|[^|]+\|([^|]+)\|/g) || [];
    return rows.map((row) => {
      const cols = row.split('|').map((col) => col.trim()).filter(Boolean);
      if (cols.length < 4) return null;
      const [id, desc, priority, label] = cols;
      if (!id.startsWith('GAP-')) return null;
      if ((label || '').includes('RESOLVED')) return null;
      return { id, desc: desc.slice(0, 100), priority: priority.trim(), label: (label || '').trim() };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function generateSupportTaskBatch(generation, attemptedKeys, state) {
  const tasks = [];
  const openOCs = await readOpenContradictions();
  for (const oc of openOCs) {
    const tf = `scripts/verify-${oc.id.toLowerCase()}-status.mjs`;
    const key = `support::${tf}`;
    if (attemptedKeys.has(key)) continue;
    tasks.push({
      id: `${oc.id}-status-verify-g${generation}`,
      priority: 800 + tasks.length,
      category: 'support_open_contradiction',
      ref: oc.id,
      lane: 'support',
      zone: 'Z1',
      target_file: tf,
      instruction: buildOCVerifyInstruction(oc, tf),
    });
    attemptedKeys.add(key);
    if (tasks.length >= 3) break;
  }

  const openGaps = await readOpenGaps();
  for (const gap of openGaps) {
    if (tasks.length >= 5) break;
    const tf = `scripts/verify-${gap.id.toLowerCase()}-gap.mjs`;
    const key = `support::${tf}`;
    if (attemptedKeys.has(key)) continue;
    tasks.push({
      id: `${gap.id}-gap-verify-g${generation}`,
      priority: 850 + tasks.length,
      category: 'support_platform_gap',
      ref: gap.id,
      lane: 'support',
      zone: 'Z1',
      target_file: tf,
      instruction: buildGapVerifyInstruction(gap, tf),
    });
    attemptedKeys.add(key);
  }

  if (tasks.length === 0) {
    const tf = `scripts/verify-runner-telemetry-g${generation}.mjs`;
    const key = `support::${tf}`;
    if (!attemptedKeys.has(key)) {
      tasks.push({
        id: `runner-self-improvement-g${generation}`,
        priority: 999,
        category: 'support_self_improvement',
        lane: 'support',
        zone: 'Z1',
        target_file: tf,
        instruction: buildSelfImprovementInstruction(generation, state, tf),
      });
      attemptedKeys.add(key);
    }
  }

  return tasks;
}

// Returns local-only infra recovery tasks that do NOT call the Railway API.
// These run when infrastructure_degraded=true to avoid the 502 → task → 502 churn loop.
// Each task has requires_api=false so runLocalTask() handles it instead of runTask().
function generateInfraRecoveryTasks(generation) {
  return [
    {
      id: `infra-health-check-g${generation}`,
      priority: 0,
      category: 'infra_recovery',
      lane: 'infra',
      zone: 'Z0',
      action_type: 'railway_health_check',
      requires_api: false,
      target_file: null,
      instruction: 'Check Railway health — if 200 OK clear infrastructure_degraded and resume blueprint work.',
    },
    {
      id: `syntax-audit-g${generation}`,
      priority: 1,
      category: 'infra_recovery',
      lane: 'infra',
      zone: 'Z0',
      action_type: 'syntax_audit',
      requires_api: false,
      target_file: null,
      instruction: 'Run node --check on all .js/.mjs files in routes/, services/, scripts/. Report failures.',
    },
    {
      id: `status-summary-g${generation}`,
      priority: 2,
      category: 'infra_recovery',
      lane: 'infra',
      zone: 'Z0',
      action_type: 'status_summary',
      requires_api: false,
      target_file: null,
      instruction: 'Write data/governed-autonomy-status-summary.json with current runner state.',
    },
  ];
}

// MISSION ADVANCEMENT DOCTRINE: Active is not enough. Productive work is required.
// When infrastructure is degraded, only generate local tasks (no Railway dependency).
// This breaks the 502 → support-task → 502 circular churn that was the prior failure mode.
async function generateNextTaskBatch(generation, attemptedKeys, state) {
  if (state.infrastructure_degraded) {
    const infraTasks = generateInfraRecoveryTasks(generation);
    const fresh = infraTasks.filter((t) => !attemptedKeys.has(t.id));
    if (fresh.length > 0) {
      return { source: 'infra_recovery', tasks: fresh, choice_reason: 'infrastructure_degraded — local recovery only' };
    }
    infraBackoffIndex = Math.min(infraBackoffIndex + 1, INFRA_RECOVERY_BACKOFF_MS.length - 1);
    return { source: 'infra_recovery_backoff', tasks: [], choice_reason: 'infra backoff — no local tasks left' };
  }
  if (shouldPauseBlueprintGeneration(state)) {
    const diagnoseTasks = generateInfraRecoveryTasks(generation).map((t) => ({
      ...t,
      id: `${t.id}-churn-diagnose`,
      category: 'churn_diagnosis',
      instruction: `${t.instruction} Churn diagnosis: ${state.consecutive_no_founder_value} consecutive tasks without founder_value_deliveries. Pause proof-doc generation.`,
    }));
    const fresh = diagnoseTasks.filter((t) => !attemptedKeys.has(t.id));
    if (fresh.length > 0) {
      return {
        source: 'churn_diagnosis',
        tasks: fresh,
        choice_reason: `${state.consecutive_no_founder_value} tasks without founder value — diagnose before more blueprint churn`,
      };
    }
  }
  if (PRODUCT_ONLY_FACTORY) {
    const recycled = recycleRetryableProductKeys(attemptedKeys, state);
    if (recycled > 0) {
      await appendLog('product_keys_recycled', { generation, recycled, reason: 'HTTP_502 retry on blueprint product targets' });
    }
  }

  const blueprintTasks = await generateBlueprintTaskBatch(generation, attemptedKeys, state);
  if (blueprintTasks.length > 0) {
    const valued = applyValueEngineToBatch(blueprintTasks, state);
    const tasks = valued.map(({ task, score }) => ({
      ...task,
      value_score: score,
    }));
    return {
      source: 'blueprints',
      tasks,
      choice_reason: `value-ranked blueprint queue (active_mission=${state.active_mission || 'unset'}, top_notice=${tasks[0]?.value_score?.adamNoticeability ?? '?'})`,
    };
  }

  if (PRODUCT_ONLY_FACTORY) {
    const remainingProduct = await estimateRemainingProductTasks(attemptedKeys);
    if (remainingProduct > 0) {
      return {
        source: 'product_only_backoff',
        tasks: [],
        choice_reason: `product-only: ${remainingProduct} product task(s) remain — suppress support/verify; backoff`,
      };
    }
    if (hasExplicitProductBlockerReceipt(state)) {
      const infraTasks = generateInfraRecoveryTasks(generation).filter((t) => !attemptedKeys.has(t.id));
      if (infraTasks.length > 0) {
        return {
          source: 'product_blocker_recovery',
          tasks: infraTasks,
          choice_reason: 'product-only: explicit product blocker receipt — local infra recovery only (no support/verify)',
        };
      }
    }
    return {
      source: 'product_only_idle',
      tasks: [],
      choice_reason: 'product-only: no product tasks remain — support/verify suppressed',
    };
  }

  const supportTasks = await generateSupportTaskBatch(generation, attemptedKeys, state);
  return { source: 'support', tasks: supportTasks, choice_reason: 'blueprint queue exhausted — fallback support only' };
}

async function appendLog(event, payload = {}) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...payload }) + '\n';
  await fs.appendFile(LOG_PATH, line, 'utf8');
  process.stdout.write(line);
}

async function writeState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

async function appendBuilderFailureLesson(task, blockerCode, state) {
  const lessonPath = path.join(ROOT, 'data', 'builder-failure-lessons.jsonl');
  const entry = {
    ts: new Date().toISOString(),
    task_id: task.id,
    target_file: task.target_file || null,
    blueprint_path: task.blueprint_path || null,
    blocker: blockerCode,
    blocker_family: blockerCategory(blockerCode),
    founder_value_deliveries: state.founder_value_deliveries,
    consecutive_no_founder_value: state.consecutive_no_founder_value,
    lesson: isKnownChurnBlocker(blockerCode)
      ? `Known churn blocker ${blockerCode} — route to blocker repair, not another proof doc`
      : `Builder failure on ${task.target_file || task.id}: ${blockerCode}`,
  };
  await fs.mkdir(path.dirname(lessonPath), { recursive: true });
  await fs.appendFile(lessonPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function callApi(method, apiPath, body) {
  const res = await fetch(`${BASE_URL}${apiPath}`, {
    method,
    headers: { 'x-command-key': KEY, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = { raw_error: 'non_json_response', status: res.status };
  }
  if (res.status === 502) {
    consecutive502s++;
  } else {
    consecutive502s = 0;
  }
  return { status: res.status, body: json };
}

async function pollCommandControlJob(jobId, meta) {
  const t0 = Date.now();
  while (Date.now() - t0 < JOB_EXECUTE_POLL_MAX_MS) {
    const poll = await callApi('GET', `/api/v1/lifeos/builderos/command-control/jobs/${jobId}`);
    const job = poll.body?.job;
    if (!job) {
      return { status: poll.status, body: poll.body };
    }
    if (['committed', 'failed', 'blocked', 'halted', 'cancelled'].includes(job.status)) {
      const trace = job.result_json?.trace || job.result_json || {};
      return {
        status: job.status === 'committed' ? 200 : 422,
        body: { job, result: { trace } },
      };
    }
    await appendLog('task_execute_poll', {
      ...meta,
      job_id: jobId,
      job_status: job.status,
      poll_ms: Date.now() - t0,
    });
    await new Promise((resolve) => setTimeout(resolve, JOB_EXECUTE_POLL_MS));
  }
  return { status: 502, body: { error: 'job_poll_timeout', job_id: jobId } };
}

function syntaxCheck(filePath) {
  try {
    execSync(`node --check ${JSON.stringify(filePath)}`, { stdio: 'pipe', shell: '/bin/zsh' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.stderr?.toString?.()?.slice(0, 200) || 'syntax_error' };
  }
}

function classifyBlocker(job, execResult) {
  const blocker = job?.blocker || execResult?.body?.job?.blocker || '';
  if (HARD_BLOCKERS.has(blocker)) return { hard: true, code: blocker };
  const traceBlocker = execResult?.body?.result?.trace?.blocker || '';
  if (traceBlocker === 'ZONE3_PATCH_REQUIRED') return { hard: false, code: 'ZONE3_PATCH_REQUIRED', zone3: true };
  if (blocker === 'ZONE3_PATCH_REQUIRED') return { hard: false, code: 'ZONE3_PATCH_REQUIRED', zone3: true };
  if (execResult?.status >= 500) return { hard: false, code: `HTTP_${execResult.status}` };
  return { hard: false, code: blocker || traceBlocker || 'UNKNOWN_FAILURE' };
}

async function runTask(task, state) {
  const t0 = Date.now();
  const meta = {
    task_id: task.id,
    priority: task.priority,
    category: task.category,
    lane: task.lane || null,
    ref: task.ref,
    zone: task.zone,
    target_file: task.target_file,
    expected_blocker: task.expected_blocker || null,
    blueprint_path: task.blueprint_path || null,
    blueprint_section: task.blueprint_section || null,
  };

  await appendLog('task_start', meta);

  if (DRY_RUN) {
    await appendLog('task_dry_run', { ...meta, wall_ms: Date.now() - t0 });
    return { ok: true, dry_run: true };
  }

  let createResult;
  try {
    createResult = await callApi('POST', '/api/v1/lifeos/builderos/command-control/jobs', {
      instruction: task.instruction,
      requested_by: 'governed_overnight_backlog_run',
      metadata_json: {
        target_file: task.target_file,
        task_id: task.id,
        category: task.category,
        lane: task.lane || null,
        priority: task.priority,
        ref: task.ref || null,
        zone: task.zone,
        expected_blocker: task.expected_blocker || null,
        mission: task.mission_id || state.active_mission || 'TSOS_CONTINUOUS_AUTONOMOUS_OPS',
        mission_id: task.mission_id || state.active_mission_id || null,
        operations_directive: 'prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md',
        session: new Date().toISOString().slice(0, 10),
        blueprint_path: task.blueprint_path || null,
        blueprint_section: task.blueprint_section || null,
        blueprint_title: task.blueprint_title || null,
        blueprint_source_target: task.blueprint_source_target || null,
      },
    });
  } catch (error) {
    await appendLog('task_create_error', { ...meta, error: error.message, wall_ms: Date.now() - t0 });
    return { ok: false, error: error.message, stage: 'create' };
  }

  const job = createResult.body?.job;
  if (!job?.id || job.status === 'blocked' || job.status === 'halted') {
    const blocker = job?.blocker;
    const isHard = HARD_BLOCKERS.has(blocker);
    await appendLog('task_create_blocked', { ...meta, blocker, hard: isHard, wall_ms: Date.now() - t0 });
    return { ok: false, blocker, hard: isHard, stage: 'create' };
  }

  const jobId = job.id;
  await appendLog('task_job_created', { ...meta, job_id: jobId });

  let execResult;
  try {
    execResult = await callApi('POST', `/api/v1/lifeos/builderos/command-control/jobs/${jobId}/execute`, {});
    if (execResult.status === 202 && execResult.body?.accepted) {
      await appendLog('task_execute_async_accepted', { ...meta, job_id: jobId });
      execResult = await pollCommandControlJob(jobId, meta);
    }
  } catch (error) {
    await appendLog('task_execute_error', { ...meta, job_id: jobId, error: error.message, wall_ms: Date.now() - t0 });
    return { ok: false, error: error.message, stage: 'execute', job_id: jobId };
  }

  const execJob = execResult.body?.job;
  const trace = execResult.body?.result?.trace || {};
  const committed = trace.builder_output?.committed === true;
  const targetFile = trace.builder_output?.target_file || task.target_file;
  const oilVerified = trace.builder_output?.kernel_receipts?.oil?.verified === true;
  const oilId = trace.builder_output?.kernel_receipts?.oil?.id || null;
  const tokenVerified = trace.builder_output?.kernel_receipts?.token?.verified === true;
  const tokenId = trace.builder_output?.kernel_receipts?.token?.id || null;

  if (execJob?.status === 'committed' && committed) {
    let syntaxResult = { ok: true };
    const absPath = path.join(ROOT, targetFile);
    try {
      await fs.access(absPath);
      syntaxResult = syntaxCheck(absPath);
    } catch {
      // remote commit may not yet exist locally
    }

    await appendLog('task_success', {
      ...meta,
      job_id: jobId,
      committed: true,
      target_file: targetFile,
      oil_verified: oilVerified,
      oil_id: oilId,
      token_verified: tokenVerified,
      token_id: tokenId,
      syntax_ok: syntaxResult.ok,
      wall_ms: Date.now() - t0,
    });

    state.successes.push({
      task_id: task.id,
      job_id: jobId,
      committed: true,
      oil_verified: oilVerified,
      token_verified: tokenVerified,
      blueprint_path: task.blueprint_path || null,
    });
    state.autonomous_decisions++;
    if (oilVerified && tokenVerified) {
      state.successful_repairs++;
      state.founder_value_deliveries++;
      state.consecutive_no_founder_value = 0;
    } else {
      state.consecutive_no_founder_value = (state.consecutive_no_founder_value || 0) + 1;
    }
    return { ok: true, committed: true, job_id: jobId, oil_verified: oilVerified, token_verified: tokenVerified };
  }

  const blockerInfo = classifyBlocker(job, execResult);
  const isZone3 = blockerInfo.zone3 || task.expected_blocker === 'ZONE3_PATCH_REQUIRED';
  const isExpected = Boolean(task.expected_blocker && blockerInfo.code === task.expected_blocker);

  await appendLog('task_failed', {
    ...meta,
    job_id: jobId,
    committed: false,
    blocker: blockerInfo.code,
    hard: blockerInfo.hard,
    zone3: isZone3,
    expected: isExpected,
    lesson: isZone3
      ? `Zone 3 blocked — ${task.target_file} requires patch-plan follow-up`
      : `Failed at execute with blocker: ${blockerInfo.code}`,
    wall_ms: Date.now() - t0,
  });

  state.failures.push({
    task_id: task.id,
    job_id: jobId,
    blocker: blockerInfo.code,
    zone3: isZone3,
    expected: isExpected,
    blueprint_path: task.blueprint_path || null,
  });
  if (!isZone3) state.failed_repairs++;
  if (isZone3) state.governance_prevented_drift++;
  state.consecutive_no_founder_value = (state.consecutive_no_founder_value || 0) + 1;
  await appendBuilderFailureLesson(task, blockerInfo.code, state).catch(() => {});

  const baseId = taskBaseId(task.id);
  const category = blockerCategory(blockerInfo.code);
  state.blocked_attempts[baseId] = {
    blocker: blockerInfo.code,
    category,
    at: new Date().toISOString(),
    target_file: task.target_file,
  };

  return {
    ok: false,
    blocker: blockerInfo.code,
    hard: blockerInfo.hard,
    zone3: isZone3,
    expected: isExpected,
    job_id: jobId,
  };
}

async function main() {
  try {
    await fs.access(LOCK_PATH);
    console.error('[BACKLOG-RUN] Lock file exists. Delete data/governed-autonomy-backlog.lock to force start.');
    process.exit(1);
  } catch {
    // proceed
  }

  if (!BASE_URL || !KEY) {
    console.error('[BACKLOG-RUN] HARD BLOCKER: PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing.');
    process.exit(1);
  }

  await fs.writeFile(LOCK_PATH, String(process.pid), 'utf8');

  process.on('SIGTERM', async () => {
    await appendLog('orchestrator_operator_stop', { signal: 'SIGTERM', reason: 'operator_requested' });
    try { await fs.unlink(LOCK_PATH); } catch {}
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await appendLog('orchestrator_operator_stop', { signal: 'SIGINT', reason: 'operator_requested' });
    try { await fs.unlink(LOCK_PATH); } catch {}
    process.exit(0);
  });

  const CHECKPOINT_MS = CHECKPOINT_EVERY_MIN * 60 * 1000;
  let nextCheckpoint = Date.now() + CHECKPOINT_MS;

  const state = {
    status: 'running',
    started_at: new Date().toISOString(),
    checkpoint_every_min: CHECKPOINT_EVERY_MIN,
    dry_run: DRY_RUN,
    tasks_total: 0,
    tasks_done: 0,
    generation_count: 0,
    autonomous_decisions: 0,
    successful_repairs: 0,
    failed_repairs: 0,
    governance_prevented_drift: 0,
    blueprint_tasks_generated: 0,
    support_tasks_generated: 0,
    first_blueprint_selected: null,
    first_job_id: null,
    successes: [],
    failures: [],
    lessons: [],
    founder_value_deliveries: 0,
    consecutive_no_founder_value: 0,
    active_mission: 'MarketingOS / Am 41',
    active_mission_id: null,
    task_choice_reason: null,
    blocked_attempts: {},
    local_verifications: [],
    infrastructure_degraded: false,
    current_task: null,
    // Mission Advancement Doctrine fields — track whether work is advancing mission or just motion
    productive_work: false,
    productive_work_last_at: null,
    consecutive_infra_failures: 0,
    churn_count: 0,
    work_classification_last: null,
    infra_backoff_index: 0,
    stop_reason: null,
    stop_law: 'ONLY: operator_stop | capacity_exhausted | safety_boundary | repo_corruption. Active is not enough — productive work is required. HTTP_502 → redirect to local work (not idle). See prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md',
  };

  await appendLog('orchestrator_start', {
    checkpoint_every_min: CHECKPOINT_EVERY_MIN,
    dry_run: DRY_RUN,
    base_url: BASE_URL.slice(0, 50),
    key_len: KEY.length,
    workflow: 'BLUEPRINT_FIRST',
    operations_directive: 'prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md',
    success_metrics: 'founder_value_deliveries (oil+token+committed), not commit_count',
    queue_priority: ['SocialMediaOS/MarketingOS', 'C2/Command Control (when needed for MarketingOS)', 'LifeOS/LimitlessOS (only if needed by MarketingOS)', 'TC', 'TSOS platform improvements'],
    fallback_queue: ['OPEN_CONTRADICTIONS.md', 'PLATFORM_GAP_REGISTER.md', 'self_improvement'],
  });
  await writeState(state);

  const workQueue = [];
  const attemptedKeys = new Set();
  const completedIds = new Set();

  let hardStop = false;
  while (!hardStop) {
    if (Date.now() >= nextCheckpoint) {
      const wallMin = ((Date.now() - new Date(state.started_at).getTime()) / 60000).toFixed(1);
      await appendLog('checkpoint_reached_continue', {
        wall_min: wallMin,
        tasks_done: state.tasks_done,
        generation_count: state.generation_count,
        founder_value_deliveries: state.founder_value_deliveries,
        autonomous_decisions: state.autonomous_decisions,
        successful_repairs: state.successful_repairs,
        failed_repairs: state.failed_repairs,
        governance_prevented_drift: state.governance_prevented_drift,
        blueprint_tasks_generated: state.blueprint_tasks_generated,
        support_tasks_generated: state.support_tasks_generated,
        infrastructure_degraded: state.infrastructure_degraded,
        queue_depth: workQueue.length,
        productive_work: state.productive_work,
        productive_work_last_at: state.productive_work_last_at,
        consecutive_infra_failures: state.consecutive_infra_failures,
        churn_count: state.churn_count,
        work_classification_last: state.work_classification_last,
        infra_backoff_index: infraBackoffIndex,
        action: 'CONTINUING — checkpoint is NOT a stop condition. Active is not enough; productive work is required.',
      });
      await writeState(state);
      nextCheckpoint = Date.now() + CHECKPOINT_MS;
    }

    // INFRA DEGRADATION GUARD — Mission Advancement Doctrine
    // At INFRA_REDIRECT_AT_502 (3) consecutive task-level 502 failures: mark degraded,
    // flush Railway-dependent queue, redirect to local-only infra_recovery tasks.
    // NOTE: consecutive502s (call-level) oscillates when CREATE succeeds but EXECUTE 502s.
    // Use state.consecutive_infra_failures (task-level) as the reliable trigger.
    if ((state.consecutive_infra_failures >= INFRA_REDIRECT_AT_502 || consecutive502s >= INFRA_REDIRECT_AT_502) && !state.infrastructure_degraded) {
      state.infrastructure_degraded = true;
      infraBackoffIndex = 0;
      workQueue.length = 0; // flush Railway-dependent tasks; infra_recovery tasks generated next
      await appendLog('infrastructure_degraded', {
        consecutive_502s: consecutive502s,
        threshold: INFRA_REDIRECT_AT_502,
        action: 'queue_flushed — redirecting to local infra_recovery tasks only',
        law: 'ACTIVE IS NOT ENOUGH. PRODUCTIVE WORK IS REQUIRED.',
        next: 'generateNextTaskBatch will return railway_health_check, syntax_audit, status_summary',
      });
      await writeState(state);
    }

    // Hard stop only if infra has been degraded for MAX_CONSECUTIVE_502 task-level failures
    // (not just call-level). This is tracked via consecutive_infra_failures.
    if (state.consecutive_infra_failures >= MAX_CONSECUTIVE_502 * 4) {
      await appendLog('orchestrator_hard_stop', {
        blocker: 'SERVICE_OUTAGE',
        reason: `${state.consecutive_infra_failures} consecutive infra failures with no recovery`,
      });
      state.status = 'hard_stop';
      state.stop_reason = 'SERVICE_OUTAGE';
      hardStop = true;
      break;
    }

    if (workQueue.length === 0) {
      state.generation_count++;
      const batch = await generateNextTaskBatch(state.generation_count, attemptedKeys, state);
      const newTasks = batch.tasks || [];

      await appendLog('queue_rebuild', {
        generation: state.generation_count,
        mode: batch.source,
        choice_reason: batch.choice_reason || null,
        active_mission: state.active_mission,
        founder_value_deliveries: state.founder_value_deliveries,
        consecutive_no_founder_value: state.consecutive_no_founder_value,
        productive_work: state.productive_work,
        new_tasks: newTasks.length,
        task_ids: newTasks.map((task) => task.id),
        target_files: newTasks.map((task) => task.target_file),
        blueprint_paths: newTasks.map((task) => task.blueprint_path).filter(Boolean),
        message: batch.source === 'blueprints'
          ? 'Primary queue rebuilt from docs/projects/*.md blueprints.'
          : 'Blueprint queue exhausted for this generation; support tasks queued as fallback.',
      });

      if (newTasks.length === 0) {
        const isInfraBackoff = batch.source === 'infra_recovery_backoff';
        const sleepMs = isInfraBackoff
          ? INFRA_RECOVERY_BACKOFF_MS[Math.max(0, infraBackoffIndex - 1)]
          : 60_000;
        state.infra_backoff_index = infraBackoffIndex;
        await appendLog('generator_temporarily_empty', {
          generation: state.generation_count,
          source: batch.source,
          sleep_ms: sleepMs,
          infrastructure_degraded: state.infrastructure_degraded,
          consecutive_infra_failures: state.consecutive_infra_failures,
          message: isInfraBackoff
            ? `Infrastructure degraded — backing off ${sleepMs}ms before Railway health retry. Law: Active is not enough; productive work is required.`
            : 'Generator returned 0 tasks. Pausing 60s before retry. Will not stop.',
        });
        await writeState(state);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
        continue;
      }

      state.task_choice_reason = batch.choice_reason || null;
      const sorted = newTasks.sort((a, b) => {
        const sa = a.value_score || scoreTask(a);
        const sb = b.value_score || scoreTask(b);
        const dc = (sb.composite ?? 0) - (sa.composite ?? 0);
        if (dc !== 0) return dc;
        return (a.priority || 999) - (b.priority || 999);
      });
      workQueue.push(...sorted);
      if (batch.source === 'blueprints') {
        state.blueprint_tasks_generated += newTasks.length;
        if (!state.first_blueprint_selected) {
          state.first_blueprint_selected = newTasks[0]?.blueprint_path || null;
        }
      } else {
        state.support_tasks_generated += newTasks.length;
      }
      state.tasks_total = state.tasks_done + workQueue.length;
      await writeState(state);
      continue;
    }

    const task = workQueue.shift();
    if (completedIds.has(task.id)) continue;
    completedIds.add(task.id);

    if (PRODUCT_ONLY_FACTORY && SUPPORT_TASK_CATEGORY_RE.test(task.category || '')) {
      await appendLog('task_skip_support_product_only', {
        task_id: task.id,
        category: task.category,
        target_file: task.target_file,
      });
      state.tasks_done++;
      await writeState(state);
      continue;
    }

    state.current_task = task.id;
    if (task.blueprint_path?.includes('AMENDMENT_41')) {
      state.active_mission = 'MarketingOS / Am 41';
    }
    state.tasks_total = state.tasks_done + workQueue.length + 1;
    await writeState(state);

    const knownBad = shouldSkipKnownBadTask(task, state.blocked_attempts);
    if (knownBad.skip) {
      await appendLog('task_skip_known_bad', {
        task_id: task.id,
        reason: knownBad.reason,
        value_score: task.value_score || scoreTask(task),
      });
      state.tasks_done++;
      await writeState(state);
      continue;
    }

    const taskScore = task.value_score || scoreTask(task);
    if (task.requires_api !== false && isLowValueProofDocTask(task)) {
      await appendLog('task_skip_low_value_proof_doc', {
        task_id: task.id,
        target_file: task.target_file,
        value_score: taskScore,
      });
      state.tasks_done++;
      await writeState(state);
      continue;
    }

    const result = task.requires_api === false
      ? await runLocalTask(task, state)
      : await runTask(task, state);
    if (!state.first_job_id && result.job_id) {
      state.first_job_id = result.job_id;
    }

    // Mission Advancement Doctrine — classify work and track productive vs churn.
    const workClass = classifyWorkAdvancement(task, result);
    state.work_classification_last = workClass;
    if (workClass === 'mission_advancing') {
      state.productive_work = true;
      state.productive_work_last_at = new Date().toISOString();
      state.churn_count = 0;
      state.consecutive_infra_failures = 0;
    } else if (workClass === 'blocker_reduction') {
      state.productive_work = true;
      if (result.ok) state.consecutive_infra_failures = 0; // successful local work = infra recovered
    } else if (workClass === 'churn') {
      state.productive_work = false;
      state.churn_count = (state.churn_count || 0) + 1;
      state.consecutive_infra_failures = (state.consecutive_infra_failures || 0) + 1;
    } else {
      // mission_supporting or learning — productive by effort even if not value-delivering
      state.productive_work = result.ok || false;
    }

    if (result.hard) {
      await appendLog('orchestrator_hard_stop', { blocker: result.blocker, task_id: task.id });
      state.status = 'hard_stop';
      state.stop_reason = result.blocker;
      hardStop = true;
      break;
    }

    if (!result.ok && result.zone3 && task.category === 'blueprint_build' && task.blueprint_path) {
      const blueprint = {
        path: task.blueprint_path,
        title: task.blueprint_title || task.blueprint_path,
        lane: task.lane,
      };
      const followUp = buildPatchPlanTask(blueprint, task, state.generation_count, result.blocker || 'ZONE3_PATCH_REQUIRED');
      if (!completedIds.has(followUp.id)) {
        workQueue.push(followUp);
        await appendLog('zone3_follow_up_queued', {
          task_id: task.id,
          follow_up_task_id: followUp.id,
          patch_plan_target: followUp.target_file,
          source_blueprint: task.blueprint_path,
        });
      }
    }

    if (!result.ok && !result.dry_run && !result.zone3) {
      const baseId = taskBaseId(task.id);
      const failCode = result.blocker || result.error || 'UNKNOWN_FAILURE';
      const category = blockerCategory(failCode);
      const prior = state.blocked_attempts[baseId];
      const shouldSkipRetry = NO_RETRY_BLOCKERS.has(failCode)
        || failCode.startsWith('HTTP_5')
        || (prior && prior.blocker === failCode)
        || (prior && prior.category === category && category !== 'other');

      if (shouldSkipRetry) {
        await appendLog('task_redirect_skip_retry', {
          task_id: task.id,
          blocker: failCode,
          category,
          reason: 'TSOS_CONTINUOUS_AUTONOMOUS_OPS — no repeated retry on same blocker class',
        });
      } else {
        const retryTask = {
          ...task,
          id: `${task.id}_retry`,
          instruction: `${task.instruction} Keep the implementation minimal and aligned to the blueprint. Focus only on the named target and required return shape.`,
        };
        await appendLog('task_retry', { task_id: task.id, retry_id: retryTask.id, blocker: failCode, category });
        const retryResult = await runTask(retryTask, state);
        if (!state.first_job_id && retryResult.job_id) {
          state.first_job_id = retryResult.job_id;
        }
        if (retryResult.hard) {
          await appendLog('orchestrator_hard_stop', { blocker: retryResult.blocker, task_id: retryTask.id });
          state.status = 'hard_stop';
          state.stop_reason = retryResult.blocker;
          hardStop = true;
          break;
        }
      }
    }

    state.tasks_done++;
    await writeState(state);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  state.completed_at = new Date().toISOString();
  await appendLog('orchestrator_stop', {
    stop_reason: state.stop_reason,
    tasks_done: state.tasks_done,
    generation_count: state.generation_count,
    founder_value_deliveries: state.founder_value_deliveries,
    autonomous_decisions: state.autonomous_decisions,
    successful_repairs: state.successful_repairs,
    failed_repairs: state.failed_repairs,
    governance_prevented_drift: state.governance_prevented_drift,
    infrastructure_degraded: state.infrastructure_degraded,
    wall_min: ((Date.now() - new Date(state.started_at).getTime()) / 60000).toFixed(1),
    valid_stop: true,
  });
  await writeState(state);
  try { await fs.unlink(LOCK_PATH); } catch {}
}

main().catch(async (error) => {
  await appendLog('orchestrator_crash', { error: error.message, stack: error.stack?.slice(0, 500) });
  try { await fs.unlink(LOCK_PATH); } catch {}
  process.exit(1);
});
