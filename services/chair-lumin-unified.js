/**
 * SYNOPSIS: Chair native turn — Lumin IS the Chair; personality translates real facts only.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectDualIntent } from './chair-context-classifier.js';
import { gatherChairNativeFacts } from './chair-native-facts.js';
import { translateChairPersonality } from './chair-personality-translate.js';
import { formatStrategicBriefSection } from './lumin-strategic-intelligence.js';
import { getDoctrinePromptBlock } from './lifeos-service-doctrine.js';
import { formatThreadForPrompt } from './lumin-thread-context.js';
import { shouldUseDirectProgramAnswer, formatDirectProgramAnswer, shouldUseDirectFactualAnswer, formatDirectFactualAnswer } from './chair-program-direct-answer.js';
import { needsSystemKnowledge } from './chair-system-knowledge.js';
import { composeReasoning } from './cognitive-chair.mjs';
import { createReasoningPlan, reasoningPlanGate, propagateOverallConfidence } from '../factory-staging/factory-core/builder/reasoning-plan.mjs';
import { recordFounderDecision } from './founder-intent-model.js';
import { recordModelOutcome } from './model-capability-ledger.js';
import { logModelCall } from './model-roi-ledger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REASONING_LOG = path.resolve(__dirname, '..', 'data', 'chair-reasoning-log.jsonl');

/**
 * SO-003 grounding resolver. The direct-answer helpers used to BE the Chair
 * reply (hardcoded string literal → zero model call) — the exact canned-response
 * violation SO-003 names. This now returns the verified factual block to GROUND
 * a real model call, never to replace it. Returns null when nothing grounds.
 * Exported for the SO-003 regression test.
 */
export function resolveGroundedDirectAnswer(cleanedInput, systemFacts = {}) {
  if (needsSystemKnowledge(cleanedInput)) {
    const a = formatDirectProgramAnswer(cleanedInput, systemFacts);
    if (a) return a;
  }
  if (shouldUseDirectProgramAnswer(cleanedInput, systemFacts)) {
    const a = formatDirectProgramAnswer(cleanedInput, systemFacts);
    if (a) return a;
  }
  if (shouldUseDirectFactualAnswer(cleanedInput, systemFacts)) {
    const a = formatDirectFactualAnswer(cleanedInput, systemFacts);
    if (a) return a;
  }
  return null;
}

const DECISION_MARKERS = /\b(should|want to|need to|decide|choose|pick|plan|build|create|make|deploy|ship|fix|change|update|implement|next step|what do you think|recommend|ratify|sign off|approve|go with|let's|mission|product|blueprint|factory|sentry|receipt|lens|chair|council|governance|priority|strategy|roadmap)\b/i;

function shouldRunCognitiveReasoning(cleanedInput, systemFacts, chairContext) {
  if (!cleanedInput || typeof cleanedInput !== 'string') return false;
  if (systemFacts.personal_turn) return false;
  if (chairContext.domain === 'listening_onboarding') return false;
  if (resolveGroundedDirectAnswer(cleanedInput, systemFacts)) return false;
  const t = cleanedInput.trim();
  if (t.length < 30) return false;
  return DECISION_MARKERS.test(t);
}

async function recordModelOutcomeSafe(pool, fields) {
  if (!pool) return;
  try {
    await recordModelOutcome(pool, fields);
  } catch {
    // non-fatal
  }
}

function roleForTaskType(taskType) {
  if (taskType === 'lumin_chair_translate') return 'founder_intent_modeling';
  if (taskType === 'cognitive_chair.synthesis') return 'founder_intent_modeling';
  if (taskType === 'cognitive_chair.lens') return 'aic_debate';
  return 'builderos_execution';
}

function createLoggedCallAI({ callAI, pool, mission, defaultRole, defaultLens, defaultResponsibility }) {
  if (typeof callAI !== 'function') return null;
  return async (member, prompt, options = {}) => {
    const wantsObject = options.returnObject === true;
    const opts = { ...options, returnObject: true };
    let result;
    try {
      result = await callAI(member, prompt, opts);
    } catch (err) {
      result = { error: err.message, content: null, text: null, usage: null };
    }
    const ok = result && !result.error;
    const model = result?.member || member || 'unknown';
    const role = options.role || defaultRole || roleForTaskType(options.taskType) || 'builderos_execution';
    const lensId = options.lens_id || defaultLens || (options.taskType === 'lumin_chair_translate' ? 'lumin_chair_translate' : 'unknown');
    const responsibility = options.responsibility || defaultResponsibility || 'chair';
    await recordModelOutcomeSafe(pool, {
      model_tier: model,
      role,
      ok: Boolean(ok),
      trust_earned: false,
      theater_detected: Boolean(!ok && result?.error),
      escalated: false,
      effective_grade: ok ? null : 'fail',
    });
    logModelCall({
      model,
      lens_id: lensId,
      responsibility,
      mission: (mission || '').slice(0, 200),
      promptTokens: result?.usage?.prompt_tokens || 0,
      completionTokens: result?.usage?.completion_tokens || 0,
      estimatedUsd: result?.usage?.estimated_usd || 0,
      outcome: ok ? 'unknown' : 'fail',
    });
    if (wantsObject) return result;
    return result?.content ?? result?.text ?? '';
  };
}

function appendReasoningLog(entry) {
  try {
    fs.mkdirSync(path.dirname(REASONING_LOG), { recursive: true });
    fs.appendFileSync(REASONING_LOG, `${JSON.stringify(entry)}\n`);
  } catch {
    // non-fatal
  }
}

async function runCognitiveReasoning({ cleanedInput, systemFacts, chairContext, callAI, pool, userId }) {
  const mission = `User turn (${chairContext.domain || 'conversation'}): ${cleanedInput.trim()}`;

  // MMAZ-008: Constitutional Decision Engine gate before lens selection.
  const plan = createReasoningPlan({ mission, chairContext, systemFacts });
  const gate = reasoningPlanGate(plan);
  if (!gate.ok) {
    throw new Error(`Reasoning plan gate failed: ${gate.reason}`);
  }

  const loggedCallAI = createLoggedCallAI({
    callAI,
    pool,
    mission,
    defaultRole: 'aic_debate',
    defaultLens: 'chair_reasoning',
    defaultResponsibility: 'chair',
  });

  const callModel = async ({ member, prompt, options = {} }) => {
    if (!loggedCallAI) {
      return { content: null, text: null, error: 'callAI unavailable', usage: null };
    }
    return loggedCallAI(member, prompt, { ...options, returnObject: true });
  };

  const transcript = await composeReasoning({
    mission,
    responsibilities: plan.responsibilities,
    lenses: plan.lenses,
    callModel,
    maxModelCalls: plan.budget.max_model_calls,
  });

  const propagated = propagateOverallConfidence(transcript.outputs);
  const context = {
    reasoning_plan_id: plan.id,
    chair_reasoning_id: plan.id,
    chair_position: transcript.chair?.parsed?.chair_position || null,
    named_disagreements: transcript.chair?.parsed?.named_disagreements || [],
    tradeoffs: transcript.chair?.parsed?.tradeoffs || [],
    risks: (transcript.chair?.parsed?.risks || []).concat(plan.risks || []),
    next_action: transcript.chair?.parsed?.next_action || null,
    lenses_used: (transcript.outputs || []).map((o) => ({ lens_id: o.lens_id, responsibility: o.responsibility, model: o.model_member })),
    propagated_confidence: propagated,
    classification: plan.classification,
    budget: plan.budget,
    gates: plan.gates,
  };

  appendReasoningLog({
    id: plan.id,
    ts: new Date().toISOString(),
    user_id: userId || null,
    mission,
    domain: chairContext.domain || 'conversation',
    plan,
    transcript,
  });

  if (pool && cleanedInput) {
    recordFounderDecision(pool, {
      decision_text: cleanedInput.trim().slice(0, 4000),
      context: JSON.stringify(context),
      category: 'product_scope',
      source: 'live_conversation',
    }).catch(() => {});
  }

  return { transcript, plan, propagated };
}

export async function runChairNativeTurn(cleanedInput, deps = {}, chairContext = {}) {
  const {
    callAI,
    translatePersonality = translateChairPersonality,
    gatherFacts = gatherChairNativeFacts,
    sanitizeConversationReply,
    memoryContext = null,
    strategicBrief = null,
    pool = null,
  } = deps;

  const dual = detectDualIntent(cleanedInput);
  const systemFacts = await gatherFacts(cleanedInput, {
    callAI,
    pool,
    memoryContext,
    strategicBrief,
    userId: deps.userId || null,
    userHandle: deps.userHandle || chairContext.user_handle || null,
  }, chairContext);

  const doctrineBlock = getDoctrinePromptBlock();
  if (doctrineBlock && !systemFacts.lifeos_service_doctrine) {
    systemFacts.lifeos_service_doctrine = doctrineBlock;
  }

  if (deps.listeningOnboarding) {
    systemFacts.listening_onboarding = deps.listeningOnboarding;
    systemFacts.chair_note = `${systemFacts.chair_note} Listening setup mode — output listening_profile fence when user confirms prefs.`;
  }

  const threadHist = chairContext.conversation_history || deps.conversationHistory || [];
  if (threadHist.length) {
    systemFacts.recent_thread = formatThreadForPrompt(threadHist);
    systemFacts.chair_note = `${systemFacts.chair_note} Continue the thread naturally — do not paraphrase Adam's request back; do not ask obvious confirm questions.`;
  }

  // SO-003: a real model produces EVERY Chair reply. The direct-answer helpers
  // only GROUND that model call now (attached as systemFacts.grounded_direct_answer)
  // — they never short-circuit it with a canned string. translatePersonality
  // always runs and delivers the verified content in Lumin's voice.
  const groundedDirect = resolveGroundedDirectAnswer(cleanedInput, systemFacts);
  if (groundedDirect) {
    systemFacts.grounded_direct_answer = groundedDirect;
  }

  // MMAZ-004: wire composeReasoning into runChairNativeTurn for bounded trigger.
  // All model calls inside the reasoning and the final translation are logged to
  // model_capability_ledger and model-roi-ledger.
  let reasoning = null;
  if (shouldRunCognitiveReasoning(cleanedInput, systemFacts, chairContext)) {
    try {
      reasoning = await runCognitiveReasoning({
        cleanedInput,
        systemFacts,
        chairContext,
        callAI,
        pool,
        userId: deps.userId || null,
      });
      if (reasoning) {
        systemFacts.chair_reasoning = reasoning.transcript;
        systemFacts.chair_reasoning_plan = reasoning.plan;
        systemFacts.chair_reasoning_propagated_confidence = reasoning.propagated;
      }
    } catch (err) {
      systemFacts.chair_reasoning_error = err.message;
    }
  }

  const mission = reasoning?.transcript?.mission || `User turn (${chairContext.domain || 'conversation'}): ${cleanedInput.trim()}`;
  const loggedCallAI = createLoggedCallAI({
    callAI,
    pool,
    mission,
    defaultRole: 'founder_intent_modeling',
    defaultLens: 'lumin_chair_translate',
    defaultResponsibility: 'chair',
  });

  let voice = await translatePersonality({
    callAI: loggedCallAI,
    userMessage: cleanedInput,
    systemFacts,
    accountRole: chairContext.account_role || chairContext.user_role || 'founder',
    channel: chairContext.domain || 'chair',
    pool,
    userId: deps.userId || null,
  });

  const strategicSection = systemFacts.personal_turn
    ? ''
    : (systemFacts.strategic_brief ? formatStrategicBriefSection(systemFacts.strategic_brief) : '');
  if (strategicSection && !voice.includes('strategic')) {
    voice = `${voice}\n\n${strategicSection}`;
  }

  const priorReceipt = systemFacts.last_build_receipt || null;
  const safeReply = sanitizeConversationReply
    ? sanitizeConversationReply(voice, {
      command_truth: 'NO_COMMAND_RAN',
      last_build_receipt: priorReceipt,
    })
    : voice;

  return {
    ok: true,
    action: 'chair',
    chair_domain: chairContext.domain || 'conversation',
    personal_turn: systemFacts.personal_turn,
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
    execution_kind: 'CHAIR_FACTS',
    direct_connection: true,
    dual_intent: dual.dual ? { personal: true, build: true } : null,
    human_summary_technical: safeReply,
    chair_native_facts: systemFacts,
    last_build_receipt: priorReceipt,
    conversation_sanitized: safeReply !== voice,
    done_synopsis: null,
    next_synopsis: null,
    strategic_brief: systemFacts.strategic_brief || null,
    errand_search_block: systemFacts.verified_search || null,
  };
}

export { runChairNativeTurn as runLuminUnifiedTurn };
