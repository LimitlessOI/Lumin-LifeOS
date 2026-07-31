/**
 * SYNOPSIS: Reasoning Plan — Constitutional Decision Engine gate before lens selection.
 * Every mission first answers reversibility, cost-of-error, security, money,
 * customer data, constitutional behavior, and scope. Those answers determine the
 * reasoning budget, required responsibilities/lenses, and mandatory gates.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLensRegistry } from '../../../services/cognitive-chair.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REASONING_PLANS_DIR = path.resolve(__dirname, '..', '..', '..', 'data', 'reasoning-plans');

function normalize(text) {
  return String(text || '').toLowerCase();
}

function anyKeyword(text, keywords) {
  const t = normalize(text);
  return keywords.some((k) => t.includes(k));
}

export function classifyMission({ mission = '', systemFacts = {} }) {
  const t = `${mission} ${JSON.stringify(systemFacts || {})}`;

  const reversibleHints = ['revert', 'undo', 'toggle', 'flag', 'config', 'ui text', 'style', 'copy', 'color', 'label'];
  const irreversibleHints = ['deploy', 'commit', 'merge', 'delete', 'drop table', 'publish', 'charge', 'billing', 'purchase', 'domain', 'dns'];

  const reversible = anyKeyword(t, reversibleHints) && !anyKeyword(t, irreversibleHints);
  const irreversible = anyKeyword(t, irreversibleHints);

  let costOfError = 1;
  if (anyKeyword(t, ['security', 'auth', 'secret', 'password', 'vulnerability', 'xss', 'injection', 'exploit'])) costOfError = 5;
  else if (anyKeyword(t, ['revenue', 'money', 'billing', 'stripe', 'charge', 'customer payment', '$'])) costOfError = 4;
  else if (anyKeyword(t, ['customer data', 'pii', 'email', 'phone', 'hipaa', 'gdpr', 'user data'])) costOfError = 4;
  else if (anyKeyword(t, ['deploy', 'production', 'railway', 'database migration', 'schema'])) costOfError = 3;
  else if (anyKeyword(t, ['constitution', 'governance', 'ssot', 'authority', 'blueprint', 'truth', 'enforcement'])) costOfError = 3;
  else if (anyKeyword(t, ['build', 'create', 'implement', 'feature', 'component'])) costOfError = 2;

  const affectsSecurity = anyKeyword(t, ['security', 'auth', 'secret', 'password', 'vulnerability', 'xss', 'injection', 'exploit', 'encrypt', 'permissions']);
  const affectsMoney = anyKeyword(t, ['revenue', 'money', 'billing', 'stripe', 'charge', 'cost', 'price', 'subscription', '$']);
  const affectsCustomerData = anyKeyword(t, ['customer data', 'payment data', 'pii', 'email', 'phone', 'hipaa', 'gdpr', 'user data', 'contact', 'lead', 'customer payment']);
  const affectsConstitutionalBehavior = anyKeyword(t, ['constitution', 'governance', 'ssot', 'authority', 'blueprint', 'truth', 'enforcement', 'doctrine']);
  const scope = anyKeyword(t, ['system', 'platform', 'all products', 'shared', 'core', 'universal', 'cross-product']) ? 'system-wide' : 'local';

  let type = 'A';
  if (affectsSecurity || affectsConstitutionalBehavior || (scope === 'system-wide' && (affectsMoney || affectsCustomerData)) || costOfError >= 4 || irreversible) {
    type = 'C';
  } else if (affectsMoney || affectsCustomerData || costOfError >= 3 || scope === 'system-wide' || !reversible) {
    type = 'B';
  }

  return {
    reversibility: reversible ? 'high' : irreversible ? 'low' : 'medium',
    cost_of_error: costOfError,
    affects_security: affectsSecurity,
    affects_money: affectsMoney,
    affects_customer_data: affectsCustomerData,
    affects_constitutional_behavior: affectsConstitutionalBehavior,
    scope,
    type,
  };
}

function deriveBudget(classification) {
  switch (classification.type) {
    case 'A':
      return { size: 'small', max_model_calls: 2, max_tokens_per_call: 2048, allow_external_research: false };
    case 'B':
      return { size: 'medium', max_model_calls: 4, max_tokens_per_call: 4096, allow_external_research: false };
    case 'C':
    default:
      return { size: classification.affects_constitutional_behavior ? 'constitutional' : 'high', max_model_calls: 8, max_tokens_per_call: 8192, allow_external_research: true };
  }
}

function deriveResponsibilities(classification) {
  const responsibilities = new Set(['chair']);
  if (classification.affects_security) responsibilities.add('security');
  if (classification.affects_money) responsibilities.add('cfo');
  if (classification.affects_customer_data) responsibilities.add('privacy');
  if (classification.affects_constitutional_behavior || classification.scope === 'system-wide') responsibilities.add('governance');
  if (classification.scope === 'system-wide' || classification.cost_of_error >= 3) responsibilities.add('architect');
  return Array.from(responsibilities);
}

function deriveLenses(responsibilities, classification, systemFacts = {}, chairContext = {}) {
  const registry = loadLensRegistry();
  const preferred = {
    chair: ['founder-philosophy', 'steve-jobs'],
    security: ['red-team'],
    cfo: ['cfo-roi'],
    privacy: ['red-team', 'customer-ease'],
    governance: ['wisdom-memory'],
    architect: ['steve-jobs', 'toyota-lean'],
    builder: ['toyota-lean'],
    creative: ['steve-jobs'],
  };

  const selected = new Set();
  for (const r of responsibilities) {
    const ids = preferred[r] || [r];
    for (const id of ids) {
      const lens = registry.lenses.find((l) => l.lens_id === id);
      if (lens) selected.add(id);
    }
  }

  // Fallback: if no preferred lens resolved, pick the highest-trust lens for any responsibility.
  if (selected.size === 0) {
    const top = registry.lenses
      .filter((l) => responsibilities.some((r) => l.responsibilities.includes(r)))
      .sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0))[0];
    if (top) selected.add(top.lens_id);
  }

  // Adversarial augmentation for high-stakes missions.
  const highStakes = classification.type === 'C' || classification.affects_security || classification.affects_money || classification.affects_customer_data || classification.scope === 'system-wide';
  if (highStakes) {
    selected.add('skeptic');
    selected.add('devils-advocate');
  }
  if (classification.affects_security || classification.affects_customer_data) {
    selected.add('red-team');
  }

  // Founder-philosophy lens joins when founder identity is available.
  if (systemFacts.userId || chairContext.userId) {
    selected.add('founder-philosophy');
  }

  return Array.from(selected);
}

function deriveGates(classification) {
  return {
    sentry_mandatory: classification.type === 'C' || classification.affects_security || classification.affects_money || classification.affects_customer_data,
    founder_approval_required: classification.type === 'C',
    blueprint_authority_required: classification.scope === 'system-wide' || classification.affects_constitutional_behavior,
    external_research_required: classification.type === 'C' && classification.cost_of_error >= 4,
  };
}

function deriveQuestions(mission, classification) {
  const questions = [
    'What is the smallest reversible step that satisfies the mission?',
    'What would make this fail after it ships?',
    'What would the founder likely push back on?',
  ];
  if (classification.affects_security) questions.push('What security failure modes must be checked before execution?');
  if (classification.affects_money) questions.push('What revenue or cost assumptions are unverified?');
  if (classification.affects_customer_data) questions.push('What customer-data handling rules apply?');
  if (classification.affects_constitutional_behavior) questions.push('Which constitutional / SSOT authority owns this decision?');
  if (classification.scope === 'system-wide') questions.push('Which other products or systems could this change affect?');
  return questions;
}

function deriveEvidence(systemFacts = {}) {
  const evidence = [];
  if (systemFacts.grounded_direct_answer) evidence.push('grounded_direct_answer');
  if (systemFacts.strategic_brief) evidence.push('strategic_brief');
  if (systemFacts.last_build_receipt) evidence.push('last_build_receipt');
  if (systemFacts.chair_reasoning_error) evidence.push('last_reasoning_error');
  return evidence;
}

function deriveRealityMeasures(classification) {
  const measures = ['sentry_pass'];
  if (classification.affects_money) measures.push('revenue_receipt');
  if (classification.affects_customer_data) measures.push('privacy_review');
  if (classification.scope === 'system-wide') measures.push('cross_product_smoke');
  if (classification.affects_constitutional_behavior) measures.push('constitution_drift_check');
  return measures;
}

export function createReasoningPlan({
  mission,
  chairContext = {},
  systemFacts = {},
  priorKnowledge = [],
} = {}) {
  if (!mission || typeof mission !== 'string') {
    throw new Error('Reasoning Plan requires a mission string.');
  }

  const classification = classifyMission({ mission, systemFacts });
  const budget = deriveBudget(classification);
  const responsibilities = deriveResponsibilities(classification);
  const lenses = deriveLenses(responsibilities, classification, systemFacts, chairContext);
  const gates = deriveGates(classification);
  const questions = deriveQuestions(mission, classification);
  const evidence = deriveEvidence(systemFacts);
  const reality_measures = deriveRealityMeasures(classification);
  const planId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const plan = {
    id: planId,
    created_at: new Date().toISOString(),
    intent: mission.trim().slice(0, 2000),
    classification,
    budget,
    gates,
    responsibilities,
    lenses,
    questions,
    evidence,
    prior_knowledge: priorKnowledge || [],
    reality_measures,
    unknowns: [],
    assumptions: [],
    risks: [],
    evidence_needed: [],
    domain: chairContext.domain || 'conversation',
  };

  try {
    fs.mkdirSync(REASONING_PLANS_DIR, { recursive: true });
    fs.writeFileSync(path.join(REASONING_PLANS_DIR, `${planId}.json`), JSON.stringify(plan, null, 2));
  } catch {
    // persistence is evidence, not logic
  }

  return plan;
}

export function loadReasoningPlan(planId) {
  if (!planId) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(REASONING_PLANS_DIR, `${planId}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export function reasoningPlanGate(plan) {
  if (!plan || typeof plan !== 'object') return { ok: false, reason: 'missing_plan' };
  if (!plan.intent) return { ok: false, reason: 'missing_intent' };
  if (!plan.classification || !plan.classification.type) return { ok: false, reason: 'missing_classification' };
  if (!plan.budget || typeof plan.budget.max_model_calls !== 'number') return { ok: false, reason: 'missing_budget' };
  if (!Array.isArray(plan.responsibilities) || plan.responsibilities.length === 0) return { ok: false, reason: 'missing_responsibilities' };
  return { ok: true, reason: 'plan_valid' };
}

export function estimateConfidencePerLens(outputs = []) {
  return outputs.map((o) => ({
    lens_id: o.lens_id,
    responsibility: o.responsibility,
    confidence: o.parsed?.confidence ?? null,
  }));
}

export function propagateOverallConfidence(outputs = []) {
  const scores = outputs
    .map((o) => o.parsed?.confidence)
    .filter((c) => typeof c === 'number' && !Number.isNaN(c));
  if (scores.length === 0) return { overall: null, limiting_factor: 'no_confidence_scores', by_lens: estimateConfidencePerLens(outputs) };
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const limiting = outputs.reduce((lowest, o) => {
    const c = o.parsed?.confidence;
    if (typeof c !== 'number') return lowest;
    return !lowest || c < lowest.confidence ? { lens_id: o.lens_id, responsibility: o.responsibility, confidence: c } : lowest;
  }, null);
  const spread = max - min;
  const propagated = Math.max(0, avg - spread * 0.25);
  return {
    overall: Math.round(propagated * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    spread: Math.round(spread * 100) / 100,
    limiting_factor: limiting ? `${limiting.responsibility}/${limiting.lens_id} at ${limiting.confidence}` : 'none',
    by_lens: estimateConfidencePerLens(outputs),
  };
}
