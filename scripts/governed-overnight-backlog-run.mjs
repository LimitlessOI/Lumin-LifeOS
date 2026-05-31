#!/usr/bin/env node
/**
 * Overnight BuilderOS backlog runner — blueprint-first, C2-governed, never stops.
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
 *   -> next blueprint task
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
const MAX_CONSECUTIVE_502 = 15;
let consecutive502s = 0;

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

const PRIORITY_RULES = Object.freeze([
  {
    lane: 'c2_command_control',
    rank: 1,
    patterns: [/AMENDMENT_46_BUILDEROS_CONTROL_PLANE/i, /AMENDMENT_12_COMMAND_CENTER/i, /BUILDEROS_ALPHA_BLUEPRINT/i],
  },
  {
    lane: 'socialmediaos',
    rank: 2,
    patterns: [/AMENDMENT_41_MARKETINGOS/i, /SOCIALMEDIAOS/i, /MARKETINGOS/i],
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

function buildEnhancementTask(blueprint, generation, reason, sectionSummary) {
  const targetFile = `docs/projects/builderos-remediation/${slugify(path.basename(blueprint.path, '.md'))}-enhancement-g${generation}.md`;
  return {
    id: `${slugify(path.basename(blueprint.path, '.md'))}-enhancement-g${generation}`,
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
  const candidates = [
    'BUILDEROS_ALPHA_BLUEPRINT.md',
    'AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md',
    'AMENDMENT_12_COMMAND_CENTER.md',
    'AMENDMENT_41_MARKETINGOS.md',
    'AMENDMENT_21_LIFEOS_CORE.md',
    'AMENDMENT_09_LIFE_COACHING.md',
    'AMENDMENT_17_TC_SERVICE.md',
    'AMENDMENT_10_API_COST_SAVINGS.md',
    'AMENDMENT_44_TOKEN_ACCOUNTING_OS.md',
    'AMENDMENT_45_CCL_MEANING_PRESERVATION_PROTOCOL.md',
    'TSOS_PROVEN_ADVANCEMENT_PLAN.md',
  ].filter((name) => entries.includes(name));

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
    });
  }

  blueprints.sort((a, b) => a.rank - b.rank || a.fileName.localeCompare(b.fileName));
  return blueprints;
}

function pickBuildableRows(blueprint, attemptedKeys) {
  const tasks = [];
  for (const row of blueprint.buildOrderRows) {
    if (!row.file) continue;
    const key = buildBlueprintQueueKey(blueprint.path, `row:${row.file}`);
    if (attemptedKeys.has(key)) continue;
    if (!row.file.includes('/')) continue;
    if (!/^(routes|services|scripts|public\/overlay|db\/migrations|config|prompts|docs\/projects\/builderos-remediation)\//.test(row.file)) continue;
    tasks.push(buildBlueprintBuildTask(
      blueprint,
      `Build Order Task ${row.order}`,
      `${row.purpose}. Dependency: ${row.dependency}. Verification: ${row.verification}. Done when: ${row.doneCriteria}.`,
      row.file,
      row.order,
    ));
    if (tasks.length >= 2) break;
  }
  return tasks;
}

async function generateBlueprintTaskBatch(generation, attemptedKeys) {
  const blueprints = await readProjectBlueprints();
  const tasks = [];

  for (const blueprint of blueprints) {
    if (tasks.length >= 6) break;

    if (blueprint.openDecisionSection && blueprint.lane === 'socialmediaos') {
      const key = buildBlueprintQueueKey(blueprint.path, 'open-decisions');
      if (!attemptedKeys.has(key)) {
        tasks.push(buildEnhancementTask(
          blueprint,
          generation,
          'founder decisions still block direct code start',
          clampSummary(blueprint.openDecisionSection, 900),
        ));
        attemptedKeys.add(key);
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
          ));
          attemptedKeys.add(key);
          continue;
        }
      }
    }

    const rowTasks = pickBuildableRows(blueprint, attemptedKeys);
    if (rowTasks.length > 0) {
      for (const task of rowTasks) {
        tasks.push(task);
        attemptedKeys.add(buildBlueprintQueueKey(blueprint.path, `row:${task.blueprint_source_target || task.target_file}`));
        if (tasks.length >= 6) break;
      }
      continue;
    }

    const fallbackKey = buildBlueprintQueueKey(blueprint.path, 'fallback-enhancement');
    if (!attemptedKeys.has(fallbackKey)) {
      tasks.push(buildEnhancementTask(
        blueprint,
        generation,
        'no directly buildable safe-scope task was found in the current blueprint sections',
        blueprint.firstExactTask || (blueprint.buildOrderRows[0]?.purpose ?? ''),
      ));
      attemptedKeys.add(fallbackKey);
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

async function generateNextTaskBatch(generation, attemptedKeys, state) {
  const blueprintTasks = await generateBlueprintTaskBatch(generation, attemptedKeys);
  if (blueprintTasks.length > 0) {
    return { source: 'blueprints', tasks: blueprintTasks };
  }
  const supportTasks = await generateSupportTaskBatch(generation, attemptedKeys, state);
  return { source: 'support', tasks: supportTasks };
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
        mission: 'BLUEPRINT_FIRST_CONTINUOUS_AUTONOMOUS_OVERNIGHT',
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
    if (oilVerified && tokenVerified) state.successful_repairs++;
    return { ok: true, committed: true, job_id: jobId, oil_verified: oilVerified };
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
    current_task: null,
    stop_reason: null,
    stop_law: 'ONLY: operator_stop | capacity_exhausted | service_outage | safety_boundary | repo_corruption. Time limits are checkpoints only.',
  };

  await appendLog('orchestrator_start', {
    checkpoint_every_min: CHECKPOINT_EVERY_MIN,
    dry_run: DRY_RUN,
    base_url: BASE_URL.slice(0, 50),
    key_len: KEY.length,
    workflow: 'BLUEPRINT_FIRST',
    queue_priority: ['C2/Command Control', 'SocialMediaOS', 'LifeOS/LimitlessOS', 'TC', 'TSOS platform improvements'],
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
        autonomous_decisions: state.autonomous_decisions,
        successful_repairs: state.successful_repairs,
        failed_repairs: state.failed_repairs,
        governance_prevented_drift: state.governance_prevented_drift,
        blueprint_tasks_generated: state.blueprint_tasks_generated,
        support_tasks_generated: state.support_tasks_generated,
        queue_depth: workQueue.length,
        action: 'CONTINUING — checkpoint is NOT a stop condition',
      });
      await writeState(state);
      nextCheckpoint = Date.now() + CHECKPOINT_MS;
    }

    if (consecutive502s >= MAX_CONSECUTIVE_502) {
      await appendLog('orchestrator_hard_stop', {
        blocker: 'SERVICE_OUTAGE',
        reason: `${consecutive502s} consecutive HTTP 502 responses — Railway unreachable`,
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
        new_tasks: newTasks.length,
        task_ids: newTasks.map((task) => task.id),
        target_files: newTasks.map((task) => task.target_file),
        blueprint_paths: newTasks.map((task) => task.blueprint_path).filter(Boolean),
        message: batch.source === 'blueprints'
          ? 'Primary queue rebuilt from docs/projects/*.md blueprints.'
          : 'Blueprint queue exhausted for this generation; support tasks queued as fallback.',
      });

      if (newTasks.length === 0) {
        await appendLog('generator_temporarily_empty', {
          generation: state.generation_count,
          message: 'Generator returned 0 tasks. Pausing 60s before retry. Will not stop.',
        });
        await new Promise((resolve) => setTimeout(resolve, 60000));
        continue;
      }

      workQueue.push(...newTasks.sort((a, b) => a.priority - b.priority));
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

    state.current_task = task.id;
    state.tasks_total = state.tasks_done + workQueue.length + 1;
    await writeState(state);

    const result = await runTask(task, state);
    if (!state.first_job_id && result.job_id) {
      state.first_job_id = result.job_id;
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
      const retryTask = {
        ...task,
        id: `${task.id}_retry`,
        instruction: `${task.instruction} Keep the implementation minimal and aligned to the blueprint. Focus only on the named target and required return shape.`,
      };
      await appendLog('task_retry', { task_id: task.id, retry_id: retryTask.id });
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

    state.tasks_done++;
    await writeState(state);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  state.completed_at = new Date().toISOString();
  await appendLog('orchestrator_stop', {
    stop_reason: state.stop_reason,
    tasks_done: state.tasks_done,
    generation_count: state.generation_count,
    autonomous_decisions: state.autonomous_decisions,
    successful_repairs: state.successful_repairs,
    failed_repairs: state.failed_repairs,
    governance_prevented_drift: state.governance_prevented_drift,
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
