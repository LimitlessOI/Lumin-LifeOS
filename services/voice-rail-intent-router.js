/**
 * Intent-first routing — LifeOS infers lane from utterance; mode buttons are overrides only.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFounderDirectProviderUtterance } from './founder-direct-provider.js';
import {
  detectSystemAgentQuestion,
  findNextIncompleteBpStep,
  answerDeployVsCommit,
} from './lifeos-system-agent.js';
import { executeVoiceRailFounderCommand } from './voice-rail-command-executor.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWLIST_SHELL_COMMANDS = new Set([
  'npm run lifeos:founder-direct-provider:proof',
]);

async function runFounderDirectProviderProofHttp(baseUrl, commandKey) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const hdrs = { 'content-type': 'application/json', 'x-command-key': commandKey };
  const cases = [
    { id: 'FDP-T02', text: 'Talk to GPT: what model are you and what is 2+2?', provider: 'openai' },
    { id: 'FDP-T03', text: 'Talk to Claude: what model are you and what is 2+2?', provider: 'anthropic' },
    { id: 'FDP-T04', text: 'Talk to Gemini: what model are you and what is 2+2?', provider: 'google' },
  ];
  const health = await fetch(`${base}/api/v1/lifeos/voice-rail/health`, { headers: hdrs });
  const healthJson = await health.json().catch(() => ({}));
  const results = [];
  for (const c of cases) {
    const res = await fetch(`${base}/api/v1/lifeos/voice-rail/founder-direct-provider`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ text: c.text }),
    });
    const body = await res.json().catch(() => ({}));
    results.push({
      test: c.id,
      http_status: res.status,
      ok: body.ok === true && body.provider === c.provider && Boolean(body.raw_response),
      provider: body.provider,
      model: body.model,
      request_id: body.request_id,
    });
  }
  const pass = health.ok && healthJson.founder_direct_provider === true && results.every((r) => r.ok);
  return { pass, health: { build: healthJson.build, founder_direct_provider: healthJson.founder_direct_provider }, results };
}

function isBuildNextBpStepUtterance(text) {
  const t = String(text || '').toLowerCase();
  return (
    /\bnext\b.*\b(lifeos\s+)?(bp|blueprint)\b.*\bstep\b/.test(t)
    || /\bbuild\b.*\bnext\b.*\b(lifeos\s+)?(bp|blueprint)\b/.test(t)
    || /\b(build|run|execute|complete)\b.*\bnext\b.*\b(bp|blueprint)\b/.test(t)
  );
}

function isAuditUtterance(text) {
  const t = String(text || '').toLowerCase();
  return (
    /\b(show me proof|proof this was|was this deployed|deployed or only committed|only committed)\b/.test(t)
    || /\b(deploy sha|deployment proof|prove.*deployed)\b/.test(t)
  );
}

function isBrainstormUtterance(text) {
  const t = String(text || '').toLowerCase();
  return /\b(brainstorm|what if|ideas? for|could we explore|monetize|monetization)\b/.test(t);
}

function inferCommandLikeIntent(text, explicitMode) {
  const t = String(text || '').toLowerCase();
  if (explicitMode === 'command') return 'command';
  if (isBuildNextBpStepUtterance(text)) return 'command';
  if (/\b(please run|please build|please fix|deploy|execute|make the system)\b/.test(t)) return 'command';
  return 'general_conversation';
}

/**
 * Resolve intent lane from utterance. explicitMode is a founder override, not required routing.
 */
export function resolveFounderIntentRoute(utterance, { explicitMode = 'lifeos', explicitPrivate = false } = {}) {
  const text = String(utterance || '').trim();
  if (!text) {
    return { lane: 'lifeos_operator', confidence: 'low', explicit_mode: explicitMode, reason: 'empty' };
  }

  if (explicitPrivate || explicitMode === 'private') {
    return { lane: 'private', confidence: 'high', explicit_mode: 'private', reason: 'explicit_private' };
  }

  if (explicitMode === 'system') {
    return { lane: 'debug_api', confidence: 'high', explicit_mode: 'system', reason: 'explicit_debug' };
  }

  if (parseFounderDirectProviderUtterance(text)) {
    const p = parseFounderDirectProviderUtterance(text);
    return {
      lane: 'direct_provider',
      confidence: 'high',
      inferred_provider: p.provider,
      explicit_mode: explicitMode,
      reason: 'talk_to_provider_pattern',
    };
  }

  if (detectSystemAgentQuestion(text)) {
    return { lane: 'audit', confidence: 'high', explicit_mode: explicitMode, reason: 'system_agent_question' };
  }

  if (isAuditUtterance(text)) {
    return { lane: 'audit', confidence: 'high', explicit_mode: explicitMode, reason: 'deploy_proof_question' };
  }

  if (isBuildNextBpStepUtterance(text)) {
    return { lane: 'execution_bp', confidence: 'high', explicit_mode: explicitMode, reason: 'build_next_bp_step' };
  }

  const intent = inferCommandLikeIntent(text, explicitMode);
  if (intent === 'command') {
    return { lane: 'execution', confidence: 'medium', inferred_intent: intent, explicit_mode: explicitMode, reason: 'command_intent' };
  }

  if (isBrainstormUtterance(text) || explicitMode === 'brainstorm') {
    return {
      lane: 'brainstorm',
      confidence: explicitMode === 'brainstorm' ? 'high' : 'medium',
      explicit_mode: explicitMode,
      reason: 'brainstorm_intent',
    };
  }

  if (explicitMode === 'conversation') {
    return { lane: 'conversation', confidence: 'medium', explicit_mode: 'conversation', reason: 'explicit_departments' };
  }

  if (explicitMode === 'command') {
    return { lane: 'execution', confidence: 'high', explicit_mode: 'command', reason: 'explicit_command_mode' };
  }

  return { lane: 'lifeos_operator', confidence: 'medium', explicit_mode: explicitMode, reason: 'default_lifeos' };
}

export async function executeBuildNextBpStep({
  pool,
  userId,
  sessionId,
  stageCommand,
  baseUrl,
  commandKey,
  logger,
}) {
  const stepInfo = findNextIncompleteBpStep();
  if (!stepInfo.incomplete) {
    return {
      ok: true,
      path: 'none',
      complete: true,
      message: 'All BLUEPRINT.json steps under BP priority ranking are complete.',
      stepInfo,
    };
  }

  const { step } = stepInfo;

  if (step.action_type === 'shell_command' && step.command) {
    if (!ALLOWLIST_SHELL_COMMANDS.has(step.command)) {
      return {
        ok: false,
        path: 'shell_command',
        blocker: 'shell_command_not_allowlisted',
        command: step.command,
        stepInfo,
      };
    }
    if (step.command === 'npm run lifeos:founder-direct-provider:proof' && baseUrl && commandKey) {
      const proof = await runFounderDirectProviderProofHttp(baseUrl, commandKey);
      return {
        ok: proof.pass,
        path: 'shell_command',
        command: step.command,
        stepInfo,
        proof_receipt_path: 'products/receipts/FOUNDER_DIRECT_PROVIDER_PROOF.json',
        proof_http: proof,
      };
    }
    try {
      const stdout = execSync(step.command, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 180_000,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let proofReceipt = null;
      const receiptRel = 'products/receipts/FOUNDER_DIRECT_PROVIDER_PROOF.json';
      const receiptFull = path.join(REPO_ROOT, receiptRel);
      if (fs.existsSync(receiptFull)) {
        proofReceipt = JSON.parse(fs.readFileSync(receiptFull, 'utf8'));
      }
      return {
        ok: proofReceipt?.pass === true || proofReceipt?.verdict === 'PASS',
        path: 'shell_command',
        command: step.command,
        stdout: String(stdout || '').slice(0, 3000),
        stepInfo,
        proof_receipt_path: receiptRel,
        proof_receipt: proofReceipt,
      };
    } catch (err) {
      return {
        ok: false,
        path: 'shell_command',
        command: step.command,
        error: err.message,
        stderr: String(err.stderr || err.stdout || '').slice(0, 1500),
        stepInfo,
      };
    }
  }

  const target = step.target_file;
  if (!target) {
    return { ok: false, path: 'builder', blocker: 'step_missing_target_file', stepInfo };
  }

  const instruction = `Execute BLUEPRINT step ${step.step_id} (${step.title}): build ${target} only.`;
  const stagedCommand = await stageCommand({
    userId,
    sessionId,
    utterance: instruction,
    intent: 'command',
  });
  const commandExecution = await executeVoiceRailFounderCommand({
    pool,
    stagedCommandId: stagedCommand.id,
    utterance: instruction,
    userId,
    logger,
    baseUrl,
    commandKey,
  });

  return {
    ok: commandExecution?.ok === true,
    path: 'builder',
    instruction,
    stepInfo,
    stagedCommand,
    commandExecution,
  };
}

export function formatIntentRouteHeader(route) {
  return [
    'INTENT-FIRST ROUTING',
    `lane: ${route.lane}`,
    `confidence: ${route.confidence}`,
    `reason: ${route.reason || '—'}`,
    route.inferred_provider ? `inferred_provider: ${route.inferred_provider}` : '',
    route.explicit_mode ? `explicit_mode_override: ${route.explicit_mode}` : '',
  ].filter(Boolean).join('\n');
}

export function formatBuildNextBpStepReply(route, result) {
  const lines = [formatIntentRouteHeader(route), ''];
  if (result.complete) {
    lines.push(result.message || 'No incomplete blueprint steps.');
    return lines.join('\n');
  }
  const si = result.stepInfo || {};
  const step = si.step || {};
  lines.push('BP INSPECTED');
  lines.push(`  rank: ${si.rank}`);
  lines.push(`  mission_id: ${si.mission_id}`);
  lines.push(`  blueprint_path: ${si.blueprint_path}`);
  lines.push(`  step_id: ${step.step_id}`);
  lines.push(`  title: ${step.title}`);
  lines.push(`  action_type: ${step.action_type || '—'}`);
  lines.push(`  target_file: ${step.target_file || '—'}`);
  if (step.command) lines.push(`  command: ${step.command}`);
  lines.push('');
  lines.push(`execution_path: ${result.path}`);

  if (result.path === 'shell_command') {
    lines.push(`command: ${result.command}`);
    lines.push(`ok: ${result.ok}`);
    if (result.proof_receipt_path) lines.push(`proof_receipt: ${result.proof_receipt_path}`);
    if (result.proof_http?.results?.length) {
      lines.push('');
      lines.push('provider_proof:');
      for (const r of result.proof_http.results) {
        lines.push(`  ${r.test} ${r.provider} ok=${r.ok} model=${r.model || '—'} request_id=${r.request_id || '—'}`);
      }
    }
    if (result.proof_receipt?.verdict) lines.push(`proof_verdict: ${result.proof_receipt.verdict}`);
    if (result.error) lines.push(`error: ${result.error}`);
    if (result.stderr) {
      lines.push('');
      lines.push('stderr:');
      lines.push(result.stderr);
    }
  }

  if (result.path === 'builder' && result.commandExecution) {
    const ce = result.commandExecution;
    lines.push('');
    lines.push('Execution receipt:');
    lines.push(`  ok: ${ce.ok}`);
    lines.push(`  job_id: ${ce.job_id || '—'}`);
    lines.push(`  target_file: ${ce.target_file || step.target_file || '—'}`);
    lines.push(`  commit_sha: ${ce.commit_sha || '—'}`);
    if (ce.root_cause) lines.push(`  blocker: ${ce.root_cause}`);
  }

  if (result.blocker) {
    lines.push(`blocker: ${result.blocker}`);
  }

  return lines.join('\n');
}

export async function answerAuditIntent(utterance, { baseUrl, commandKey } = {}) {
  if (detectSystemAgentQuestion(utterance)) {
    const { answerSystemAgentQuestion } = await import('./lifeos-system-agent.js');
    return answerSystemAgentQuestion(utterance, { baseUrl, commandKey });
  }
  return answerDeployVsCommit({ topic: utterance, baseUrl, commandKey });
}

export function formatAuditIntentReply(route, result) {
  const lines = [formatIntentRouteHeader(route), '', 'AUDIT RECEIPT'];
  if (result.file_path) {
    lines.push(`file_path: ${result.file_path}`);
    if (result.evidence_snippet) lines.push(`evidence: ${String(result.evidence_snippet).slice(0, 400)}`);
  }
  if (result.deploy_commit_sha !== undefined) {
    lines.push(`repo_head_sha: ${result.repo_head_sha || '—'}`);
    lines.push(`deploy_commit_sha: ${result.deploy_commit_sha || '—'}`);
    lines.push(`interpretation: ${result.interpretation || '—'}`);
  }
  if (result.status === 'BLOCKED') {
    lines.push(`blocker: ${result.blocker}`);
    lines.push(`detail: ${result.detail || '—'}`);
  }
  lines.push('');
  lines.push(JSON.stringify(result, null, 2));
  return lines.join('\n');
}
