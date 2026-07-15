/**
 * SYNOPSIS: Chair native facts — real system state Lumin IS (not chat overlay).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { loadPointBTarget } from './point-b-target-lite.js';
import { evaluatePointBNavigator, formatPointBStatusSummary } from './point-b-navigator.js';
import { getLifeREAlphaReadinessSurface } from './lifere-alpha-readiness-surface.js';
import { createWebSearchService } from './web-search-service.js';
import {
  buildLifeAdminSearchQuery,
  formatLifeAdminCounselPreamble,
  formatErrandCouponFallback,
  isFounderIdentityIntent,
  isFounderPersonalLifeIntent,
} from './founder-life-admin-intent.js';
import { hasProductBuildContext } from './chair-context-classifier.js';
import { isBuildRequest } from './chair-intent-signals.js';
import { gatherStrategicBriefForChair } from './lumin-strategic-intelligence.js';
import { createLuminContextLoader } from './lumin-context-loader.js';
import { gatherChairSystemKnowledge, needsSystemKnowledge } from './chair-system-knowledge.js';
import { loadKnowledgeContext, getKnowledgeContext } from './knowledge-context.js';
import { getLatestFounderBuildJobForUser } from './founder-build-job-store.js';
import {
  getLatestFounderInterfaceBuildReceipt,
  summarizeFounderBuildReceipt,
} from './builderos-command-control-service.js';
import { getGovernedAutonomousShipStatus } from './governed-autonomous-shipping-loop.js';
import { getNeverStopProductFactoryStatus } from './never-stop-product-factory-scheduler.js';

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
  if (/\b(should i|what should i|which should i|help me decide|smartest next|best next|prioritize|focus on|where should i spend|next two hours|next step)\b/i.test(t)) {
    return false;
  }
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
    const SEARCH_BUDGET_MS = Number(process.env.CHAIR_SEARCH_BUDGET_MS || '14000');
    let budgetTimer;
    const searchResult = await Promise.race([
      searchSvc.search(query, { count: 5 }),
      new Promise((_, reject) => {
        budgetTimer = setTimeout(
          () => reject(new Error('chair_search_budget_exceeded')),
          SEARCH_BUDGET_MS,
        );
      }),
    ]).finally(() => clearTimeout(budgetTimer));
    if (searchResult?.results?.length) {
      facts.verified_search = formatLifeAdminCounselPreamble(searchResult);
      facts.search_source = searchResult.source || null;
    } else {
      markSearchUnavailable(facts, text);
    }
  } catch {
    markSearchUnavailable(facts, text);
  }
}

/**
 * No live web result. Do NOT echo the user's question back as a fake
 * "verified" block — a string that repeats the query passes the downstream
 * relevance check and gets served verbatim as the answer ("Live search
 * unavailable for: <question>"). Instead surface any genuine offline fallback,
 * else leave verified_search null so the Chair answers from its own
 * knowledge/twin/memory and only caveats missing live data when it matters.
 */
function markSearchUnavailable(facts, text) {
  const fallback = formatErrandCouponFallback(text);
  if (fallback) {
    facts.verified_search = fallback;
    return;
  }
  facts.verified_search = null;
  facts.search_source = null;
  facts.search_unavailable = true;
  facts.chair_note = `${facts.chair_note} No live web search result was available — answer directly from your own knowledge, the twin, and memory; only note that live/current data was unavailable if the answer genuinely depends on it.`;
}

export async function gatherChairNativeFacts(input, deps = {}, chairContext = {}) {
  const text = String(input || '').trim();
  const systemQuestion = needsSystemKnowledge(text);
  const explicitPersonalLifeIntent = isFounderPersonalLifeIntent(text);
  // Default conversational turns (founder drawer / Chair) are personal unless the
  // user is clearly asking about product/build/ops. Previously only
  // personal_life domain or explicit life-admin intents counted — so almost every
  // drawer message got Point B / strategic briefs injected and felt like an
  // operator console, not a shippable human OS chat.
  const productOpsTurn = systemQuestion
    || hasProductBuildContext(text)
    || isBuildRequest(text)
    || /\b(point b|alpha|lifere alpha|progress|status|machine path|readiness|what(?:'s| is) next|queue|deploy|commit|working on|what are you (building|working on)|what is it (doing|working on)|what are we (building|working on)|currently (building|working on)|focused on|BOS|builder|building|shipping)\b/i.test(text);
  const conversationalDefault = chairContext.conversational_mode !== false
    && (chairContext.domain === 'chair'
      || chairContext.domain === 'counsel'
      || chairContext.domain === 'lumin'
      || chairContext.domain === 'conversation'
      || chairContext.conversational_mode === true);
  const personalTurn = !chairContext.alpha_probe
    && !productOpsTurn
    && chairContext.personal_search !== false
    && (explicitPersonalLifeIntent
      || chairContext.domain === 'personal_life'
      || conversationalDefault);

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
    memory_context: chairContext.alpha_probe ? null : (deps.memoryContext ?? null),
    strategic_brief: deps.strategicBrief || null,
    chair_note: 'Lumin is the operating intelligence — facts from system APIs/files/twin/SSOT, not roleplay. Lumin IS the Chair and can implement via BuilderOS build_async.',
    system_knowledge: null,
    program_context: null,
    builder_capability: null,
    last_build_receipt: null,
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
    // Only demote personal_turn for real system/ops questions. Matching the
    // "lumin|chair" program keyword alone used to force ops mode on every drawer
    // turn that mentioned Lumin — that made chat unshippable.
    if (systemQuestion && !explicitPersonalLifeIntent) {
      facts.personal_turn = false;
    }
  } catch {
    /* non-fatal */
  }

  let numericUserId = deps.userId || null;
  let userHandle = deps.userHandle || chairContext.user_handle || null;

  if (deps.pool) {
    try {
      const loader = createLuminContextLoader({ pool: deps.pool, callAI: deps.callAI });

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

  try {
    const memJob = getLatestFounderBuildJobForUser(numericUserId);
    const memReceipt = memJob
      ? summarizeFounderBuildReceipt({
        id: memJob.id,
        task: memJob.task,
        result: memJob.result,
        updated_at: memJob.updated_at || memJob.created_at,
        created_at: memJob.created_at,
      })
      : null;
    const dbReceipt = deps.pool
      ? await getLatestFounderInterfaceBuildReceipt(deps.pool, { userId: numericUserId })
      : null;
    facts.last_build_receipt = pickFresherBuildReceipt(memReceipt, dbReceipt);
    if (facts.last_build_receipt?.commit_sha) {
      facts.chair_note = `${facts.chair_note} last_build_receipt is a REAL prior build receipt (job store/DB). When Adam asks if a build landed or for the SHA, cite commit_sha from it — do not deny a receipt that is present.`;
    } else if (facts.last_build_receipt?.pass_fail === 'FAIL') {
      facts.chair_note = `${facts.chair_note} last_build_receipt shows the latest build FAILED — say so plainly with first_blocker if present.`;
    }
  } catch {
    /* non-fatal */
  }

  const runtimeStatusTurn = productOpsTurn && !isFounderIdentityIntent(text)
    && /\b(status|progress|builder|queue|running|never stop|governed|autonomous|working on|what are you (building|working on)|what is it (doing|working on)|what are we (building|working on)|currently (building|working on)|focused on|shipping|building|doing)\b/i.test(text);

  if (runtimeStatusTurn) {
    try {
      const governed = getGovernedAutonomousShipStatus().governed_autonomous_ship;
      const neverStop = getNeverStopProductFactoryStatus();
      const summary =
        `Governed autonomous loop enabled=${governed.enabled}, running=${governed.running}, totalRuns=${governed.totalRuns}, lastRunAt=${governed.lastRunAt || 'never'}, lastShippedInLastTick=${governed.lastShipped}, lastCommitSha=${governed.lastCommitSha || 'none'}, lastCommitError=${governed.lastCommitError || 'none'}, productsWithQueues=${governed.products_with_queues}. ` +
        `Legacy never-stop enabled=${neverStop?.never_stop?.enabled ?? 'unknown'}, running=${neverStop?.never_stop?.running ?? 'unknown'}.`;
      facts.live_builder_status = {
        summary,
        governed,
        never_stop: neverStop,
      };
      facts.chair_note = `${facts.chair_note} live_builder_status (and its summary field) is the REAL runtime builder/queue status — use it when Adam asks about builder status, progress, queue, or whether the system is running. Do not make up numbers; quote the facts. Note: lastShippedInLastTick is the count of steps shipped in the most recent tick only; a 0 there does NOT mean nothing has ever shipped. lastCommitSha is the SHA of the most recent commit the loop authored.`;
    } catch {
      /* non-fatal */
    }
  }

  if ((!personalTurn || hasProductBuildContext(text)) && !isFounderIdentityIntent(text)
    && /\b(point b|alpha|lifere alpha|machine path|readiness|what(?:'s| is) next)\b/i.test(text)
    && !runtimeStatusTurn) {
    try {
      facts.point_b_status = await evaluatePointBNavigator({
        callAI: deps.callAI,
        includeWebResearch: /\b(research|competitor|gap|strategy)\b/i.test(text),
        skipAcceptance: true,
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
    if (explicitPersonalLifeIntent) {
      await attachVerifiedSearch(facts, text, deps);
    }
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

  if (runtimeStatusTurn) {
    facts.system_knowledge = null;
    facts.program_context = null;
    facts.builder_capability = null;
    facts.point_b_target = null;
    facts.point_b_status = null;
    facts.point_b_summary = null;
    facts.strategic_brief = null;
    facts.memory_context = null;
    facts.personal_twin = null;
    facts.chair_note = `${facts.chair_note} Runtime status question — answer ONLY from live_builder_status and last_build_receipt. Do not use system_knowledge, program_context, point_b_target, strategic_brief, memory_context, or personal_twin.`;
  }

  return JSON.parse(JSON.stringify(facts));
}

function receiptTimeMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickFresherBuildReceipt(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const aPass = a.pass_fail === 'PASS' && a.commit_sha;
  const bPass = b.pass_fail === 'PASS' && b.commit_sha;
  if (aPass && !bPass) return a;
  if (bPass && !aPass) return b;
  return receiptTimeMs(a.updated_at) >= receiptTimeMs(b.updated_at) ? a : b;
}
