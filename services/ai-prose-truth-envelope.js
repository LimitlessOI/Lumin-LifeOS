/**
 * SYNOPSIS: Universal AI prose envelope — every council output scrubbed vs execution truth.
 * One degree off compounds. 95% true + 5% false execution claim = drift disaster.
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import {
  detectCounselTheater,
  scrubCounselTheater,
} from './chair-direct-connection-truth.js';
import { detectExecutionLie } from './voice-rail-execution-truth.js';

export const AI_PROSE_ENVELOPE_VERSION = 'ai_prose_envelope_v1';

const CODEGEN_TASK_PREFIXES = [
  'council.builder.code',
  'council.builder.code_execute',
  'council.builder.task',
  'codegen',
  'lifeos.lumin.program_plan',
];

const SKIP_TASK_TYPES = new Set([
  'json_extract',
  'structured_extract',
  'routing',
]);

const FALSE_VERIFICATION_WHEN_NO_COMMAND = [
  /\b(i (verified|checked|confirmed|looked up) (that|your|the|in))\b/i,
  /\b(according to (the|your) (database|system|records|live data))\b/i,
  /\b(the system (shows|reports|confirms))\b/i,
  /\b(i (ran|executed) (a )?(query|check|audit))\b/i,
];

const UNLABELED_CERTAINTY = [
  /\b(definitely|certainly|without (a )?doubt|guaranteed)\b/i,
];

function inferCommandTruth(options = {}, taskType = '') {
  const ctx = options.executionContext || {};
  if (ctx.command_truth) return ctx.command_truth;
  if (options.commandExecutionReceipt?.ok === true) return 'COMMAND_RAN';
  if (options.commandExecutionReceipt?.committed === true) return 'COMMITTED';
  if (/^council\.builder/.test(taskType)) return 'BUILD_ATTEMPTED';
  return 'NO_COMMAND_RAN';
}

function inferPassFail(options = {}, commandTruth = 'NO_COMMAND_RAN') {
  const ctx = options.executionContext || {};
  if (ctx.pass_fail) return ctx.pass_fail;
  if (commandTruth === 'COMMAND_RAN' || commandTruth === 'COMMITTED') return 'PASS';
  if (commandTruth === 'BUILD_ATTEMPTED') return 'RUNNING';
  return 'NO_COMMAND_RAN';
}

export function shouldSkipTruthEnvelope(options = {}, taskType = '') {
  if (options.truthEnvelope === false) return true;
  if (options.skipTruthEnvelope === true) return true;
  if (options.internalStructured === true) return true;
  if (SKIP_TASK_TYPES.has(taskType)) return true;
  if (CODEGEN_TASK_PREFIXES.some((p) => taskType === p || taskType.startsWith(p))) return true;
  if (options.expectCodeOutput === true) return true;
  return false;
}

function scrubFalseVerification(text, commandTruth) {
  if (commandTruth !== 'NO_COMMAND_RAN') return text;
  let out = String(text || '');
  for (const re of FALSE_VERIFICATION_WHEN_NO_COMMAND) {
    if (re.test(out)) {
      out = out.replace(re, '[unverified — no system query ran]');
    }
  }
  return out;
}

function scrubVoiceExecutionLie(text = '') {
  const sentences = String(text || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept = [];
  for (const sentence of sentences) {
    if (!detectExecutionLie(sentence).lied) kept.push(sentence);
  }
  return kept.join(' ').trim();
}

function appendUncertaintyFooter(text, envelope) {
  if (envelope.theater_blocked || envelope.voice_lie_blocked) {
    return text;
  }
  if (envelope.command_truth !== 'NO_COMMAND_RAN') {
    return text;
  }
  if (envelope.partial_truth_risk && !/\b(THINK|GUESS|DON'T KNOW|unverified)\b/i.test(text)) {
    return `${text}\n\n[Epistemic note: counsel only — no command ran; treat unlabeled claims as THINK not KNOW.]`;
  }
  return text;
}

/**
 * Wrap raw LLM prose before it reaches users, memory, or receipts.
 * @returns {{ text: string, envelope: object }}
 */
export function applyAiProseTruthEnvelope(rawText = '', ctx = {}) {
  const commandTruth = ctx.command_truth || inferCommandTruth(ctx.options || {}, ctx.taskType || '');
  const passFail = ctx.pass_fail || inferPassFail(ctx.options || {}, commandTruth);
  const taskType = ctx.taskType || ctx.options?.taskType || 'general';
  const options = ctx.options || {};

  const envelope = {
    version: AI_PROSE_ENVELOPE_VERSION,
    command_truth: commandTruth,
    pass_fail: passFail,
    taskType,
    source: ctx.source || 'callCouncilMember',
    member: ctx.member || null,
    theater_blocked: false,
    voice_lie_blocked: false,
    partial_truth_risk: false,
    hits: [],
    stripped_sentences: 0,
  };

  if (shouldSkipTruthEnvelope(options, taskType)) {
    envelope.skipped = true;
    envelope.skip_reason = 'codegen_or_explicit_opt_out';
    return { text: String(rawText || ''), envelope };
  }

  let text = String(rawText || '').trim();
  if (!text) {
    return { text: '', envelope };
  }

  const theater = detectCounselTheater(text, commandTruth);
  if (theater.violation) {
    envelope.theater_blocked = true;
    envelope.hits.push(...theater.hits);
    const scrubbed = scrubCounselTheater(text, commandTruth);
    envelope.stripped_sentences = text.split(/(?<=[.!?])\s+/).length - scrubbed.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    text = scrubbed;
  }

  if (commandTruth === 'NO_COMMAND_RAN') {
    const voiceLie = detectExecutionLie(text);
    if (voiceLie.lied) {
      envelope.voice_lie_blocked = true;
      envelope.hits.push(...voiceLie.violations);
      text = scrubVoiceExecutionLie(text);
    }
    text = scrubFalseVerification(text, commandTruth);
    if (UNLABELED_CERTAINTY.some((re) => re.test(text)) && !/\b(KNOW|THINK|GUESS)\b/.test(text)) {
      envelope.partial_truth_risk = true;
    }
  }

  if (passFail === 'FAIL' && /\b(successfully|completed|all set|shipped|deployed)\b/i.test(text)) {
    envelope.theater_blocked = true;
    envelope.hits.push('false_success_on_fail');
    text = text.replace(/\b(successfully|completed|all set|shipped|deployed to production)\b/gi, '[not proven — FAIL receipt]');
  }

  text = appendUncertaintyFooter(text, envelope);
  return { text: text.trim(), envelope };
}

/**
 * Council-service helper — envelope before return/cache.
 */
export function envelopeCouncilMemberOutput(rawText, options = {}, taskType = 'general', member = null) {
  return applyAiProseTruthEnvelope(rawText, {
    options,
    taskType,
    member,
    source: 'callCouncilMember',
    command_truth: options.executionContext?.command_truth,
    pass_fail: options.executionContext?.pass_fail,
  });
}
