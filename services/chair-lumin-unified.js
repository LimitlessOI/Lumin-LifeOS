/**
 * SYNOPSIS: Unified Lumin turn — personal life + counsel + command context (one front door).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createWebSearchService } from './web-search-service.js';
import {
  buildLifeAdminSearchQuery,
  formatLifeAdminCounselPreamble,
  formatErrandCouponFallback,
  isFounderPersonalLifeIntent,
} from './founder-life-admin-intent.js';
import { detectDualIntent } from './chair-context-classifier.js';
import { shouldAttachStrategicBrief } from './chair-lumin-personal-mode.js';
import { formatStrategicBriefSection } from './lumin-strategic-intelligence.js';
import { getDoctrinePromptBlock } from './lifeos-service-doctrine.js';

function searchBlockIsUseful(searchResult) {
  if (!searchResult?.results?.length) return false;
  if (searchResult.source === 'ai_knowledge') return false;
  return true;
}

export async function runLuminUnifiedTurn(cleanedInput, deps = {}, chairContext = {}) {
  const {
    callAI,
    luminConverse,
    sanitizeConversationReply,
    strategicBrief = null,
    pointBTarget = null,
  } = deps;

  const dual = detectDualIntent(cleanedInput);
  const personalTurn = chairContext.personal_search !== false
    && (dual.personal || isFounderPersonalLifeIntent(cleanedInput) || ['personal_life', 'conversation'].includes(chairContext.domain));

  let searchBlock = '';
  if (personalTurn) {
    const searchSvc = createWebSearchService({
      BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      callAI,
    });
    try {
      const query = buildLifeAdminSearchQuery(cleanedInput);
      const searchResult = await searchSvc.search(query, { count: 5 });
      searchBlock = searchBlockIsUseful(searchResult)
        ? formatLifeAdminCounselPreamble(searchResult)
        : formatErrandCouponFallback(cleanedInput);
    } catch {
      searchBlock = formatErrandCouponFallback(cleanedInput);
    }
    if (!searchBlock && /\b(coupon|oil change)\b/i.test(cleanedInput)) {
      searchBlock = formatErrandCouponFallback(cleanedInput);
    }
  }

  const attachStrategic = shouldAttachStrategicBrief(cleanedInput, chairContext);
  const strategicSection = attachStrategic && strategicBrief
    ? formatStrategicBriefSection(strategicBrief)
    : '';

  const contextPreamble = [
    getDoctrinePromptBlock(),
    personalTurn ? 'PERSONAL LIFE TURN — not a software build.' : 'LUMIN COUNSEL TURN.',
    'HONESTY (mandatory):',
    '- Do NOT invent your location, drive time, shop hours, calendar, or vehicle maintenance history unless explicitly listed under WHAT I KNOW FROM MEMORY or in verified search results below.',
    '- If you lack city/ZIP or schedule data, say so and give national coupon links or ask one clarifying question.',
    '- No Point B, founder success test, or LifeRE talk on personal errands unless Adam asked about the product.',
    '- No numbered option menus unless he asked for options — answer like a chief of staff in plain prose.',
    '',
    `- Domain: ${chairContext.domain || 'conversation'}`,
    dual.dual
      ? '- He may also want a code change later — answer life part now; mention "confirm build" only if product surfaces were named.'
      : '',
    searchBlock ? `\nVerified / fallback links to use:\n${searchBlock}` : '',
    !personalTurn && pointBTarget?.label ? `\nProgram anchor (only if relevant): ${pointBTarget.label}` : '',
  ].filter(Boolean).join('\n');

  const luminReply = await luminConverse(`${contextPreamble}\n\nAdam: ${cleanedInput}`);
  const combined = [luminReply, strategicSection].filter(Boolean).join('');
  const safeReply = sanitizeConversationReply(combined, { command_truth: 'NO_COMMAND_RAN' });

  return {
    ok: true,
    action: 'lumin',
    chair_domain: chairContext.domain || 'conversation',
    personal_turn: personalTurn,
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
    dual_intent: dual.dual ? { personal: true, build: true } : null,
    human_summary_technical: safeReply,
    conversation_sanitized: safeReply !== combined,
    done_synopsis: personalTurn
      ? null
      : 'Lumin — counsel (no code executed unless you asked a separate build).',
    next_synopsis: personalTurn
      ? null
      : (dual.dual
        ? 'Reply with follow-up, or "confirm build" + what to change in the product.'
        : null),
    strategic_brief: attachStrategic ? strategicBrief : null,
    errand_search_block: searchBlock || null,
  };
}
