/**
 * SYNOPSIS: Cognitive Core Era-1 — perspective-before-retrieval, multi-wear tension, scarce WM.
 * Capsules are attention lenses (Law 3–4), not memory bags.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import {
  CAPSULE_CONTRACTS,
  COMPILER_VERSION,
  WORKING_MEMORY_SLOT_CAP,
  detectJudgmentTurn,
  resolveCapsuleContracts,
  suppressSystemFactsForCapsule,
  suppressTextForCapsule,
} from '../config/judgment-capsule-contracts.js';
import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCorePrograms } from './cognitive-core-programs.js';

function coerceText(raw) {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    return String(raw.text || raw.content || raw.message || raw.output || '');
  }
  return String(raw || '');
}

function parseJsonObject(raw) {
  const text = coerceText(raw).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function gravityScore(item) {
  const recency = Number(item.recency || 0.5);
  const relevance = Number(item.relevance || 0.5);
  const affinity = Number(item.identity_affinity || 0.5);
  const emotion = Number(item.emotional_weight || 0.3);
  return recency * 0.3 + relevance * 0.35 + affinity * 0.25 + emotion * 0.1;
}

/**
 * Build scarce working-memory slots competing by gravity.
 * @param {Array<{ text: string, capsule_id?: string, recency?: number, relevance?: number, identity_affinity?: number, emotional_weight?: number }>} candidates
 */
export function selectWorkingMemory(candidates, cap = WORKING_MEMORY_SLOT_CAP) {
  const scored = (candidates || [])
    .map((c) => ({ ...c, gravity: gravityScore(c) }))
    .sort((a, b) => b.gravity - a.gravity)
    .slice(0, cap);
  return scored;
}

/**
 * Infer domain slug from message for trust matrix.
 */
export function inferJudgmentDomain(message) {
  const m = String(message || '').toLowerCase();
  if (/\b(hire|hiring|interview|candidate)\b/.test(m)) return 'hiring';
  if (/\b(invest|money|pricing|spend|budget)\b/.test(m)) return 'investing';
  if (/\b(auth|login|signup|session)\b/.test(m)) return 'auth';
  if (/\b(template|sitebuilder|website|canva)\b/.test(m)) return 'sitebuilder';
  if (/\b(counsel|chat|human|feel|trust|relationship|sherry)\b/.test(m)) return 'counsel';
  if (/\b(ship|launch|deploy|alpha|build)\b/.test(m)) return 'shipping';
  if (/\b(calendar|schedule|travel)\b/.test(m)) return 'scheduling';
  return 'general';
}

/**
 * Extract rough options from "A or B" style questions.
 */
export function extractOptions(message) {
  const text = String(message || '').trim();
  const orMatch = text.match(/(.+?)\s+or\s+(.+?)(?:\?|$)/i);
  if (orMatch) {
    return [
      orMatch[1].replace(/^should i\s+/i, '').trim().slice(0, 200),
      orMatch[2].replace(/\?$/, '').trim().slice(0, 200),
    ].filter(Boolean);
  }
  return ['option_a', 'option_b', 'neither_yet'];
}

/**
 * @param {object} args
 * @param {string} args.message
 * @param {string[]} [args.worn]
 * @param {object} [args.systemFacts]
 * @param {string} [args.memoryContext]
 * @param {Array} [args.history]
 * @param {Function} args.callAI
 * @param {import('pg').Pool} [args.pool]
 * @param {string|number} [args.userId]
 * @param {string} [args.sourceSurface]
 * @param {string} [args.stakes]
 * @param {Console} [args.logger]
 */
export async function runCognitiveCoreJudgmentTurn(args = {}) {
  const message = String(args.message || '').trim();
  const detection = detectJudgmentTurn(message, {
    worn: args.worn,
    stakes: args.stakes,
  });
  if (!detection.is_judgment_turn) {
    return { matched: false, reason: 'not_judgment_turn' };
  }

  const wornIds = detection.default_wear.length
    ? detection.default_wear
    : detection.worn_requested;
  const capsules = resolveCapsuleContracts(wornIds);
  if (!capsules.length) {
    return { matched: false, reason: 'no_valid_capsules' };
  }

  const domain = inferJudgmentDomain(message);
  const options = extractOptions(message);
  const baseFacts = args.systemFacts && typeof args.systemFacts === 'object' ? args.systemFacts : {};
  const memoryText = suppressTextForCapsule(String(args.memoryContext || ''), capsules[0]);

  const wmCandidates = [];
  if (memoryText) {
    wmCandidates.push({
      text: memoryText.slice(0, 1200),
      capsule_id: 'shared',
      recency: 0.7,
      relevance: 0.8,
      identity_affinity: 0.6,
      emotional_weight: 0.4,
    });
  }
  for (const c of capsules) {
    wmCandidates.push({
      text: `Lens ${c.label}: goals=${c.goals.join(', ')}; measure=${c.success_metric}; bias=${c.retrieval_bias}`,
      capsule_id: c.id,
      recency: 1,
      relevance: 1,
      identity_affinity: 1,
      emotional_weight: c.id === 'anti_you' ? 0.8 : 0.4,
    });
  }
  const workingMemory = selectWorkingMemory(wmCandidates);

  const perCapsuleFacts = {};
  for (const c of capsules) {
    perCapsuleFacts[c.id] = suppressSystemFactsForCapsule(baseFacts, c);
  }

  const capsuleBrief = capsules.map((c) => ({
    id: c.id,
    label: c.label,
    goals: c.goals,
    success_metric: c.success_metric,
    retrieval_bias: c.retrieval_bias,
    suppressed_fact_keys: c.deny_system_fact_keys,
    simulation_note: c.simulation_note || undefined,
  }));

  // Layer 2 (Era-2): inject active program hypotheses so the compiler reasons about the
  // deep patterns that may drive Adam — and links predictions to concrete program ids.
  let programBriefs = [];
  let programsSvc = null;
  if (args.pool && args.userId != null) {
    try {
      programsSvc = createCognitiveCorePrograms({ pool: args.pool, logger: args.logger });
      programBriefs = await programsSvc.activeProgramBriefs(args.userId, domain, 6);
    } catch (err) {
      args.logger?.warn?.(`[cognitive-core] program load failed: ${err.message}`);
    }
  }

  const prompt = `You are the LifeOS Cognitive Core judgment compiler (Era-1).
Laws: models are hypotheses; perspective precedes retrieval; CONFLICT before synthesis (never average); predict with calibrated confidence.

Adam's question:
${message}

Worn capsules (think AS each — then expose disagreement):
${JSON.stringify(capsuleBrief, null, 2)}

Working memory (scarce slots only):
${JSON.stringify(workingMemory.map((w) => ({ capsule_id: w.capsule_id, text: w.text.slice(0, 400), gravity: w.gravity })), null, 2)}

Options (use or refine):
${JSON.stringify(options)}

Domain: ${domain}

Known program hypotheses (deep patterns that may drive Adam — treat as hypotheses, cite by label if one activates):
${JSON.stringify(programBriefs)}

Return ONLY JSON:
{
  "tension_ledger": [
    {"capsule_id":"founder","stance":"...","wants":"...","objects_to":"..."}
  ],
  "synthesis": "one paragraph naming the real trade — not a mushy average",
  "reply_to_adam": "human voice answer — value first, then at most one sharp question. No status theater. No mission queue dump unless a worn capsule is founder AND he asked ops.",
  "predicted_option": "which option you predict Adam will actually choose",
  "predicted_reasons": ["why you think he will choose that"],
  "activated_programs": ["labels of the program hypotheses above that may be driving this — [] if none apply"],
  "confidence": 0.0,
  "situation": {"stakes":"medium","notes":"..."},
  "missing_info": {"most_valuable":"the single fact worth getting before deciding (or empty if none)","facts":["other useful missing facts"],"cheapest_way_to_learn":"smallest experiment/lookup"},
  "consequences": {"second_order":["plausible 2nd-order effects of your predicted option"],"third_order":["3rd-order effects"],"watch_signals":["early signals to instrument now"]}
}

confidence must be calibrated humility (not fake 0.99). Era-3: proactively surface the most valuable MISSING fact and the downstream CONSEQUENCES of your predicted option — these are hypotheses, hedge them.`;

  const cascade = (process.env.COGNITIVE_CORE_CASCADE
    || process.env.CHAIR_DIRECT_AGENT_CASCADE
    || 'claude_sonnet,openai_gpt,gemini_flash')
    .split(',').map((s) => s.trim()).filter(Boolean);

  let parsed = null;
  let rawText = '';
  let callError = null;
  for (const member of cascade) {
    try {
      const out = coerceText(await args.callAI(member, prompt, {
        maxOutputTokens: 1800,
        taskType: 'cognitive_core_judgment',
        founderComms: true,
        useCache: false,
      }));
      if (out && out.trim()) {
        rawText = out;
        parsed = parseJsonObject(out);
        break;
      }
      callError = `${member}_empty`;
    } catch (err) {
      callError = err.message;
    }
  }

  let degraded = false;
  let degradeReason = null;
  if (!parsed) {
    // Never fall through silently: salvage raw text as the answer, still journal.
    degraded = true;
    degradeReason = rawText ? 'judgment_parse_failed' : (callError || 'judgment_no_text');
    parsed = {
      reply_to_adam: rawText.trim() || '',
      synthesis: rawText.trim() || '',
      tension_ledger: [],
      predicted_option: null,
      predicted_reasons: [],
      activated_programs: [],
      confidence: 0.35,
      situation: { stakes: args.stakes || 'medium', notes: degradeReason },
      missing_info: null,
      consequences: null,
    };
  }

  const tension = Array.isArray(parsed.tension_ledger) ? parsed.tension_ledger : [];
  let reply = String(parsed.reply_to_adam || parsed.synthesis || '').trim();
  if (!reply) {
    reply = 'I tried to think this through as your worn perspectives but could not complete the pass. Say it again, or change which capsules you are wearing.';
    degraded = true;
    degradeReason = degradeReason || 'empty_reply';
  }
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));
  const predictedOption = String(parsed.predicted_option || '').trim() || null;
  const predictedReasons = Array.isArray(parsed.predicted_reasons) ? parsed.predicted_reasons : [];
  const programs = Array.isArray(parsed.activated_programs) ? parsed.activated_programs.map(String) : [];

  // Era-3 proactivity (same AI pass, zero extra calls): most-valuable missing fact + consequence sketch.
  const mi = parsed.missing_info && typeof parsed.missing_info === 'object' ? parsed.missing_info : null;
  const missingInfo = mi && (mi.most_valuable || (Array.isArray(mi.facts) && mi.facts.length))
    ? {
        most_valuable: String(mi.most_valuable || '').slice(0, 1000),
        facts: (Array.isArray(mi.facts) ? mi.facts : []).map((f) => String(f).slice(0, 400)).slice(0, 6),
        cheapest_way_to_learn: String(mi.cheapest_way_to_learn || '').slice(0, 1000),
      }
    : null;
  const cs = parsed.consequences && typeof parsed.consequences === 'object' ? parsed.consequences : null;
  const consequences = cs && (Array.isArray(cs.second_order) ? cs.second_order.length : 0)
    ? {
        second_order: (cs.second_order || []).map((x) => String(x).slice(0, 400)).slice(0, 6),
        third_order: (Array.isArray(cs.third_order) ? cs.third_order : []).map((x) => String(x).slice(0, 400)).slice(0, 6),
        watch_signals: (Array.isArray(cs.watch_signals) ? cs.watch_signals : []).map((x) => String(x).slice(0, 400)).slice(0, 6),
      }
    : null;

  let decisionRow = null;
  let predictionRow = null;
  let activatedProgramBriefs = [];
  if (args.pool && args.userId != null) {
    try {
      const journal = createCognitiveCoreJudgment({ pool: args.pool, logger: args.logger });
      decisionRow = await journal.recordDecisionTurn({
        userId: args.userId,
        domain,
        question: message,
        options,
        situationSnapshot: parsed.situation || { stakes: args.stakes || 'medium' },
        wornCapsuleIds: capsules.map((c) => c.id),
        stakes: args.stakes || parsed.situation?.stakes || 'medium',
        sourceSurface: args.sourceSurface || 'founder-interface',
        threadId: args.threadId || null,
      });
      predictionRow = await journal.recordPrediction({
        decisionId: decisionRow.decision_id,
        predictedOption,
        predictedReasons,
        activatedProgramIds: programs,
        confidence,
        tensionLedger: tension,
        synthesisSummary: String(parsed.synthesis || '').slice(0, 4000),
        compilerVersion: COMPILER_VERSION,
      });
      // Link the prediction to the concrete program hypotheses the compiler activated.
      if (programsSvc && programs.length) {
        const matched = await programsSvc.matchProgramsByRefs(args.userId, programs).catch(() => []);
        for (const p of matched) {
          await programsSvc.recordActivation({
            programId: p.program_id,
            decisionId: decisionRow.decision_id,
            userId: args.userId,
            weight: 0.5,
            source: 'prediction',
          }).catch(() => null);
        }
        activatedProgramBriefs = matched.map((p) => ({
          program_id: p.program_id, label: p.label, confidence: Number(p.confidence),
        }));
      }
      // Era-3: persist the proactive missing-info + consequence hypotheses against this decision.
      if (missingInfo) {
        await args.pool.query(
          `INSERT INTO missing_info_findings (decision_id, user_id, missing_facts, most_valuable, cheapest_way_to_learn, confidence)
           VALUES ($1,$2,$3::jsonb,$4,$5,$6)`,
          [decisionRow.decision_id, String(args.userId), JSON.stringify(missingInfo.facts),
            missingInfo.most_valuable, missingInfo.cheapest_way_to_learn, 0.5],
        ).catch((e) => args.logger?.warn?.(`[cognitive-core] missing_info write failed: ${e.message}`));
      }
      if (consequences && predictedOption) {
        await args.pool.query(
          `INSERT INTO consequence_maps (decision_id, user_id, option, second_order, third_order, watch_signals, confidence, source)
           VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,'judgment_turn')`,
          [decisionRow.decision_id, String(args.userId), predictedOption.slice(0, 500),
            JSON.stringify(consequences.second_order), JSON.stringify(consequences.third_order),
            JSON.stringify(consequences.watch_signals), confidence],
        ).catch((e) => args.logger?.warn?.(`[cognitive-core] consequence write failed: ${e.message}`));
      }
    } catch (err) {
      args.logger?.warn?.(`[cognitive-core] journal write failed: ${err.message}`);
    }
  }

  const stackSummary = {
    law: 'perspective_precedes_retrieval',
    worn: capsules.map((c) => c.id),
    tension_count: tension.length,
    predicted_option: predictedOption,
    confidence,
    activated_programs: activatedProgramBriefs.map((p) => p.label),
    decision_id: decisionRow?.decision_id || null,
    prediction_id: predictionRow?.prediction_id || null,
    compiler_version: COMPILER_VERSION,
  };

  return {
    matched: true,
    ok: true,
    degraded,
    degrade_reason: degradeReason,
    reply,
    tension_ledger: tension,
    synthesis: parsed.synthesis || null,
    prediction: {
      option: predictedOption,
      reasons: predictedReasons,
      confidence,
      activated_programs: programs,
    },
    activated_program_briefs: activatedProgramBriefs,
    working_memory: workingMemory,
    worn_capsule_ids: capsules.map((c) => c.id),
    domain,
    options,
    decision_id: decisionRow?.decision_id || null,
    prediction_id: predictionRow?.prediction_id || null,
    stack_summary: stackSummary,
    per_capsule_fact_keys: Object.fromEntries(
      Object.entries(perCapsuleFacts).map(([k, v]) => [k, Object.keys(v || {})]),
    ),
    command_truth: 'NO_COMMAND_RAN',
    action: 'judgment',
    chair_channel: 'cognitive_core',
  };
}

export function listWearableCapsules() {
  return Object.values(CAPSULE_CONTRACTS).map((c) => ({
    id: c.id,
    label: c.label,
    goals: c.goals,
    success_metric: c.success_metric,
  }));
}

export {
  detectJudgmentTurn,
  resolveCapsuleContracts,
  CAPSULE_CONTRACTS,
  COMPILER_VERSION,
};
