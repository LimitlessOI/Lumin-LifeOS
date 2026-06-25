/**
 * SYNOPSIS: Lumin translation routing — cheapest model first, escalate by difficulty + account role.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { estimateTokens } from './token-optimizer.js';

/** Models in cost order (free/cheap → capable). Council member keys. */
export const TRANSLATION_MODEL_LADDER = [
  'groq_llama',
  'gemini_flash',
  'gemini',
  'claude',
];

const SMART_TIER_TOKEN_THRESHOLD = 1500;
const HIGH_STAKES_KEYWORDS = [
  'hipaa', 'medical record', 'billing charge', 'legal liability', 'compliance violation',
];

const COMPLEXITY_HINTS = [
  { re: /\b(build|execute|deploy|commit|mission|blueprint|fix the code)\b/i, bump: 1 },
  { re: /\b(research|competitor|strategy|simulate|predict|future lookback)\b/i, bump: 1 },
  { re: /\b(legal|medical|billing|hipaa|compliance)\b/i, bump: 2 },
];

function classifyRoutingTier(text, { forceSmart = false } = {}) {
  const lower = String(text || '').toLowerCase();
  const tokenCount = estimateTokens(text);
  const isHighStakes = HIGH_STAKES_KEYWORDS.some((kw) => lower.includes(kw));
  if (isHighStakes) return { tier: 'paid', reason: 'high_stakes keyword' };
  if (forceSmart || tokenCount > SMART_TIER_TOKEN_THRESHOLD) {
    return { tier: 'smart', reason: `tokens=${tokenCount}` };
  }
  return { tier: 'free', reason: 'standard translate' };
}

/**
 * Classify a Lumin turn for translation (not execution) cost routing.
 * @returns {{ complexity: 'low'|'medium'|'high', tier: string, suggestedModels: string[], account_role: string }}
 */
export function classifyLuminTranslationTurn({
  userMessage = '',
  systemFacts = {},
  accountRole = 'member',
  channel = 'chair',
} = {}) {
  const text = String(userMessage || '').trim();
  const factsJson = JSON.stringify(systemFacts || {});
  const tokenEstimate = estimateTokens(`${text}\n${factsJson}`);

  let complexityScore = 0;
  if (tokenEstimate > 2500) complexityScore += 2;
  else if (tokenEstimate > 1200) complexityScore += 1;

  for (const hint of COMPLEXITY_HINTS) {
    if (hint.re.test(text)) complexityScore += hint.bump;
  }

  if (systemFacts.strategic_brief) complexityScore += 1;
  if (systemFacts.listening_onboarding) complexityScore += 0;
  if (channel === 'point_b' || channel === 'mission_pipeline') complexityScore += 2;
  if (systemFacts.command_ran === true) complexityScore += 1;

  const complexity = complexityScore >= 3 ? 'high' : complexityScore >= 1 ? 'medium' : 'low';

  const routing = classifyRoutingTier(`${text}\n${factsJson.slice(0, 4000)}`, {
    taskType: 'lumin_chair_translate',
    forceSmart: complexity === 'high',
  });

  let startIndex = 0;
  if (routing.tier === 'smart' || complexity === 'medium') startIndex = 1;
  if (routing.tier === 'paid' || complexity === 'high') startIndex = 2;

  // Founder/operator may escalate sooner for strategic turns; members stay cheaper longer.
  if (accountRole === 'founder' && complexity === 'high') {
    startIndex = Math.max(startIndex, 1);
  }
  if (accountRole === 'member' && complexity === 'low') {
    startIndex = 0;
  }

  const suggestedModels = TRANSLATION_MODEL_LADDER.slice(startIndex);

  return {
    complexity,
    tier: routing.tier,
    tier_reason: routing.reason,
    suggested_models: suggestedModels,
    account_role: accountRole,
    token_estimate: tokenEstimate,
  };
}

/**
 * Try models in order until one returns text.
 */
export async function callTranslationWithEscalation({
  callAI,
  prompt,
  routing,
  options = {},
}) {
  if (typeof callAI !== 'function') return { text: null, model_used: null, attempts: [] };

  const models = routing?.suggested_models?.length
    ? routing.suggested_models
    : TRANSLATION_MODEL_LADDER;

  const attempts = [];
  for (const model of models) {
    try {
      const response = await callAI(model, prompt, {
        maxOutputTokens: options.maxOutputTokens || 1200,
        taskType: 'lumin_chair_translate',
        useCache: false,
        allowModelDowngrade: false,
      });
      const text = typeof response === 'string'
        ? response
        : response?.content || response?.text || null;
      if (text?.trim()) {
        return { text: text.trim(), model_used: model, attempts };
      }
      attempts.push({ model, ok: false, reason: 'empty' });
    } catch (err) {
      attempts.push({ model, ok: false, reason: err.message });
    }
  }
  return { text: null, model_used: null, attempts };
}
