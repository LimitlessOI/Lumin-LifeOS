/**
 * SYNOPSIS: Life admin Chair turn — coupons, errands, appointments (web search + counsel).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createWebSearchService } from './web-search-service.js';
import {
  buildLifeAdminSearchQuery,
  formatLifeAdminCounselPreamble,
} from './founder-life-admin-intent.js';

export async function runLifeAdminChairTurn(cleanedInput, deps = {}) {
  const { callAI, luminConverse, sanitizeConversationReply } = deps;
  const searchSvc = createWebSearchService({
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    callAI,
  });

  const query = buildLifeAdminSearchQuery(cleanedInput);
  let searchResult = null;
  try {
    searchResult = await searchSvc.search(query, { count: 5 });
  } catch {
    searchResult = null;
  }

  const searchBlock = formatLifeAdminCounselPreamble(searchResult);
  const counselPrompt = [
    'The founder asked a personal life / errand question — NOT a software build.',
    'Help practically: yes/no on timing, coupon links if you have them, what to do on the way out.',
    'Do NOT ask about target_file, LifeRE HTML, SSOT, or builder surfaces.',
    'If location is unknown, say so and give national chain coupon paths they can open on their phone.',
    '',
    `Founder message: ${cleanedInput}`,
    searchBlock ? `\nSearch results to cite:\n${searchBlock}` : '',
  ].filter(Boolean).join('\n');

  const luminReply = await luminConverse(counselPrompt);
  const combined = `${luminReply}${searchBlock}`;
  const safeReply = sanitizeConversationReply(combined, { command_truth: 'NO_COMMAND_RAN' });

  return {
    ok: true,
    action: 'life_admin',
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
    life_admin: {
      search_query: query,
      search_source: searchResult?.source || null,
      result_count: searchResult?.results?.length || 0,
    },
    human_summary_technical: safeReply,
    conversation_sanitized: safeReply !== combined,
    done_synopsis: 'Life admin — coupon/errand help (no code executed).',
    next_synopsis: 'Tell me your city or preferred shop if you want tighter local results.',
  };
}
