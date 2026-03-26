/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-billing-service.js
 * Claim rescue queue, payer-window classification, and recovery action planning.
 */

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

function inferPayerType(name = '', explicit = null) {
  if (explicit) return String(explicit).toLowerCase();
  const payer = String(name || '').toLowerCase();
  if (/medicare/.test(payer)) return 'medicare';
  if (/medicaid|nevada check up/.test(payer)) return 'nevada_medicaid';
  if (/self[- ]?pay|cash/.test(payer)) return 'self_pay';
  if (payer) return 'commercial';
  return 'unknown';
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

function resolveTimelyRule(claim = {}) {
  const payerType = inferPayerType(claim.payer_name, claim.payer_type);
  const providerState = String(claim.provider_state || '').toUpperCase();
  const metadata = claim.metadata || {};

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

export function classifyClientCareClaim(claim = {}, now = new Date()) {
  const payerRule = resolveTimelyRule(claim);
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
    rescueBucket = 'likely_uncollectible';
    rescueConfidence = 0.7;
    recoveryProbability = 0.15;
    priorityScore += 10;
    actions.push(action('medicare_timely_review', 'normal', 'Review for proof of prior filing only', 'Pure Medicare timely-filing misses are usually not worth standard appeal effort.', ['original submission proof if any'])) ;
  } else if (!payerRule.filingWindowDays) {
    rescueBucket = 'payer_followup';
    rescueConfidence = 0.4;
    recoveryProbability = 0.4;
    priorityScore += 25;
    actions.push(action('verify_payer_rule', 'high', 'Verify payer timely-filing and appeal rules', 'Commercial or unknown payer needs contract or manual review before the next move.', ['payer policy', 'contract terms'])) ;
  } else if (deadline && now > deadline) {
    rescueBucket = 'timely_filing_exception';
    rescueConfidence = 0.5;
    recoveryProbability = 0.25;
    priorityScore += 15;
    actions.push(action('late_claim_review', 'normal', 'Review late-claim exception options', 'Claim appears outside baseline window; do not write it off until proof and payer rules are checked.', ['submission history', 'payer rule'])) ;
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

export function createClientCareBillingService({ pool, logger = console, now = () => new Date() }) {
  async function ensureClaimActions(claimId, actions = []) {
    await pool.query(`DELETE FROM clientcare_claim_actions WHERE claim_id=$1 AND status='open'`, [claimId]);
    const created = [];
    for (const item of actions) {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_claim_actions (claim_id, action_type, priority, summary, details, evidence_required)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [claimId, item.actionType, item.priority, item.summary, item.details, JSON.stringify(item.evidenceRequired || [])]
      );
      created.push(rows[0]);
    }
    return created;
  }

  async function upsertClaim(input = {}) {
    const claim = {
      external_claim_id: input.external_claim_id || null,
      patient_id: input.patient_id || null,
      patient_name: input.patient_name || null,
      payer_name: input.payer_name || 'Unknown',
      payer_type: input.payer_type || inferPayerType(input.payer_name, input.payer_type),
      provider_state: input.provider_state || null,
      member_id: input.member_id || null,
      claim_number: input.claim_number || null,
      account_number: input.account_number || null,
      date_of_service: input.date_of_service,
      service_end_date: input.service_end_date || null,
      original_submitted_at: input.original_submitted_at || null,
      latest_submitted_at: input.latest_submitted_at || input.original_submitted_at || null,
      claim_status: input.claim_status || 'imported',
      submission_status: input.submission_status || null,
      denial_code: input.denial_code || null,
      denial_reason: input.denial_reason || null,
      billed_amount: money(input.billed_amount),
      allowed_amount: money(input.allowed_amount),
      paid_amount: money(input.paid_amount),
      patient_balance: money(input.patient_balance),
      insurance_balance: money(input.insurance_balance),
      cpt_codes: normalizeArray(input.cpt_codes),
      icd_codes: normalizeArray(input.icd_codes),
      modifiers: normalizeArray(input.modifiers),
      source: input.source || 'manual_import',
      notes: input.notes || null,
      metadata: input.metadata || {},
    };
    const classification = classifyClientCareClaim(claim, now());

    let rows;
    if (claim.external_claim_id) {
      ({ rows } = await pool.query(
        `INSERT INTO clientcare_claims (
           external_claim_id, patient_id, patient_name, payer_name, payer_type, provider_state, member_id, claim_number, account_number,
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
         )
         ON CONFLICT (external_claim_id) DO UPDATE SET
           patient_id=EXCLUDED.patient_id,
           patient_name=EXCLUDED.patient_name,
           payer_name=EXCLUDED.payer_name,
           payer_type=EXCLUDED.payer_type,
           provider_state=EXCLUDED.provider_state,
           member_id=EXCLUDED.member_id,
           claim_number=EXCLUDED.claim_number,
           account_number=EXCLUDED.account_number,
           date_of_service=EXCLUDED.date_of_service,
           service_end_date=EXCLUDED.service_end_date,
           original_submitted_at=COALESCE(clientcare_claims.original_submitted_at, EXCLUDED.original_submitted_at),
           latest_submitted_at=EXCLUDED.latest_submitted_at,
           claim_status=EXCLUDED.claim_status,
           submission_status=EXCLUDED.submission_status,
           denial_code=EXCLUDED.denial_code,
           denial_reason=EXCLUDED.denial_reason,
           billed_amount=EXCLUDED.billed_amount,
           allowed_amount=EXCLUDED.allowed_amount,
           paid_amount=EXCLUDED.paid_amount,
           patient_balance=EXCLUDED.patient_balance,
           insurance_balance=EXCLUDED.insurance_balance,
           cpt_codes=EXCLUDED.cpt_codes,
           icd_codes=EXCLUDED.icd_codes,
           modifiers=EXCLUDED.modifiers,
           timely_filing_deadline=EXCLUDED.timely_filing_deadline,
           timely_filing_source=EXCLUDED.timely_filing_source,
           rescue_bucket=EXCLUDED.rescue_bucket,
           rescue_confidence=EXCLUDED.rescue_confidence,
           recovery_probability=EXCLUDED.recovery_probability,
           priority_score=EXCLUDED.priority_score,
           source=EXCLUDED.source,
           notes=EXCLUDED.notes,
           metadata=EXCLUDED.metadata,
           updated_at=NOW()
         RETURNING *`,
        [
          claim.external_claim_id, claim.patient_id, claim.patient_name, claim.payer_name, claim.payer_type, claim.provider_state, claim.member_id, claim.claim_number, claim.account_number,
          claim.date_of_service, claim.service_end_date, claim.original_submitted_at, claim.latest_submitted_at, claim.claim_status, claim.submission_status,
          claim.denial_code, claim.denial_reason, claim.billed_amount, claim.allowed_amount, claim.paid_amount, claim.patient_balance, claim.insurance_balance,
          JSON.stringify(claim.cpt_codes), JSON.stringify(claim.icd_codes), JSON.stringify(claim.modifiers), classification.timelyFilingDeadline, classification.timelyFilingSource,
          classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore, claim.source, claim.notes, JSON.stringify(claim.metadata),
        ]
      ));
    } else {
      ({ rows } = await pool.query(
        `INSERT INTO clientcare_claims (
           patient_id, patient_name, payer_name, payer_type, provider_state, member_id, claim_number, account_number,
           date_of_service, service_end_date, original_submitted_at, latest_submitted_at, claim_status, submission_status,
           denial_code, denial_reason, billed_amount, allowed_amount, paid_amount, patient_balance, insurance_balance,
           cpt_codes, icd_codes, modifiers, timely_filing_deadline, timely_filing_source, rescue_bucket, rescue_confidence,
           recovery_probability, priority_score, source, notes, metadata
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,$20,$21,
           $22,$23,$24,$25,$26,$27,$28,
           $29,$30,$31,$32,$33
         ) RETURNING *`,
        [
          claim.patient_id, claim.patient_name, claim.payer_name, claim.payer_type, claim.provider_state, claim.member_id, claim.claim_number, claim.account_number,
          claim.date_of_service, claim.service_end_date, claim.original_submitted_at, claim.latest_submitted_at, claim.claim_status, claim.submission_status,
          claim.denial_code, claim.denial_reason, claim.billed_amount, claim.allowed_amount, claim.paid_amount, claim.patient_balance, claim.insurance_balance,
          JSON.stringify(claim.cpt_codes), JSON.stringify(claim.icd_codes), JSON.stringify(claim.modifiers), classification.timelyFilingDeadline, classification.timelyFilingSource,
          classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore, claim.source, claim.notes, JSON.stringify(claim.metadata),
        ]
      ));
    }

    const saved = mapClaimRow(rows[0]);
    await ensureClaimActions(saved.id, classification.actions);
    return { claim: saved, classification };
  }

  async function importClaims(claims = [], { source = 'manual_import' } = {}) {
    const results = [];
    for (const item of claims) {
      try {
        results.push(await upsertClaim({ ...item, source: item.source || source }));
      } catch (error) {
        logger.warn?.({ err: error.message, claim: item.external_claim_id || item.claim_number || item.patient_name }, '[CLIENTCARE-BILLING] import failed');
        results.push({ error: error.message, claim: item });
      }
    }
    return results;
  }

  async function getClaimById(claimId) {
    const { rows } = await pool.query(`SELECT * FROM clientcare_claims WHERE id=$1`, [claimId]);
    return mapClaimRow(rows[0] || null);
  }

  async function reclassifyClaim(claimId) {
    const claim = await getClaimById(claimId);
    if (!claim) return null;
    const classification = classifyClientCareClaim(claim, now());
    const { rows } = await pool.query(
      `UPDATE clientcare_claims
       SET payer_type=$2, timely_filing_deadline=$3, timely_filing_source=$4, rescue_bucket=$5,
           rescue_confidence=$6, recovery_probability=$7, priority_score=$8, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [claimId, classification.payerType, classification.timelyFilingDeadline, classification.timelyFilingSource, classification.rescueBucket, classification.rescueConfidence, classification.recoveryProbability, classification.priorityScore]
    );
    await ensureClaimActions(claimId, classification.actions);
    return { claim: mapClaimRow(rows[0]), classification };
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
         COUNT(*) FILTER (WHERE rescue_bucket='likely_uncollectible')::int AS likely_uncollectible_count
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
    const classification = classifyClientCareClaim(claim, now());
    const actions = await listActions(claimId);
    return { claim, classification, actions };
  }

  return {
    importClaims,
    upsertClaim,
    getClaimById,
    reclassifyClaim,
    listClaims,
    listActions,
    updateAction,
    getDashboard,
    buildClaimPlan,
    parseClaimsCsv,
    getImportTemplate: () => IMPORT_TEMPLATE_FIELDS,
  };
}
