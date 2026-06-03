/**
 * Founder Value Engine v0 — ranks work by founder-visible impact.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * @ssot docs/architecture/BUILDEROS_CONTINUOUS_AUDIT_TO_EXCELLENCE_PROTOCOL.md
 */

const PROOF_DOC_RE = /builderos-remediation\/.*-proof-g\d+/;
const MARKETING_RE = /marketing|routes\/marketing|AMENDMENT_41|socialmediaos/i;
const HOUSEHOLD_RE = /household|lifeos-household|commitment|sherry/i;
const LIFEOS_UI_RE = /lifeos-app|lifeos-dashboard|lifeos-communication|overlay\/lifeos/i;
const GOVERNANCE_LOW_RE = /decision-ledger|proof-g\d|builderos-remediation|telemetry|alpha-readiness|model.benchmark/i;

/**
 * @param {object} task Runner task object
 * @returns {{
 *   adamNoticeability: number,
 *   revenueValue: number,
 *   householdValue: number,
 *   customerValue: number,
 *   reliabilityValue: number,
 *   timeSaved: number,
 *   stressRemoved: number,
 *   composite: number,
 *   rationale: string,
 * }}
 */
export function scoreTask(task = {}) {
  const target = String(task.target_file || '');
  const lane = String(task.lane || '');
  const category = String(task.category || '');
  const instruction = String(task.instruction || '');
  const blob = `${target} ${lane} ${category} ${instruction} ${task.blueprint_path || ''}`;

  let adamNoticeability = 3;
  let revenueValue = 2;
  let householdValue = 2;
  let customerValue = 2;
  let reliabilityValue = 4;
  let timeSaved = 2;
  let stressRemoved = 2;
  const rationales = [];

  if (MARKETING_RE.test(blob)) {
    adamNoticeability = 9;
    revenueValue = 9;
    customerValue = 8;
    rationales.push('MarketingOS — revenue + founder-visible product');
  }

  if (HOUSEHOLD_RE.test(blob)) {
    adamNoticeability = Math.max(adamNoticeability, 9);
    householdValue = 10;
    stressRemoved = 8;
    rationales.push('Household / Sherry impact');
  }

  if (LIFEOS_UI_RE.test(blob)) {
    adamNoticeability = Math.max(adamNoticeability, 8);
    householdValue = Math.max(householdValue, 7);
    rationales.push('LifeOS user surface');
  }

  if (target.startsWith('routes/') && !GOVERNANCE_LOW_RE.test(blob)) {
    adamNoticeability = Math.max(adamNoticeability, 7);
    revenueValue = Math.max(revenueValue, 6);
    rationales.push('Live API route');
  }

  if (category === 'infra_recovery' || task.action_type === 'railway_health_check') {
    reliabilityValue = 9;
    adamNoticeability = 2;
    rationales.push('Infra recovery — reliability, low direct notice');
  }

  if (category === 'blueprint_proof' || PROOF_DOC_RE.test(target)) {
    adamNoticeability = 1;
    revenueValue = 0;
    householdValue = 0;
    reliabilityValue = 3;
    rationales.push('Proof-doc / remediation memo — internal churn risk');
  }

  if (GOVERNANCE_LOW_RE.test(blob) && !MARKETING_RE.test(blob)) {
    adamNoticeability = Math.min(adamNoticeability, 2);
    revenueValue = Math.min(revenueValue, 1);
    householdValue = Math.min(householdValue, 1);
    rationales.push('Governance / telemetry — low founder notice');
  }

  if (category === 'blueprint_patch_plan' || category === 'blueprint_enhancement') {
    adamNoticeability = Math.min(adamNoticeability, 4);
    rationales.push('Plan/enhancement doc — not shipped product');
  }

  const composite =
    adamNoticeability * 3 +
    revenueValue * 2 +
    householdValue * 2 +
    reliabilityValue * 1.5 +
    customerValue +
    timeSaved * 0.5 +
    stressRemoved * 0.5;

  return {
    adamNoticeability,
    revenueValue,
    householdValue,
    customerValue,
    reliabilityValue,
    timeSaved,
    stressRemoved,
    composite: Math.round(composite * 10) / 10,
    rationale: rationales.join('; ') || 'default task scoring',
  };
}

/** @param {object} task */
export function isLowNoticeabilityTask(task, minNoticeability = 3) {
  if (task.requires_api === false) return false;
  if (task.category === 'infra_recovery' || task.category === 'churn_diagnosis') return false;
  return scoreTask(task).adamNoticeability < minNoticeability;
}

/**
 * @param {object[]} tasks
 * @param {{ minNoticeability?: number, allowProofDocs?: boolean }} [opts]
 */
export function filterAndRankTasks(tasks, opts = {}) {
  const minNoticeability = opts.minNoticeability ?? 3;
  const allowProofDocs = opts.allowProofDocs ?? false;

  const scored = tasks.map((task) => ({ task, score: scoreTask(task) }));

  const filtered = scored.filter(({ task, score }) => {
    if (!allowProofDocs && (task.category === 'blueprint_proof' || PROOF_DOC_RE.test(String(task.target_file || '')))) {
      return false;
    }
    if (task.requires_api === false) return true;
    if (task.category === 'infra_recovery' || task.category === 'churn_diagnosis') return true;
    if (score.adamNoticeability >= minNoticeability) return true;
    if (score.reliabilityValue >= 8 && score.adamNoticeability >= 2) return true;
    return false;
  });

  filtered.sort((a, b) => {
    const dc = b.score.composite - a.score.composite;
    if (dc !== 0) return dc;
    return (a.task.priority || 999) - (b.task.priority || 999);
  });

  return filtered;
}

/**
 * @param {object} task
 * @param {Record<string, { blocker?: string, category?: string }>} blockedAttempts
 */
export function shouldSkipKnownBadTask(task, blockedAttempts = {}) {
  const baseId = String(task.id || '').replace(/_retry\d*$/, '').replace(/_retry$/, '');
  const prior = blockedAttempts[baseId];
  if (!prior) return { skip: false };
  const infra = ['HTTP_502', 'SERVICE_OUTAGE', 'ZONE3_PATCH_REQUIRED', 'fetch failed'];
  if (infra.some((p) => String(prior.blocker || '').includes(p))) {
    return { skip: true, reason: `known bad task ${baseId}: prior blocker ${prior.blocker}` };
  }
  return { skip: false };
}
