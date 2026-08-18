#!/usr/bin/env node
/**
 * SYNOPSIS: Execute a founder/architect handoff blueprint without re-authoring it in ARC.
 *
 * This lane exists for BLUEPRINT.json files whose status is handoff_ready and whose
 * steps are pre-authored as author_then_write. The factory may author implementation
 * text for the named target only; it may not choose new work, change the blueprint,
 * or widen the sandbox. Every successful target is verified and persisted to GitHub.
 */
import 'dotenv/config';
import './lib/load-builderos-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missionId = process.argv[2];
if (!missionId) {
  console.error('Usage: node scripts/execute-handoff-blueprint.mjs <mission-id>');
  process.exit(1);
}

const missionDir = path.join(ROOT, 'builderos-reboot', 'MISSIONS', missionId);
const blueprintPath = path.join(missionDir, 'BLUEPRINT.json');
const receiptDir = path.join(missionDir, 'receipts');
const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
const repo = String(process.env.GITHUB_REPO || 'LimitlessOI/Lumin-LifeOS').trim();
const branch = String(process.env.GITHUB_DEPLOY_BRANCH || 'main').trim();
const token = String(process.env.GITHUB_TOKEN || '').trim();

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
}
function rel(abs) { return path.relative(ROOT, abs).replace(/\\/g, '/'); }
function safeTarget(step) {
  const target = String(step.target_file || '').replace(/\\/g, '/');
  const boundary = String(step.sandbox_boundary || '').replace(/\\/g, '/').replace(/\/\*\*$/, '');
  return Boolean(target && boundary && (target === boundary || target.startsWith(`${boundary}/`)));
}
function orderedSteps(steps = []) {
  const byId = new Map(steps.map((s) => [s.step_id, s]));
  const done = new Set();
  const visiting = new Set();
  const out = [];
  function visit(id) {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`circular_dependency:${id}`);
    const step = byId.get(id);
    if (!step) throw new Error(`unknown_dependency:${id}`);
    visiting.add(id);
    for (const dep of step.dependencies || []) visit(dep);
    visiting.delete(id);
    done.add(id);
    out.push(step);
  }
  for (const step of steps) visit(step.step_id);
  return out;
}
function assertionsPass(step, content) {
  const required = step.assertion_spec?.file_contains || [];
  return required.every((needle) => content.includes(String(needle)));
}
function stripFence(text) {
  const t = String(text || '').trim();
  const m = t.match(/^```(?:javascript|js|mjs|json|text)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}
async function openAIText(input) {
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.BUILDEROS_MODEL_DEFAULT || 'gpt-5.4-mini',
      max_output_tokens: Number(process.env.BUILDEROS_AUTHOR_MAX_TOKENS || 7000),
      input,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OPENAI_${response.status}:${JSON.stringify(payload).slice(0, 500)}`);
  return (payload?.output || []).flatMap((item) => item?.content || []).map((c) => c?.text || '').join('\n').trim();
}
async function persistFile(absPath, message) {
  if (!token || !repo) throw new Error('GITHUB_PERSISTENCE_CREDENTIALS_MISSING');
  const [owner, repoName] = repo.split('/');
  const filePath = rel(absPath);
  const get = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${encodeURIComponent(branch)}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  let sha;
  if (get.status === 200) sha = (await get.json()).sha;
  else if (get.status !== 404) throw new Error(`GITHUB_READ_${get.status}:${(await get.text()).slice(0, 300)}`);
  const body = {
    message,
    content: Buffer.from(fs.readFileSync(absPath)).toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };
  const put = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!put.ok) throw new Error(`GITHUB_WRITE_${put.status}:${(await put.text()).slice(0, 500)}`);
  return await put.json();
}
function writeBlocker(kind, detail, stepId = null) {
  const blocker = {
    schema: 'handoff_factory_blocker_v1',
    mission_id: missionId,
    step_id: stepId,
    at: new Date().toISOString(),
    status: 'HARD_CAPABILITY_BLOCKER',
    blocker: kind,
    detail,
  };
  writeJson(path.join(receiptDir, 'HANDOFF_FACTORY_BLOCKER.json'), blocker);
  return blocker;
}

if (!fs.existsSync(blueprintPath)) {
  console.error(JSON.stringify(writeBlocker('BLUEPRINT_MISSING', blueprintPath), null, 2));
  process.exit(2);
}
const blueprint = readJson(blueprintPath);
const status = String(blueprint.blueprint_status || blueprint.status || '').toLowerCase();
const authority = String(blueprint.authority || '').toUpperCase();
if (status !== 'handoff_ready' || !['BPB', 'ARCHITECT'].includes(authority)) {
  console.error(JSON.stringify(writeBlocker('NOT_AUTHORIZED_HANDOFF', { status, authority }), null, 2));
  process.exit(2);
}

fs.mkdirSync(receiptDir, { recursive: true });
const steps = orderedSteps(blueprint.steps || []);
const runReceipt = {
  schema: 'handoff_factory_run_receipt_v1',
  mission_id: missionId,
  blueprint_id: blueprint.blueprint_id || null,
  started_at: new Date().toISOString(),
  authority,
  status: 'BUILDING',
  steps: [],
};
writeJson(path.join(receiptDir, 'HANDOFF_FACTORY_RUN.json'), runReceipt);

for (const step of steps) {
  if (step.action_type !== 'author_then_write') {
    console.error(JSON.stringify(writeBlocker('UNSUPPORTED_ACTION_TYPE', step.action_type, step.step_id), null, 2));
    process.exit(2);
  }
  if (!safeTarget(step)) {
    console.error(JSON.stringify(writeBlocker('SANDBOX_VIOLATION', step.target_file, step.step_id), null, 2));
    process.exit(2);
  }

  const targetAbs = path.join(ROOT, step.target_file);
  if (fs.existsSync(targetAbs)) {
    const existing = fs.readFileSync(targetAbs, 'utf8');
    if (assertionsPass(step, existing)) {
      runReceipt.steps.push({ step_id: step.step_id, status: 'ALREADY_SATISFIED', target_file: step.target_file });
      writeJson(path.join(receiptDir, 'HANDOFF_FACTORY_RUN.json'), runReceipt);
      continue;
    }
  }

  const dependencyContext = (step.dependencies || []).map((depId) => {
    const dep = steps.find((s) => s.step_id === depId);
    if (!dep?.target_file) return '';
    const p = path.join(ROOT, dep.target_file);
    if (!fs.existsSync(p)) return '';
    return `\nDEPENDENCY ${dep.target_file}:\n${fs.readFileSync(p, 'utf8').slice(0, 12000)}`;
  }).join('\n');

  const prompt = `You are the Builder execution lane. Implement exactly one pre-authorized blueprint slice.\n\nMISSION: ${missionId}\nBLUEPRINT: ${blueprint.blueprint_id}\nSTEP: ${step.step_id} - ${step.title}\nTARGET FILE: ${step.target_file}\nSANDBOX: ${step.sandbox_boundary}\nTASK: ${step.task}\nSPEC: ${step.spec}\nEXPECTED EXPORTS: ${JSON.stringify(step.expected_exports || [])}\nREQUIRED FILE STRINGS: ${JSON.stringify(step.assertion_spec?.file_contains || [])}\n\nRules:\n- Return ONLY the complete contents of the target file. No markdown fences or commentary.\n- Do not create or modify any other file.\n- Do not invent a different task, architecture, dependency, product, or acceptance condition.\n- Keep dependencies minimal and use existing local interfaces where visible.\n- Never claim live/browser proof in code or comments unless runtime evidence exists.\n${dependencyContext}`;

  let authored;
  try {
    authored = stripFence(await openAIText(prompt));
  } catch (err) {
    console.error(JSON.stringify(writeBlocker('AUTHORING_MODEL_FAILURE', String(err.message || err), step.step_id), null, 2));
    process.exit(2);
  }
  if (!authored || !assertionsPass(step, authored)) {
    console.error(JSON.stringify(writeBlocker('AUTHORED_CONTENT_FAILED_ASSERTIONS', step.assertion_spec || {}, step.step_id), null, 2));
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.writeFileSync(targetAbs, `${authored.replace(/\s+$/, '')}\n`);
  if (/\.(?:js|mjs|cjs)$/.test(step.target_file)) {
    const check = spawnSync(process.execPath, ['--check', targetAbs], { cwd: ROOT, encoding: 'utf8' });
    if (check.status !== 0) {
      console.error(JSON.stringify(writeBlocker('SYNTAX_CHECK_FAILED', String(check.stderr || check.stdout).slice(0, 1500), step.step_id), null, 2));
      process.exit(2);
    }
  }

  try {
    await persistFile(targetAbs, `[system-build] ${missionId} ${step.step_id}: ${step.title}\n\nINTENT DRIFT: none\n\nAuthored from canonical handoff blueprint ${blueprint.blueprint_id}.`);
  } catch (err) {
    console.error(JSON.stringify(writeBlocker('PERSISTENCE_FAILURE', String(err.message || err), step.step_id), null, 2));
    process.exit(2);
  }

  const stepReceipt = {
    schema: 'handoff_factory_step_receipt_v1',
    mission_id: missionId,
    blueprint_id: blueprint.blueprint_id || null,
    step_id: step.step_id,
    target_file: step.target_file,
    completed_at: new Date().toISOString(),
    status: 'DONE',
    authority,
  };
  const stepReceiptPath = path.join(receiptDir, `${step.step_id}.json`);
  writeJson(stepReceiptPath, stepReceipt);
  try {
    await persistFile(stepReceiptPath, `[system-build] receipt ${missionId} ${step.step_id}`);
  } catch (err) {
    console.error(JSON.stringify(writeBlocker('RECEIPT_PERSISTENCE_FAILURE', String(err.message || err), step.step_id), null, 2));
    process.exit(2);
  }
  runReceipt.steps.push({ step_id: step.step_id, status: 'DONE', target_file: step.target_file });
  writeJson(path.join(receiptDir, 'HANDOFF_FACTORY_RUN.json'), runReceipt);
}

const acceptanceCommand = String(blueprint.acceptance_command || '').trim();
let acceptance = { status: null, signal: null };
if (acceptanceCommand) {
  const r = spawnSync(acceptanceCommand, { cwd: ROOT, shell: true, encoding: 'utf8', env: process.env });
  acceptance = {
    status: r.status,
    stdout_tail: String(r.stdout || '').slice(-4000),
    stderr_tail: String(r.stderr || '').slice(-2000),
  };
}
runReceipt.acceptance = acceptance;
runReceipt.completed_at = new Date().toISOString();
runReceipt.status = acceptance.status === 0 ? 'POINT_B_REACHED_OR_ACCEPTANCE_PASS' : 'TECHNICAL_PARTIAL_OR_BLOCKED';
const runReceiptPath = path.join(receiptDir, 'HANDOFF_FACTORY_RUN.json');
writeJson(runReceiptPath, runReceipt);
try {
  await persistFile(runReceiptPath, `[system-build] handoff factory run receipt ${missionId}`);
} catch (err) {
  console.error(JSON.stringify(writeBlocker('FINAL_RECEIPT_PERSISTENCE_FAILURE', String(err.message || err)), null, 2));
  process.exit(2);
}

console.log(JSON.stringify(runReceipt, null, 2));
process.exit(acceptance.status === 0 ? 0 : 2);
