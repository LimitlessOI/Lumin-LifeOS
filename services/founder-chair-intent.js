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

/**
 * Classify founder prompt intent and route to the correct workflow lane.
 * Routes 'drawer_direct_build' to 'workflow-content' instead of 'counsel/essay'.
 * Integrates with clarification and signal services, using callCouncilMember
 * for AI-driven classification when pattern matching is insufficient.
 */
export function classifyFounderIntent(prompt = '', ctx = {}) {
  const p = String(prompt || '').toLowerCase().trim();

  // Pattern-based routing for known drawer build intents
  if (/\b(drawer direct build|build the drawer|update the drawer|fix the drawer|rebuild the drawer)\b/i.test(p)) {
    return {
      intent: 'drawer_direct_build',
      lane: 'workflow-content',
      channel: 'build_async',
      source: 'pattern',
    };
  }

  // If a clarification signal is present, respect its explicit lane
  if (ctx?.clarification?.lane) {
    return {
      intent: ctx.clarification.intent || 'clarified',
      lane: ctx.clarification.lane,
      channel: ctx.clarification.channel || null,
      source: 'clarification',
    };
  }

  // If a signal service provided a classification, use it
  if (ctx?.signal?.intent) {
    return {
      intent: ctx.signal.intent,
      lane: ctx.signal.lane || 'default',
      channel: ctx.signal.channel || null,
      source: 'signal',
    };
  }

  // Fallback: AI-driven classification via callCouncilMember
  if (typeof ctx?.callCouncilMember === 'function') {
    try {
      const councilResult = ctx.callCouncilMember({
        task: 'classify_founder_intent',
        prompt: String(prompt || ''),
      });
      if (councilResult?.intent) {
        const intent = councilResult.intent;
        return {
          intent,
          lane: intent === 'drawer_direct_build' ? 'workflow-content' : (councilResult.lane || 'default'),
          channel: councilResult.channel || null,
          source: 'council',
        };
      }
    } catch {
      // Fall through to unknown if council fails
    }
  }

  return { intent: 'unknown', lane: 'default', source: 'fallback' };
}

/**
 * Classifies the founder's build intent, specifically 'drawer_direct_build' vs. 'counsel/essay text'.
 * Uses callCouncilMember for AI-driven classification.
 * @param {string} prompt The founder's natural language prompt.
 * @param {object} ctx Context object, expected to contain `callCouncilMember` function.
 * @returns {object} A structured object indicating the classified intent, e.g., { intent: 'drawer_direct_build', lane: 'workflow-content' }
 */
export async function classifyFounderBuildIntent(prompt = '', ctx = {}) {
  const p = String(prompt || '').trim();

  if (typeof ctx?.callCouncilMember !== 'function') {
    console.warn('classifyFounderBuildIntent: callCouncilMember function not provided in context.');
    return { intent: 'unknown', lane: 'default', source: 'missing_council_member' };
  }

  try {
    const councilResult = await ctx.callCouncilMember('founder_intent_classifier', p);

    const intent = councilResult?.intent || 'unknown';
    const lane = (intent === 'drawer_direct_build' || intent === 'build_async') ? 'workflow-content' : 'counsel/essay';
    const channel = (intent === 'drawer_direct_build' || intent === 'build_async') ? 'build_async' : 'counsel';

    return {
      intent,
      lane,
      channel,
      source: 'council_founder_intent_classifier',
      rawCouncilResult: councilResult, // For debugging/transparency
    };
  } catch (error) {
    console.error('Error classifying founder build intent with Council Member:', error);
    return { intent: 'unknown', lane: 'default', source: 'council_error', error: error.message };
  }
}

/**
 * Classifies a founder prompt into the correct workflow lane,
 * specifically identifying 'drawer_direct_build' prompts.
 * This is an alias for classifyFounderIntent, ensuring consistent naming.
 * @param {string} prompt The founder's natural language prompt.
 * @param {object} ctx Context object, which may contain clarification, signal, or callCouncilMember.
 * @returns {object} A structured object indicating the classified intent, lane, channel, and source.
 */
export function classifyFounderPrompt(prompt = '', ctx = {}) {
  return classifyFounderIntent(prompt, ctx);
}