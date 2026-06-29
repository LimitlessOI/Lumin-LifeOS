/**
 * SYNOPSIS: Founder natural language → structured build task + explicit Chair channel map.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import {
  augmentTaskWithGapFillScope,
  inferTargetFileFromFounderFeedback,
  resolveFounderBuildTarget,
} from './builder-instruction-target.js';

const EXPLICIT_ACTION_CHANNELS = {
  build: 'build_async',
  execute: 'execute',
  display: 'display',
  counsel: 'counsel',
  mission_pipeline: 'mission_pipeline',
  pipeline: 'mission_pipeline',
  blueprint_execute: 'blueprint_execute',
  blueprint: 'blueprint_execute',
  point_b: 'point_b',
  status: 'point_b',
};

export function resolveExplicitChairChannel(explicitAction = '', ctx = {}) {
  const key = String(explicitAction || '').toLowerCase().trim();
  if (!key || key === 'auto') return null;
  const base = EXPLICIT_ACTION_CHANNELS[key];
  if (!base) return null;
  if (base === 'build_async' && ctx.useTerminalForBuild) return 'build_terminal';
  return base;
}

export function isFounderShipOrUsabilityIntent(text = '') {
  const t = String(text || '');
  return /\b(ship it|get it working|make it work|make this work|usability|auto-?load|on open|when i open|daily command|working end-to-end)\b/i.test(t);
}

/**
 * Expand vague founder text into a builder task with target_file when inferrable.
 */
export function expandFounderBuildTask(cleanedInput = '') {
  const base = String(cleanedInput || '').trim();
  if (!base) return base;
  if (/target_file:\s*\S+/i.test(base)) return base;

  let target = resolveFounderBuildTarget(base);
  if (!target && /\b(lifere|life-?re|life re)\b/i.test(base)) {
    target = 'public/overlay/lifeos-lifere.html';
  }
  if (!target && /\b(lumin|lifeos-?app|main shell|drawer)\b/i.test(base) && /\b(ui|nav|voice|open|load|page)\b/i.test(base)) {
    target = 'public/overlay/lifeos-app.html';
  }
  if (!target) {
    const inferred = inferTargetFileFromFounderFeedback(base);
    target = inferred?.target_file || null;
  }
  if (!target) return base;

  return augmentTaskWithGapFillScope(base, target);
}
