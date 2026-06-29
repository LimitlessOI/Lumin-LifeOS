/**
 * SYNOPSIS: Memory write gate — no AI prose stored without epistemic stamp + envelope scrub.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */

import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';
import { detectCounselTheater } from './chair-direct-connection-truth.js';

export const EPISTEMIC_LABELS = Object.freeze(['KNOW', 'THINK', 'GUESS', 'DONT_KNOW']);

export const TRUTH_LEVEL_MAP = Object.freeze({
  KNOW: 3,
  THINK: 1,
  GUESS: 0,
  DONT_KNOW: 0,
});

function extractAiText(content) {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    return content.lumin || content.reply || content.text || content.summary || JSON.stringify(content);
  }
  return '';
}

export function buildMemoryTruthStamp(options = {}) {
  return {
    epistemic_label: options.epistemic_label || options.epistemicLabel || 'GUESS',
    evidence_level: options.evidence_level ?? TRUTH_LEVEL_MAP[options.epistemic_label || 'GUESS'] ?? 0,
    command_truth: options.command_truth || options.commandTruth || 'NO_COMMAND_RAN',
    truth_envelope_version: options.truth_envelope_version || 'ai_prose_envelope_v1',
    truth_lockdown_version: options.truth_lockdown_version || null,
    receipt_path: options.receipt_path || null,
    at: new Date().toISOString(),
  };
}

/**
 * Gate AI-originated memory writes. Returns null to skip store.
 */
export function gateMemoryWrite(category, content, options = {}) {
  if (options.bypassTruthGate === true) {
    return { content, options, allowed: true, bypass: true };
  }

  const aiCategories = new Set([
    'conversation_history',
    'facts',
    'goals',
    'preferences',
    'user_profile',
    'lumin_doctrine',
  ]);

  const isAiOrigin = options.aiOrigin === true
    || aiCategories.has(category)
    || Boolean(extractAiText(content));

  if (!isAiOrigin) {
    return { content, options, allowed: true };
  }

  const stamp = buildMemoryTruthStamp(options.truth_stamp || options);
  const rawText = extractAiText(content);
  const commandTruth = stamp.command_truth || 'NO_COMMAND_RAN';

  const { text: safeText, envelope } = applyAiProseTruthEnvelope(rawText, {
    command_truth: commandTruth,
    pass_fail: options.pass_fail || 'NO_COMMAND_RAN',
    taskType: options.taskType || 'memory_write',
    source: 'memory_write_gate',
  });

  const rawTheater = detectCounselTheater(rawText, commandTruth);
  if (rawTheater.violation || envelope.theater_blocked) {
    return {
      allowed: false,
      reason: 'THEATER_BLOCKED',
      envelope,
      stamp,
      theater_hits: rawTheater.hits || envelope.hits,
    };
  }

  let stampedContent = content;
  if (typeof content === 'string') {
    stampedContent = safeText;
  } else if (content && typeof content === 'object') {
    stampedContent = { ...content };
    if ('lumin' in stampedContent) stampedContent.lumin = safeText;
    if ('reply' in stampedContent) stampedContent.reply = safeText;
    if ('text' in stampedContent) stampedContent.text = safeText;
    stampedContent.truth_stamp = stamp;
    stampedContent.truth_envelope = envelope;
  }

  const gatedOptions = {
    ...options,
    type: options.type || 'ai_inferred',
    confidence: Math.min(options.confidence ?? 0.5, stamp.epistemic_label === 'KNOW' ? 0.95 : 0.7),
    truth_stamp: stamp,
    truth_envelope: envelope,
  };

  if (stamp.epistemic_label === 'KNOW' && !stamp.receipt_path && commandTruth === 'NO_COMMAND_RAN') {
    stamp.epistemic_label = 'THINK';
    stamp.evidence_level = 1;
    gatedOptions.confidence = Math.min(gatedOptions.confidence, 0.6);
  }

  return {
    allowed: true,
    content: stampedContent,
    options: gatedOptions,
    envelope,
    stamp,
  };
}

export function sanitizeLegacyMemoryContent(content, category = '') {
  if (category !== 'conversation_history' && category !== 'facts') {
    return content;
  }
  if (typeof content === 'string') {
    const { text } = applyAiProseTruthEnvelope(content, {
      command_truth: 'NO_COMMAND_RAN',
      taskType: 'legacy_memory_read',
      source: 'legacy_sanitizer',
    });
    return text;
  }
  if (content && typeof content === 'object' && content.lumin) {
    const { text } = applyAiProseTruthEnvelope(String(content.lumin), {
      command_truth: 'NO_COMMAND_RAN',
      taskType: 'legacy_memory_read',
      source: 'legacy_sanitizer',
    });
    return { ...content, lumin: text, legacy_sanitized: true };
  }
  return content;
}
