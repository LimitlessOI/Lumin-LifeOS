/**
 * SYNOPSIS: clientcare-billing-service.js
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 * clientcare-billing-service.js
 * Claim rescue queue, payer-window classification, and recovery action planning.
 */

import {
  buildStagePlan,
  computeDueAt,
  getScenarioStages,
  inferBillingScenario,
  inferCareBillingFromNotes,
  listBillingScenarios,
  nextStageId,
  pregnancyIdFromHref,
  resolveStage,
  WORKER_TO_ACTION_TYPE,
} from '../config/clientcare-billing-stages.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const IMPORT_TEMPLATE_FIELDS = [
  'external_claim_id',
  'patient_id',
  'patient_name',
  'payer_name',
  'payer_type',
  'provider_state',
  'member_id',
  'claim_number',
  'account_number',
  'date_of_service',
  'service_end_date',
  'original_submitted_at',
  'latest_submitted_at',
  'claim_status',
  'submission_status',
  'denial_code',
  'denial_reason',
  'billed_amount',
  'allowed_amount',
  'paid_amount',
  'patient_balance',
  'insurance_balance',
  'cpt_codes',
  'icd_codes',
  'modifiers',
  'notes',
];

const CLAIM_IMPORT_ALIASES = {
  external_claim_id: ['external_claim_id', 'external id', 'claim_id', 'claim id'],
  patient_id: ['patient_id', 'patient id', 'client_id', 'client id'],
  patient_name: ['patient_name', 'patient', 'client_name', 'client'],
  payer_name: ['payer_name', 'payer', 'insurance_name', 'insurance'],
  payer_type: ['payer_type', 'payer type'],
  provider_state: ['provider_state', 'provider state'],
  member_id: ['member_id', 'member id', 'subscriber_id', 'subscriber id'],
  claim_number: ['claim_number', 'claim number'],
  account_number: ['account_number', 'account number'],
  date_of_service: ['date_of_service', 'date of service', 'dos'],
  service_end_date: ['service_end_date', 'service end date', 'dos_to'],
  original_submitted_at: ['original_submitted_at', 'original submitted at', 'submitted_at', 'submission_date'],
  latest_submitted_at: ['latest_submitted_at', 'latest submitted at', 'last_submitted_at', 'paid_date', 'remit_date'],
  claim_status: ['claim_status', 'claim status', 'status'],
  submission_status: ['submission_status', 'submission status'],
  denial_code: ['denial_code', 'denial code', 'carc_code', 'reason_code'],
  denial_reason: ['denial_reason', 'denial reason', 'reason', 'remark'],
  billed_amount: ['billed_amount', 'billed amount', 'charge_amount', 'charge amount', 'submitted_amount'],
  allowed_amount: ['allowed_amount', 'allowed amount', 'allowed'],
  paid_amount: ['paid_amount', 'paid amount', 'insurance_paid', 'payment_amount', 'check_amount'],
  patient_balance: ['patient_balance', 'patient balance', 'patient_responsibility', 'member_responsibility'],
  insurance_balance: ['insurance_balance', 'insurance balance', 'remaining_insurance_balance'],
  cpt_codes: ['cpt_codes', 'cpt codes', 'cpt', 'procedure_codes'],
  icd_codes: ['icd_codes', 'icd codes', 'icd', 'diagnosis_codes'],
  modifiers: ['modifiers', 'modifier', 'modifier_codes'],
  notes: ['notes', 'note', 'description'],
};

const PAYMENT_METADATA_ALIASES = {
  carc_codes: ['carc_codes', 'carc code', 'carc', 'claim_adjustment_reason_code', 'adjustment_reason_code'],
  rarc_codes: ['rarc_codes', 'rarc code', 'rarc', 'remark_codes', 'remittance_remark_code'],
  payment_reference: ['payment_reference', 'trace_number', 'eft_trace', 'check_number', 'check number'],
  payment_method: ['payment_method', 'payment method', 'method', 'payment_type'],
  paid_date: ['paid_date', 'payment_date', 'payment date', 'check_date', 'era_date', 'remit_date'],
};

function parseCsvLine(line = '') {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((item) => item.trim());
}

function parseClaimsCsv(text = '') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function findAliasValue(input = {}, aliases = []) {
  const entries = Object.entries(input || {});
  for (const alias of aliases) {
    const exact = entries.find(([key]) => key === alias);
    if (exact && exact[1] != null && String(exact[1]).trim() !== '') return exact[1];
    const normalized = alias.toLowerCase();
    const matched = entries.find(([key]) => String(key || '').toLowerCase().trim() === normalized);
    if (matched && matched[1] != null && String(matched[1]).trim() !== '') return matched[1];
  }
  return null;
}

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetween(start, end = new Date()) {
  const a = toDateOnly(start);
  const b = toDateOnly(end);
  if (!a || !b) return null;
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

function addDays(date, days) {
  const base = toDateOnly(date);
  if (!base) return null;
  return new Date(base.getTime() + (days * DAY_MS));
}

function isoDate(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(/[|,;]/).map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function normalizeReasonCodes(value) {
  return normalizeArray(value).map((item) => String(item || '').trim()).filter(Boolean);
}

function extractPaymentMetadata(input = {}) {
  const metadata = {};
  for (const [target, aliases] of Object.entries(PAYMENT_METADATA_ALIASES)) {
    const value = findAliasValue(input, aliases);
    if (value == null || String(value).trim() === '') continue;
    metadata[target] = /codes$/i.test(target) ? normalizeReasonCodes(value) : String(value).trim();
  }
  return metadata;
}

function normalizeImportedClaim(input = {}) {
  const out = { ...input };
  for (const [target, aliases] of Object.entries(CLAIM_IMPORT_ALIASES)) {
    if (out[target] != null && String(out[target]).trim() !== '') continue;
    const value = findAliasValue(input, aliases);
    if (value != null && String(value).trim() !== '') out[target] = value;
  }

  out.metadata = {
    ...(out.metadata || {}),
    ...extractPaymentMetadata(input),
  };

  if ((!out.denial_code || String(out.denial_code).trim() === '') && Array.isArray(out.metadata?.carc_codes) && out.metadata.carc_codes.length) {
    out.denial_code = out.metadata.carc_codes[0];
  }

  if ((!out.denial_reason || String(out.denial_reason).trim() === '') && Array.isArray(out.metadata?.rarc_codes) && out.metadata.rarc_codes.length) {
    out.denial_reason = out.metadata.rarc_codes.join(', ');
  }

  const billed = money(out.billed_amount);
  const allowed = money(out.allowed_amount);
  const paid = money(out.paid_amount);
  const patientBalance = money(out.patient_balance);

  if ((!out.insurance_balance || money(out.insurance_balance) === 0) && allowed > 0) {
    out.insurance_balance = Number(Math.max(allowed - paid - patientBalance, 0).toFixed(2));
  }

  if ((!out.patient_balance || money(out.patient_balance) === 0) && billed > 0 && allowed > 0 && paid >= 0) {
    const fallbackPatient = Math.max(billed - allowed, 0);
    if (fallbackPatient > 0) out.patient_balance = Number(fallbackPatient.toFixed(2));
  }

  if (!out.claim_status && paid > 0) out.claim_status = 'paid';
  if (!out.submission_status && paid > 0) out.submission_status = 'paid';
  if (!out.latest_submitted_at && paid > 0) {
    out.latest_submitted_at = out.paid_date || out.remit_date || out.metadata?.paid_date || out.original_submitted_at || null;
  }

  return out;
}

function inferPayerType(name = '', explicit = null) {
  if (explicit) return String(explicit).toLowerCase();
  const payer = String(name || '').toLowerCase();
  if (/medicare/.test(payer)) return 'medicare';
  if (/medicaid|nevada check up/.test(payer)) return 'nevada_medicaid';
  if (/self[- ]?pay|cash/.test(payer)) return 'self_pay';
  if (payer) return 'commercial';
  return 'unknown';
}

function normalizePayerKey(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findPayerRuleOverride(overrides = new Map(), payerName = '') {
  const key = normalizePayerKey(payerName);
  if (!key) return null;
  return overrides.get(key) || null;
}

function hasTimelyFilingDenial(claim = {}) {
  const text = `${claim.denial_code || ''} ${claim.denial_reason || ''}`.toLowerCase();
  return /timely|late filing|filing deadline|dos exceed timely filing/.test(text);
}

function hasCorrectableDenial(claim = {}) {
  const text = `${claim.denial_code || ''} ${claim.denial_reason || ''}`.toLowerCase();
  return /modifier|coding|diagnosis|authorization|member id|provider|npi|duplicate|invalid|missing/i.test(text);
}

function hasSubmissionProofCandidate(claim = {}) {
  const metadataText = JSON.stringify(claim.metadata || {}).toLowerCase();
  return Boolean(claim.original_submitted_at) || /clearinghouse|proof|acceptance|277|999|ack/i.test(metadataText);
}

function resolveTimelyRule(claim = {}, options = {}) {
  const payerType = inferPayerType(claim.payer_name, claim.payer_type);
  const providerState = String(claim.provider_state || '').toUpperCase();
  const metadata = claim.metadata || {};
  const payerOverride = findPayerRuleOverride(options.payerRuleOverrides, claim.payer_name);

  if (payerType === 'medicare') {
    return {
      payerType,
      filingWindowDays: 365,
      source: 'CMS Medicare FFS timely filing baseline: 1 calendar year from DOS',
      notes: ['Pure timely-filing denials are generally not the place to start appeals; focus first on proof of prior filing or non-timely issues.'],
    };
  }

  if (payerType === 'nevada_medicaid') {
    const hasTpl = Boolean(metadata.has_tpl || metadata.third_party_liability);
    const outOfState = providerState && providerState !== 'NV';
    const filingWindowDays = (hasTpl || outOfState) ? 365 : 180;
    return {
      payerType,
      filingWindowDays,
      source: `Nevada Medicaid baseline timely filing window: ${filingWindowDays} days`,
      notes: ['Agency or system-caused delay may support an exception request and appeal path.'],
    };
  }

  if (payerType === 'self_pay') {
    return {
      payerType,
      filingWindowDays: null,
      source: 'Self-pay does not use payer timely filing rules; check signed financial agreements and practice policy.',
      notes: ['Do not shift denied or late insurance balances to the patient without payer-contract and consent review.'],
    };
  }

  if (payerOverride) {
    return {
      payerType,
      filingWindowDays: Number.isFinite(Number(payerOverride.filing_window_days)) ? Number(payerOverride.filing_window_days) : null,
      source: payerOverride.timely_filing_source || `Operator override for ${claim.payer_name || 'payer'}`,
      appealWindowDays: Number.isFinite(Number(payerOverride.appeal_window_days)) ? Number(payerOverride.appeal_window_days) : null,
      requiresAuthReview: Boolean(payerOverride.requires_auth_review),
      notes: [payerOverride.notes, payerOverride.followup_notes].filter(Boolean),
      override: payerOverride,
    };
  }

  return {
    payerType,
    filingWindowDays: null,
    source: 'Commercial or unknown payer rule not yet verified',
    notes: ['Verify payer contract or payer manual before making a timely-filing assumption.'],
  };
}

function action(actionType, priority, summary, details, evidenceRequired = []) {
  return { actionType, priority, summary, details, evidenceRequired };
}

export function classifyClientCareClaim(claim = {}, now = new Date(), options = {}) {
  const payerRule = resolveTimelyRule(claim, options);
  const dos = toDateOnly(claim.date_of_service);
  const deadline = payerRule.filingWindowDays ? addDays(dos, payerRule.filingWindowDays) : null;
  const daysOld = daysBetween(dos, now);
  const daysToDeadline = deadline ? Math.floor((deadline.getTime() - toDateOnly(now).getTime()) / DAY_MS) : null;
  const outstanding = Math.max(money(claim.billed_amount) - money(claim.paid_amount), money(claim.insurance_balance), 0);
  const status = String(claim.claim_status || claim.submission_status || 'imported').toLowerCase();
  const timelyDenial = hasTimelyFilingDenial(claim);
  const correctable = hasCorrectableDenial(claim);
  const proofCandidate = hasSubmissionProofCandidate(claim);

  let rescueBucket = 'payer_followup';
  let rescueConfidence = 0.45;
  let recoveryProbability = 0.45;
  let priorityScore = outstanding;
  const actions = [];

  if (payerRule.requiresAuthReview) {
    actions.push(action('auth_contract_review', 'normal', 'Review payer-specific auth rule', 'This payer override requires auth/contract review before standard follow-up.', ['payer contract', 'authorization record']));
  }

  if (/paid|closed/.test(status) || outstanding <= 0) {
    rescueBucket = 'resolved';
    rescueConfidence = 1;
    recoveryProbability = 1;
    priorityScore = 0;
  } else if (!claim.original_submitted_at && !claim.latest_submitted_at && payerRule.filingWindowDays && deadline && now <= deadline) {
    rescueBucket = 'submit_now';
    rescueConfidence = 0.95;
    recoveryProbability = 0.9;
    priorityScore += 150;
    actions.push(action('submit_claim', 'high', 'Submit claim immediately', 'Claim appears unsubmitted and still within the baseline filing window.', ['coded claim', 'insurance verification']));
  } else if (/reject/.test(status)) {
    rescueBucket = proofCandidate ? 'proof_of_timely_filing' : 'correct_and_resubmit';
    rescueConfidence = 0.8;
    recoveryProbability = 0.75;
    priorityScore += 120;
    actions.push(action('review_rejection', 'high', 'Review rejection and resubmit', 'Rejected claims are often the fastest recoverable dollars.', ['rejection reason', 'claim form copy'])) ;
  } else if (correctable && !timelyDenial) {
    rescueBucket = 'correct_and_resubmit';
    rescueConfidence = 0.78;
    recoveryProbability = 0.7;
    priorityScore += 90;
    actions.push(action('correct_claim', 'high', 'Correct claim and resubmit', 'Denial appears correctable based on denial text.', ['denial reason', 'coding or authorization review']));
  } else if (timelyDenial && proofCandidate) {
    rescueBucket = 'proof_of_timely_filing';
    rescueConfidence = 0.72;
    recoveryProbability = 0.55;
    priorityScore += 70;
    actions.push(action('collect_timely_filing_proof', 'high', 'Gather proof of timely filing', 'Clearinghouse or original submission evidence may reopen the path.', ['clearinghouse acceptance', 'original submission date'])) ;
  } else if (payerRule.payerType === 'nevada_medicaid' && timelyDenial) {
    rescueBucket = 'timely_filing_exception';
    rescueConfidence = 0.55;
    recoveryProbability = 0.35;
    priorityScore += 45;
    actions.push(action('medicaid_exception_review', 'normal', 'Review Nevada Medicaid exception path', 'Check for eligibility, agency, or system delay grounds before closing out.', ['eligibility timeline', 'submission timeline', 'remittance or denial'])) ;
  } else if (payerRule.payerType === 'medicare' && timelyDenial) {
    // Founder forever-chase doctrine (2026-07-14): age/timely denial is NEVER a write-off.
    // Keep hounding until paid, written no-liability denial, or founder closes.
    rescueBucket = 'forever_chase';
    rescueConfidence = 0.55;
    recoveryProbability = 0.35;
    priorityScore += 80;
    actions.push(action(
      'ask_insurer_forever',
      'high',
      'Call/write insurer and demand status + payment path',
      'Do not stop because the claim is old. Ask the insurer what is owed, why unpaid/underpaid, and what document unlocks payment. Keep a dated receipt of every contact.',
      ['payer phone/portal contact log', 'claim number', 'DOS', 'member ID', 'prior EOB/ERA if any']
    ));
  } else if (!payerRule.filingWindowDays) {
    rescueBucket = 'payer_followup';
    rescueConfidence = 0.4;
    recoveryProbability = 0.4;
    priorityScore += 25;
    actions.push(action('verify_payer_rule', 'high', 'Verify payer timely-filing and appeal rules', 'Commercial or unknown payer needs contract or manual review before the next move.', ['payer policy', 'contract terms'])) ;
  } else if (deadline && now > deadline) {
    rescueBucket = 'forever_chase';
    rescueConfidence = 0.55;
    recoveryProbability = 0.4;
    priorityScore += 70;
    actions.push(action(
      'ask_insurer_forever',
      'high',
      'Late claim — still chase: ask insurer for exception + payment',
      'Outside baseline filing window is NOT permission to quit. Ask payer for reconsideration, good-cause exception, or proof they already paid. Document every ask.',
      ['submission history', 'payer rule', 'call/portal receipt']
    ));
  } else {
    rescueBucket = 'payer_followup';
    rescueConfidence = 0.6;
    recoveryProbability = 0.5;
    priorityScore += 60;
    actions.push(action('status_followup', 'normal', 'Follow up on claim status', 'Claim needs payer or clearinghouse follow-up.', ['claim status', 'last remit or EOB'])) ;
  }

  if (daysOld !== null) priorityScore += Math.min(daysOld, 365) * 0.35;
  if (timelyDenial) priorityScore += 30;
  if (proofCandidate) priorityScore += 20;

  if (rescueBucket !== 'resolved' && payerRule.payerType !== 'self_pay') {
    actions.push(action('contract_review', 'normal', 'Review patient-balance rules before any patient billing', 'Do not shift insurance balance to the patient until payer contract and signed agreements are checked.', ['payer contract', 'financial agreement'])) ;
  }

  // Founder forever-chase: anything still unpaid/short after 90 days keeps an ask-insurer action.
  if (rescueBucket !== 'resolved' && outstanding > 0 && (daysOld || 0) >= 90) {
    if (rescueBucket === 'likely_uncollectible' || rescueBucket === 'timely_filing_exception') {
      rescueBucket = 'forever_chase';
      recoveryProbability = Math.max(recoveryProbability, 0.35);
      priorityScore += 50;
    }
    const hasAsk = actions.some((a) => a.actionType === 'ask_insurer_forever');
    if (!hasAsk) {
      actions.unshift(action(
        'ask_insurer_forever',
        'high',
        'Ask insurer status + payment (age is not a stop)',
        'Call/portal/write the payer. Demand what is owed, why unpaid/underpaid, and the document that unlocks payment. Log every contact. Do not quit because the claim is old.',
        ['payer contact log', 'claim number', 'DOS', 'member ID']
      ));
    }
  }

  return {
    payerType: payerRule.payerType,
    timelyFilingDeadline: isoDate(deadline),
    timelyFilingSource: payerRule.source,
    daysOld,
    daysToDeadline,
    rescueBucket,
    rescueConfidence: Number(rescueConfidence.toFixed(2)),
    recoveryProbability: Number(recoveryProbability.toFixed(2)),
    priorityScore: Number(priorityScore.toFixed(2)),
    actions,
    notes: payerRule.notes,
  };
}

function mapClaimRow(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: row.metadata || {},
    cpt_codes: row.cpt_codes || [],
    icd_codes: row.icd_codes || [],
    modifiers: row.modifiers || [],
  };
}

function ratio(numerator, denominator) {
  const a = Number(numerator || 0);
  const b = Number(denominator || 0);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return Number((a / b).toFixed(4));
}

function getCollectionTimingProfile(rescueBucket = 'payer_followup') {
  const profiles = {
    submit_now: { label: '0-30 days', days: 21, multiplier: 0.85 },
    correct_and_resubmit: { label: '31-60 days', days: 45, multiplier: 0.75 },
    proof_of_timely_filing: { label: '61-90 days', days: 75, multiplier: 0.55 },
    timely_filing_exception: { label: '90+ days', days: 105, multiplier: 0.3 },
    payer_followup: { label: '31-60 days', days: 40, multiplier: 0.6 },
    likely_uncollectible: { label: '90+ days — STILL CHASE', days: 30, multiplier: 0.35 },
    forever_chase: { label: 'forever chase', days: 14, multiplier: 0.45 },
    resolved: { label: 'Closed', days: 0, multiplier: 1 },
  };
  return profiles[rescueBucket] || profiles.payer_followup;
}

function calibrateCollectionProfile(profile, payerStats = null) {
  if (!payerStats) return profile;
  const calibrated = { ...profile };
  if (payerStats.expected_days_to_pay != null && Number.isFinite(Number(payerStats.expected_days_to_pay))) {
    calibrated.days = Math.max(7, Math.round((profile.days + Number(payerStats.expected_days_to_pay)) / 2));
  }
  if (payerStats.avg_days_to_pay != null && Number.isFinite(Number(payerStats.avg_days_to_pay))) {
    calibrated.days = Math.max(7, Math.round((profile.days + Number(payerStats.avg_days_to_pay)) / 2));
  }
  if (payerStats.expected_paid_to_allowed_rate != null) {
    calibrated.multiplier = Number(Math.max(0.05, Math.min(0.98, (profile.multiplier + Number(payerStats.expected_paid_to_allowed_rate)) / 2)).toFixed(4));
  }
  if (payerStats.paid_to_allowed_rate != null) {
    calibrated.multiplier = Number(Math.max(0.05, Math.min(0.98, (profile.multiplier + Number(payerStats.paid_to_allowed_rate)) / 2)).toFixed(4));
  }
  return calibrated;
}

function classifyAppealPlaybook(claim = {}) {
  const payerType = inferPayerType(claim.payer_name, claim.payer_type);
  const text = `${claim.denial_code || ''} ${claim.denial_reason || ''} ${claim.claim_status || ''}`.toLowerCase();
  const timely = hasTimelyFilingDenial(claim);
  const correctable = hasCorrectableDenial(claim);

  const packet = {
    playbook_id: 'manual_review',
    title: 'Manual denial review',
    rationale: 'Claim needs manual review before deciding whether to appeal, correct, or close.',
    likely_path: 'review',
    evidence: ['claim form', 'payer response', 'clinical note'],
    confidence: 'low',
    notes: ['Verify payer-specific appeal or reconsideration window before submitting anything.'],
  };

  if (timely) {
    return {
      ...packet,
      playbook_id: 'timely_filing',
      title: 'Timely filing / prior submission proof',
      rationale: 'Denial text points to timely filing or late submission issues.',
      likely_path: hasSubmissionProofCandidate(claim) ? 'appeal_with_proof' : 'exception_review',
      evidence: ['original submission date', 'clearinghouse acceptance', 'payer acknowledgement', 'claim form'],
      confidence: hasSubmissionProofCandidate(claim) ? 'medium' : 'low',
      notes: payerType === 'nevada_medicaid'
        ? ['Nevada Medicaid exceptions may exist for agency/system delays; verify the exact reconsideration path.']
        : ['Pure timely-filing denials are weak unless you have proof of prior submission or a payer exception path.'],
    };
  }

  if (/auth|authorization|precert|pre-cert|pre cert/.test(text)) {
    return {
      ...packet,
      playbook_id: 'authorization',
      title: 'Authorization denial packet',
      rationale: 'Denial appears tied to missing or invalid authorization/precertification.',
      likely_path: 'correct_or_appeal',
      evidence: ['authorization record', 'referral/order', 'clinical support', 'submission timeline'],
      confidence: 'medium',
      notes: ['Check whether the denial is technical/correctable before sending a formal appeal.'],
    };
  }

  if (/medical necessity|not medically necessary|necessity/.test(text)) {
    return {
      ...packet,
      playbook_id: 'medical_necessity',
      title: 'Medical necessity appeal packet',
      rationale: 'Denial appears tied to medical necessity or level-of-care support.',
      likely_path: 'formal_appeal',
      evidence: ['clinical documentation', 'plan of care', 'provider letter', 'supporting records'],
      confidence: 'medium',
      notes: payerType === 'nevada_medicaid'
        ? ['Nevada Medicaid reconsideration is a written provider request and generally needs additional supporting information.']
        : ['Expect payer-specific medical necessity criteria; attach documentation that directly addresses the denial reason.'],
    };
  }

  if (/member|subscriber|eligibility|coverage|dob|date of birth/.test(text)) {
    return {
      ...packet,
      playbook_id: 'eligibility_identity',
      title: 'Eligibility / member data correction',
      rationale: 'Denial appears tied to member identity, coverage, or eligibility data.',
      likely_path: 'correct_and_resubmit',
      evidence: ['eligibility verification', 'member ID copy', 'coverage dates', 'payer verification note'],
      confidence: 'high',
      notes: ['These are often faster to correct and resubmit than to formally appeal.'],
    };
  }

  if (/provider|npi|taxonomy|credential|network|out of network/.test(text)) {
    return {
      ...packet,
      playbook_id: 'provider_enrollment',
      title: 'Provider enrollment / network issue',
      rationale: 'Denial appears tied to provider identity, credentialing, taxonomy, or network status.',
      likely_path: 'review_enrollment_then_rebill',
      evidence: ['provider enrollment status', 'NPI/taxonomy confirmation', 'payer credentialing status'],
      confidence: 'medium',
      notes: ['Check whether retro credentialing or enrollment correction is possible before escalating.'],
    };
  }

  if (correctable) {
    return {
      ...packet,
      playbook_id: 'coding_correction',
      title: 'Coding / data correction packet',
      rationale: 'Denial appears correctable based on code, modifier, or form data issues.',
      likely_path: 'correct_and_resubmit',
      evidence: ['claim form', 'coding review', 'modifier review', 'clinical note if needed'],
      confidence: 'high',
      notes: ['These are usually correction/resubmission work, not formal appeal-first work.'],
    };
  }

  return packet;
}

function classifyDenialCategory(claim = {}) {
  const text = `${claim.denial_code || ''} ${claim.denial_reason || ''}`.toLowerCase();
  if (!text.trim()) return 'unknown';
  if (/timely|late filing|deadline/.test(text)) return 'timely_filing';
  if (/auth|authorization|precert|pre-cert/.test(text)) return 'authorization';
  if (/medical necessity|not medically necessary|clinical/.test(text)) return 'medical_necessity';
  if (/eligib|member|coverage|subscriber|dob|identity/.test(text)) return 'eligibility';
  if (/provider|credential|enroll|network|npi|taxonomy/.test(text)) return 'provider_enrollment';
  if (/modifier|coding|diagnosis|procedure|bundl|duplicate/.test(text)) return 'coding';
  return 'other';
}

function buildPayerRecommendations({ payerName, payerType, topDenialCategory, paidClaims, avgDaysToPay }) {
  const recommendations = [];
  if (payerType === 'commercial') {
    recommendations.push('Do not assume a universal filing or appeal window; verify payer-specific rules before escalation.');
  }
  if (topDenialCategory === 'authorization') {
    recommendations.push('Verify authorization workflow and attach approval/support before rebilling or appealing.');
  }
  if (topDenialCategory === 'eligibility') {
    recommendations.push('Check member ID, coverage dates, and primary/secondary payer order before resubmission.');
  }
  if (topDenialCategory === 'coding') {
    recommendations.push('Review modifiers, CPT/ICD pairing, and any duplicate/bundling edits before correcting the claim.');
  }
  if (topDenialCategory === 'timely_filing') {
    recommendations.push('Pull clearinghouse acceptance and prior-submission proof before attempting appeal or exception review.');
  }
  if (avgDaysToPay != null) {
    recommendations.push(`Observed average payment lag is about ${avgDaysToPay} days; use that as the first forecast baseline.`);
  }
  if (!paidClaims) {
    recommendations.push('Import more paid claims or ERA history for this payer before trusting payout and timing forecasts.');
  }
  if (!recommendations.length) recommendations.push(`Build a payer-specific playbook for ${payerName || 'this payer'} from the current denial and payment history.`);
  return recommendations;
}

function buildPayerOverrideRecommendations(payerOverride = {}) {
  const recommendations = [];
  if (!payerOverride) return recommendations;
  if (payerOverride.followup_cadence_days) recommendations.push(`Work this payer every ${payerOverride.followup_cadence_days} days until resolution or escalation.`);
  if (payerOverride.escalation_after_days) recommendations.push(`Escalate internally after ${payerOverride.escalation_after_days} days without movement.`);
  if (payerOverride.expected_days_to_pay) recommendations.push(`Use ${payerOverride.expected_days_to_pay} days as the operator-approved payment lag baseline.`);
  if (payerOverride.expected_paid_to_allowed_rate != null) recommendations.push(`Use ${(Number(payerOverride.expected_paid_to_allowed_rate) * 100).toFixed(1)}% as the operator-approved paid-to-allowed baseline.`);
  if (payerOverride.denial_category_override) recommendations.push(`Treat the dominant denial lane as ${String(payerOverride.denial_category_override).replace(/_/g, ' ')} until current history proves otherwise.`);
  if (payerOverride.followup_notes) recommendations.push(payerOverride.followup_notes);
  if (payerOverride.notes) recommendations.push(payerOverride.notes);
  return recommendations;
}

function buildAppealLetter(packet = {}, claim = {}, outstandingAmount = 0) {
  const patient = claim.patient_name || 'Unknown patient';
  const payer = claim.payer_name || 'Unknown payer';
  const claimNumber = claim.claim_number || 'Unknown claim';
  const dos = claim.date_of_service || 'Unknown DOS';
  return [
    `RE: ${patient} / Claim ${claimNumber}`,
    `Payer: ${payer}`,
    `Date of Service: ${dos}`,
    `Outstanding Amount: $${Number(outstandingAmount || 0).toFixed(2)}`,
    '',
    `Request Type: ${packet.title || 'Appeal / reconsideration review'}`,
    '',
    'Summary:',
    packet.rationale || 'Claim requires payer review.',
    '',
    'Requested Resolution:',
    packet.likely_path || 'review',
    '',
    'Attach the following:',
    ...(packet.evidence || []).map((item) => `- ${item}`),
    '',
    'Notes:',
    ...((packet.notes || []).map((item) => `- ${item}`)),
  ].join('\n');
}

export function createClientCareBillingService({ pool, logger = console, now = () => new Date() }) {
  async function ensureClaimActions(claimId, actions = [], { dueAt = null } = {}) {
    await pool.query(`DELETE FROM clientcare_claim_actions WHERE claim_id=$1 AND status='open'`, [claimId]);
    const created = [];
    const stamp = dueAt ? new Date(dueAt) : null;
    for (const item of actions) {
      const itemDue = item.dueAt ? new Date(item.dueAt) : stamp;
      const { rows } = await pool.query(
        `INSERT INTO clientcare_claim_actions (claim_id, action_type, priority, summary, details, evidence_required, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          claimId,
          item.actionType,
          item.priority,
          item.summary,
          item.details,
          JSON.stringify(item.evidenceRequired || []),
          itemDue && !Number.isNaN(itemDue.getTime()) ? itemDue.toISOString() : null,
        ]
      );
      created.push(rows[0]);
    }
    return created;
  }

  async function stampClaimStage(claimId, plan, extraMeta = {}) {
    const { rows } = await pool.query(
      `UPDATE clientcare_claims
       SET metadata = COALESCE(metadata, '{}'::jsonb)
         || jsonb_build_object(
           'billing_scenario', $2::text,
           'stage', $3::text,
           'next_due_at', $4::text,
           'stage_worker', $5::text,
           'stage_surface', $6::text,
           'pregnancy_id', COALESCE(NULLIF($7::text, ''), metadata->>'pregnancy_id'),
           'stage_clock_label', $8::text
         )
         || $9::jsonb,
           last_action_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        claimId,
        plan.scenario,
        plan.stage,
        plan.next_due_at,
        plan.worker,
        plan.surface || null,
        plan.pregnancy_id || null,
        plan.clock_label || null,
        JSON.stringify(extraMeta || {}),
      ]
    );
    return mapClaimRow(rows[0]);
  }

  async function attachPregnancyLink(claimId, {
    pregnancyId = null,
    billingHref = null,
    source = 'directory_resolve',
    matchedName = null,
  } = {}) {
    const claim = await getClaimById(claimId);
    if (!claim) throw new Error(`claim ${claimId} not found`);
    const pid = pregnancyId || pregnancyIdFromHref(billingHref);
    if (!pid && !billingHref) throw new Error('pregnancy_id or billing_href required');
    const meta = {
      ...(claim.metadata || {}),
      pregnancy_id: pid || claim.metadata?.pregnancy_id || null,
      billing_href: billingHref || claim.metadata?.billing_href || null,
      resolve_source: source,
      resolve_matched_name: matchedName || null,
      resolved_at: now().toISOString(),
      resolve_fail_count: 0,
      last_resolve_error: null,
    };
    if (pid && (!meta.stage || meta.stage === 'discover' || meta.stage === 'read_notes')) {
      meta.stage = 'prepare_status';
      meta.billing_scenario = meta.billing_scenario || inferBillingScenario(claim);
      meta.next_due_at = now().toISOString();
    }
    const { rows } = await pool.query(
      `UPDATE clientcare_claims
       SET metadata = $2::jsonb,
           claim_status = CASE
             WHEN claim_status ILIKE '%notes%' OR claim_status ILIKE '%unbilled%' OR claim_status = 'billing_notes_backlog'
               THEN 'unbilled_birth_linked'
             ELSE claim_status
           END,
           submission_status = 'chart_linked_not_proved_paid',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [claimId, JSON.stringify(meta)]
    );
    return mapClaimRow(rows[0]);
  }

  async function recordResolveFailure(claimId, errorCode = 'pregnancy_id_missing_after_resolve', detail = null) {
    const claim = await getClaimById(claimId);
    if (!claim) return null;
    const prev = Number(claim.metadata?.resolve_fail_count || 0) || 0;
    const meta = {
      ...(claim.metadata || {}),
      resolve_fail_count: prev + 1,
      last_resolve_error: String(errorCode || '').slice(0, 120),
      last_resolve_error_detail: detail ? String(detail).slice(0, 240) : null,
      last_resolve_error_at: now().toISOString(),
    };
    const { rows } = await pool.query(
      `UPDATE clientcare_claims
       SET metadata = $2::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [claimId, JSON.stringify(meta)]
    );
    return mapClaimRow(rows[0]);
  }

  async function syncClaimStageClocks(claimRow, payerOverridesMap = null) {
    if (!claimRow?.id) return null;
    const map = payerOverridesMap || await getPayerRuleOverridesMap();
    const payerOverride = map.get(normalizePayerKey(claimRow.payer_name)) || null;
    const plan = buildStagePlan(claimRow, payerOverride, now());
    const href = claimRow.metadata?.billing_href || plan.billing_href;
    if (href && !plan.pregnancy_id) {
      plan.pregnancy_id = pregnancyIdFromHref(href);
      plan.billing_href = href;
    }
    await stampClaimStage(claimRow.id, plan);
    const due = plan.next_due_at;
    await pool.query(
      `UPDATE clientcare_claim_actions
       SET due_at = COALESCE(due_at, $2::timestamptz), updated_at = NOW()
       WHERE claim_id = $1 AND status = 'open' AND due_at IS NULL`,
      [claimRow.id, due]
    );
    return plan;
  }

  async function advanceClaimStage(claimId, event = 'advance', { notes = null } = {}) {
    const claim = await getClaimById(claimId);
    if (!claim) throw new Error(`claim ${claimId} not found`);
    const payerOverrides = await getPayerRuleOverridesMap();
    const payerOverride = payerOverrides.get(normalizePayerKey(claim.payer_name)) || null;
    const scenario = inferBillingScenario(claim);
    const currentStage = claim.metadata?.stage || resolveStage(scenario).id;
    let next = currentStage;
    let claimPatch = {};

    if (event === 'filed' || event === 'proved_sent') {
      next = 'filed_await_era';
      if (!getScenarioStages(scenario).some((s) => s.id === next)) {
        next = nextStageId(scenario, currentStage) || currentStage;
      }
      claimPatch = {
        claim_status: 'filed_awaiting_era',
        submission_status: 'edi_submitted_awaiting_payment',
        latest_submitted_at: now().toISOString(),
      };
    } else if (event === 'paid_full') {
      claimPatch = { claim_status: 'paid', rescue_bucket: 'resolved' };
      next = currentStage;
    } else if (event === 'underpaid') {
      next = 'era_reconcile';
      claimPatch = { claim_status: 'underpaid' };
    } else if (event === 'denied') {
      next = nextStageId('denial_correct_resubmit', 'review_denial') || 'review_denial';
    } else {
      next = nextStageId(scenario, currentStage) || currentStage;
    }

    const dueAt = computeDueAt(
      event === 'underpaid' ? 'underpayment_chase' : (event === 'denied' ? 'denial_correct_resubmit' : scenario),
      next,
      { now: now(), payerOverride }
    );
    const scenarioForNext = event === 'underpaid'
      ? 'underpayment_chase'
      : (event === 'denied' ? 'denial_correct_resubmit' : scenario);
    const stage = resolveStage(scenarioForNext, next);
    const plan = {
      scenario: scenarioForNext,
      stage: stage.id,
      worker: stage.worker,
      surface: stage.surface,
      next_due_at: dueAt.toISOString(),
      pregnancy_id: claim.metadata?.pregnancy_id || pregnancyIdFromHref(claim.metadata?.billing_href),
      clock_label: stage.clock_hours === 0 ? 'due immediately' : `in ${stage.clock_hours}h`,
    };

    if (Object.keys(claimPatch).length) {
      const sets = [];
      const vals = [claimId];
      let i = 2;
      for (const [k, v] of Object.entries(claimPatch)) {
        sets.push(`${k}=$${i}`);
        vals.push(v);
        i += 1;
      }
      if (notes) {
        sets.push(`notes = CASE WHEN notes IS NULL OR notes = '' THEN $${i} ELSE notes || E'\\n' || $${i} END`);
        vals.push(notes);
        i += 1;
      }
      sets.push('updated_at=NOW()');
      await pool.query(`UPDATE clientcare_claims SET ${sets.join(', ')} WHERE id=$1`, vals);
    }

    const stamped = await stampClaimStage(claimId, plan, {
      last_stage_event: event,
      last_stage_event_at: now().toISOString(),
    });
    await ensureClaimActions(claimId, [{
      actionType: WORKER_TO_ACTION_TYPE[stage.worker] || stage.worker,
      priority: 'high',
      summary: `Stage ${stage.id}: ${stage.worker}`,
      details: `Auto-advanced by event=${event}. Surface: ${stage.surface || 'n/a'}.`,
      evidenceRequired: [],
      dueAt: dueAt.toISOString(),
    }], { dueAt: dueAt.toISOString() });
    return { ok: true, event, plan, claim: stamped };
  }

  async function listPayerRuleOverrides() {
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_payer_rule_overrides ORDER BY payer_name ASC`);
      return rows;
    } catch (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
  }

  async function getPayerRuleOverridesMap() {
    const rows = await listPayerRuleOverrides();
    return new Map(rows.map((row) => [normalizePayerKey(row.payer_name), row]));
  }

  async function savePayerRuleOverride(input = {}) {
    const payerName = String(input.payer_name || '').trim();
    if (!payerName) throw new Error('payer_name required');
    const payload = {
      payer_name: payerName,
      filing_window_days: Number.isFinite(Number(input.filing_window_days)) ? Number(input.filing_window_days) : null,
      appeal_window_days: Number.isFinite(Number(input.appeal_window_days)) ? Number(input.appeal_window_days) : null,
      timely_filing_source: String(input.timely_filing_source || '').trim() || null,
      notes: String(input.notes || '').trim() || null,
      followup_notes: String(input.followup_notes || '').trim() || null,
      denial_category_override: String(input.denial_category_override || '').trim() || null,
      followup_cadence_days: Number.isFinite(Number(input.followup_cadence_days)) ? Number(input.followup_cadence_days) : null,
      escalation_after_days: Number.isFinite(Number(input.escalation_after_days)) ? Number(input.escalation_after_days) : null,
      expected_days_to_pay: Number.isFinite(Number(input.expected_days_to_pay)) ? Number(input.expected_days_to_pay) : null,
      expected_paid_to_allowed_rate: Number.isFinite(Number(input.expected_paid_to_allowed_rate)) ? Number(input.expected_paid_to_allowed_rate) : null,
      requires_auth_review: Boolean(input.requires_auth_review),
      updated_by: String(input.updated_by || 'overlay').trim(),
    };
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_payer_rule_overrides (
          payer_name, filing_window_days, appeal_window_days, timely_filing_source, notes, followup_notes,
          denial_category_override, followup_cadence_days, escalation_after_days, expected_days_to_pay,
          expected_paid_to_allowed_rate, requires_auth_review, updated_by
        )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (payer_name) DO UPDATE SET
           filing_window_days=EXCLUDED.filing_window_days,
           appeal_window_days=EXCLUDED.appeal_window_days,
           timely_filing_source=EXCLUDED.timely_filing_source,
           notes=EXCLUDED.notes,
           followup_notes=EXCLUDED.followup_notes,
           denial_category_override=EXCLUDED.denial_category_override,
           followup_cadence_days=EXCLUDED.followup_cadence_days,
           escalation_after_days=EXCLUDED.escalation_after_days,
           expected_days_to_pay=EXCLUDED.expected_days_to_pay,
           expected_paid_to_allowed_rate=EXCLUDED.expected_paid_to_allowed_rate,
           requires_auth_review=EXCLUDED.requires_auth_review,
           updated_by=EXCLUDED.updated_by,
           updated_at=NOW()
         RETURNING *`,
        [
          payload.payer_name,
          payload.filing_window_days,
          payload.appeal_window_days,
          payload.timely_filing_source,
          payload.notes,
          payload.followup_notes,
          payload.denial_category_override,
          payload.followup_cadence_days,
          payload.escalation_after_days,
          payload.expected_days_to_pay,
          payload.expected_paid_to_allowed_rate,
          payload.requires_auth_review,
          payload.updated_by,
        ]
      );
      return rows[0] || payload;
    } catch (error) {
      if (isMissingRelation(error)) return payload;
      throw error;
    }
  }

  async function upsertClaim(input = {}) {
    const normalized = normalizeImportedClaim(input);
    const tenantIdRaw = input.tenant_id ?? normalized.tenant_id ?? null;
    const tenantId = tenantIdRaw == null || tenantIdRaw === '' ? null : Number(tenantIdRaw);
    const claim = {
      tenant_id: Number.isFinite(tenantId) ? tenantId : null,
      external_claim_id: normalized.external_claim_id || null,
      patient_id: normalized.patient_id || null,
      patient_name: normalized.patient_name || null,
      payer_name: normalized.payer_name || 'Unknown',
      payer_type: normalized.payer_type || inferPayerType(normalized.payer_name, normalized.payer_type),
      provider_state: normalized.provider_state || null,
      member_id: normalized.member_id || null,
      claim_number: normalized.claim_number || null,
      account_number: normalized.account_number || null,
      date_of_service: normalized.date_of_service,
      service_end_date: normalized.service_end_date || null,
      original_submitted_at: normalized.original_submitted_at || null,
      latest_submitted_at: normalized.latest_submitted_at || normalized.original_submitted_at || null,
      claim_status: normalized.claim_status || 'imported',
      submission_status: normalized.submission_status || null,
      denial_code: normalized.denial_code || null,
      denial_reason: normalized.denial_reason || null,
      billed_amount: money(normalized.billed_amount),
      allowed_amount: money(normalized.allowed_amount),
      paid_amount: money(normalized.paid_amount),
      patient_balance: money(normalized.patient_balance),
      insurance_balance: money(normalized.insurance_balance),
      cpt_codes: normalizeArray(normalized.cpt_codes),
      icd_codes: normalizeArray(normalized.icd_codes),
      modifiers: normalizeArray(normalized.modifiers),
      source: normalized.source || 'manual_import',
      notes: normalized.notes || null,
      metadata: normalized.metadata || {},
    };
    const payerRuleOverrides = await getPayerRuleOverridesMap();
    const classification = classifyClientCareClaim(claim, now(), { payerRuleOverrides });
    if (claim.metadata?.forever_chase && classification.rescueBucket !== 'resolved') {
      classification.rescueBucket = 'forever_chase';
      classification.recoveryProbability = Math.max(classification.recoveryProbability || 0, 0.35);
      const hasAsk = (classification.actions || []).some((a) => a.actionType === 'ask_insurer_forever');
      if (!hasAsk) {
        classification.actions = [
          action(
            'ask_insurer_forever',
            'high',
            'Ask insurer status + payment (age is not a stop)',
            'Call/portal/write the payer. Demand what is owed, why unpaid/underpaid, and the document that unlocks payment. Log every contact. Do not quit because the claim is old.',
            ['payer contact log', 'claim number', 'DOS', 'member ID']
          ),
          ...(classification.actions || []),
        ];
      }
    }

    const valuesWithExternal = [
      claim.tenant_id, claim.external_claim_id, claim.patient_id, claim.patient_name, claim.payer_name, claim.payer_type, claim.provider_state, claim.member_id, claim.claim_number, claim.account_number,
      claim.date_of_service, claim.service_end_date, claim.original_submitted_at, claim.latest_submitted_at, claim.claim_status, claim.submission_status,
      claim.denial_code, claim.denial_reason, claim.billed_amount, claim.allowed_amount, claim.paid_amount, claim.patient_balance, claim.insurance_balance,
      JSON.stringify(claim.cpt_codes), JSON.stringify(claim.icd_codes), JSON.stringify(claim.modifiers), classification.timelyFilingDeadline, classification.timelyFilingSource,
      classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore, claim.source, claim.notes, JSON.stringify(claim.metadata),
    ];

    let rows;
    if (claim.external_claim_id) {
      const existing = await pool.query(
        `SELECT id FROM clientcare_claims
         WHERE external_claim_id = $1
           AND COALESCE(tenant_id, 0) = COALESCE($2::bigint, 0)
         LIMIT 1`,
        [claim.external_claim_id, claim.tenant_id]
      );
      if (existing.rows[0]?.id) {
        ({ rows } = await pool.query(
          `UPDATE clientcare_claims SET
             tenant_id=$2,
             patient_id=$3, patient_name=$4, payer_name=$5, payer_type=$6, provider_state=$7, member_id=$8, claim_number=$9, account_number=$10,
             date_of_service=$11, service_end_date=$12,
             original_submitted_at=COALESCE(original_submitted_at, $13), latest_submitted_at=$14,
             claim_status=$15, submission_status=$16, denial_code=$17, denial_reason=$18,
             billed_amount=$19, allowed_amount=$20, paid_amount=$21, patient_balance=$22, insurance_balance=$23,
             cpt_codes=$24, icd_codes=$25, modifiers=$26,
             timely_filing_deadline=$27, timely_filing_source=$28, rescue_bucket=$29, rescue_confidence=$30,
             recovery_probability=$31, priority_score=$32, source=$33, notes=$34, metadata=$35, updated_at=NOW()
           WHERE id=$1
           RETURNING *`,
          [
            existing.rows[0].id,
            claim.tenant_id,
            claim.patient_id, claim.patient_name, claim.payer_name, claim.payer_type, claim.provider_state, claim.member_id, claim.claim_number, claim.account_number,
            claim.date_of_service, claim.service_end_date, claim.original_submitted_at, claim.latest_submitted_at, claim.claim_status, claim.submission_status,
            claim.denial_code, claim.denial_reason, claim.billed_amount, claim.allowed_amount, claim.paid_amount, claim.patient_balance, claim.insurance_balance,
            JSON.stringify(claim.cpt_codes), JSON.stringify(claim.icd_codes), JSON.stringify(claim.modifiers), classification.timelyFilingDeadline, classification.timelyFilingSource,
            classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore, claim.source, claim.notes, JSON.stringify(claim.metadata),
          ]
        ));
      } else {
        ({ rows } = await pool.query(
          `INSERT INTO clientcare_claims (
             tenant_id, external_claim_id, patient_id, patient_name, payer_name, payer_type, provider_state, member_id, claim_number, account_number,
             date_of_service, service_end_date, original_submitted_at, latest_submitted_at, claim_status, submission_status,
             denial_code, denial_reason, billed_amount, allowed_amount, paid_amount, patient_balance, insurance_balance,
             cpt_codes, icd_codes, modifiers, timely_filing_deadline, timely_filing_source, rescue_bucket, rescue_confidence,
             recovery_probability, priority_score, source, notes, metadata
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
             $11,$12,$13,$14,$15,$16,
             $17,$18,$19,$20,$21,$22,$23,
             $24,$25,$26,$27,$28,$29,$30,
             $31,$32,$33,$34,$35
           )
           RETURNING *`,
          valuesWithExternal
        ));
      }
    } else {
      ({ rows } = await pool.query(
        `INSERT INTO clientcare_claims (
           tenant_id, patient_id, patient_name, payer_name, payer_type, provider_state, member_id, claim_number, account_number,
           date_of_service, service_end_date, original_submitted_at, latest_submitted_at, claim_status, submission_status,
           denial_code, denial_reason, billed_amount, allowed_amount, paid_amount, patient_balance, insurance_balance,
           cpt_codes, icd_codes, modifiers, timely_filing_deadline, timely_filing_source, rescue_bucket, rescue_confidence,
           recovery_probability, priority_score, source, notes, metadata
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,
           $10,$11,$12,$13,$14,$15,
           $16,$17,$18,$19,$20,$21,$22,
           $23,$24,$25,$26,$27,$28,$29,
           $30,$31,$32,$33,$34
         ) RETURNING *`,
        [
          claim.tenant_id, claim.patient_id, claim.patient_name, claim.payer_name, claim.payer_type, claim.provider_state, claim.member_id, claim.claim_number, claim.account_number,
          claim.date_of_service, claim.service_end_date, claim.original_submitted_at, claim.latest_submitted_at, claim.claim_status, claim.submission_status,
          claim.denial_code, claim.denial_reason, claim.billed_amount, claim.allowed_amount, claim.paid_amount, claim.patient_balance, claim.insurance_balance,
          JSON.stringify(claim.cpt_codes), JSON.stringify(claim.icd_codes), JSON.stringify(claim.modifiers), classification.timelyFilingDeadline, classification.timelyFilingSource,
          classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore, claim.source, claim.notes, JSON.stringify(claim.metadata),
        ]
      ));
    }

    const saved = mapClaimRow(rows[0]);
    const duePlan = await syncClaimStageClocks(saved);
    const dueAt = duePlan?.next_due_at || null;
    await ensureClaimActions(
      saved.id,
      classification.actions.map((a) => ({ ...a, dueAt })),
      { dueAt },
    );
    const refreshed = await getClaimById(saved.id);
    return { claim: refreshed || saved, classification, stage: duePlan };
  }

  async function importClaims(claims = [], { source = 'manual_import', tenantId = null } = {}) {
    const results = [];
    for (const item of claims) {
      try {
        results.push(await upsertClaim({ ...item, source: item.source || source, tenant_id: item.tenant_id ?? tenantId }));
      } catch (error) {
        logger.warn?.({ err: error.message, claim: item.external_claim_id || item.claim_number || item.patient_name }, '[CLIENTCARE-BILLING] import failed');
        results.push({ error: error.message, claim: item });
      }
    }
    return results;
  }

  async function importPaymentHistoryCsv(csv = '', { source = 'payment_history_import' } = {}) {
    const claims = parseClaimsCsv(csv).map((row) => normalizeImportedClaim(row));
    if (!claims.length) return { parsed: 0, imported: 0, failed: 0, results: [] };
    const results = await importClaims(claims, { source });
    return {
      parsed: claims.length,
      imported: results.filter((item) => !item.error).length,
      failed: results.filter((item) => item.error).length,
      results,
    };
  }

  async function getClaimById(claimId) {
    const { rows } = await pool.query(`SELECT * FROM clientcare_claims WHERE id=$1`, [claimId]);
    return mapClaimRow(rows[0] || null);
  }

  async function reclassifyClaim(claimId) {
    const claim = await getClaimById(claimId);
    if (!claim) return null;
    const classification = classifyClientCareClaim(claim, now(), { payerRuleOverrides: await getPayerRuleOverridesMap() });
    const { rows } = await pool.query(
      `UPDATE clientcare_claims
       SET payer_type=$2, timely_filing_deadline=$3, timely_filing_source=$4, rescue_bucket=$5,
           rescue_confidence=$6, recovery_probability=$7, priority_score=$8, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [claimId, classification.payerType, classification.timelyFilingDeadline, classification.timelyFilingSource, classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore]
    );
    await ensureClaimActions(claimId, classification.actions);
    const mapped = mapClaimRow(rows[0]);
    const stage = await syncClaimStageClocks(mapped);
    return { claim: await getClaimById(claimId), classification, stage };
  }

  async function listClaims(filters = {}) {
    const clauses = [];
    const values = [];
    const add = (sql, value) => {
      values.push(value);
      clauses.push(sql.replace('?', `$${values.length}`));
    };

    if (filters.rescue_bucket) add('rescue_bucket=?', filters.rescue_bucket);
    if (filters.claim_status) add('claim_status=?', filters.claim_status);
    if (filters.payer_name) add('payer_name ILIKE ?', `%${filters.payer_name}%`);
    if (filters.patient_name) add('patient_name ILIKE ?', `%${filters.patient_name}%`);

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(Number(filters.limit) || 100, 500);
    values.push(limit);
    const { rows } = await pool.query(
      `SELECT * FROM clientcare_claims ${where} ORDER BY priority_score DESC NULLS LAST, date_of_service ASC LIMIT $${values.length}`,
      values
    );
    return rows.map(mapClaimRow);
  }

  async function listActions(claimId = null) {
    if (claimId) {
      const { rows } = await pool.query(`SELECT * FROM clientcare_claim_actions WHERE claim_id=$1 ORDER BY created_at DESC`, [claimId]);
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT a.*, c.patient_name, c.payer_name, c.claim_number, c.priority_score
       FROM clientcare_claim_actions a
       JOIN clientcare_claims c ON c.id=a.claim_id
       WHERE a.status <> 'completed'
       ORDER BY CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
                c.priority_score DESC NULLS LAST,
                a.created_at ASC`
    );
    return rows;
  }

  async function updateAction(actionId, patch = {}) {
    const fields = [];
    const values = [];
    for (const key of ['status', 'owner', 'summary', 'details', 'priority', 'due_at']) {
      if (key in patch) {
        values.push(patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return null;
    values.push(actionId);
    const { rows } = await pool.query(
      `UPDATE clientcare_claim_actions SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async function getDashboard() {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_claims,
         COALESCE(SUM(GREATEST(COALESCE(insurance_balance,0), COALESCE(billed_amount,0) - COALESCE(paid_amount,0), 0)), 0)::numeric AS outstanding_total,
         COUNT(*) FILTER (WHERE rescue_bucket='submit_now')::int AS submit_now_count,
         COUNT(*) FILTER (WHERE rescue_bucket='correct_and_resubmit')::int AS correct_and_resubmit_count,
         COUNT(*) FILTER (WHERE rescue_bucket='proof_of_timely_filing')::int AS proof_count,
         COUNT(*) FILTER (WHERE rescue_bucket='timely_filing_exception')::int AS exception_count,
         COUNT(*) FILTER (WHERE rescue_bucket='likely_uncollectible')::int AS likely_uncollectible_count,
         COUNT(*) FILTER (WHERE rescue_bucket='forever_chase')::int AS forever_chase_count
       FROM clientcare_claims`
    );
    const summary = rows[0] || {};
    const topClaims = await listClaims({ limit: 25 });
    const topActions = await listActions();
    return {
      summary,
      topClaims,
      topActions: topActions.slice(0, 50),
      assumptions: {
        noPublicApiAssumed: true,
        browserFallbackPlanned: true,
      },
    };
  }

  async function buildClaimPlan(claimId) {
    const claim = await getClaimById(claimId);
    if (!claim) return null;
    const classification = classifyClientCareClaim(claim, now(), { payerRuleOverrides: await getPayerRuleOverridesMap() });
    const actions = await listActions(claimId);
    return { claim, classification, actions };
  }

  async function getReimbursementIntelligence() {
    const payerRuleOverrides = await getPayerRuleOverridesMap();
    const { rows: summaryRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE COALESCE(paid_amount, 0) > 0)::int AS paid_claims,
         COUNT(*) FILTER (WHERE COALESCE(insurance_balance, 0) > 0)::int AS unpaid_claims,
         COUNT(*) FILTER (WHERE rescue_bucket IN ('submit_now','correct_and_resubmit','proof_of_timely_filing','timely_filing_exception','payer_followup'))::int AS recoverable_claims,
         COALESCE(SUM(paid_amount) FILTER (WHERE COALESCE(paid_amount, 0) > 0), 0)::numeric AS total_paid,
         COALESCE(SUM(allowed_amount) FILTER (WHERE COALESCE(allowed_amount, 0) > 0), 0)::numeric AS total_allowed,
         COALESCE(SUM(billed_amount) FILTER (WHERE COALESCE(billed_amount, 0) > 0), 0)::numeric AS total_billed,
         COALESCE(SUM(insurance_balance) FILTER (WHERE COALESCE(insurance_balance, 0) > 0), 0)::numeric AS total_unpaid_balance
       FROM clientcare_claims`
    );

    const { rows: payerRows } = await pool.query(
      `SELECT
         payer_name,
         COUNT(*)::int AS total_claims,
         COUNT(*) FILTER (WHERE COALESCE(paid_amount, 0) > 0)::int AS paid_claims,
         COALESCE(AVG(NULLIF(billed_amount, 0)), 0)::numeric AS avg_billed,
         COALESCE(AVG(NULLIF(allowed_amount, 0)), 0)::numeric AS avg_allowed,
         COALESCE(AVG(NULLIF(paid_amount, 0)), 0)::numeric AS avg_paid,
         COALESCE(AVG(EXTRACT(EPOCH FROM (latest_submitted_at - original_submitted_at)) / 86400)
           FILTER (WHERE original_submitted_at IS NOT NULL AND latest_submitted_at IS NOT NULL AND COALESCE(paid_amount, 0) > 0), 0)::numeric AS avg_days_to_pay,
         COALESCE(SUM(insurance_balance) FILTER (WHERE COALESCE(insurance_balance, 0) > 0), 0)::numeric AS unpaid_balance,
         COALESCE(SUM(paid_amount), 0)::numeric AS paid_total
       FROM clientcare_claims
       WHERE payer_name IS NOT NULL AND payer_name <> ''
       GROUP BY payer_name
       ORDER BY paid_total DESC, unpaid_balance DESC
       LIMIT 12`
    );

    const { rows: denialRows } = await pool.query(
      `SELECT
         COALESCE(NULLIF(denial_reason, ''), NULLIF(denial_code, ''), 'Unknown') AS reason,
         COUNT(*)::int AS count
       FROM clientcare_claims
       WHERE COALESCE(denial_reason, '') <> '' OR COALESCE(denial_code, '') <> ''
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`
    );

    const summary = summaryRows[0] || {};
    const collectionRate = ratio(summary.total_paid, summary.total_billed);
    const allowedRate = ratio(summary.total_allowed, summary.total_billed);
    const paidToAllowedRate = ratio(summary.total_paid, summary.total_allowed);
    const hasHistory = Number(summary.paid_claims || 0) > 0;
    const payerProfiles = new Map(
      payerRows.map((payer) => {
        const payerOverride = findPayerRuleOverride(payerRuleOverrides, payer.payer_name);
        return ([
          payer.payer_name,
          {
          ...payer,
          avg_days_to_pay: payer.avg_days_to_pay ? Number(Number(payer.avg_days_to_pay).toFixed(1)) : null,
          collection_rate: ratio(payer.paid_total, Number(payer.avg_billed || 0) * Number(payer.paid_claims || 0)),
          paid_to_allowed_rate: ratio(Number(payer.avg_paid || 0), Number(payer.avg_allowed || 0)),
          expected_days_to_pay: payerOverride?.expected_days_to_pay != null ? Number(payerOverride.expected_days_to_pay) : null,
          expected_paid_to_allowed_rate: payerOverride?.expected_paid_to_allowed_rate != null ? Number(payerOverride.expected_paid_to_allowed_rate) : null,
        },
      ]);
      })
    );

    const recommendations = [];
    if (!hasHistory) {
      recommendations.push('Import paid claims, ERAs, or remits so payout estimates can learn from actual history.');
    }
    if (Number(summary.unpaid_claims || 0) > 0) {
      recommendations.push('Work unpaid insurance balances before they age further; these balances are still the fastest path to cash recovery.');
    }
    if ((denialRows[0]?.count || 0) > 0) {
      recommendations.push(`Top denial pattern right now is "${denialRows[0].reason}". Build a payer-specific fix playbook for it.`);
    }
    if (collectionRate !== null && collectionRate < 0.5) {
      recommendations.push('Historical paid-to-billed ratio is weak. Review fee schedules, payer order, auth, modifiers, and underpayment follow-up.');
    }

    const { rows: forecastRows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         rescue_bucket,
         recovery_probability,
         COALESCE(insurance_balance, GREATEST(COALESCE(billed_amount,0) - COALESCE(paid_amount,0), 0))::numeric AS outstanding,
         date_of_service,
         latest_submitted_at
       FROM clientcare_claims
       WHERE COALESCE(insurance_balance, GREATEST(COALESCE(billed_amount,0) - COALESCE(paid_amount,0), 0)) > 0
         AND rescue_bucket <> 'resolved'
       ORDER BY priority_score DESC NULLS LAST, date_of_service ASC
       LIMIT 500`
    );

    const buckets = new Map([
      ['0-30 days', { label: '0-30 days', amount: 0, claims: 0 }],
      ['31-60 days', { label: '31-60 days', amount: 0, claims: 0 }],
      ['61-90 days', { label: '61-90 days', amount: 0, claims: 0 }],
      ['90+ days', { label: '90+ days', amount: 0, claims: 0 }],
    ]);
    const forecastClaims = forecastRows.map((claim) => {
      const payerProfile = payerProfiles.get(claim.payer_name) || null;
      const baseProfile = getCollectionTimingProfile(claim.rescue_bucket);
      const profile = calibrateCollectionProfile(baseProfile, payerProfile);
      const expectedDate = addDays(now(), profile.days);
      const probability = Number(claim.recovery_probability || 0) * profile.multiplier;
      const expectedAmount = Number((money(claim.outstanding) * probability).toFixed(2));
      const bucket = buckets.get(profile.label);
      if (bucket) {
        bucket.amount += expectedAmount;
        bucket.claims += 1;
      }
      return {
        id: claim.id,
        patient_name: claim.patient_name,
        payer_name: claim.payer_name,
        rescue_bucket: claim.rescue_bucket,
        outstanding: money(claim.outstanding),
        expected_amount: expectedAmount,
        projected_date: isoDate(expectedDate),
        timing_bucket: profile.label,
        calibration_basis: payerProfile?.expected_days_to_pay != null
          ? `payer_override_${claim.payer_name}`
          : payerProfile?.avg_days_to_pay != null
            ? `payer_history_${claim.payer_name}`
            : 'rescue_bucket_only',
      };
    });

    const forecast = {
      has_claim_data: forecastClaims.length > 0,
      confidence: hasHistory ? 'medium' : 'low',
      assumptions: hasHistory
        ? 'Forecast uses current rescue buckets calibrated by observed payer payment lag and paid-to-allowed history where available.'
        : 'Forecast uses current rescue buckets only. Import paid claims or ERAs to improve amount and timing accuracy.',
      projected_total: Number(forecastClaims.reduce((sum, claim) => sum + Number(claim.expected_amount || 0), 0).toFixed(2)),
      timing_buckets: Array.from(buckets.values()).map((bucket) => ({
        ...bucket,
        amount: Number(bucket.amount.toFixed(2)),
      })),
      top_claims: forecastClaims.slice(0, 12),
    };

    return {
      summary: {
        ...summary,
        collection_rate: collectionRate,
        allowed_rate: allowedRate,
        paid_to_allowed_rate: paidToAllowedRate,
        has_history: hasHistory,
      },
      payers: payerRows.map((payer) => ({
        ...payerProfiles.get(payer.payer_name),
      })),
      denials: denialRows,
      recommendations,
      collection_forecast: forecast,
    };
  }

  async function getEraInsights({ limit = 20 } = {}) {
    const { rows: summaryRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE COALESCE(metadata->>'payment_reference', '') <> '')::int AS traced_payments,
         COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(metadata->'carc_codes', '[]'::jsonb)) > 0)::int AS carc_tagged_claims,
         COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(metadata->'rarc_codes', '[]'::jsonb)) > 0)::int AS rarc_tagged_claims,
         COUNT(*) FILTER (WHERE COALESCE(metadata->>'payment_method', '') <> '')::int AS payment_method_tagged
       FROM clientcare_claims`
    );

    const { rows: carcRows } = await pool.query(
      `SELECT
         code,
         COUNT(*)::int AS count
       FROM (
         SELECT jsonb_array_elements_text(COALESCE(metadata->'carc_codes', '[]'::jsonb)) AS code
         FROM clientcare_claims
       ) codes
       WHERE COALESCE(code, '') <> ''
       GROUP BY code
       ORDER BY count DESC, code ASC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 20), 100))]
    );

    const { rows: rarcRows } = await pool.query(
      `SELECT
         code,
         COUNT(*)::int AS count
       FROM (
         SELECT jsonb_array_elements_text(COALESCE(metadata->'rarc_codes', '[]'::jsonb)) AS code
         FROM clientcare_claims
       ) codes
       WHERE COALESCE(code, '') <> ''
       GROUP BY code
       ORDER BY count DESC, code ASC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 20), 100))]
    );

    const { rows: paymentMethodRows } = await pool.query(
      `SELECT
         metadata->>'payment_method' AS payment_method,
         COUNT(*)::int AS count,
         COALESCE(SUM(paid_amount), 0)::numeric AS total_paid
       FROM clientcare_claims
       WHERE COALESCE(metadata->>'payment_method', '') <> ''
       GROUP BY metadata->>'payment_method'
       ORDER BY count DESC, total_paid DESC
       LIMIT 10`
    );

    return {
      summary: summaryRows[0] || {},
      carc_codes: carcRows.map((row) => ({ code: row.code, count: Number(row.count || 0) })),
      rarc_codes: rarcRows.map((row) => ({ code: row.code, count: Number(row.count || 0) })),
      payment_methods: paymentMethodRows.map((row) => ({
        payment_method: row.payment_method,
        count: Number(row.count || 0),
        total_paid: Number(row.total_paid || 0),
      })),
    };
  }

  async function getPayerPlaybooks({ limit = 25 } = {}) {
    const payerRuleOverrides = await getPayerRuleOverridesMap();
    const { rows } = await pool.query(
      `SELECT
         payer_name,
         COALESCE(NULLIF(payer_type, ''), 'unknown') AS payer_type,
         COUNT(*)::int AS total_claims,
         COUNT(*) FILTER (WHERE COALESCE(paid_amount, 0) > 0)::int AS paid_claims,
         COALESCE(AVG(NULLIF(allowed_amount, 0)) FILTER (WHERE COALESCE(allowed_amount, 0) > 0), 0)::numeric AS avg_allowed,
         COALESCE(AVG(NULLIF(paid_amount, 0)) FILTER (WHERE COALESCE(paid_amount, 0) > 0), 0)::numeric AS avg_paid,
         COALESCE(AVG(EXTRACT(EPOCH FROM (latest_submitted_at - original_submitted_at)) / 86400)
           FILTER (WHERE original_submitted_at IS NOT NULL AND latest_submitted_at IS NOT NULL AND COALESCE(paid_amount, 0) > 0), 0)::numeric AS avg_days_to_pay,
         COALESCE(SUM(insurance_balance), 0)::numeric AS unpaid_balance
       FROM clientcare_claims
       WHERE COALESCE(payer_name, '') <> ''
       GROUP BY payer_name, COALESCE(NULLIF(payer_type, ''), 'unknown')
       ORDER BY unpaid_balance DESC, total_claims DESC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 25), 100))]
    );

    const playbooks = [];
    for (const row of rows) {
      const { rows: denialRows } = await pool.query(
        `SELECT
           COALESCE(NULLIF(denial_code, ''), NULLIF(denial_reason, ''), 'Unknown') AS denial_key,
           denial_code,
           denial_reason,
           COUNT(*)::int AS count
         FROM clientcare_claims
         WHERE payer_name = $1
           AND (COALESCE(denial_code, '') <> '' OR COALESCE(denial_reason, '') <> '')
         GROUP BY COALESCE(NULLIF(denial_code, ''), NULLIF(denial_reason, ''), 'Unknown'), denial_code, denial_reason
         ORDER BY count DESC
         LIMIT 5`,
        [row.payer_name]
      );

      const normalizedDenials = denialRows.map((entry) => ({
        key: entry.denial_key,
        denial_code: entry.denial_code,
        denial_reason: entry.denial_reason,
        count: Number(entry.count || 0),
        category: classifyDenialCategory(entry),
      }));

      const payerOverride = findPayerRuleOverride(payerRuleOverrides, row.payer_name);
      const topDenial = normalizedDenials[0] || null;
      const topCategory = payerOverride?.denial_category_override || topDenial?.category || 'unknown';
      playbooks.push({
        payer_name: row.payer_name,
        payer_type: row.payer_type,
        total_claims: Number(row.total_claims || 0),
        paid_claims: Number(row.paid_claims || 0),
        unpaid_balance: Number(row.unpaid_balance || 0),
        avg_allowed: Number(row.avg_allowed || 0),
        avg_paid: Number(row.avg_paid || 0),
        avg_days_to_pay: row.avg_days_to_pay ? Number(Number(row.avg_days_to_pay).toFixed(1)) : null,
        expected_days_to_pay: payerOverride?.expected_days_to_pay != null ? Number(payerOverride.expected_days_to_pay) : null,
        expected_paid_to_allowed_rate: payerOverride?.expected_paid_to_allowed_rate != null ? Number(payerOverride.expected_paid_to_allowed_rate) : null,
        top_denial_category: topCategory,
        top_denials: normalizedDenials,
        rule_override: payerOverride || null,
        recommendations: buildPayerRecommendations({
          payerName: row.payer_name,
          payerType: row.payer_type,
          topDenialCategory: topCategory,
          paidClaims: Number(row.paid_claims || 0),
          avgDaysToPay: row.avg_days_to_pay ? Number(Number(row.avg_days_to_pay).toFixed(1)) : null,
        }).concat(payerOverride ? [
          payerOverride.filing_window_days ? `Use operator filing window override: ${payerOverride.filing_window_days} days.` : null,
          payerOverride.appeal_window_days ? `Target appeals within ${payerOverride.appeal_window_days} days when denials hit.` : null,
          ...buildPayerOverrideRecommendations(payerOverride),
        ].filter(Boolean) : []),
      });
    }

    return {
      summary: {
        total_payers: playbooks.length,
        commercial_payers: playbooks.filter((item) => item.payer_type === 'commercial').length,
        medicare_payers: playbooks.filter((item) => item.payer_type === 'medicare').length,
        medicaid_payers: playbooks.filter((item) => item.payer_type === 'nevada_medicaid').length,
        total_unpaid_balance: Number(playbooks.reduce((sum, item) => sum + money(item.unpaid_balance), 0).toFixed(2)),
      },
      items: playbooks,
    };
  }

  async function getUnderpaymentQueue({ limit = 100 } = {}) {
    const { rows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         claim_number,
         date_of_service,
         claim_status,
         denial_code,
         denial_reason,
         billed_amount,
         allowed_amount,
         paid_amount,
         patient_balance,
         insurance_balance,
         latest_submitted_at,
         rescue_bucket,
         GREATEST(COALESCE(allowed_amount, 0) - COALESCE(patient_balance, 0) - COALESCE(paid_amount, 0), 0)::numeric AS short_paid_amount
       FROM clientcare_claims
       WHERE COALESCE(allowed_amount, 0) > 0
         AND COALESCE(paid_amount, 0) > 0
         AND GREATEST(COALESCE(allowed_amount, 0) - COALESCE(patient_balance, 0) - COALESCE(paid_amount, 0), 0) >= 10
       ORDER BY short_paid_amount DESC, latest_submitted_at ASC NULLS LAST
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 100), 250))]
    );

    const items = rows.map((row) => {
      const expectedInsurerPayment = Math.max(money(row.allowed_amount) - money(row.patient_balance), 0);
      const shortPaidAmount = Math.max(expectedInsurerPayment - money(row.paid_amount), 0);
      return {
        ...row,
        expected_insurer_payment: Number(expectedInsurerPayment.toFixed(2)),
        short_paid_amount: Number(shortPaidAmount.toFixed(2)),
        likely_underpaid: shortPaidAmount >= 10,
        next_action: shortPaidAmount >= 10
          ? 'Review ERA/EOB and payer contract; escalate as potential underpayment if patient responsibility is already correct.'
          : 'No underpayment action recommended.',
      };
    });

    const summary = {
      total_claims: items.length,
      total_short_paid: Number(items.reduce((sum, item) => sum + money(item.short_paid_amount), 0).toFixed(2)),
      average_short_paid: Number((items.length ? items.reduce((sum, item) => sum + money(item.short_paid_amount), 0) / items.length : 0).toFixed(2)),
      top_payers: Array.from(items.reduce((map, item) => {
        const key = item.payer_name || 'Unknown';
        const current = map.get(key) || { payer_name: key, claims: 0, short_paid_total: 0 };
        current.claims += 1;
        current.short_paid_total += money(item.short_paid_amount);
        map.set(key, current);
        return map;
      }, new Map()).values())
        .sort((a, b) => b.short_paid_total - a.short_paid_total)
        .slice(0, 8)
        .map((row) => ({ ...row, short_paid_total: Number(row.short_paid_total.toFixed(2)) })),
    };

    return { summary, items };
  }

  async function getAppealsQueue({ limit = 100 } = {}) {
    const payerRuleOverrides = await getPayerRuleOverridesMap();
    const { rows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         payer_type,
         claim_number,
         date_of_service,
         latest_submitted_at,
         claim_status,
         denial_code,
         denial_reason,
         billed_amount,
         allowed_amount,
         paid_amount,
         patient_balance,
         insurance_balance,
         rescue_bucket
       FROM clientcare_claims
       WHERE (
         COALESCE(denial_code, '') <> ''
         OR COALESCE(denial_reason, '') <> ''
         OR claim_status ILIKE '%denied%'
         OR rescue_bucket IN ('proof_of_timely_filing', 'timely_filing_exception', 'payer_followup', 'correct_and_resubmit')
       )
       ORDER BY priority_score DESC NULLS LAST, latest_submitted_at ASC NULLS LAST
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 100), 250))]
    );

    const items = rows.map((row) => {
      const payerOverride = findPayerRuleOverride(payerRuleOverrides, row.payer_name);
      const playbook = classifyAppealPlaybook(row);
      return {
        ...row,
        outstanding_amount: Number(Math.max(money(row.insurance_balance), money(row.allowed_amount) - money(row.paid_amount) - money(row.patient_balance), 0).toFixed(2)),
        payer_rule_override: payerOverride || null,
        followup_cadence_days: payerOverride?.followup_cadence_days || null,
        escalation_after_days: payerOverride?.escalation_after_days || null,
        playbook,
      };
    });

    const summary = {
      total_claims: items.length,
      by_playbook: Array.from(items.reduce((map, item) => {
        const key = item.playbook.playbook_id;
        const current = map.get(key) || { playbook_id: key, title: item.playbook.title, claims: 0, outstanding_amount: 0 };
        current.claims += 1;
        current.outstanding_amount += money(item.outstanding_amount);
        map.set(key, current);
        return map;
      }, new Map()).values())
        .sort((a, b) => b.outstanding_amount - a.outstanding_amount)
        .map((item) => ({ ...item, outstanding_amount: Number(item.outstanding_amount.toFixed(2)) })),
      top_denial_reason: items[0]?.playbook?.title || null,
    };

    return { summary, items };
  }

  async function buildAppealPacketPreview(claimId) {
    const claim = await getClaimById(claimId);
    if (!claim) return null;
    const payerRuleOverride = findPayerRuleOverride(await getPayerRuleOverridesMap(), claim.payer_name);
    const playbook = classifyAppealPlaybook(claim);
    const outstandingAmount = Number(Math.max(money(claim.insurance_balance), money(claim.allowed_amount) - money(claim.paid_amount) - money(claim.patient_balance), 0).toFixed(2));
    return {
      claim,
      outstanding_amount: outstandingAmount,
      playbook,
      payer_rule_override: payerRuleOverride || null,
      draft_letter: buildAppealLetter(playbook, claim, outstandingAmount),
      packet_sections: [
        'Claim summary',
        'Denial reason and payer response',
        'Requested correction or reconsideration',
        'Evidence checklist',
        'Submission / follow-up log',
      ],
      next_action: playbook.likely_path,
      followup_guidance: buildPayerOverrideRecommendations(payerRuleOverride),
    };
  }

  async function queueAppealAction(claimId, { owner = null, actionType = 'appeal_followup' } = {}) {
    const packet = await buildAppealPacketPreview(claimId);
    if (!packet) return null;

    const { claim, playbook, draft_letter: draftLetter, outstanding_amount: outstandingAmount } = packet;
    const summary = actionType === 'appeal_packet'
      ? `Prepare appeal packet — ${playbook.title}`
      : `Payer follow-up — ${playbook.title}`;
    const details = [
      `Claim ${claim.claim_number || claim.id} for ${claim.patient_name || 'Unknown patient'}`,
      `Outstanding: $${Number(outstandingAmount || 0).toFixed(2)}`,
      `Path: ${playbook.likely_path || 'review'}`,
      '',
      draftLetter,
    ].join('\n');
    const evidenceRequired = playbook.evidence || [];

    const { rows } = await pool.query(
      `INSERT INTO clientcare_claim_actions (claim_id, action_type, priority, owner, summary, details, evidence_required)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        claimId,
        actionType,
        playbook.confidence === 'high' ? 'high' : 'normal',
        owner,
        summary,
        details,
        JSON.stringify(evidenceRequired),
      ]
    );

    return {
      action: rows[0],
      packet,
    };
  }

  async function queueUnderpaymentAction(claimId, { owner = null, actionType = 'underpayment_review' } = {}) {
    const claim = await getClaimById(claimId);
    if (!claim) return null;

    const expectedInsurerPayment = Math.max(money(claim.allowed_amount) - money(claim.patient_balance), 0);
    const shortPaidAmount = Number(Math.max(expectedInsurerPayment - money(claim.paid_amount), 0).toFixed(2));

    if (shortPaidAmount < 10) {
      return {
        action: null,
        claim,
        expected_insurer_payment: Number(expectedInsurerPayment.toFixed(2)),
        short_paid_amount: shortPaidAmount,
        skipped: true,
        reason: 'Claim does not currently qualify as a meaningful underpayment candidate.',
      };
    }

    const summary = 'Review potential payer underpayment';
    const details = [
      `Claim ${claim.claim_number || claim.id} for ${claim.patient_name || 'Unknown patient'}`,
      `Expected insurer payment: $${expectedInsurerPayment.toFixed(2)}`,
      `Actual paid amount: $${money(claim.paid_amount).toFixed(2)}`,
      `Short-paid amount: $${shortPaidAmount.toFixed(2)}`,
      '',
      'Review ERA/EOB, patient responsibility, and payer contract before escalating as an underpayment.',
    ].join('\n');

    const evidenceRequired = [
      'ERA/EOB showing the actual allowed and paid amounts',
      'Patient-responsibility calculation and any copay/coinsurance support',
      'Fee schedule, contract terms, or payer policy support if available',
    ];

    const { rows } = await pool.query(
      `INSERT INTO clientcare_claim_actions (claim_id, action_type, priority, owner, summary, details, evidence_required, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        claimId,
        actionType,
        shortPaidAmount >= 50 ? 'high' : 'normal',
        owner,
        summary,
        details,
        JSON.stringify(evidenceRequired),
        JSON.stringify({
          expected_insurer_payment: Number(expectedInsurerPayment.toFixed(2)),
          short_paid_amount: shortPaidAmount,
          source: 'underpayment_queue',
        }),
      ]
    );

    return {
      action: rows[0],
      claim,
      expected_insurer_payment: Number(expectedInsurerPayment.toFixed(2)),
      short_paid_amount: shortPaidAmount,
    };
  }

  /**
   * Founder forever-chase seed: birth activity + billing-notes backlog → claims ledger.
   * Age never ends the chase. Underpayments stay open until short-pay is recovered or founder closes.
   */
  async function seedForeverChaseFromInventory({
    births = [],
    accounts = [],
    evidence = {},
    tenantId = null,
    midwifeLabel = null,
  } = {}) {
    const claims = [];
    const midwife = String(midwifeLabel || evidence?.midwife_label || (tenantId ? 'The midwife' : 'Sherry')).trim();
    const workNote = [
      'FOREVER-CHASE MANDATE (BirthBill):',
      'Every insurance birth unpaid or underpaid stays open until paid enough, insurer gives written no-liability denial, or practice closes.',
      'Ask the insurance company when status is unknown. Old age is not a stop.',
      `${midwife} performed the midwifery work and must be compensated; prior billing neglect is not a write-off.`,
      evidence?.operator_note ? `Operator note: ${evidence.operator_note}` : null,
    ].filter(Boolean).join(' ');

    for (const birth of Array.isArray(births) ? births : []) {
      const name = String(birth.motherNameGuess || birth.patientName || birth.name || '').trim() || 'Unknown mother';
      const dosRaw = birth.birthDateGuess || birth.date || birth.date_of_service;
      const dos = toDateOnly(dosRaw);
      if (!dos) continue;
      const href = birth.billingHref || birth.clientHref || null;
      const external = href
        ? `birth:${String(href).replace(/^https?:\/\/[^/]+/i, '')}`
        : `birth:${name.toLowerCase().replace(/\s+/g, '_')}:${isoDate(dos)}`;
      claims.push({
        external_claim_id: external.slice(0, 180),
        patient_name: name,
        payer_name: birth.insurer || birth.payer_name || 'Unknown — ask insurer',
        date_of_service: isoDate(dos),
        claim_status: birth.billingHref ? 'unbilled_birth_linked' : 'unbilled_birth',
        submission_status: birth.billingHref ? 'chart_linked_not_proved_paid' : 'needs_billing_link',
        billed_amount: birth.billed_amount || 4900,
        paid_amount: birth.paid_amount || 0,
        insurance_balance: birth.insurance_balance || 4900,
        source: 'forever_chase_birth_activity',
        notes: workNote,
        metadata: {
          forever_chase: true,
          lane: 'unpaid_birth',
          billing_scenario: 'unpaid_birth_file',
          stage: birth.billingHref ? 'prepare_status' : 'discover',
          next_due_at: new Date().toISOString(),
          billing_href: href,
          pregnancy_id: pregnancyIdFromHref(href) || birth.pregnancyId || birth.pregnancy_id || null,
          birth_completed: true,
          global_fee: 4900,
          global_cpt: '59400',
          do_not_bill_current_prenatal: true,
          resolve: birth.resolve || null,
          work_performed_by: midwife,
          prior_billing_failure: true,
          founder_mandate: 'forever_chase_until_paid_or_written_denial',
        },
      });
    }

    for (const account of Array.isArray(accounts) ? accounts : []) {
      const name = String(account.client || account.patientName || account.name || '').trim();
      if (!name) continue;
      const oldest = account.oldestNoteDate || account.oldest_note_date || account.date_of_service;
      const dos = toDateOnly(oldest) || toDateOnly(account.latestNoteDate) || toDateOnly(new Date());
      const external = `notes:${name.toLowerCase().replace(/\s+/g, '_')}:${isoDate(dos)}`;
      const notePreviews = Array.isArray(account.notePreviews)
        ? account.notePreviews
        : (Array.isArray(account.note_previews) ? account.note_previews : []);
      const careBilling = inferCareBillingFromNotes(
        [account.notePreview, ...notePreviews, account.notes, account.nextAction, account.next_action]
          .filter(Boolean)
          .join('\n'),
        account,
      );
      const href = account.billingHref || account.billing_href || null;
      const isTransport = careBilling.scenario === 'transport_prenatal_claim';
      const scenario = careBilling.scenario || 'billing_notes_repair';
      const stage = careBilling.billable_now
        ? (href ? 'prepare_status' : (isTransport ? 'read_notes' : 'prepare_status'))
        : 'read_notes';
      claims.push({
        external_claim_id: external.slice(0, 180),
        patient_name: name,
        payer_name: (Array.isArray(account.insurers) && account.insurers[0]) || account.payer_name || 'Unknown — ask insurer',
        date_of_service: isoDate(dos),
        claim_status: careBilling.billable_now
          ? (isTransport ? 'transport_prenatal_billable' : 'unbilled_birth_from_notes')
          : (account.status || 'billing_notes_backlog'),
        submission_status: careBilling.billable_now ? 'notes_classified_file' : 'notes_queue',
        billed_amount: careBilling.billed_amount || null,
        insurance_balance: careBilling.billed_amount || null,
        source: 'forever_chase_billing_notes',
        notes: `${workNote} Notes determinant: ${careBilling.reason}. Next: ${account.nextAction || account.next_action || (careBilling.billable_now ? 'File from notes decision.' : 'Ask insurer / repair / read chart.')}`,
        metadata: {
          forever_chase: true,
          lane: isTransport ? 'transport_prenatal' : (careBilling.billable_now ? 'unpaid_birth' : 'billing_notes_backlog'),
          billing_scenario: scenario,
          stage,
          next_due_at: new Date().toISOString(),
          billing_href: href,
          pregnancy_id: pregnancyIdFromHref(href) || account.pregnancyId || account.pregnancy_id || null,
          birth_completed: Boolean(careBilling.birth_completed),
          billable_now: Boolean(careBilling.billable_now),
          care_billing: careBilling,
          notes_classified_at: new Date().toISOString(),
          note_previews: notePreviews.slice(0, 20),
          global_cpt: careBilling.global_cpt || null,
          antepartum_cpt: careBilling.antepartum_cpt || null,
          auto_file_global: careBilling.scenario === 'unpaid_birth_file',
          do_not_bill_current_prenatal: true,
          note: careBilling.billable_now
            ? (careBilling.note || 'Notes proved billable episode — start filing.')
            : 'Notes inconclusive or current prenatal — do not invent global $4900.',
          recovery_band: account.recoveryBand || account.recovery_band || null,
          note_count: account.noteCount || account.note_count || null,
          work_performed_by: midwife,
          prior_billing_failure: true,
          founder_mandate: 'forever_chase_until_paid_or_written_denial',
        },
      });
    }

    const stamped = claims.map((c) => ({ ...c, tenant_id: c.tenant_id ?? tenantId }));
    const imported = await importClaims(stamped, { source: 'forever_chase_seed', tenantId });

    // Force open forever_chase / ask_insurer actions on anything still marked write-off style.
    await pool.query(
      `UPDATE clientcare_claims
       SET rescue_bucket = 'forever_chase',
           notes = CASE
             WHEN notes IS NULL OR notes = '' THEN $1
             WHEN notes LIKE '%FOREVER-CHASE MANDATE%' THEN notes
             ELSE notes || E'\\n' || $1
           END,
           updated_at = NOW()
       WHERE rescue_bucket IN ('likely_uncollectible', 'timely_filing_exception')
          OR (metadata->>'forever_chase') = 'true'`
      ,
      [workNote]
    );

    const clockSync = await syncAllOpenStageClocks({ tenantId, limit: 500 });

    return {
      ok: true,
      seeded_from: { births: births.length, accounts: accounts.length, claim_rows: claims.length },
      imported: imported.length,
      stage_clocks_synced: clockSync.synced,
      doctrine: 'forever_chase_until_paid_or_written_denial',
      work_performed_by: midwife,
    };
  }

  async function reclassifyNotesClaimsFromStoredText({ tenantId = null, limit = 500 } = {}) {
    const capped = Math.max(1, Math.min(Number(limit) || 500, 1000));
    const hasTenant = !(tenantId == null || tenantId === '');
    const params = hasTenant ? [Number(tenantId), capped] : [capped];
    const tenantSql = hasTenant ? ' AND COALESCE(tenant_id, 0) = COALESCE($1::bigint, 0)' : '';
    const lim = hasTenant ? '$2' : '$1';
    const { rows } = await pool.query(
      `SELECT * FROM clientcare_claims
       WHERE COALESCE(rescue_bucket, '') <> 'resolved'
         AND (
           source ILIKE '%billing_notes%'
           OR COALESCE(metadata->>'lane', '') IN ('billing_notes_backlog', 'transport_prenatal')
           OR COALESCE(claim_status, '') ILIKE '%billing_notes%'
           OR COALESCE(metadata->>'notes_classified_at', '') = ''
         )${tenantSql}
       ORDER BY updated_at DESC NULLS LAST
       LIMIT ${lim}`,
      params
    );
    let updated = 0;
    const byReason = {};
    for (const row of rows) {
      const claim = mapClaimRow(row);
      const meta = { ...(claim.metadata || {}) };
      if (meta.last_stage_event === 'proved_sent' || /filed_await|edi_submitted/.test(String(claim.claim_status || ''))) {
        continue;
      }
      const noteText = [
        claim.notes,
        ...(Array.isArray(meta.note_previews) ? meta.note_previews : []),
        meta.note,
      ].filter(Boolean).join('\n');
      if (!String(noteText || '').trim()) continue;
      const careBilling = inferCareBillingFromNotes(noteText, { notePreviews: meta.note_previews });
      const nextKey = careBilling.reason || careBilling.scenario;
      byReason[nextKey] = (byReason[nextKey] || 0) + 1;
      const same = claim.metadata?.care_billing?.reason === careBilling.reason
        && claim.metadata?.billing_scenario === careBilling.scenario
        && Boolean(claim.metadata?.birth_completed) === Boolean(careBilling.birth_completed)
        && Boolean(claim.metadata?.billable_now) === Boolean(careBilling.billable_now);
      if (same && claim.metadata?.notes_classified_at) continue;
      const isTransport = careBilling.scenario === 'transport_prenatal_claim';
      meta.care_billing = careBilling;
      meta.notes_classified_at = new Date().toISOString();
      meta.birth_completed = Boolean(careBilling.birth_completed);
      meta.billable_now = Boolean(careBilling.billable_now);
      meta.billing_scenario = careBilling.scenario;
      meta.global_cpt = careBilling.global_cpt || meta.global_cpt || null;
      meta.antepartum_cpt = careBilling.antepartum_cpt || null;
      meta.lane = isTransport
        ? 'transport_prenatal'
        : (careBilling.billable_now ? 'unpaid_birth' : (meta.lane || 'billing_notes_backlog'));
      if (careBilling.billable_now && (!meta.stage || meta.stage === 'read_notes')) {
        meta.stage = meta.billing_href || meta.pregnancy_id ? 'prepare_status' : 'read_notes';
        meta.next_due_at = new Date().toISOString();
      }
      await pool.query(
        `UPDATE clientcare_claims
         SET metadata = $2::jsonb,
             claim_status = CASE
               WHEN $3::boolean THEN COALESCE(NULLIF($4, ''), claim_status)
               ELSE claim_status
             END,
             submission_status = CASE
               WHEN $3::boolean THEN 'notes_classified_file'
               ELSE submission_status
             END,
             billed_amount = COALESCE($5::numeric, billed_amount),
             insurance_balance = COALESCE($5::numeric, insurance_balance),
             updated_at = NOW()
         WHERE id = $1`,
        [
          claim.id,
          JSON.stringify(meta),
          Boolean(careBilling.billable_now),
          isTransport ? 'transport_prenatal_billable' : 'unbilled_birth_from_notes',
          careBilling.billed_amount,
        ]
      );
      updated += 1;
    }
    return { ok: true, scanned: rows.length, updated, by_reason: byReason };
  }

  async function syncAllOpenStageClocks({ tenantId = null, limit = 500 } = {}) {
    const notesPass = await reclassifyNotesClaimsFromStoredText({ tenantId, limit });
    const capped = Math.max(1, Math.min(Number(limit) || 500, 1000));
    const hasTenant = !(tenantId == null || tenantId === '');
    const params = hasTenant ? [Number(tenantId), capped] : [capped];
    const tenantSql = hasTenant ? ' AND COALESCE(tenant_id, 0) = COALESCE($1::bigint, 0)' : '';
    const lim = hasTenant ? '$2' : '$1';
    const { rows } = await pool.query(
      `SELECT * FROM clientcare_claims
       WHERE COALESCE(rescue_bucket, '') <> 'resolved'${tenantSql}
       ORDER BY updated_at DESC NULLS LAST
       LIMIT ${lim}`,
      params
    );
    const payerOverrides = await getPayerRuleOverridesMap();
    let synced = 0;
    for (const row of rows) {
      await syncClaimStageClocks(mapClaimRow(row), payerOverrides);
      synced += 1;
    }
    return { ok: true, synced, scanned: rows.length, notes_reclassified: notesPass };
  }

  async function getDueChaseWork({ limit = 20, tenantId = null, dueOnly = true, mode = 'all' } = {}) {
    // mode: 'all' | 'file_now' | 'follow_up'
    // Clocks gate FOLLOW-UP only. Capture/file work is always due now — never stagger the open queue.
    const FOLLOW_UP_WORKERS = new Set([
      'await_era', 'status_followup', 'ask_insurer', 'underpay_packet',
      'review_rejection', 'collect_timely_proof',
    ]);
    const FILE_NOW_SCENARIOS = new Set([
      'unpaid_birth_file', 'transport_prenatal_claim', 'billing_notes_repair',
      'denial_correct_resubmit', 'secondary_payer', 'newborn_claim',
    ]);
    const FILE_NOW_WORKERS = new Set([
      'file_claim', 'prove_sent_bills', 'prepare_claim_status', 'resolve_billing_href',
      'notes_repair',
    ]);

    const queue = await getForeverChaseQueue({ limit: Math.max(limit * 5, 200), tenantId });
    const payerOverrides = await getPayerRuleOverridesMap();
    const nowMs = now().getTime();
    const enriched = [];
    for (const item of queue.items || []) {
      const payerOverride = payerOverrides.get(normalizePayerKey(item.payer_name)) || null;
      // Live notes determinant when seed missed or notes text arrived later.
      let working = item;
      if (
        !item.metadata?.care_billing
        && (item.metadata?.lane === 'billing_notes_backlog'
          || /billing_notes|notes_queue/.test(String(item.claim_status || item.submission_status || ''))
          || String(item.source || '').includes('billing_notes'))
      ) {
        const noteText = [
          item.notes,
          ...(Array.isArray(item.metadata?.note_previews) ? item.metadata.note_previews : []),
        ].filter(Boolean).join('\n');
        if (noteText.trim()) {
          const careBilling = inferCareBillingFromNotes(noteText, item.metadata || {});
          working = {
            ...item,
            metadata: {
              ...(item.metadata || {}),
              care_billing: careBilling,
              birth_completed: Boolean(careBilling.birth_completed),
              billable_now: Boolean(careBilling.billable_now),
              billing_scenario: careBilling.scenario,
              lane: careBilling.scenario === 'transport_prenatal_claim'
                ? 'transport_prenatal'
                : (careBilling.billable_now ? 'unpaid_birth' : 'billing_notes_backlog'),
              global_cpt: careBilling.global_cpt,
              antepartum_cpt: careBilling.antepartum_cpt,
            },
          };
        }
      }
      let plan = buildStagePlan(working, payerOverride, now());
      if (!working.metadata?.next_due_at || !working.metadata?.billing_scenario) {
        plan = (await syncClaimStageClocks(working, payerOverrides)) || plan;
      }
      const statusText = String(working.claim_status || working.submission_status || '').toLowerCase();
      const alreadyFiled = plan.stage === 'filed_await_era'
        || plan.worker === 'await_era'
        || /filed_await|edi_submitted|claim.?submitted|awaiting_era/.test(statusText)
        || Boolean(working.metadata?.last_stage_event === 'proved_sent');

      // Founder: notes are the determinant. Bill completed episodes + transport prenatal.
      // Never invent charges; never bill active/current prenatal.
      const lane = String(working.metadata?.lane || plan.scenario || '').toLowerCase();
      const notesBillable = Boolean(working.metadata?.billable_now)
        || Boolean(working.metadata?.care_billing?.billable_now)
        || plan.scenario === 'transport_prenatal_claim';
      const isCompletedBirthLane = lane === 'unpaid_birth'
        || lane === 'transport_prenatal'
        || plan.scenario === 'unpaid_birth_file'
        || plan.scenario === 'transport_prenatal_claim'
        || /unbilled_birth|transport_prenatal/.test(statusText)
        || Boolean(working.metadata?.birth_completed)
        || notesBillable
        || Boolean(working.metadata?.billing_href && working.date_of_service && lane !== 'billing_notes_backlog');
      const isNotesOnly = lane === 'billing_notes_backlog'
        || plan.scenario === 'billing_notes_repair'
        || (/billing_notes/.test(statusText) && !notesBillable);
      const excludeCurrentClient = isNotesOnly && !isCompletedBirthLane
        && working.metadata?.care_billing?.reason === 'current_prenatal';

      let isFileNow = !alreadyFiled && !excludeCurrentClient && (
        FILE_NOW_SCENARIOS.has(plan.scenario) || FILE_NOW_WORKERS.has(plan.worker)
        || working.chase_lane === 'unpaid'
        || /unbilled|needs_billing|chart_linked|transport_prenatal/.test(statusText)
        || notesBillable
      );
      // Notes backlog: FILE NOW only when notes determinant says billable (birth / transport prenatal).
      if (isNotesOnly && !(working.metadata?.birth_completed || notesBillable)) isFileNow = false;
      if (working.metadata?.care_billing?.reason === 'current_prenatal') isFileNow = false;

      let isFollowUp = alreadyFiled || FOLLOW_UP_WORKERS.has(plan.worker) || plan.scenario === 'claim_status_followup'
        || plan.scenario === 'underpayment_chase' || plan.scenario === 'forever_ask_insurer'
        || plan.scenario === 'denial_timely_proof';
      if (alreadyFiled) isFileNow = false;

      if (mode === 'file_now' && !isFileNow) continue;
      if (mode === 'follow_up' && !isFollowUp) continue;

      const dueMs = new Date(plan.next_due_at).getTime();
      const clockDue = Number.isFinite(dueMs) ? dueMs <= nowMs : true;
      // Capture/file: always runnable. Follow-up: respect next_due_at.
      const due_now = isFileNow ? true : clockDue;
      if (dueOnly && !due_now) continue;

      enriched.push({
        claim_id: working.id,
        patient_name: working.patient_name,
        payer_name: working.payer_name,
        date_of_service: working.date_of_service,
        chase_lane: working.chase_lane,
        rescue_bucket: working.rescue_bucket,
        ...plan,
        file_now: isFileNow,
        follow_up: isFollowUp,
        care_billing: working.metadata?.care_billing || null,
        antepartum_cpt: working.metadata?.antepartum_cpt || null,
        global_cpt: working.metadata?.global_cpt || null,
        resolve_fail_count: Number(working.metadata?.resolve_fail_count || 0) || 0,
        next_action: isFileNow
          ? (plan.scenario === 'transport_prenatal_claim'
            ? `SYSTEM [${plan.scenario}/${plan.stage}/${plan.worker}]: FILE NOW antepartum (notes: transport/hospital global — prenatal still owed). Midwife does nothing.`
            : `SYSTEM [${plan.scenario}/${plan.stage}/${plan.worker}]: FILE NOW — clocks do not delay capture. Midwife does nothing.`)
          : `SYSTEM [${plan.scenario}/${plan.stage}/${plan.worker}]: follow-up due ${plan.clock_label}. Midwife does nothing.`,
      });
    }
    enriched.sort((a, b) => {
      if (Boolean(a.file_now) !== Boolean(b.file_now)) return a.file_now ? -1 : 1;
      const aLinked = Boolean(a.pregnancy_id || a.billing_href);
      const bLinked = Boolean(b.pregnancy_id || b.billing_href);
      if (aLinked !== bLinked) return aLinked ? -1 : 1;
      // Rotate past repeated resolve failures so the blast does not thrash the same two names.
      const aFail = Number(a.resolve_fail_count || 0) || 0;
      const bFail = Number(b.resolve_fail_count || 0) || 0;
      if (aFail !== bFail) return aFail - bFail;
      const ad = new Date(a.next_due_at).getTime();
      const bd = new Date(b.next_due_at).getTime();
      return ad - bd;
    });
    return {
      doctrine: 'file_as_fast_as_possible_clocks_are_followups_only',
      due_only: dueOnly,
      mode,
      summary: {
        due_now: enriched.length,
        file_now: enriched.filter((i) => i.file_now).length,
        follow_up_due: enriched.filter((i) => i.follow_up).length,
        queue_open: queue.summary?.total_open || 0,
      },
      scenarios: listBillingScenarios(),
      items: enriched.slice(0, Math.max(1, Math.min(Number(limit) || 20, 200))),
    };
  }

  async function getForeverChaseQueue({ limit = 200, tenantId = null } = {}) {
    const capped = Math.max(1, Math.min(Number(limit || 200), 500));
    const hasTenant = !(tenantId == null || tenantId === '');
    const tenantParam = hasTenant ? Number(tenantId) : null;
    const tenantSql = hasTenant ? ' AND COALESCE(tenant_id, 0) = COALESCE($1::bigint, 0)' : '';
    const countParams = hasTenant ? [tenantParam] : [];
    const listParams = hasTenant ? [tenantParam, capped] : [capped];
    const limitPlaceholder = hasTenant ? '$2' : '$1';
    const { rows: countRows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_open,
         COUNT(*) FILTER (WHERE COALESCE(paid_amount, 0) <= 0)::int AS unpaid,
         COUNT(*) FILTER (
           WHERE COALESCE(paid_amount, 0) > 0
             AND GREATEST(COALESCE(allowed_amount, 0) - COALESCE(patient_balance, 0) - COALESCE(paid_amount, 0), 0) >= 10
         )::int AS underpaid,
         COUNT(*) FILTER (WHERE rescue_bucket = 'forever_chase')::int AS forever_chase_bucket
       FROM clientcare_claims
       WHERE COALESCE(rescue_bucket, '') <> 'resolved'
         AND (
           (metadata->>'forever_chase') = 'true'
           OR rescue_bucket IN ('forever_chase', 'submit_now', 'correct_and_resubmit', 'payer_followup', 'proof_of_timely_filing', 'timely_filing_exception', 'likely_uncollectible')
           OR COALESCE(paid_amount, 0) <= 0
           OR GREATEST(COALESCE(allowed_amount, 0) - COALESCE(patient_balance, 0) - COALESCE(paid_amount, 0), 0) >= 10
         )${tenantSql}`,
      countParams
    );
    const { rows } = await pool.query(
      `SELECT
         id, tenant_id, patient_name, payer_name, claim_number, date_of_service, claim_status, submission_status,
         billed_amount, allowed_amount, paid_amount, patient_balance, insurance_balance,
         rescue_bucket, priority_score, source, notes, metadata, updated_at,
         GREATEST(COALESCE(allowed_amount, 0) - COALESCE(patient_balance, 0) - COALESCE(paid_amount, 0), 0)::numeric AS short_paid_amount
       FROM clientcare_claims
       WHERE COALESCE(rescue_bucket, '') <> 'resolved'
         AND (
           (metadata->>'forever_chase') = 'true'
           OR rescue_bucket IN ('forever_chase', 'submit_now', 'correct_and_resubmit', 'payer_followup', 'proof_of_timely_filing', 'timely_filing_exception', 'likely_uncollectible')
           OR COALESCE(paid_amount, 0) <= 0
           OR GREATEST(COALESCE(allowed_amount, 0) - COALESCE(patient_balance, 0) - COALESCE(paid_amount, 0), 0) >= 10
         )${tenantSql}
       ORDER BY
         CASE WHEN COALESCE(paid_amount, 0) <= 0 THEN 0 ELSE 1 END,
         date_of_service ASC NULLS LAST,
         priority_score DESC NULLS LAST
       LIMIT ${limitPlaceholder}`,
      listParams
    );

    const payerOverrides = await getPayerRuleOverridesMap();
    const items = rows.map((row) => {
      const shortPaid = money(row.short_paid_amount);
      const unpaid = money(row.paid_amount) <= 0;
      const midwife = row.metadata?.work_performed_by || 'The midwife';
      const mapped = mapClaimRow(row);
      const payerOverride = payerOverrides.get(normalizePayerKey(mapped.payer_name)) || null;
      const stage = buildStagePlan(mapped, payerOverride, now());
      return {
        ...mapped,
        short_paid_amount: Number(shortPaid.toFixed(2)),
        chase_lane: unpaid ? 'unpaid' : (shortPaid >= 10 ? 'underpaid' : 'open'),
        billing_scenario: stage.scenario,
        stage: stage.stage,
        stage_worker: stage.worker,
        next_due_at: stage.next_due_at,
        due_now: stage.due_now,
        pregnancy_id: stage.pregnancy_id,
        next_action: unpaid
          ? `SYSTEM [${stage.scenario}/${stage.stage}]: file global claim / chase until paid. Due ${stage.clock_label}. Midwife does nothing.`
          : (shortPaid >= 10
            ? `SYSTEM [${stage.scenario}/${stage.stage}]: underpaid — demand remaining allowed. Due ${stage.clock_label}. Midwife does nothing.`
            : `SYSTEM [${stage.scenario}/${stage.stage}]: follow up until written resolution. Due ${stage.clock_label}. Midwife does nothing.`),
        work_performed_by: midwife,
        evidence_for_payer: row.metadata?.evidence_message_for_payer
          || `${midwife} performed the midwifery work. Prior billing that claimed this was handled failed — compensate the provider.`,
      };
    });

    const counts = countRows[0] || {};
    return {
      doctrine: 'forever_chase_until_paid_or_written_denial',
      tenant_id: tenantParam,
      summary: {
        total_open: counts.total_open || 0,
        unpaid: counts.unpaid || 0,
        underpaid: counts.underpaid || 0,
        forever_chase_bucket: counts.forever_chase_bucket || 0,
        returned: items.length,
      },
      items,
    };
  }

  return {
    importClaims,
    importPaymentHistoryCsv,
    upsertClaim,
    getClaimById,
    reclassifyClaim,
    listClaims,
    listActions,
    updateAction,
    getDashboard,
    buildClaimPlan,
    getReimbursementIntelligence,
    getEraInsights,
    getPayerPlaybooks,
    listPayerRuleOverrides,
    savePayerRuleOverride,
    getUnderpaymentQueue,
    getAppealsQueue,
    buildAppealPacketPreview,
    queueAppealAction,
    queueUnderpaymentAction,
    seedForeverChaseFromInventory,
    getForeverChaseQueue,
    getDueChaseWork,
    reclassifyNotesClaimsFromStoredText,
    syncAllOpenStageClocks,
    advanceClaimStage,
    attachPregnancyLink,
    recordResolveFailure,
    listBillingScenarios: () => listBillingScenarios(),
    parseClaimsCsv,
    getImportTemplate: () => IMPORT_TEMPLATE_FIELDS,
  };
}
