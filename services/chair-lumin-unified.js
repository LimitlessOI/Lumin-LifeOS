/**
 * SYNOPSIS: Unified Lumin turn — personal life + counsel + command context (one front door).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createWebSearchService } from './web-search-service.js';
import {
  buildLifeAdminSearchQuery,
  formatLifeAdminCounselPreamble,
} from './founder-life-admin-intent.js';
import { detectDualIntent } from './chair-context-classifier.js';
import { formatStrategicBriefSection } from './lumin-strategic-intelligence.js';

export async function runLuminUnifiedTurn(cleanedInput, deps = {}, chairContext = {}) {
  const {
    callAI,
    luminConverse,
    sanitizeConversationReply,
    strategicBrief = null,
    pointBTarget = null,
  } = deps;

  const dual = detectDualIntent(cleanedInput);
  let searchBlock = '';
  if (chairContext.personal_search !== false && (dual.personal || chairContext.domain === 'personal_life')) {
    const searchSvc = createWebSearchService({
      BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      callAI,
    });
    try {
      const query = buildLifeAdminSearchQuery(cleanedInput);
      const searchResult = await searchSvc.search(query, { count: 5 });
      searchBlock = formatLifeAdminCounselPreamble(searchResult);
    } catch {
      searchBlock = '';
    }
  }

  const strategicSection = strategicBrief ? formatStrategicBriefSection(strategicBrief) : '';
  const contextPreamble = [
    'CONTEXT FOR THIS TURN:',
    `- Domain: ${chairContext.domain || 'conversation'}`,
    '- Adam is using LifeOS as his personal operating system AND command/control center.',
    '- This is NOT a software build request unless he named product surfaces (HTML, routes, LifeRE, deploy, etc.).',
    '- Answer the human question first — errands, coupons, timing, life decisions, strategy.',
    '- Do NOT ask about target_file, LifeRE HTML, or builder surfaces for personal-life questions.',
    dual.dual
      ? '- DUAL INTENT: he also hinted at a product/code change — answer the life part now; mention he can say "confirm build" for the code part.'
      : '',
    searchBlock ? `\nWeb search results (cite if useful):\n${searchBlock}` : '',
    pointBTarget?.label ? `\nProgram anchor (background only): ${pointBTarget.label}` : '',
  ].filter(Boolean).join('\n');

  const luminReply = await luminConverse(`${contextPreamble}\n\nAdam: ${cleanedInput}`);
  const combined = [luminReply, strategicSection].filter(Boolean).join('');
  const safeReply = sanitizeConversationReply(combined, { command_truth: 'NO_COMMAND_RAN' });

  return {
    ok: true,
    action: 'lumin',
    chair_domain: chairContext.domain || 'conversation',
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
    dual_intent: dual.dual ? { personal: true, build: true } : null,
    human_summary_technical: safeReply,
    conversation_sanitized: safeReply !== combined,
    done_synopsis: 'Lumin — personal + counsel (no code executed unless you asked a separate build).',
    next_synopsis: dual.dual
      ? 'Reply with life follow-up, or "confirm build" + what to change in the product.'
      : 'Keep talking — LifeOS handles life and code from this same front door.',
    strategic_brief: strategicBrief,
  };
}
