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
import { isBuildRequest } from './chair-intent-signals.js';
import { gatherStrategicBriefForChair } from './lumin-strategic-intelligence.js';
import { createLuminContextLoader } from './lumin-context-loader.js';
import { gatherChairSystemKnowledge, needsSystemKnowledge } from './chair-system-knowledge.js';
import { loadKnowledgeContext, getKnowledgeContext } from './knowledge-context.js';

function searchBlockIsUseful(searchResult) {
  if (!searchResult?.results?.length) return false;
  if (searchResult.source === 'ai_knowledge') return false;
  return true;
}

/** Factual question — not system/build/status; may need live web search. */
function needsGeneralWebSearch(text = '', chairContext = {}) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (isFounderPersonalLifeIntent(t)) return false;
  if (hasProductBuildContext(t) && isBuildRequest(t)) return false;
  if (/^\s*(do|execute|run)\s*:/i.test(t)) return false;
  if (/\b(point b|lifere alpha|alpha readiness|alpha battery|alpha test|lifere|ssot|amendment|deploy|railway|builder os|builder pipeline|queue status|target_file|smos|social media os)\b/i.test(t)) {
    return false;
  }
  if (/\?\s*$/.test(t)) return true;
  if (/^(what|who|when|where|why|how|is|are|does|did|can|could|tell me about)\b/i.test(t)) return true;
  if (chairContext.personal_search) return true;
  return false;
}

async function attachVerifiedSearch(facts, text, deps) {
  const searchSvc = createWebSearchService({
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    callAI: deps.callAI,
  });
  try {
    const query = buildLifeAdminSearchQuery(text) || String(text).slice(0, 160);
    const searchResult = await searchSvc.search(query, { count: 5 });
    if (searchResult?.results?.length) {
      facts.verified_search = formatLifeAdminCounselPreamble(searchResult);
      facts.search_source = searchResult.source || null;
    } else {
      const fallback = formatErrandCouponFallback(text);
      facts.verified_search = fallback || `Live search returned no snippets for: ${query.slice(0, 120)}. (source: none)`;
      facts.search_source = searchResult?.source || null;
    }
  } catch {
    const fallback = formatErrandCouponFallback(text);
    facts.verified_search = fallback || `Live search unavailable for: ${String(text).slice(0, 120)}.`;
  }
}

export async function gatherChairNativeFacts(input, deps = {}, chairContext = {}) {
  const text = String(input || '').trim();
  const systemQuestion = needsSystemKnowledge(text);
  const personalTurn = !chairContext.alpha_probe
    && !systemQuestion
    && chairContext.personal_search !== false
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
    memory_context: chairContext.alpha_probe ? null : (deps.memoryContext || null),
    strategic_brief: deps.strategicBrief || null,
    chair_note: 'Lumin is the operating intelligence — facts from system APIs/files/twin/SSOT, not roleplay. Lumin IS the Chair and can implement via BuilderOS build_async.',
    system_knowledge: null,
    program_context: null,
    builder_capability: null,
  };

  if (!getKnowledgeContext()) {
    await loadKnowledgeContext().catch(() => null);
  }

  try {
    const sysKnow = await gatherChairSystemKnowledge(text);
    facts.system_knowledge = sysKnow.formatted || null;
    facts.program_context = sysKnow.programs?.length ? sysKnow.programs : null;
    facts.builder_capability = sysKnow.builder;
    if (sysKnow.programs?.length) {
      facts.program_context = sysKnow.programs;
      facts.chair_note = `${facts.chair_note} Answer using program_context and system_knowledge — do not claim the system lacks this; do not answer a different topic.`;
    }
    if (sysKnow.programs?.length || systemQuestion) {
      facts.personal_turn = false;
    }
  } catch {
    /* non-fatal */
  }

  if (deps.pool) {
    try {
      const loader = createLuminContextLoader({ pool: deps.pool, callAI: deps.callAI });
      let numericUserId = deps.userId || null;
      let userHandle = deps.userHandle || chairContext.user_handle || null;

      if (numericUserId && !userHandle) {
        const { rows } = await deps.pool.query(
          `SELECT user_handle FROM lifeos_users WHERE id = $1 AND active = TRUE LIMIT 1`,
          [numericUserId],
        ).catch(() => ({ rows: [] }));
        userHandle = rows[0]?.user_handle || null;
      }

      if (!numericUserId && userHandle) {
        const { rows } = await deps.pool.query(
          `SELECT id FROM lifeos_users WHERE user_handle = $1 AND active = TRUE LIMIT 1`,
          [userHandle],
        ).catch(() => ({ rows: [] }));
        numericUserId = rows[0]?.id || null;
      }

      if (!numericUserId && !userHandle) {
        userHandle = 'adam';
        const { rows } = await deps.pool.query(
          `SELECT id FROM lifeos_users WHERE user_handle = 'adam' AND active = TRUE LIMIT 1`,
        ).catch(() => ({ rows: [] }));
        numericUserId = rows[0]?.id || null;
      }

      userHandle = userHandle || 'adam';

      facts.lumin_context = await loader.buildPromptContext({
        userId: numericUserId,
        userHandle,
      });
      facts.personal_twin = await loader.loadPersonalTwin(userHandle);
      facts.twin_user_handle = userHandle;
    } catch {
      /* non-fatal */
    }
  }

  if ((!personalTurn || hasProductBuildContext(text)) && /\b(point b|alpha|lifere alpha|progress|status|machine path|readiness|what(?:'s| is) next)\b/i.test(text)) {
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
    facts.chair_note = `${facts.chair_note} Personal life turn — answer the user's question directly; do not recite Point B, alpha, or builder queue unless they asked.`;
    facts.point_b_target = null;
    facts.point_b_summary = null;
    await attachVerifiedSearch(facts, text, deps);
  } else if (needsGeneralWebSearch(text, chairContext) && !needsSystemKnowledge(text)) {
    facts.chair_note = `${facts.chair_note} Factual question — use verified_search when present; answer directly; do not CLARIFY or paraphrase the question back.`;
    await attachVerifiedSearch(facts, text, deps);
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

  if (needsSystemKnowledge(text)) {
    facts.verified_search = null;
    facts.personal_turn = false;
  }

  return JSON.parse(JSON.stringify(facts));
}
