/**
 * SYNOPSIS: Chair native facts — real system state Lumin IS (not chat overlay).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { loadPointBTarget } from './point-b-target-lite.js';
import { evaluatePointBNavigator, formatPointBStatusSummary } from './point-b-navigator.js';
import { getLifeREAlphaReadinessSurface } from './lifere-alpha-readiness-surface.js';
import { createWebSearchService } from './web-search-service.js';
import {
  buildLifeAdminSearchQuery,
  formatLifeAdminCounselPreamble,
  formatErrandCouponFallback,
  isFounderPersonalLifeIntent,
} from './founder-life-admin-intent.js';
import { hasProductBuildContext } from './chair-context-classifier.js';
import { gatherStrategicBriefForChair } from './lumin-strategic-intelligence.js';

function searchBlockIsUseful(searchResult) {
  if (!searchResult?.results?.length) return false;
  if (searchResult.source === 'ai_knowledge') return false;
  return true;
}

export async function gatherChairNativeFacts(input, deps = {}, chairContext = {}) {
  const text = String(input || '').trim();
  const personalTurn = chairContext.personal_search !== false
    && (isFounderPersonalLifeIntent(text) || ['personal_life', 'conversation'].includes(chairContext.domain));

  const facts = {
    schema: 'chair_native_facts_v1',
    role: 'chair',
    lumin_is_chair: true,
    command_truth: 'NO_COMMAND_RAN',
    command_ran: false,
    personal_turn: personalTurn,
    domain: chairContext.domain || 'conversation',
    point_b_target: loadPointBTarget(),
    point_b_status: null,
    alpha_readiness: null,
    verified_search: null,
    memory_context: deps.memoryContext || null,
    strategic_brief: deps.strategicBrief || null,
    chair_note: 'Lumin is the Chair — these facts come from system APIs/files, not roleplay.',
  };

  if (!personalTurn || hasProductBuildContext(text)) {
    try {
      facts.point_b_status = await evaluatePointBNavigator({
        callAI: deps.callAI,
        includeWebResearch: /\b(research|competitor|gap|strategy)\b/i.test(text),
      });
      facts.point_b_summary = formatPointBStatusSummary(facts.point_b_status);
    } catch {
      facts.point_b_summary = facts.point_b_target?.label
        ? `Point B anchor: ${facts.point_b_target.label} (${facts.point_b_target.mission_id || '—'})`
        : null;
    }
  }

  if (/\b(alpha|lifere|readiness)\b/i.test(text) && deps.pool) {
    try {
      facts.alpha_readiness = getLifeREAlphaReadinessSurface({
        pool: Boolean(deps.pool),
        pgTablesOk: null,
      });
    } catch {
      /* non-fatal */
    }
  }

  if (personalTurn) {
    const searchSvc = createWebSearchService({
      BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      callAI: deps.callAI,
    });
    try {
      const query = buildLifeAdminSearchQuery(text);
      const searchResult = await searchSvc.search(query, { count: 5 });
      facts.verified_search = searchBlockIsUseful(searchResult)
        ? formatLifeAdminCounselPreamble(searchResult)
        : formatErrandCouponFallback(text);
    } catch {
      facts.verified_search = formatErrandCouponFallback(text);
    }
  }

  if (!facts.strategic_brief && deps.pool && !personalTurn && hasProductBuildContext(text)) {
    try {
      facts.strategic_brief = await gatherStrategicBriefForChair({
        cleanedInput: text,
        pool: deps.pool,
        callAI: deps.callAI,
        pointBTarget: facts.point_b_target,
      });
    } catch {
      /* non-fatal */
    }
  }

  return facts;
}
