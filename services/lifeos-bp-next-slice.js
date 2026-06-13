/**
 * LifeOS BP queue — read BP_PRIORITY + blueprints, resolve next slice, dispatch /builder/build.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const BP_PRIORITY_PATH = path.join(REPO_ROOT, 'builderos-reboot', 'BP_PRIORITY.json');
const DASHBOARD_QUEUE_PATH = path.join(REPO_ROOT, 'docs', 'projects', 'LIFEOS_DASHBOARD_BUILDER_QUEUE.json');

function normalizeText(value) {
  return String(value || '').trim();
}

export function isBpProgramUtterance(utterance) {
  const t = normalizeText(utterance).toLowerCase();
  if (!t) return false;
  if (/\b(bp|blueprint|bp_priority|mission queue|builder queue)\b/.test(t)) return true;
  if (/\b(next slice|program.*slice|pick.*slice|build.*slice|run.*slice)\b/.test(t)) return true;
  if (/\b(what('s| is) (been )?done|what comes next|very next)\b/.test(t) && /\b(lifeos|bp|build|slice|queue)\b/.test(t)) {
    return true;
  }
  if (/\b(prove|show).*\b(agent|system|lifeos)\b/.test(t)) return true;
  if (/\b(program|build|execute|run|ship|do)\b/.test(t) && /\b(slice|bp|blueprint|lifeos)\b/.test(t)) {
    return true;
  }
  if (/\bthere is no other queue\b/.test(t) || /\bonly.*queue.*bp/.test(t)) return true;
  return false;
}

export function wantsBpExecute(utterance) {
  const t = normalizeText(utterance).toLowerCase();
  if (/\b(just (tell|show|list|explain)|what is|what's|status only)\b/.test(t) && !/\b(program|build|run|execute|do it|ship)\b/.test(t)) {
    return false;
  }
  if (/\b(program|build|run|execute|do it|ship|start|prove|go ahead|make it|fix it)\b/.test(t)) return true;
  if (/\bpick any slice\b/.test(t) || /\bvery next slice\b/.test(t)) return true;
  if (/\bnever argue\b/.test(t) && /\b(do|program|build)\b/.test(t)) return true;
  return isBpProgramUtterance(utterance);
}

async function readJson(absPath) {
  const raw = await fs.readFile(absPath, 'utf8');
  return JSON.parse(raw);
}

export async function loadBpPriorityQueue() {
  const data = await readJson(BP_PRIORITY_PATH);
  const items = data.items || [];
  const enriched = [];
  for (const item of items) {
    const row = {
      rank: item.rank,
      mission_id: item.mission_id,
      verdict: item.verdict || item.receipt_verdict || null,
      blueprint_path: item.blueprint_path || null,
      blueprint_status: item.blueprint_status || null,
      canonical_url: item.canonical_url || null,
      git_sha: item.git_sha ? String(item.git_sha).slice(0, 12) : null,
      next_step: null,
    };
    if (item.blueprint_path) {
      try {
        const bp = await readJson(path.join(REPO_ROOT, item.blueprint_path));
        const pending = (bp.steps || []).find((s) => s.status !== 'complete');
        row.next_step = pending
          ? {
            step_id: pending.step_id,
            title: pending.title,
            target_file: pending.target_file || null,
            status: pending.status || 'pending',
          }
          : null;
        row.blueprint_status = bp.blueprint_status || row.blueprint_status;
      } catch {
        row.next_step = { error: 'blueprint_unreadable' };
      }
    }
    enriched.push(row);
  }
  return { queue_id: data.queue_id, updated_at: data.updated_at, items: enriched };
}

async function loadDashboardQueueNext() {
  try {
    const q = await readJson(DASHBOARD_QUEUE_PATH);
    for (const task of q.tasks || []) {
      const target = task.target_file;
      if (!target) continue;
      const abs = path.join(REPO_ROOT, target);
      if (!existsSync(abs) || (await fs.stat(abs)).size < 80) {
        return {
          source: 'lifeos_dashboard_queue',
          task_id: task.id,
          mission_id: task.id,
          step_id: task.id,
          title: task.id,
          target_file: target,
          domain: task.domain || 'lifeos-platform',
          blueprint_path: null,
          task: task.task,
          spec: task.spec,
          commit_message: task.commit_message || `[system-build] ${task.id}`,
          files: task.files || [],
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

const PHASE_8_SLICE = {
  source: 'am21_voice_rail_phase_8',
  mission_id: 'LIFEOS-VOICE-BP-LOOP',
  step_id: 'VR-P8-S01',
  title: 'Voice Rail reads BP queue and executes next slice via builder',
  target_file: 'services/lifeos-bp-next-slice.js',
  domain: 'lifeos-platform',
  blueprint_path: 'docs/projects/AMENDMENT_21_LIFEOS_CORE.md',
  task:
    'Maintain lifeos-bp-next-slice.js: load BP_PRIORITY.json, read mission BLUEPRINT.json steps, return first incomplete step or dashboard queue head or Phase 8 fallback; expose executeLifeOSSliceBuild POST /api/v1/lifeos/builder/build.',
  spec: 'ESM. Exports: isBpProgramUtterance, wantsBpExecute, loadBpPriorityQueue, resolveNextLifeOSSlice, executeLifeOSSliceBuild, formatSliceToolSummary. @ssot AMENDMENT_21.',
  commit_message: '[system-build] LifeOS BP next-slice runner (Voice Rail Phase 8)',
  files: [
    'builderos-reboot/BP_PRIORITY.json',
    'services/voice-rail-system-operator.js',
    'docs/projects/AMENDMENT_21_LIFEOS_CORE.md',
  ],
};

/** First incomplete blueprint step, else dashboard queue, else Phase 8 / backlog hint. */
export async function resolveNextLifeOSSlice() {
  const queue = await loadBpPriorityQueue();
  for (const item of queue.items) {
    if (item.next_step?.step_id && item.next_step?.target_file) {
      return {
        source: 'bp_priority',
        rank: item.rank,
        mission_id: item.mission_id,
        step_id: item.next_step.step_id,
        title: item.next_step.title,
        target_file: item.next_step.target_file,
        domain: 'lifeos-platform',
        blueprint_path: item.blueprint_path,
        verdict: item.verdict,
        task: `Execute blueprint step ${item.next_step.step_id}: ${item.next_step.title}`,
        spec: `Mission ${item.mission_id}. Blueprint: ${item.blueprint_path}. Target: ${item.next_step.target_file}. Follow blueprint step spec; @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md.`,
        commit_message: `[system-build] ${item.mission_id} ${item.next_step.step_id}`,
      };
    }
  }

  const dash = await loadDashboardQueueNext();
  if (dash) return dash;

  const phase8Exists = existsSync(path.join(REPO_ROOT, PHASE_8_SLICE.target_file));
  if (!phase8Exists) return { ...PHASE_8_SLICE, actionable: true };

  return {
    source: 'backlog_hint',
    mission_id: 'LIFEOS-VOICE-RAIL-V2',
    step_id: 'VR-P3-TTS',
    title: 'Voice Rail Phase 3 — server natural TTS route',
    target_file: 'services/voice-rail-tts-natural.js',
    domain: 'lifeos-platform',
    blueprint_path: null,
    verdict: 'BP ranks 1–3 TECHNICAL_PASS; Phase 8 BP runner wired',
    task:
      'Add services/voice-rail-tts-natural.js and wire POST /api/v1/lifeos/voice-rail/tts to OpenAI tts-1-hd when OPENAI_API_KEY set (AM21 Voice Rail Phase 3).',
    spec: 'ESM service + route hook in lifeos-voice-rail-routes.js. Fail-closed fallback message when key missing. @ssot AMENDMENT_21.',
    commit_message: '[system-build] Voice Rail Phase 3 natural TTS service',
    actionable: true,
    queue_summary: queue.items.map((i) => `${i.rank}:${i.mission_id}:${i.verdict || '?'}`).join('; '),
  };
}

function resolveBuilderDispatchBaseUrl(baseUrl) {
  const normalized = String(baseUrl || '').replace(/\/$/, '');
  const publicBase = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const port = process.env.PORT || '3000';
  if (publicBase && normalized === publicBase) return `http://127.0.0.1:${port}`;
  return normalized || `http://127.0.0.1:${port}`;
}

export async function executeLifeOSSliceBuild({ slice, baseUrl, commandKey, logger }) {
  if (!slice?.target_file) {
    return { ok: false, error: 'no_target_file', slice };
  }
  const dispatchBase = resolveBuilderDispatchBaseUrl(baseUrl);
  const url = `${dispatchBase}/api/v1/lifeos/builder/build`;
  const body = {
    domain: slice.domain || 'lifeos-platform',
    task: slice.task || slice.title,
    spec: slice.spec || slice.task,
    target_file: slice.target_file,
    commit_message: slice.commit_message || `[system-build] ${slice.step_id || slice.task_id || 'lifeos-slice'}`,
    mission_id: slice.mission_id || undefined,
    blueprint_path: slice.blueprint_path || undefined,
    ...(Array.isArray(slice.files) && slice.files.length ? { files: slice.files } : {}),
  };

  logger?.info?.({ target: slice.target_file, mission: slice.mission_id }, 'lifeos bp slice build dispatch');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-command-key': commandKey || process.env.COMMAND_CENTER_KEY || '',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message, url, slice };
  }
  clearTimeout(timer);

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = { ok: false, error: 'non_json_response' };
  }

  return {
    ok: response.ok && json?.ok === true,
    http_status: response.status,
    committed: json?.committed === true,
    target_file: json?.target_file || slice.target_file,
    commit_sha: json?.commit_sha || json?.sha || null,
    model_used: json?.model_used || null,
    error: json?.error || null,
    detail: json?.detail || null,
    output: json?.output || null,
    raw: json,
    slice,
  };
}

export function summarizeBuildAsCommandExecution(buildResult) {
  if (!buildResult) return null;
  return {
    ok: buildResult.ok && buildResult.committed,
    job_id: null,
    job_status: buildResult.committed ? 'committed' : 'failed',
    root_cause: buildResult.error || (buildResult.committed ? null : 'builder_not_committed'),
    target_file: buildResult.target_file,
    commit_sha: buildResult.commit_sha,
    stage: 'builder_build',
    builder_http_status: buildResult.http_status,
    model_used: buildResult.model_used,
  };
}

export function formatSliceToolSummary({ slice, buildResult, mode, queue }) {
  const lines = ['LifeOS BP QUEUE (read from repo — ground truth):'];
  if (queue?.items?.length) {
    for (const item of queue.items) {
      const step = item.next_step?.step_id
        ? `next=${item.next_step.step_id} → ${item.next_step.target_file || '?'}`
        : 'all steps complete';
      lines.push(`  rank ${item.rank} ${item.mission_id} [${item.verdict || '?'}] ${step}`);
    }
  } else {
    lines.push('  (queue load failed)');
  }

  if (slice) {
    lines.push('');
    lines.push(`RESOLVED NEXT SLICE [${slice.source}]:`);
    lines.push(`  ${slice.step_id || slice.task_id}: ${slice.title || slice.task_id}`);
    lines.push(`  target_file: ${slice.target_file || '—'}`);
    lines.push(`  mission_id: ${slice.mission_id || '—'}`);
    if (slice.verdict) lines.push(`  note: ${slice.verdict}`);
    if (slice.queue_summary) lines.push(`  queue: ${slice.queue_summary}`);
  }

  if (mode === 'bp_execute' && buildResult) {
    lines.push('');
    lines.push('BUILDER /build RESULT:');
    lines.push(`  http: ${buildResult.http_status}`);
    lines.push(`  committed: ${buildResult.committed === true}`);
    lines.push(`  commit_sha: ${buildResult.commit_sha || '—'}`);
    lines.push(`  model: ${buildResult.model_used || '—'}`);
    if (buildResult.error) lines.push(`  error: ${buildResult.error}`);
  } else if (mode === 'bp_inspect') {
    lines.push('');
    lines.push('(inspect only — say "program it" or "run the slice" to dispatch /builder/build)');
  }

  return lines.join('\n');
}
