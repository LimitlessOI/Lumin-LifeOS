/**
 * SYNOPSIS: Truth enforcement spine — single import for all truth gates in production.
 * No path may bypass: council envelope → response lockdown → memory gate → receipt validator.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';
import { enforceTruthLockdown } from './truth-lockdown.js';
import { gateMemoryWrite, buildMemoryTruthStamp } from './memory-write-gate.js';
import { validateReceiptObject } from './receipt-truth-validator.js';
import { stampPointBDna } from './point-b-dna.js';

export const TRUTH_SPINE_VERSION = 'truth_enforcement_spine_v1';

const RESPONSE_TRUTH_FIELDS = [
  'human_summary',
  'human_summary_technical',
  'done_synopsis',
  'chair_answer',
  'reply',
  'message',
  'content',
  'text',
  'summary',
  'narrative',
];

function inferChannelFromRequest(req) {
  if (!req) return 'api';
  const p = String(req.path || req.url || '');
  if (p.includes('founder-interface')) return 'founder_interface';
  if (p.includes('voice-rail')) return 'voice_rail';
  if (p.includes('/chat')) return 'chat';
  if (p.includes('lifere')) return 'lifere';
  if (p.includes('builder')) return 'build_async';
  return 'api';
}

function envelopePlainText(text, ctx = {}) {
  if (!text || typeof text !== 'string') return text;
  const { text: safe } = applyAiProseTruthEnvelope(text, {
    command_truth: ctx.command_truth || 'NO_COMMAND_RAN',
    pass_fail: ctx.pass_fail || 'NO_COMMAND_RAN',
    taskType: ctx.taskType || 'api_response',
    source: ctx.source || 'truth_spine',
  });
  return safe;
}

/**
 * Scrub prose before DB persistence (lumin_messages, etc.)
 */
export function scrubProseForStorage(text, ctx = {}) {
  return envelopePlainText(String(text || ''), {
    ...ctx,
    source: 'storage_scrub',
  });
}

export function truthGateOutbound(body, channel = 'api', req = null) {
  if (body == null) return body;
  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    return enforceTruthOnResponseBody(body, channel, req);
  }
  if (typeof body === 'string') {
    const trimmed = body.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === 'object') {
          return JSON.stringify(enforceTruthOnResponseBody(parsed, channel, req));
        }
      } catch {
        return body;
      }
    }
  }
  return body;
}

/**
 * Apply truth lockdown to any API JSON body with execution fields.
 */
export function enforceTruthOnResponseBody(body, channel = 'api', req = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  if (body.truth_spine_applied === true && body.truth_lockdown_applied === true) {
    return body;
  }

  const hasTruthFields = body.pass_fail != null
    || body.command_truth != null
    || body.human_summary != null
    || body.ok != null && body.verdict != null;

  let out = { ...body };

  if (hasTruthFields) {
    out = enforceTruthLockdown(out, channel || out.chair_channel || inferChannelFromRequest(req));
  }

  for (const key of RESPONSE_TRUTH_FIELDS) {
    if (typeof out[key] === 'string') {
      out[key] = envelopePlainText(out[key], {
        command_truth: out.command_truth || 'NO_COMMAND_RAN',
        pass_fail: out.pass_fail,
        taskType: `${channel}_field`,
      });
    }
    if (out[key] && typeof out[key] === 'object' && typeof out[key].content === 'string') {
      out[key] = {
        ...out[key],
        content: envelopePlainText(out[key].content, {
          command_truth: out.command_truth || 'NO_COMMAND_RAN',
          pass_fail: out.pass_fail,
          taskType: `${channel}_reply`,
        }),
      };
    }
  }

  if (out.result && typeof out.result === 'object' && out.result !== out) {
    out.result = enforceTruthOnResponseBody(out.result, channel, req);
  }

  out.truth_spine_applied = true;
  out.truth_spine_version = TRUTH_SPINE_VERSION;
  return stampPointBDna(out);
}

/**
 * Unified callAI — all scheduled jobs and services must use this, not raw fetch.
 */
export function createSpineCallAI(callCouncilMember, defaults = {}) {
  if (typeof callCouncilMember !== 'function') {
    return async () => '';
  }
  return async function spineCallAI(taskOrPrompt, promptOrOpts, maybeOpts = {}) {
    let prompt = '';
    let opts = { ...defaults };

    if (typeof promptOrOpts === 'string') {
      prompt = promptOrOpts;
      opts = { ...opts, ...(maybeOpts || {}) };
      if (typeof taskOrPrompt === 'string' && taskOrPrompt.length < 80 && !taskOrPrompt.includes('\n')) {
        opts.taskType = opts.taskType || taskOrPrompt;
      } else {
        prompt = typeof taskOrPrompt === 'string' ? taskOrPrompt : prompt;
      }
    } else {
      prompt = typeof taskOrPrompt === 'string' ? taskOrPrompt : '';
      opts = { ...opts, ...(promptOrOpts || {}) };
    }

    const member = opts.member || opts.model || 'gemini';
    const result = await callCouncilMember(member, prompt, {
      ...opts,
      taskType: opts.taskType || 'lifeos.spine.callAI',
      truthSpine: true,
    });
    const text = typeof result === 'string'
      ? result
      : result?.content || result?.text || result?.message || '';
    return text;
  };
}

export function createSpineStoreMemory(baseStoreMemory) {
  return async function spineStoreMemory(category, content, options = {}) {
    const gated = gateMemoryWrite(category, content, { ...options, aiOrigin: options.aiOrigin !== false });
    if (!gated.allowed) {
      return null;
    }
    return baseStoreMemory(category, gated.content, gated.options);
  };
}

export function assertReceiptTruth(receipt, fileName = 'inline') {
  return validateReceiptObject(receipt, fileName);
}

export function buildSpineStamp(overrides = {}) {
  return buildMemoryTruthStamp(overrides);
}
