/**
 * SYNOPSIS: Billing scenario stage map + follow-up clocks for ClientCare forever-chase.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 *
 * Doctrine: global maternity (59400) is the default file spine. Clocks schedule
 * SYSTEM work — midwife does nothing. Age is not a stop.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Default clocks — hours until next SYSTEM touch after entering the stage. */
export const BILLING_SCENARIOS = {
  unpaid_birth_file: {
    label: 'Unbilled birth — file global claim',
    description: 'Birth linked (or linkable) in ClientCare; insurance unpaid. File 59400 global path.',
    stages: [
      { id: 'discover', worker: 'resolve_billing_href', clock_hours: 0, surface: 'Birth Activity / Pregnancy Billing' },
      { id: 'prepare_status', worker: 'prepare_claim_status', clock_hours: 0, surface: 'Claims Processing / CPM' },
      { id: 'file_global', worker: 'file_claim', clock_hours: 0, surface: 'ChargeSlip → SuperBill → HCFA → EDI → Sent Bills' },
      { id: 'prove_sent', worker: 'prove_sent_bills', clock_hours: 0.25, surface: 'Review Sent Bills' },
      { id: 'filed_await_era', worker: 'await_era', clock_hours: 24 * 7, surface: 'Record Insurance Payment / ERA' },
    ],
  },
  claim_status_followup: {
    label: 'Filed — status / payment follow-up',
    description: 'Claim submitted; no full payment yet. Ask insurer on cadence.',
    stages: [
      { id: 'check_status', worker: 'status_followup', clock_hours: 0, surface: 'Claim Status / Follow Up' },
      { id: 'recheck', worker: 'status_followup', clock_hours: 24 * 14, surface: 'Claim Status / portal / phone' },
      { id: 'escalate_ask', worker: 'ask_insurer', clock_hours: 24 * 7, surface: 'Billing Follow Up + contact log' },
    ],
  },
  underpayment_chase: {
    label: 'Underpaid vs allowed',
    description: 'Paid but short ≥$10 vs allowed/contract. Forever-chase remainder.',
    stages: [
      { id: 'era_reconcile', worker: 'underpay_packet', clock_hours: 0, surface: 'ERA / Remittance / AR' },
      { id: 'demand_balance', worker: 'underpay_packet', clock_hours: 24 * 7, surface: 'Appeal / corrected claim / payer letter' },
      { id: 'recheck_payment', worker: 'status_followup', clock_hours: 24 * 14, surface: 'Claim Status / AR' },
    ],
  },
  denial_correct_resubmit: {
    label: 'Correctable denial / rejection',
    description: 'Fix coding/auth/info and resubmit.',
    stages: [
      { id: 'review_denial', worker: 'review_rejection', clock_hours: 0, surface: 'Denial / EOB' },
      { id: 'correct_resubmit', worker: 'file_claim', clock_hours: 24, surface: 'HCFA / EDI' },
      { id: 'prove_resent', worker: 'prove_sent_bills', clock_hours: 0.25, surface: 'Sent Bills' },
    ],
  },
  denial_timely_proof: {
    label: 'Timely-filing denial — proof path',
    description: 'Gather clearinghouse/original submit proof; still chase.',
    stages: [
      { id: 'collect_proof', worker: 'collect_timely_proof', clock_hours: 0, surface: 'Clearinghouse / Sent Bills history' },
      { id: 'submit_proof', worker: 'ask_insurer', clock_hours: 24 * 3, surface: 'Payer appeal / reconsideration' },
      { id: 'recheck', worker: 'status_followup', clock_hours: 24 * 14, surface: 'Claim Status' },
    ],
  },
  forever_ask_insurer: {
    label: 'Forever ask insurer',
    description: 'Age/unknown/late — keep asking until paid or written no-liability denial.',
    stages: [
      { id: 'ask_now', worker: 'ask_insurer', clock_hours: 0, surface: 'Phone / portal / write' },
      { id: 'ask_again', worker: 'ask_insurer', clock_hours: 24 * 14, surface: 'Phone / portal / write' },
      { id: 'escalate_intensity', worker: 'ask_insurer', clock_hours: 24 * 7, surface: 'Supervisor / written demand' },
    ],
  },
  billing_notes_repair: {
    label: 'Billing notes backlog',
    description: 'Insurance setup / notes queue blocking clean file.',
    stages: [
      { id: 'read_notes', worker: 'notes_repair', clock_hours: 0, surface: 'Billing Notes' },
      { id: 'repair_coverage', worker: 'prepare_claim_status', clock_hours: 0, surface: 'Claims Processing / coverage' },
      { id: 'handoff_file', worker: 'file_claim', clock_hours: 0, surface: 'File path after repair' },
    ],
  },
  transport_prenatal_claim: {
    label: 'Transport / hospital delivery — bill midwife prenatal',
    description:
      'Hospital or transport took delivery (often a global). Midwife still collected prenatal; file antepartum package (59425/59426) from notes+chart — not a write-off.',
    stages: [
      { id: 'read_notes', worker: 'notes_repair', clock_hours: 0, surface: 'Billing Notes / chart' },
      { id: 'prepare_status', worker: 'prepare_claim_status', clock_hours: 0, surface: 'Claims Processing / CPM' },
      { id: 'file_antepartum', worker: 'file_claim', clock_hours: 0, surface: 'ChargeSlip → SuperBill → HCFA → EDI → Sent Bills' },
      { id: 'prove_sent', worker: 'prove_sent_bills', clock_hours: 0.25, surface: 'Review Sent Bills' },
      { id: 'filed_await_era', worker: 'await_era', clock_hours: 24 * 7, surface: 'Record Insurance Payment / ERA' },
    ],
  },
  secondary_payer: {
    label: 'Secondary / coordination of benefits',
    description: 'Primary paid or denied; secondary still owed.',
    stages: [
      { id: 'confirm_primary', worker: 'status_followup', clock_hours: 0, surface: 'ERA primary' },
      { id: 'file_secondary', worker: 'file_claim', clock_hours: 24, surface: 'HCFA secondary' },
      { id: 'chase_secondary', worker: 'status_followup', clock_hours: 24 * 14, surface: 'Claim Status' },
    ],
  },
  newborn_claim: {
    label: 'Newborn separate claim',
    description: 'Baby care billed as separate patient when applicable.',
    stages: [
      { id: 'identify_newborn', worker: 'resolve_billing_href', clock_hours: 0, surface: 'Chart / newborn' },
      { id: 'file_newborn', worker: 'file_claim', clock_hours: 0, surface: 'ChargeSlip / HCFA' },
      { id: 'chase_newborn', worker: 'status_followup', clock_hours: 24 * 14, surface: 'Claim Status' },
    ],
  },
};

export const WORKER_TO_ACTION_TYPE = {
  resolve_billing_href: 'resolve_billing_link',
  prepare_claim_status: 'prepare_claim_status',
  file_claim: 'submit_claim',
  prove_sent_bills: 'prove_sent_bills',
  await_era: 'await_era_payment',
  status_followup: 'status_followup',
  underpay_packet: 'underpayment_demand',
  ask_insurer: 'ask_insurer_forever',
  review_rejection: 'review_rejection',
  collect_timely_proof: 'collect_timely_filing_proof',
  notes_repair: 'repair_billing_notes',
};

export function listBillingScenarios() {
  return Object.entries(BILLING_SCENARIOS).map(([id, def]) => ({
    id,
    label: def.label,
    description: def.description,
    stages: def.stages.map((s) => ({
      ...s,
      clock_label: formatClock(s.clock_hours),
      action_type: WORKER_TO_ACTION_TYPE[s.worker] || s.worker,
    })),
  }));
}

export function formatClock(hours) {
  const h = Number(hours) || 0;
  if (h <= 0) return 'due immediately';
  if (h < 24) return `every ${h}h until advanced`;
  const days = h / 24;
  return days === 1 ? 'in 1 day' : `in ${days} days`;
}

/**
 * Billing notes + chart text decide scenario. Founder 2026-07-15:
 * transports / hospital globals still leave prenatal money midwife can collect;
 * notes are the determinant — never invent charges; never bill active prenatals.
 */
export function inferCareBillingFromNotes(raw = '', account = {}) {
  const blobs = [
    raw,
    account.notePreview,
    account.notes,
    account.nextAction,
    account.next_action,
    ...(Array.isArray(account.notePreviews) ? account.notePreviews : []),
    ...(Array.isArray(account.note_previews) ? account.note_previews : []),
  ].filter(Boolean).map((x) => String(x));
  const t = blobs.join('\n').toLowerCase();

  const transport = /\b(transport|transported|transfer(?:red)?\s+to\s+(?:the\s+)?hospital|hospital\s+transfer|ems|ambulance|sent\s+to\s+(?:the\s+)?hospital)\b/.test(t);
  const hospitalBilledGlobal = /hospital.{0,60}(global|billed|bill)|(?:facility|ob\/?gyn|hospital).{0,60}(global|delivery\s+claim)|hospital\s+did\s+(?:the\s+)?delivery|\bdid\s+not\s+deliver\b|\bprenatal\s+only\b|\bantepartum\s+only\b/.test(t);
  const prenatalWork = /\b(prenatal|antepartum|ob\s*visit|prenatal\s+care)\b/.test(t);
  // Strong episode-end only — bare "birth"/"delivery" appears in insurance setup notes and must NOT auto-file.
  const birthCompletedSignals = /\b(home\s*birth|baby\s+(?:was\s+)?born|born\s+on\b|delivered\s+on\b|date\s+of\s+(?:birth|delivery)|apgar|placenta\s+(?:delivered|birth)|live\s*birth|vaginal\s+delivery\s+completed|birth\s+completed)\b/.test(t)
    || transport
    || hospitalBilledGlobal;
  const currentPrenatal = !birthCompletedSignals
    && /\b(current\s+prenatal|still\s+pregnant|active\s+prenatal|weeks?\s+gestation|upcoming\s+birth|due\s+date|\bedc\b|ongoing\s+prenatal)\b/.test(t);
  const visitCountMatch = t.match(/(\d+)\s*(?:\+|plus)?\s*(?:prenatal|antepartum|ob)\s*visits?/)
    || t.match(/(?:prenatal|antepartum|ob)\s*visits?[:\s]+(\d+)/);
  const visitCount = visitCountMatch ? Number(visitCountMatch[1]) : null;
  const antepartumCpt = visitCount != null && visitCount >= 7
    ? '59426'
    : visitCount != null && visitCount >= 4
      ? '59425'
      : '59426';

  if (currentPrenatal) {
    return {
      billable_now: false,
      birth_completed: false,
      scenario: 'billing_notes_repair',
      reason: 'current_prenatal',
      confidence: 'think',
      global_cpt: null,
      antepartum_cpt: null,
      billed_amount: null,
      notes_determinant: 'do_not_bill_active_prenatal',
    };
  }

  if (
    transport
    || hospitalBilledGlobal
    || (prenatalWork && /\b(hospital|transport|did not (?:attend|catch|deliver)|prenatal only|antepartum only)\b/.test(t))
  ) {
    return {
      billable_now: true,
      birth_completed: true,
      scenario: 'transport_prenatal_claim',
      reason: transport ? 'transport_prenatal_owed' : 'hospital_global_prenatal_owed',
      confidence: visitCount != null ? 'think' : 'guess',
      global_cpt: null,
      antepartum_cpt: antepartumCpt,
      visit_count_guess: visitCount,
      billed_amount: null,
      notes_determinant: 'notes_text',
      note: 'Hospital/transport took delivery global; midwife still collects prenatal package from chart.',
    };
  }

  if (birthCompletedSignals) {
    return {
      billable_now: true,
      birth_completed: true,
      scenario: 'unpaid_birth_file',
      reason: 'birth_completed_from_notes',
      confidence: 'think',
      global_cpt: '59400',
      antepartum_cpt: null,
      billed_amount: 4900,
      notes_determinant: 'notes_text',
    };
  }

  return {
    billable_now: false,
    birth_completed: false,
    scenario: 'billing_notes_repair',
    reason: 'notes_inconclusive',
    confidence: 'guess',
    global_cpt: null,
    antepartum_cpt: null,
    billed_amount: null,
    notes_determinant: 'needs_chart_read',
  };
}

export function inferBillingScenario(claim = {}) {
  const meta = claim.metadata || {};
  if (meta.billing_scenario && BILLING_SCENARIOS[meta.billing_scenario]) {
    return meta.billing_scenario;
  }
  if (meta.care_billing?.scenario && BILLING_SCENARIOS[meta.care_billing.scenario]) {
    return meta.care_billing.scenario;
  }
  const lane = String(meta.lane || '').toLowerCase();
  const status = String(claim.claim_status || claim.submission_status || '').toLowerCase();
  const bucket = String(claim.rescue_bucket || '').toLowerCase();
  const shortPaid = Math.max(
    Number(claim.allowed_amount || 0) - Number(claim.patient_balance || 0) - Number(claim.paid_amount || 0),
    0,
  );
  const unpaid = Number(claim.paid_amount || 0) <= 0;

  if (lane === 'transport_prenatal' || meta.care_billing?.reason === 'transport_prenatal_owed') {
    return 'transport_prenatal_claim';
  }
  if (lane === 'billing_notes_backlog' || /notes|billing_notes/.test(status)) return 'billing_notes_repair';
  if (shortPaid >= 10 && !unpaid) return 'underpayment_chase';
  if (/reject/.test(status) || bucket === 'correct_and_resubmit') return 'denial_correct_resubmit';
  if (bucket === 'proof_of_timely_filing' || /timely/.test(status)) return 'denial_timely_proof';
  if (meta.newborn || /newborn/.test(status)) return 'newborn_claim';
  if (meta.secondary || /secondary/.test(status)) return 'secondary_payer';
  if (
    unpaid
    && (/unbilled|chart_linked|needs_billing/.test(status) || bucket === 'submit_now' || lane === 'unpaid_birth')
  ) {
    return 'unpaid_birth_file';
  }
  if (bucket === 'forever_chase' || (unpaid && (Number(meta.days_old) >= 90 || bucket === 'likely_uncollectible'))) {
    return 'forever_ask_insurer';
  }
  if (!unpaid || /submitted|filed|claim.?submitted|pending/.test(status)) return 'claim_status_followup';
  return unpaid ? 'unpaid_birth_file' : 'forever_ask_insurer';
}

export function getScenarioStages(scenarioId) {
  return BILLING_SCENARIOS[scenarioId]?.stages || BILLING_SCENARIOS.forever_ask_insurer.stages;
}

export function resolveStage(scenarioId, stageId) {
  const stages = getScenarioStages(scenarioId);
  const found = stages.find((s) => s.id === stageId);
  return found || stages[0];
}

export function nextStageId(scenarioId, stageId) {
  const stages = getScenarioStages(scenarioId);
  const idx = stages.findIndex((s) => s.id === stageId);
  if (idx < 0) return stages[0]?.id || null;
  if (idx >= stages.length - 1) return stages[idx].id;
  return stages[idx + 1].id;
}

export function clockHoursForStage(scenarioId, stageId, payerOverride = null) {
  const stage = resolveStage(scenarioId, stageId);
  let hours = Number(stage?.clock_hours ?? 24 * 14);
  const cadenceDays = payerOverride?.followup_cadence_days;
  if (cadenceDays != null && Number.isFinite(Number(cadenceDays)) && Number(cadenceDays) > 0) {
    if (['status_followup', 'ask_insurer', 'underpay_packet', 'await_era'].includes(stage?.worker)) {
      hours = Number(cadenceDays) * 24;
    }
  }
  return hours;
}

export function computeDueAt(scenarioId, stageId, { now = new Date(), payerOverride = null, from = null } = {}) {
  const hours = clockHoursForStage(scenarioId, stageId, payerOverride);
  const base = from ? new Date(from) : new Date(now);
  if (Number.isNaN(base.getTime())) return new Date(now);
  return new Date(base.getTime() + hours * HOUR_MS);
}

export function pregnancyIdFromHref(href) {
  const s = String(href || '');
  const m = s.match(/Pregnancy\/Billing\/([0-9a-f-]{36})/i)
    || s.match(/pregnancyID=([0-9a-f-]{36})/i)
    || s.match(/pregnancyId=([0-9a-f-]{36})/i);
  return m?.[1] || null;
}

export function buildStagePlan(claim = {}, payerOverride = null, now = new Date()) {
  const scenario = inferBillingScenario(claim);
  const meta = claim.metadata || {};
  const stages = getScenarioStages(scenario);
  let stageId = meta.stage && resolveStage(scenario, meta.stage).id === meta.stage
    ? meta.stage
    : null;
  if (!stageId) {
    if (meta.billing_href || meta.pregnancy_id || pregnancyIdFromHref(meta.billing_href)) {
      stageId = stages.find((s) => s.id === 'prepare_status')?.id
        || stages.find((s) => s.id === 'file_global')?.id
        || stages.find((s) => s.id === 'file_claim' || s.worker === 'file_claim')?.id
        || stages[0].id;
    } else {
      stageId = stages[0].id;
    }
  }
  const stage = resolveStage(scenario, stageId);
  const dueAt = meta.next_due_at
    ? new Date(meta.next_due_at)
    : computeDueAt(scenario, stageId, { now, payerOverride });
  return {
    scenario,
    scenario_label: BILLING_SCENARIOS[scenario]?.label || scenario,
    stage: stage.id,
    worker: stage.worker,
    surface: stage.surface,
    clock_hours: clockHoursForStage(scenario, stage.id, payerOverride),
    clock_label: formatClock(clockHoursForStage(scenario, stage.id, payerOverride)),
    next_due_at: dueAt.toISOString(),
    due_now: dueAt.getTime() <= now.getTime(),
    pregnancy_id: meta.pregnancy_id || pregnancyIdFromHref(meta.billing_href) || null,
    billing_href: meta.billing_href || null,
    action_type: WORKER_TO_ACTION_TYPE[stage.worker] || stage.worker,
  };
}

export { DAY_MS, HOUR_MS };
