/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-ops-service.js
 * Actionable operations layer for ClientCare billing recovery.
 */

function normalizeIntent(text = '') {
  return String(text || '').toLowerCase().trim();
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function ratio(a, b) {
  const numerator = Number(a || 0);
  const denominator = Number(b || 0);
  if (!denominator) return null;
  return Number((numerator / denominator).toFixed(4));
}

function bucketByAge(days) {
  if (days == null) return 'unknown';
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

function summarizeTopActions(actions = [], limit = 5) {
  return actions.slice(0, limit).map((item) => ({
    id: item.id,
    patient_name: item.patient_name,
    payer_name: item.payer_name,
    summary: item.summary,
    priority: item.priority,
    status: item.status,
  }));
}

function isMissingRelation(error) {
  return /does not exist|relation .* does not exist/i.test(String(error?.message || ''));
}

function findWorkflow(workflowId, summary = {}) {
  return (summary.workflowPlaybooks || []).find((item) => item.id === workflowId) || null;
}

function extractClaimId(text = '') {
  const match = String(text || '').match(/\bclaim\s*#?\s*(\d+)\b/i) || String(text || '').match(/\b(\d{2,})\b/);
  return match ? match[1] : null;
}

function normalizeRepairUpdates(input = {}) {
  const updates = {};
  if (input.client_billing_status) updates.client_billing_status = String(input.client_billing_status).trim();
  if (input.bill_provider_type) updates.bill_provider_type = String(input.bill_provider_type).trim();
  if (input.payment_status) updates.payment_status = String(input.payment_status).trim().toLowerCase();
  if (input.insurance_name) updates.insurance_name = String(input.insurance_name).trim();
  if (input.member_id) updates.member_id = String(input.member_id).trim();
  if (input.subscriber_name) updates.subscriber_name = String(input.subscriber_name).trim();
  if (input.payor_id) updates.payor_id = String(input.payor_id).trim();
  if (input.insurance_priority) updates.insurance_priority = String(input.insurance_priority).trim();
  return updates;
}

function buildInsuranceDecision({ coverageActive, inNetwork, authRequired, memberId, payerName, billedAmount, payerStats, deductibleRemaining, copay, coinsurance }) {
  const reasons = [];
  const missing = [];

  if (!payerName) missing.push('payer name');
  if (!memberId) missing.push('member ID');
  if (coverageActive == null) missing.push('coverage status');
  if (inNetwork == null) missing.push('network status');

  let decision = 'review';
  let confidence = 'low';

  if (coverageActive === false) {
    decision = 'do_not_schedule';
    confidence = 'high';
    reasons.push('Coverage appears inactive.');
  } else if (inNetwork === false) {
    decision = 'review';
    confidence = 'medium';
    reasons.push('Provider may be out of network.');
  } else if (authRequired === true) {
    decision = 'review';
    confidence = 'medium';
    reasons.push('Authorization is required before clean billing.');
  } else if (!missing.length) {
    decision = 'take_client';
    confidence = payerStats?.paid_claims >= 10 ? 'high' : 'medium';
    reasons.push('Core intake fields are present and no hard blocker is visible.');
  } else {
    reasons.push('Missing intake details prevent a clean take/review decision.');
  }

  const billed = money(billedAmount);
  const payerAllowedRatio = payerStats && money(payerStats.avg_billed) > 0
    ? ratio(payerStats.avg_allowed, payerStats.avg_billed)
    : null;
  const paidToAllowed = payerStats ? ratio(payerStats.avg_paid, payerStats.avg_allowed) : null;
  const estimatedAllowed = billed && payerAllowedRatio != null ? Number((billed * payerAllowedRatio).toFixed(2)) : null;
  const estimatedInsurancePayment = estimatedAllowed && paidToAllowed != null
    ? Number((estimatedAllowed * paidToAllowed).toFixed(2))
    : null;

  let estimatedPatientResponsibility = 0;
  estimatedPatientResponsibility += money(copay);
  estimatedPatientResponsibility += money(deductibleRemaining);
  if (estimatedAllowed && Number(coinsurance || 0) > 0) {
    estimatedPatientResponsibility += Number((estimatedAllowed * (Number(coinsurance) / 100)).toFixed(2));
  }
  if (!estimatedPatientResponsibility) estimatedPatientResponsibility = null;

  return {
    decision,
    confidence,
    reasons,
    missing,
    estimated_allowed: estimatedAllowed,
    estimated_insurance_payment: estimatedInsurancePayment,
    estimated_patient_responsibility: estimatedPatientResponsibility,
    estimation_basis: payerStats?.paid_claims
      ? `Based on ${payerStats.paid_claims} paid claims for ${payerStats.payer_name}.`
      : 'No payer-specific payment history yet; estimate is low-confidence.',
  };
}

const DEFAULT_PATIENT_AR_POLICY = {
  scope_key: 'default',
  reminder_day_1: 15,
  reminder_day_2: 30,
  provider_escalation_day: 45,
  final_notice_day: 60,
  payment_plan_grace_days: 7,
  autopay_retry_days: 3,
  allow_payment_plans: true,
  allow_hardship_review: true,
  allow_settlements: false,
  allow_referral_credit: false,
  notes: 'Provider-directed only. Do not turn this into third-party debt collection without legal review.',
  source: 'default',
};

function normalizePatientArPolicy(input = {}) {
  return {
    reminder_day_1: Math.max(1, Number(input.reminder_day_1 ?? DEFAULT_PATIENT_AR_POLICY.reminder_day_1)),
    reminder_day_2: Math.max(1, Number(input.reminder_day_2 ?? DEFAULT_PATIENT_AR_POLICY.reminder_day_2)),
    provider_escalation_day: Math.max(1, Number(input.provider_escalation_day ?? DEFAULT_PATIENT_AR_POLICY.provider_escalation_day)),
    final_notice_day: Math.max(1, Number(input.final_notice_day ?? DEFAULT_PATIENT_AR_POLICY.final_notice_day)),
    payment_plan_grace_days: Math.max(1, Number(input.payment_plan_grace_days ?? DEFAULT_PATIENT_AR_POLICY.payment_plan_grace_days)),
    autopay_retry_days: Math.max(1, Number(input.autopay_retry_days ?? DEFAULT_PATIENT_AR_POLICY.autopay_retry_days)),
    allow_payment_plans: input.allow_payment_plans !== undefined ? Boolean(input.allow_payment_plans) : DEFAULT_PATIENT_AR_POLICY.allow_payment_plans,
    allow_hardship_review: input.allow_hardship_review !== undefined ? Boolean(input.allow_hardship_review) : DEFAULT_PATIENT_AR_POLICY.allow_hardship_review,
    allow_settlements: input.allow_settlements !== undefined ? Boolean(input.allow_settlements) : DEFAULT_PATIENT_AR_POLICY.allow_settlements,
    allow_referral_credit: input.allow_referral_credit !== undefined ? Boolean(input.allow_referral_credit) : DEFAULT_PATIENT_AR_POLICY.allow_referral_credit,
    notes: String(input.notes ?? DEFAULT_PATIENT_AR_POLICY.notes ?? '').trim(),
  };
}

function derivePatientArStage(ageDays, policy) {
  if (ageDays >= policy.final_notice_day) return { stage: 'final_notice', next_action: 'Final provider-approved notice or decision review', priority: 'high' };
  if (ageDays >= policy.provider_escalation_day) return { stage: 'provider_escalation', next_action: 'Escalate to provider for direct decision on outreach or payment-plan offer', priority: 'high' };
  if (ageDays >= policy.reminder_day_2) return { stage: 'reminder_2', next_action: 'Second reminder and payment-plan check', priority: 'normal' };
  if (ageDays >= policy.reminder_day_1) return { stage: 'reminder_1', next_action: 'First reminder and courtesy balance review', priority: 'normal' };
  return { stage: 'current', next_action: 'Monitor; no outreach yet', priority: 'low' };
}

export function createClientCareOpsService({ pool, billingService, browserService, syncService, callCouncilMember = null, logger = console }) {
  async function getPatientArPolicy() {
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_patient_ar_policy WHERE scope_key='default' LIMIT 1`);
      if (!rows[0]) return { ...DEFAULT_PATIENT_AR_POLICY };
      return { ...DEFAULT_PATIENT_AR_POLICY, ...rows[0], source: 'db' };
    } catch (error) {
      if (isMissingRelation(error)) return { ...DEFAULT_PATIENT_AR_POLICY };
      throw error;
    }
  }

  async function savePatientArPolicy(input = {}, { updatedBy = 'overlay' } = {}) {
    const policy = normalizePatientArPolicy(input);
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_patient_ar_policy (
          scope_key, reminder_day_1, reminder_day_2, provider_escalation_day, final_notice_day,
          payment_plan_grace_days, autopay_retry_days, allow_payment_plans, allow_hardship_review,
          allow_settlements, allow_referral_credit, notes, updated_by
        ) VALUES (
          'default',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )
        ON CONFLICT (scope_key) DO UPDATE SET
          reminder_day_1=EXCLUDED.reminder_day_1,
          reminder_day_2=EXCLUDED.reminder_day_2,
          provider_escalation_day=EXCLUDED.provider_escalation_day,
          final_notice_day=EXCLUDED.final_notice_day,
          payment_plan_grace_days=EXCLUDED.payment_plan_grace_days,
          autopay_retry_days=EXCLUDED.autopay_retry_days,
          allow_payment_plans=EXCLUDED.allow_payment_plans,
          allow_hardship_review=EXCLUDED.allow_hardship_review,
          allow_settlements=EXCLUDED.allow_settlements,
          allow_referral_credit=EXCLUDED.allow_referral_credit,
          notes=EXCLUDED.notes,
          updated_by=EXCLUDED.updated_by,
          updated_at=NOW()
        RETURNING *`,
        [
          policy.reminder_day_1,
          policy.reminder_day_2,
          policy.provider_escalation_day,
          policy.final_notice_day,
          policy.payment_plan_grace_days,
          policy.autopay_retry_days,
          policy.allow_payment_plans,
          policy.allow_hardship_review,
          policy.allow_settlements,
          policy.allow_referral_credit,
          policy.notes,
          updatedBy,
        ]
      );
      return { ...DEFAULT_PATIENT_AR_POLICY, ...rows[0], source: 'db' };
    } catch (error) {
      if (isMissingRelation(error)) {
        return { ...DEFAULT_PATIENT_AR_POLICY, ...policy, source: 'fallback_unpersisted', updated_by: updatedBy };
      }
      throw error;
    }
  }

  async function getPatientArEscalationQueue({ limit = 50 } = {}) {
    const policy = await getPatientArPolicy();
    const { rows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         date_of_service,
         COALESCE(patient_balance, 0)::numeric AS patient_balance,
         (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
       FROM clientcare_claims
       WHERE COALESCE(patient_balance, 0) > 0
       ORDER BY patient_balance DESC, age_days DESC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 50), 250))]
    );

    const items = rows.map((row) => {
      const stage = derivePatientArStage(Number(row.age_days || 0), policy);
      return {
        ...row,
        age_bucket: bucketByAge(row.age_days),
        stage: stage.stage,
        next_action: stage.next_action,
        priority: stage.priority,
        provider_approval_required: ['provider_escalation', 'final_notice'].includes(stage.stage),
      };
    });

    return {
      policy,
      summary: {
        total_accounts: items.length,
        total_balance: Number(items.reduce((sum, item) => sum + money(item.patient_balance), 0).toFixed(2)),
        provider_escalation_count: items.filter((item) => item.stage === 'provider_escalation').length,
        final_notice_count: items.filter((item) => item.stage === 'final_notice').length,
      },
      items,
    };
  }

  async function queuePatientArAction(claimId, { owner = 'overlay', actionType = 'patient_ar_followup' } = {}) {
    const policy = await getPatientArPolicy();
    const { rows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         date_of_service,
         COALESCE(patient_balance, 0)::numeric AS patient_balance,
         (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
       FROM clientcare_claims
       WHERE id = $1`,
      [claimId]
    );
    const claim = rows[0];
    if (!claim) return null;
    const stage = derivePatientArStage(Number(claim.age_days || 0), policy);
    const { rows: actionRows } = await pool.query(
      `INSERT INTO clientcare_claim_actions (claim_id, action_type, priority, owner, summary, details, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        claimId,
        actionType,
        stage.priority === 'high' ? 'high' : 'normal',
        owner,
        `Patient AR ${stage.stage.replace(/_/g, ' ')}`,
        [
          `Patient: ${claim.patient_name || 'Unknown patient'}`,
          `Balance: $${money(claim.patient_balance).toFixed(2)}`,
          `Age days: ${claim.age_days}`,
          `Next action: ${stage.next_action}`,
          stage.provider_approval_required ? 'Provider approval is required before outreach.' : 'Provider-directed outreach is allowed within current policy.',
        ].join('\n'),
        JSON.stringify({
          patient_balance: money(claim.patient_balance),
          age_days: Number(claim.age_days || 0),
          stage: stage.stage,
          provider_approval_required: stage.provider_approval_required,
        }),
      ]
    );
    return { policy, claim, stage, action: actionRows[0] };
  }

  async function getPatientArSummary() {
    const policy = await getPatientArPolicy();
    const { rows: [summary] } = await pool.query(`
      WITH aged AS (
        SELECT
          id,
          patient_name,
          payer_name,
          COALESCE(patient_balance, 0)::numeric AS patient_balance,
          (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
        FROM clientcare_claims
        WHERE COALESCE(patient_balance, 0) > 0
      )
      SELECT
        COUNT(*)::int AS total_accounts,
        COALESCE(SUM(patient_balance), 0)::numeric AS total_balance,
        COUNT(*) FILTER (WHERE age_days <= 30)::int AS current_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days <= 30), 0)::numeric AS current_balance,
        COUNT(*) FILTER (WHERE age_days BETWEEN 31 AND 60)::int AS balance_31_60_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days BETWEEN 31 AND 60), 0)::numeric AS balance_31_60,
        COUNT(*) FILTER (WHERE age_days BETWEEN 61 AND 90)::int AS balance_61_90_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days BETWEEN 61 AND 90), 0)::numeric AS balance_61_90,
        COUNT(*) FILTER (WHERE age_days > 90)::int AS balance_90_plus_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days > 90), 0)::numeric AS balance_90_plus
      FROM aged
    `);

    const { rows: topAccounts } = await pool.query(`
      SELECT
        id,
        patient_name,
        payer_name,
        COALESCE(patient_balance, 0)::numeric AS patient_balance,
        (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
      FROM clientcare_claims
      WHERE COALESCE(patient_balance, 0) > 0
      ORDER BY patient_balance DESC, age_days DESC
      LIMIT 12
    `);

    const recommendations = [];
    if (Number(summary?.balance_90_plus || 0) > 0) {
      recommendations.push('Work 90+ day patient balances with provider-approved outreach and payment-plan offers first.');
    }
    if (Number(summary?.balance_31_60 || 0) > 0) {
      recommendations.push('Set a reminder cadence before 31-60 day balances become hard collections work.');
    }
    if (Number(summary?.total_balance || 0) === 0) {
      recommendations.push('No patient AR imported yet. Import statements or patient-balance exports to monitor adherence.');
    }

    return {
      policy,
      summary: summary || {},
      top_accounts: topAccounts.map((row) => ({
        ...row,
        age_bucket: bucketByAge(row.age_days),
      })),
      recommendations,
    };
  }

  async function getOptimizationChecklist() {
    const readiness = browserService.getReadiness();
    const dashboard = await billingService.getDashboard();
    const reconciliation = await syncService.buildReconciliationSummary({ limit: 500 });
    const patientAr = await getPatientArSummary();
    const items = [
      {
        id: 'eft-era',
        title: 'Enable EFT and ERA everywhere possible',
        why: 'Electronic remittance and payment posting reduces manual lag and missed payment visibility.',
        status: 'needs_review',
      },
      {
        id: 'claim-aging-workqueue',
        title: 'Maintain a daily claim aging queue',
        why: 'Unworked aging claims turn into timely-filing losses.',
        status: dashboard.summary?.total_claims ? 'active' : 'needs_setup',
      },
      {
        id: 'rejection-denial-split',
        title: 'Separate rejected claims from denied claims',
        why: 'Rejected claims are usually the fastest recoverable dollars and should not sit in the same queue as denials.',
        status: reconciliation.summary?.rejected ? 'active' : 'needs_setup',
      },
      {
        id: 'timely-filing-proof',
        title: 'Retain proof of timely filing',
        why: 'Clearinghouse acceptance and submission timestamps are critical to rescue borderline claims.',
        status: 'needs_review',
      },
      {
        id: 'payer-matrix',
        title: 'Track payer-specific filing and appeal rules',
        why: 'Commercial plans do not share one filing window; guessing here causes avoidable losses.',
        status: 'needs_setup',
      },
      {
        id: 'auth-eligibility-check',
        title: 'Confirm authorization and eligibility before submission where required',
        why: 'Missing auth and eligibility mismatches drive preventable denials.',
        status: 'needs_review',
      },
      {
        id: 'browser-access',
        title: 'Credential-backed ClientCare access',
        why: 'Browser discovery lets the system inspect real billing pages even before exports/API are available.',
        status: readiness.ready ? 'active' : 'blocked',
      },
      {
        id: 'patient-balance-policy',
        title: 'Review patient balance and financial agreement policy',
        why: 'Do not transfer insurance balances to patients without payer-contract and consent review.',
        status: Number(patientAr.summary?.total_accounts || 0) > 0 ? 'active' : 'needs_setup',
      },
    ];
    return {
      readiness,
      dashboard: dashboard.summary,
      reconciliation: reconciliation.summary,
      patient_ar: patientAr.summary,
      checklist: items,
    };
  }

  async function listCapabilityRequests({ status = null, limit = 100 } = {}) {
    const values = [];
    const where = [];
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    values.push(Math.max(1, Math.min(Number(limit || 100), 250)));
    try {
      const { rows } = await pool.query(
        `SELECT * FROM clientcare_capability_requests ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, created_at DESC
         LIMIT $${values.length}`,
        values,
      );
      return rows;
    } catch (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
  }

  async function createCapabilityRequest(requestText, { requestedBy = 'sherry_console', priority = 'normal', normalizedIntent = null, metadata = {} } = {}) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_capability_requests (request_text, normalized_intent, priority, requested_by, metadata)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         RETURNING *`,
        [requestText, normalizedIntent, priority, requestedBy, JSON.stringify(metadata || {})],
      );
      return rows[0];
    } catch (error) {
      if (isMissingRelation(error)) {
        return {
          id: null,
          request_text: requestText,
          normalized_intent: normalizedIntent,
          priority,
          requested_by: requestedBy,
          metadata,
          status: 'queued_unpersisted',
        };
      }
      throw error;
    }
  }

  async function updateCapabilityRequest(id, patch = {}) {
    const fields = [];
    const values = [];
    if (patch.status !== undefined) {
      values.push(String(patch.status));
      fields.push(`status = $${values.length}`);
    }
    if (patch.priority !== undefined) {
      values.push(String(patch.priority));
      fields.push(`priority = $${values.length}`);
    }
    if (patch.implementation_notes !== undefined) {
      values.push(String(patch.implementation_notes || ''));
      fields.push(`implementation_notes = $${values.length}`);
    }
    if (patch.metadata !== undefined) {
      values.push(JSON.stringify(patch.metadata || {}));
      fields.push(`metadata = $${values.length}::jsonb`);
    }
    if (!fields.length) return null;
    values.push(id);
    try {
      const { rows } = await pool.query(
        `UPDATE clientcare_capability_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] || null;
    } catch (error) {
      if (isMissingRelation(error)) return null;
      throw error;
    }
  }

  async function getInsuranceVerificationPreview(input = {}) {
    const intelligence = await billingService.getReimbursementIntelligence();
    const payerName = String(input.payer_name || '').trim();
    const payerStats = (intelligence.payers || []).find((row) => String(row.payer_name || '').toLowerCase() === payerName.toLowerCase())
      || (intelligence.payers || []).find((row) => String(row.payer_name || '').toLowerCase().includes(payerName.toLowerCase()) || payerName.toLowerCase().includes(String(row.payer_name || '').toLowerCase()));

    const coverageActive = input.coverage_active === true ? true : input.coverage_active === false ? false : null;
    const inNetwork = input.in_network === true ? true : input.in_network === false ? false : null;
    const authRequired = input.auth_required === true ? true : input.auth_required === false ? false : null;

    const preview = buildInsuranceDecision({
      coverageActive,
      inNetwork,
      authRequired,
      memberId: input.member_id,
      payerName,
      billedAmount: input.billed_amount,
      payerStats,
      deductibleRemaining: input.deductible_remaining,
      copay: input.copay,
      coinsurance: input.coinsurance_pct,
    });

    return {
      ...preview,
      payer_history: payerStats ? {
        payer_name: payerStats.payer_name,
        paid_claims: Number(payerStats.paid_claims || 0),
        avg_paid: money(payerStats.avg_paid),
        avg_allowed: money(payerStats.avg_allowed),
        unpaid_balance: money(payerStats.unpaid_balance),
      } : null,
      required_fields: ['payer_name', 'member_id', 'coverage_active', 'in_network', 'auth_required'],
    };
  }

  async function buildOperationsOverview() {
    const [checklist, patientAr, capabilityRequests] = await Promise.all([
      getOptimizationChecklist(),
      getPatientArSummary(),
      listCapabilityRequests({ status: 'queued', limit: 25 }),
    ]);

    return {
      checklist,
      patient_ar: patientAr,
      insurance_intake_rule: {
        rule: 'Verify coverage, network, authorization, and member identifiers before accepting a billable insurance client.',
        target: 'Move to 90%+ accurate payout/date forecasting after paid-claim and ERA history is imported.',
        required_fields: ['payer_name', 'member_id', 'coverage_active', 'in_network', 'auth_required', 'billed_amount'],
        note: 'Exact reimbursement is not assumed from eligibility alone. Payment history tightens the estimate over time.',
      },
      open_capability_requests: capabilityRequests,
    };
  }

  async function repairAccount({ billingHref, account = null, updates = {}, dryRun = true, requestedBy = 'operations_assistant' } = {}) {
    const normalizedUpdates = normalizeRepairUpdates(updates);
    const result = await browserService.repairBillingAccount({
      billingHref,
      account,
      updates: normalizedUpdates,
      dryRun,
      includeScreenshots: !dryRun,
    });

    return {
      ...result,
      requested_by: requestedBy,
      updates: normalizedUpdates,
      reply: result.ok
        ? dryRun
          ? 'Repair preview prepared. Review the planned field changes before applying them.'
          : 'Repair applied in ClientCare. Review the post-save account summary and screenshot.'
        : `Repair failed: ${result.error || 'unknown error'}`,
    };
  }

  async function runWorkflow(workflowId, { requestedBy = 'operations_assistant' } = {}) {
    const backlog = await browserService.buildBacklogSummary({ maxPages: 12, pageTimeoutMs: 12000, accountLimit: 200 });
    const workflow = findWorkflow(workflowId, backlog.summary || {});
    if (!workflow) {
      return {
        ok: false,
        error: 'Workflow not found',
      };
    }

    return {
      ok: true,
      workflow: {
        id: workflow.id,
        title: workflow.title,
        count: workflow.count,
        steps: workflow.steps || [],
        accounts: workflow.accounts || [],
      },
      reply: `Loaded the ${workflow.title} workflow with ${workflow.count} account(s). Work the listed steps in order and use the account board for detail drill-down.`,
      suggested_actions: workflow.steps || [],
      requested_by: requestedBy,
    };
  }

  async function ask(message, { requestedBy = 'sherry_console' } = {}) {
    const text = normalizeIntent(message);

    if (!text) {
      return { ok: false, error: 'Message required' };
    }

    if (/what should i do first|highest priority|top priority|what do i do next/.test(text)) {
      const actions = await billingService.listActions();
      return {
        ok: true,
        type: 'action_list',
        reply: 'These are the highest-priority billing actions right now.',
        data: summarizeTopActions(actions),
        suggested_actions: summarizeTopActions(actions).map((item) => item.summary),
      };
    }

    if (/patient balance|payment plan|past due|collections|self pay|cash pay/.test(text)) {
      const patientAr = await getPatientArSummary();
      return {
        ok: true,
        type: 'patient_ar',
        reply: 'Here is the current patient AR summary and where payment-plan or past-due work should focus first.',
        data: patientAr,
        suggested_actions: patientAr.recommendations,
      };
    }

    if (/patient ar policy|patient ar rules|reminder cadence|provider escalation day|hardship policy|settlement policy/.test(text)) {
      const policy = await getPatientArPolicy();
      const queue = await getPatientArEscalationQueue({ limit: 25 });
      return {
        ok: true,
        type: 'patient_ar_policy',
        reply: 'Here is the current patient AR policy and escalation queue.',
        data: { policy, queue },
        suggested_actions: [
          'Adjust reminder and escalation days in the overlay if the provider wants a different cadence.',
          'Queue provider-directed follow-up only after reviewing the current stage.',
        ],
      };
    }

    if (/underpayment|short pay|short-paid|paid less than expected/.test(text)) {
      if (/queue|follow up|follow-up|work|open action/.test(text)) {
        const claimId = extractClaimId(text);
        if (claimId) {
          const result = await billingService.queueUnderpaymentAction(claimId, { owner: requestedBy });
          if (result?.action) {
            return {
              ok: true,
              type: 'underpayment_action',
              reply: `Queued underpayment review for claim ${claimId}.`,
              data: result,
              suggested_actions: ['Open the action queue and review the evidence checklist.', 'Compare the ERA/EOB against expected patient responsibility before payer escalation.'],
            };
          }
        }
      }
      const underpayments = await billingService.getUnderpaymentQueue({ limit: 50 });
      return {
        ok: true,
        type: 'underpayments',
        reply: 'Here is the current underpayment queue based on allowed amount, patient responsibility, and insurer payment variance.',
        data: underpayments,
        suggested_actions: underpayments.items?.slice(0, 5).map((item) => item.next_action) || [],
      };
    }

    if (/appeal|appeals|denial queue|denied claims/.test(text)) {
      if (/queue|follow up|follow-up|packet|work|open action/.test(text)) {
        const claimId = extractClaimId(text);
        if (claimId) {
          const result = await billingService.queueAppealAction(claimId, {
            owner: requestedBy,
            actionType: /packet/.test(text) ? 'appeal_packet' : 'appeal_followup',
          });
          if (result?.action) {
            return {
              ok: true,
              type: 'appeal_action',
              reply: `Queued ${/packet/.test(text) ? 'appeal packet prep' : 'appeal follow-up'} for claim ${claimId}.`,
              data: result,
              suggested_actions: ['Open the action queue and packet preview.', 'Validate the payer path and evidence list before sending.'],
            };
          }
        }
      }
      const appeals = await billingService.getAppealsQueue({ limit: 50 });
      return {
        ok: true,
        type: 'appeals',
        reply: 'Here is the current appeals and denial queue, grouped by the likely recovery playbook.',
        data: appeals,
        suggested_actions: appeals.items?.slice(0, 5).map((item) => `${item.patient_name || 'Claim'}: ${item.playbook?.title || 'Manual review'}`) || [],
      };
    }

    if (/payer playbook|payer rules|commercial rules|payer-specific/.test(text)) {
      const playbooks = await billingService.getPayerPlaybooks({ limit: 25 });
      return {
        ok: true,
        type: 'payer_playbooks',
        reply: 'Here are the current payer-specific playbooks derived from imported denial and payment history.',
        data: playbooks,
        suggested_actions: playbooks.items?.slice(0, 5).map((item) => `${item.payer_name}: ${item.recommendations?.[0] || 'Review payer history'}`) || [],
      };
    }

    if (/era insight|remit insight|carc|rarc|835 insight|remittance pattern/.test(text)) {
      const insights = await billingService.getEraInsights({ limit: 25 });
      return {
        ok: true,
        type: 'era_insights',
        reply: 'Here are the current ERA/remit code patterns and payment-method signals from imported history.',
        data: insights,
        suggested_actions: [
          'Review the top CARC and RARC codes first.',
          'Use those patterns to refine payer playbooks and appeal packets.',
        ],
      };
    }

    if (/era|remit|835|paid claims import|payment history import/.test(text)) {
      return {
        ok: true,
        type: 'payment_history_import',
        reply: 'Use the payment-history import in Tools to load paid claims, ERA, or remit CSV. That is the next step to tighten payout and collection-date forecasts.',
        suggested_actions: [
          'Export paid claims, ERA, or remit CSV from ClientCare or the clearinghouse.',
          'Paste it into Import Payment History.',
          'Reload reimbursement intelligence and underpayment queue.',
        ],
      };
    }

    if (/verify insurance|benefits|eligibility|can we take this client/.test(text)) {
      return {
        ok: true,
        type: 'insurance_verification',
        reply: 'Use the insurance verification panel to check coverage, network, authorization, and estimated reimbursement before accepting the client. The endpoint is ready even if payer history is still thin.',
        suggested_actions: [
          'Collect payer name, member ID, coverage status, network status, authorization requirement, and billed amount.',
          'Run insurance verification preview.',
          'Only move forward automatically when no hard blocker is present.',
        ],
      };
    }

    if (/readiness|are we ready|login info|credentials/.test(text)) {
      const readiness = browserService.getReadiness();
      return {
        ok: true,
        type: 'readiness',
        reply: readiness.ready ? 'ClientCare browser automation is configured and ready to test.' : 'ClientCare browser automation is not fully configured yet.',
        data: readiness,
      };
    }

    if (/login test|test login/.test(text)) {
      const result = await browserService.login({ dryRun: false });
      await result.session.close().catch(() => {});
      return {
        ok: true,
        type: 'browser_login_test',
        reply: 'ClientCare login test completed.',
        data: { page: result.page, screenshots: result.screenshots, loginSelectors: result.loginSelectors },
      };
    }

    if (/discover|inspect clientcare|look through clientcare|find billing pages/.test(text)) {
      const result = await browserService.discoverBillingSurface();
      return {
        ok: true,
        type: 'browser_discovery',
        reply: 'ClientCare billing-surface discovery completed.',
        data: result,
      };
    }

    if (/extract claims|pull claims|import claims from clientcare/.test(text)) {
      const result = await browserService.extractClaimTables({ importIntoQueue: /import/.test(text) });
      return {
        ok: true,
        type: 'browser_extract',
        reply: /import/.test(text) ? 'ClientCare claim extraction and import completed.' : 'ClientCare claim extraction preview completed.',
        data: result,
      };
    }

    if (/optimi[sz]e|configuration|configure clientcare|best setup|set it up right/.test(text)) {
      const checklist = await getOptimizationChecklist();
      return {
        ok: true,
        type: 'optimization_checklist',
        reply: 'Here is the current optimization checklist for ClientCare billing and rescue operations.',
        data: checklist,
      };
    }

    if (/reconciliation|what has not been billed|what is unpaid|what is missing/.test(text)) {
      const reconciliation = await syncService.buildReconciliationSummary({ limit: 500 });
      return {
        ok: true,
        type: 'reconciliation',
        reply: 'Here is the current reconciliation summary of billed vs unpaid vs missing submission states.',
        data: reconciliation,
      };
    }

    if (/workflow|playbook|run insurance setup|run billing setup|run client match/.test(text)) {
      const workflowId = text.includes('client match')
        ? 'repair-client-match'
        : text.includes('billing setup')
          ? 'complete-billing-setup'
          : text.includes('insurer')
            ? 'enter-insurer'
            : 'verify-effective-dates';
      const result = await runWorkflow(workflowId, { requestedBy });
      return {
        ok: true,
        type: 'workflow',
        reply: result.reply,
        data: result.workflow,
        suggested_actions: result.suggested_actions,
      };
    }

    if (/repair account|fix account|apply repair|preview repair|set billing status|set provider type|payer order|insurance priority|member id|subscriber|payor id|enter insurer/.test(text)) {
      return {
        ok: true,
        type: 'repair_guidance',
        reply: 'Use the Account Recovery Detail panel to preview or apply billing setup and insurer-field repairs for the selected account. Payer-order changes across multiple coverages still need manual confirmation.',
        suggested_actions: [
          'Select an account from Accounts Needing Action.',
          'Choose the desired billing status, provider type, insurer fields, or insurance priority.',
          'Run Preview Repair first, then Apply Repair once the changes look correct.',
        ],
      };
    }

    if (callCouncilMember) {
      try {
        const dashboard = await billingService.getDashboard();
        const readiness = browserService.getReadiness();
        const reconciliation = await syncService.buildReconciliationSummary({ limit: 100 });
        const prompt = [
          'You are the ClientCare billing operations copilot.',
          'Return strict JSON with keys: reply, recommended_action, confidence, should_queue_capability_request, priority.',
          `User request: ${message}`,
          `Dashboard summary: ${JSON.stringify(dashboard.summary || {})}`,
          `Readiness: ${JSON.stringify(readiness)}`,
          `Reconciliation summary: ${JSON.stringify(reconciliation.summary || {})}`,
        ].join('\n');
        const response = await callCouncilMember('claude', prompt, '', { responseFormat: 'json', maxTokens: 500, taskType: 'json', skipKnowledge: true });
        let parsed = null;
        try { parsed = typeof response === 'string' ? JSON.parse(response) : response; } catch {}
        if (parsed) {
          if (parsed.should_queue_capability_request) {
            const request = await createCapabilityRequest(message, { requestedBy, priority: parsed.priority || 'normal', normalizedIntent: text, metadata: { recommended_action: parsed.recommended_action } });
            parsed.capability_request = request;
          }
          return { ok: true, type: 'assistant', ...parsed };
        }
      } catch (error) {
        logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] council assist failed');
      }
    }

    const request = await createCapabilityRequest(message, { requestedBy, priority: 'normal', normalizedIntent: text });
    return {
      ok: true,
      type: 'capability_request',
      reply: 'That capability is not implemented directly yet. I queued it as a ClientCare capability request for follow-up.',
      data: { capability_request: request },
    };
  }

  return {
    ask,
    buildOperationsOverview,
    createCapabilityRequest,
    getInsuranceVerificationPreview,
    getOptimizationChecklist,
    getPatientArEscalationQueue,
    getPatientArPolicy,
    getPatientArSummary,
    listCapabilityRequests,
    repairAccount,
    runWorkflow,
    savePatientArPolicy,
    queuePatientArAction,
    updateCapabilityRequest,
  };
}
