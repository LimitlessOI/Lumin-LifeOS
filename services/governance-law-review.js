/**
 * SYNOPSIS: services/governance-law-review.js
 * Real, on-demand answer to North Star §2.0G Governance Evolution Law: "at
 * fixed cadence, review which laws helped, which laws hurt, which laws
 * caused drift, which should be promoted/demoted/retired." Confirmed this
 * session: no such review existed anywhere. This is Tier-0 -- a real,
 * callable review over data that already exists, not a fabricated audit.
 * Deliberately NOT wired to an automatic background scheduler yet: Companion
 * §0.6 explicitly warns that a new hidden/self-starting timer must be
 * reviewed and approved before it runs unattended, and a review-of-reviews
 * mechanism is exactly the kind of thing that shouldn't skip that step
 * itself. Call on demand (GET /factory/governance-review) until a real
 * cadence is deliberately chosen.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModelRankings } from './model-capability-ledger.js';
import { listProductsWithQueues } from './governed-autonomous-shipping-loop.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'docs/products');

function loadQueueSteps(productId) {
  try {
    const raw = fs.readFileSync(path.join(PRODUCTS_DIR, productId, 'BUILD_QUEUE.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.steps) ? parsed.steps : Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Escalation-class distribution across every product's real BUILD_QUEUE.json
 * -- direct evidence of which structural failure types actually recur in
 * practice, not a guess. classifyFailure() (governed-autonomous-shipping-
 * loop.js) writes escalation_class onto a step every time markFailedStep
 * runs, so this is real history, not synthetic.
 */
function escalationClassDistribution() {
  const products = listProductsWithQueues();
  const counts = {};
  let stepsWithFailureHistory = 0;
  let hardGatedCount = 0;
  for (const productId of products) {
    for (const step of loadQueueSteps(productId)) {
      if (!step || typeof step !== 'object') continue;
      if (step.escalation_class) {
        counts[step.escalation_class] = (counts[step.escalation_class] || 0) + 1;
        stepsWithFailureHistory += 1;
      }
      if (step.escalation_required === true) hardGatedCount += 1;
    }
  }
  return { products_scanned: products.length, steps_with_failure_history: stepsWithFailureHistory, by_class: counts, hard_escalation_gate_active_count: hardGatedCount };
}

async function modelBenchmarkingStatus(pool) {
  if (!pool) return { instrumented: false, reason: 'no_pool_provided' };
  try {
    const rankings = await getModelRankings(pool);
    return {
      instrumented: true,
      role_coverage: 'builderos_execution_only',
      roles_named_in_north_star_2_0J_but_not_tracked: [
        'AIC debate', 'BPB blueprinting', 'OIL adversarial review', 'summarizer',
        'historian', 'founder intent modeling', 'security review', 'external research',
      ],
      models_with_real_data: rankings.length,
      rankings,
    };
  } catch (err) {
    return { instrumented: false, reason: `query_failed: ${err.message}` };
  }
}

/**
 * Known hard gates this session added or found, with an honest
 * instrumentation note for each -- "exists" and "has real evidence it
 * fires" are different claims, and this function does not conflate them.
 */
function knownGateInventory() {
  return [
    {
      name: 'security-invariants-check.mjs',
      protects: 'routes/tc-routes.js requireLifeOSAdmin coverage',
      wired: true,
      runtime_evidence: 'none_yet — blocks at commit time, no persisted fire-count. Add one if this needs measuring rather than trusting.',
    },
    {
      name: 'root_cause_class (SENTRY findings)',
      protects: 'code_defect vs blueprint_defect classification',
      wired: true,
      runtime_evidence: 'requires a real npm run sentry:gate execution to produce data — none observed yet this session',
    },
    {
      name: 'governed-autonomous-shipping-loop watchdog',
      protects: 'the build loop itself going silently stale',
      wired: true,
      runtime_evidence: 'state.watchdogRecoveries counter exists — 0 so far means the loop has not stalled since deploy, which is the good outcome, not missing instrumentation',
    },
    {
      name: 'model_capability_ledger',
      protects: 'per-model-tier trust/success tracking',
      wired: true,
      runtime_evidence: 'see modelBenchmarkingStatus in this same report',
    },
  ];
}

export async function runGovernanceReview({ pool = null } = {}) {
  const [escalation, modelBenchmarking] = await Promise.all([
    Promise.resolve(escalationClassDistribution()),
    modelBenchmarkingStatus(pool),
  ]);
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    schema: 'governance_law_review_v1',
    north_star_law: '§2.0G Governance Evolution Law',
    escalation_class_distribution: escalation,
    model_benchmarking: modelBenchmarking,
    known_gate_inventory: knownGateInventory(),
    honest_scope_note: 'Tier-0 review over real existing data. Does not yet compute promote/demote/retire recommendations (§2.0G\'s full ask) — that requires more history than currently exists to be a real judgment rather than a guess.',
  };
}
