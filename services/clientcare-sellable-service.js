/**
 * SYNOPSIS: clientcare-sellable-service.js
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 * clientcare-sellable-service.js
 * Multi-tenant packaging, onboarding, audit, and BirthBill public signup/checkout helpers.
 */

import { getStripeClient } from './stripe-client.js';
import { encrypt, decrypt } from '../core/tco-encryption.js';
import {
  CLIENTCARE_BILLING_PRICING,
  getBirthBillPilotOfferSummary,
  getBirthBillDealReasonWhy,
} from '../config/clientcare-billing-pricing.js';

function isMissingRelation(error) {
  return /does not exist|relation .* does not exist/i.test(String(error?.message || ''));
}

const DEFAULT_TENANT = {
  id: null,
  slug: 'default',
  name: 'Default Practice',
  status: 'internal',
  collections_fee_pct: 5,
  contact_name: '',
  contact_email: '',
};

const DEFAULT_ONBOARDING = {
  browser_ready: false,
  payment_history_imported: false,
  backlog_loaded: false,
  policy_configured: false,
  operator_access_configured: false,
  review_completed: false,
  notes: '',
};

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function computeOnboardingReadiness({ tenant = {}, onboarding = {}, operators = [], audit = [] } = {}) {
  const checks = [
    { key: 'tenant_name', label: 'Tenant name configured', done: Boolean(String(tenant.name || '').trim()) },
    { key: 'tenant_contact_email', label: 'Tenant contact email configured', done: Boolean(String(tenant.contact_email || '').trim()) },
    { key: 'fee_pct', label: 'Collections fee configured', done: Number(tenant.collections_fee_pct || 0) > 0 },
    { key: 'browser_ready', label: 'Browser access ready', done: Boolean(onboarding.browser_ready) },
    { key: 'history_imported', label: 'Payment history imported', done: Boolean(onboarding.payment_history_imported) },
    { key: 'backlog_loaded', label: 'Backlog loaded', done: Boolean(onboarding.backlog_loaded) },
    { key: 'policy_configured', label: 'Patient AR policy configured', done: Boolean(onboarding.policy_configured) },
    { key: 'operator_access', label: 'Operator access configured', done: Boolean(onboarding.operator_access_configured) && operators.length > 0 },
    { key: 'review_completed', label: 'Go-live review completed', done: Boolean(onboarding.review_completed) },
    { key: 'audit_receipts', label: 'Audit receipts captured', done: audit.length > 0 },
  ];
  const completed = checks.filter((item) => item.done).length;
  const score = Math.round((completed / checks.length) * 100);
  const blockers = checks.filter((item) => !item.done).map((item) => item.label);
  const status = score >= 90 ? 'go_live_ready' : score >= 70 ? 'pilot_ready' : score >= 40 ? 'setup_in_progress' : 'not_ready';
  const nextActions = blockers.slice(0, 5);
  return { score, status, checks, blockers, next_actions: nextActions };
}

function summarizeValidationChecks(checks = []) {
  const completed = checks.filter((item) => item.pass).length;
  const score = Math.round((completed / Math.max(checks.length, 1)) * 100);
  const blockers = checks.filter((item) => !item.pass).map((item) => item.label);
  const status = score >= 90 ? 'validated' : score >= 70 ? 'nearly_ready' : score >= 40 ? 'partial' : 'blocked';
  return { score, status, blockers };
}

function normalizeValidationEntry(entry = {}) {
  const details = entry?.details && typeof entry.details === 'object' ? entry.details : {};
  return {
    created_at: entry.created_at || null,
    actor: entry.actor || 'system',
    score: Number(details.score || 0),
    status: String(details.status || 'unknown'),
    blockers: Array.isArray(details.blockers) ? details.blockers : [],
  };
}

export function createClientCareSellableService({ pool, logger = console }) {
  async function logAudit({
    tenantId = null,
    actor = 'system',
    actionType,
    entityType,
    entityId = null,
    details = {},
  } = {}) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_audit_log (tenant_id, actor, action_type, entity_type, entity_id, details)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [tenantId, actor, actionType, entityType, entityId, JSON.stringify(details || {})]
      );
      return rows[0] || null;
    } catch (error) {
      if (isMissingRelation(error)) return null;
      logger.warn?.({ err: error.message }, '[CLIENTCARE-SELLABLE] audit log failed');
      return null;
    }
  }

  async function listTenants() {
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_tenants ORDER BY created_at ASC`);
      return rows.length ? rows : [DEFAULT_TENANT];
    } catch (error) {
      if (isMissingRelation(error)) return [DEFAULT_TENANT];
      throw error;
    }
  }

  async function saveTenant(input = {}) {
    const slug = String(input.slug || DEFAULT_TENANT.slug).trim().toLowerCase();
    const payload = {
      slug,
      name: String(input.name || DEFAULT_TENANT.name).trim(),
      status: String(input.status || DEFAULT_TENANT.status).trim(),
      collections_fee_pct: Number(input.collections_fee_pct ?? DEFAULT_TENANT.collections_fee_pct),
      contact_name: String(input.contact_name || '').trim(),
      contact_email: String(input.contact_email || '').trim(),
    };
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_tenants (slug, name, status, collections_fee_pct, contact_name, contact_email)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET
           name=EXCLUDED.name,
           status=EXCLUDED.status,
           collections_fee_pct=EXCLUDED.collections_fee_pct,
           contact_name=EXCLUDED.contact_name,
           contact_email=EXCLUDED.contact_email,
           updated_at=NOW()
         RETURNING *`,
        [payload.slug, payload.name, payload.status, payload.collections_fee_pct, payload.contact_name, payload.contact_email]
      );
      return rows[0] || payload;
    } catch (error) {
      if (isMissingRelation(error)) return payload;
      throw error;
    }
  }

  async function getOnboarding(tenantId = null) {
    if (!tenantId) return { tenant_id: null, ...DEFAULT_ONBOARDING };
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_onboarding WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
      return rows[0] ? { ...DEFAULT_ONBOARDING, ...rows[0] } : { tenant_id: tenantId, ...DEFAULT_ONBOARDING };
    } catch (error) {
      if (isMissingRelation(error)) return { tenant_id: tenantId, ...DEFAULT_ONBOARDING };
      throw error;
    }
  }

  async function saveOnboarding(tenantId, input = {}) {
    const payload = {
      browser_ready: Boolean(input.browser_ready),
      payment_history_imported: Boolean(input.payment_history_imported),
      backlog_loaded: Boolean(input.backlog_loaded),
      policy_configured: Boolean(input.policy_configured),
      operator_access_configured: Boolean(input.operator_access_configured),
      review_completed: Boolean(input.review_completed),
      notes: String(input.notes || '').trim(),
    };
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_onboarding (
          tenant_id, browser_ready, payment_history_imported, backlog_loaded,
          policy_configured, operator_access_configured, review_completed, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (tenant_id) DO UPDATE SET
          browser_ready=EXCLUDED.browser_ready,
          payment_history_imported=EXCLUDED.payment_history_imported,
          backlog_loaded=EXCLUDED.backlog_loaded,
          policy_configured=EXCLUDED.policy_configured,
          operator_access_configured=EXCLUDED.operator_access_configured,
          review_completed=EXCLUDED.review_completed,
          notes=EXCLUDED.notes,
          updated_at=NOW()
        RETURNING *`,
        [
          tenantId,
          payload.browser_ready,
          payload.payment_history_imported,
          payload.backlog_loaded,
          payload.policy_configured,
          payload.operator_access_configured,
          payload.review_completed,
          payload.notes,
        ]
      );
      return rows[0] || { tenant_id: tenantId, ...payload };
    } catch (error) {
      if (isMissingRelation(error)) return { tenant_id: tenantId, ...payload };
      throw error;
    }
  }

  async function listOperatorAccess(tenantId = null) {
    try {
      // `tenant_id = $1` with $1 = null never matches in Postgres (NULL
      // comparison), so a null tenantId (Sherry's original single-tenant
      // "Default Practice", DEFAULT_TENANT.id = null) always returned []
      // here even if operator rows existed for it. NULL-safe comparison so
      // the default tenant can actually be locked down later if desired.
      const { rows } = await pool.query(
        `SELECT * FROM clientcare_operator_access WHERE tenant_id IS NOT DISTINCT FROM $1 ORDER BY created_at ASC`,
        [tenantId]
      );
      return rows;
    } catch (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
  }

  async function saveOperatorAccess(tenantId, input = {}) {
    const payload = {
      operator_email: String(input.operator_email || '').trim().toLowerCase(),
      role: String(input.role || 'operator').trim().toLowerCase(),
      active: input.active !== undefined ? Boolean(input.active) : true,
    };
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_operator_access (tenant_id, operator_email, role, active)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tenant_id, operator_email) DO UPDATE SET
           role=EXCLUDED.role,
           active=EXCLUDED.active,
           updated_at=NOW()
         RETURNING *`,
        [tenantId, payload.operator_email, payload.role, payload.active]
      );
      return rows[0] || payload;
    } catch (error) {
      if (isMissingRelation(error)) return { tenant_id: tenantId, ...payload };
      throw error;
    }
  }

  async function listAuditLog({ tenantId = null, limit = 50 } = {}) {
    try {
      const values = [];
      let where = '';
      if (tenantId) {
        values.push(tenantId);
        where = `WHERE tenant_id = $${values.length}`;
      }
      values.push(Math.max(1, Math.min(Number(limit || 50), 200)));
      const { rows } = await pool.query(
        `SELECT * FROM clientcare_audit_log ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
        values
      );
      return rows;
    } catch (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
  }
  async function resolveOperatorAccess({
    tenantId = null,
    operatorEmail = '',
    allowBootstrapWhenNoOperators = false,
  } = {}) {
    const normalizedEmail = String(operatorEmail || '').trim().toLowerCase();
    const operators = await listOperatorAccess(tenantId);
    if (!operators.length) {
      if (allowBootstrapWhenNoOperators) {
        return {
          enforced: false,
          allowed: true,
          operator: null,
          operators: [],
          bootstrap: true,
        };
      }
      return {
        enforced: true,
        allowed: false,
        operator: null,
        operators: [],
        reason: 'tenant_not_provisioned',
      };
    }
    const operator = operators.find((entry) => String(entry.operator_email || '').trim().toLowerCase() === normalizedEmail) || null;
    return {
      enforced: true,
      allowed: Boolean(operator?.active),
      operator: operator || null,
      operators,
    };
  }

  async function assertOperatorAccess({
    tenantId = null,
    operatorEmail = '',
    roles = [],
    allowBootstrapWhenNoOperators = false,
  } = {}) {
    const result = await resolveOperatorAccess({
      tenantId,
      operatorEmail,
      allowBootstrapWhenNoOperators,
    });
    if (!result.enforced) return { ...result, tenantId, operatorEmail };
    if (!result.allowed) {
      throw new Error('Active operator access required for this tenant action');
    }
    if (roles.length && !roles.includes(String(result.operator?.role || '').toLowerCase())) {
      throw new Error(`Operator role must be one of: ${roles.join(', ')}`);
    }
    return { ...result, tenantId, operatorEmail };
  }

  async function getPackagingOverview({ tenantId = null, auditLimit = 20 } = {}) {
    const tenants = await listTenants();
    const activeTenant = tenants.find((tenant) => String(tenant.id) === String(tenantId || '')) || tenants[0] || DEFAULT_TENANT;
    const onboarding = activeTenant?.id ? await getOnboarding(activeTenant.id) : { ...DEFAULT_ONBOARDING };
    const operators = activeTenant?.id ? await listOperatorAccess(activeTenant.id) : [];
    const audit = await listAuditLog({ tenantId: activeTenant?.id || null, limit: auditLimit });

    const readiness = computeOnboardingReadiness({
      tenant: activeTenant,
      onboarding,
      operators,
      audit,
    });

    return {
      summary: {
        tenants: tenants.length,
        active_tenant: activeTenant?.name || DEFAULT_TENANT.name,
        active_tenant_id: activeTenant?.id || null,
        collections_fee_pct: Number(activeTenant?.collections_fee_pct || DEFAULT_TENANT.collections_fee_pct),
        operators: operators.length,
        onboarding_complete: Boolean(onboarding.review_completed),
        audit_events: audit.length,
        readiness_score: readiness.score,
        readiness_status: readiness.status,
      },
      tenants,
      active_tenant: activeTenant,
      onboarding,
      operators,
      audit,
      readiness,
    };
  }

  async function getReadinessReport({ tenantId = null } = {}) {
    const overview = await getPackagingOverview({ tenantId, auditLimit: 50 });
    const readiness = overview.readiness || computeOnboardingReadiness({});
    return {
      generated_at: new Date().toISOString(),
      tenant: overview.active_tenant || DEFAULT_TENANT,
      readiness,
      onboarding: overview.onboarding || { ...DEFAULT_ONBOARDING },
      operator_count: (overview.operators || []).length,
      recent_audit_events: (overview.audit || []).slice(0, 10),
    };
  }

  function exportAuditLogCsv(entries = []) {
    const rows = [['created_at', 'tenant_id', 'actor', 'action_type', 'entity_type', 'entity_id', 'details']];
    for (const entry of entries) {
      rows.push([
        entry.created_at,
        entry.tenant_id,
        entry.actor,
        entry.action_type,
        entry.entity_type,
        entry.entity_id,
        JSON.stringify(entry.details || {}),
      ]);
    }
    return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
  }

  async function buildLiveValidation({
    tenantId = null,
    browserReadiness = null,
    dashboard = null,
    reimbursement = null,
  } = {}) {
    const overview = await getPackagingOverview({ tenantId, auditLimit: 50 });
    const checks = [
      { key: 'browser_ready', label: 'Browser automation credentials are ready', pass: Boolean(browserReadiness?.ready) },
      { key: 'tenant_contact', label: 'Tenant contact information is set', pass: Boolean(String(overview.active_tenant?.contact_email || '').trim()) && Boolean(String(overview.active_tenant?.contact_name || '').trim()) },
      { key: 'collections_fee', label: 'Collections fee is configured', pass: Number(overview.active_tenant?.collections_fee_pct || 0) > 0 },
      { key: 'operator_access', label: 'At least one operator is active', pass: (overview.operators || []).some((entry) => entry.active) },
      { key: 'audit_receipts', label: 'Audit receipts exist', pass: (overview.audit || []).length > 0 },
      { key: 'claim_ledger', label: 'Claim ledger has imported claims', pass: Number(dashboard?.summary?.total_claims || 0) > 0 },
      { key: 'payment_history', label: 'Payment history exists for forecast calibration', pass: Boolean(reimbursement?.summary?.has_history) },
      { key: 'onboarding_review', label: 'Onboarding review is completed', pass: Boolean(overview.onboarding?.review_completed) },
    ];
    const summary = summarizeValidationChecks(checks);
    return {
      generated_at: new Date().toISOString(),
      tenant: overview.active_tenant || DEFAULT_TENANT,
      checks,
      summary,
      next_actions: summary.blockers.slice(0, 5),
      detail: {
        browser_ready: browserReadiness?.ready || false,
        claim_count: Number(dashboard?.summary?.total_claims || 0),
        has_payment_history: Boolean(reimbursement?.summary?.has_history),
        operator_count: (overview.operators || []).length,
        audit_events: (overview.audit || []).length,
      },
    };
  }

  async function getValidationHistory({ tenantId = null, limit = 20 } = {}) {
    const audit = await listAuditLog({ tenantId, limit: Math.max(Number(limit || 20) * 3, 30) });
    const validations = audit
      .filter((entry) => String(entry.action_type || '') === 'packaging_validate')
      .slice(0, Math.max(1, Math.min(Number(limit || 20), 50)))
      .map(normalizeValidationEntry);
    const summary = {
      runs: validations.length,
      latest_score: validations[0]?.score ?? null,
      latest_status: validations[0]?.status ?? 'none',
      average_score: validations.length
        ? Math.round(validations.reduce((sum, item) => sum + Number(item.score || 0), 0) / validations.length)
        : null,
      blocked_runs: validations.filter((item) => item.status === 'blocked').length,
      validated_runs: validations.filter((item) => item.status === 'validated').length,
      common_blockers: Array.from(
        validations.reduce((map, item) => {
          for (const blocker of item.blockers || []) {
            map.set(blocker, (map.get(blocker) || 0) + 1);
          }
          return map;
        }, new Map()).entries()
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count })),
    };
    return {
      generated_at: new Date().toISOString(),
      summary,
      validations,
    };
  }

  function slugifyPractice(name = '') {
    const base = String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return base || `practice-${Date.now().toString(36)}`;
  }

  function getPublicOffer() {
    const pricing = CLIENTCARE_BILLING_PRICING;
    return {
      product: pricing.product,
      pricing: {
        pilot: pricing.pilot,
        carePlan: pricing.carePlan,
        recoveryShare: pricing.recoveryShare,
      },
      includes: pricing.includes,
      excludes: pricing.excludes,
      definitions: pricing.definitions,
      steps: pricing.steps,
      offer_summary: getBirthBillPilotOfferSummary(pricing),
      reason_why: getBirthBillDealReasonWhy(pricing),
      beta: Boolean(pricing.beta),
      readiness: pricing.product?.readiness || 'pilot',
      readiness_label: pricing.product?.readiness_label || null,
      workboard_url: '/clientcare-billing?product=birthbill',
      connect_hint: 'After Stripe pay you land on /birthbill/welcome to connect ClientCare.',
    };
  }

  async function signupPracticeLead({
    practiceName = '',
    contactName = '',
    contactEmail = '',
    contactPhone = '',
    region = '',
    notes = '',
  } = {}) {
    const name = String(practiceName || '').trim();
    const email = String(contactEmail || '').trim().toLowerCase();
    if (!name || name.length < 2) return { ok: false, error: 'practice_name required' };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'valid contact_email required' };

    let slug = slugifyPractice(name);
    const existing = await listTenants();
    if ((existing || []).some((t) => t.slug === slug)) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const tenant = await saveTenant({
      slug,
      name,
      status: 'pilot_lead',
      collections_fee_pct: Number(CLIENTCARE_BILLING_PRICING.recoveryShare.pct || 5),
      contact_name: String(contactName || '').trim() || name,
      contact_email: email,
    });

    await saveOnboarding(tenant.id, {
      ...DEFAULT_ONBOARDING,
      notes: [
        'BirthBill public signup',
        contactPhone ? `phone:${contactPhone}` : null,
        region ? `region:${region}` : null,
        notes ? String(notes).slice(0, 500) : null,
      ].filter(Boolean).join(' | '),
    });

    await saveOperatorAccess(tenant.id, {
      operator_email: email,
      role: 'manager',
      active: true,
    });

    await logAudit({
      tenantId: tenant.id,
      actor: email,
      action_type: 'birthbill_signup_lead',
      entity_type: 'tenant',
      entity_id: String(tenant.id),
      details: { practiceName: name, contactEmail: email, region: region || null },
    });

    return {
      ok: true,
      tenant,
      offer: getPublicOffer(),
      next: 'checkout',
    };
  }

  async function createPilotCheckoutSession({
    tenantId = null,
    practiceName = '',
    contactEmail = '',
    baseUrl = '',
  } = {}) {
    if (!tenantId) return { ok: false, error: 'tenant_id required' };
    const stripe = await getStripeClient();
    if (!stripe) return { ok: false, error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' };

    const amountCents = CLIENTCARE_BILLING_PRICING.pilot.oneTimeCents;
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return { ok: false, error: 'Invalid BirthBill pilot price configuration' };
    }

    const safeBase = String(baseUrl || '').replace(/\/$/, '');
    const months = CLIENTCARE_BILLING_PRICING.carePlan.includedMonthsOnPilot || 1;
    const label = practiceName
      ? `BirthBill pilot — ${practiceName}`
      : 'BirthBill pilot onboard';
    const description = `${CLIENTCARE_BILLING_PRICING.pilot.description} (${getBirthBillPilotOfferSummary()})`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: contactEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: label,
              description,
            },
            unit_amount: Math.round(amountCents),
          },
          quantity: 1,
        },
      ],
      success_url: `${safeBase}/api/v1/clientcare-billing/public/checkout/success?tenant_id=${encodeURIComponent(tenantId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeBase}/birthbill?cancelled=1`,
      metadata: {
        product: 'birthbill-pilot',
        tenantId: String(tenantId),
        beta: 'true',
        careIncludedMonths: String(months),
        offerSummary: getBirthBillPilotOfferSummary(),
        recoveryFeePct: String(CLIENTCARE_BILLING_PRICING.recoveryShare.pct || 5),
      },
    });

    await logAudit({
      tenantId,
      actor: contactEmail || 'public',
      action_type: 'birthbill_checkout_started',
      entity_type: 'checkout',
      entity_id: session.id,
      details: { amountCents, practiceName: practiceName || null },
    });

    return {
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
      amount_cents: amountCents,
      offer_summary: getBirthBillPilotOfferSummary(),
    };
  }

  async function verifyPilotCheckoutSession({ tenantId = null, sessionId = null } = {}) {
    if (!sessionId) return { ok: false, error: 'session_id required' };
    const stripe = await getStripeClient();
    if (!stripe) return { ok: false, error: 'Stripe not configured' };

    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    const metaTenant = session.metadata?.tenantId || null;
    if (tenantId && metaTenant && String(tenantId) !== String(metaTenant)) {
      return { ok: false, error: 'tenant_id mismatch for checkout session' };
    }
    const resolvedTenantId = tenantId || metaTenant;
    if (paid && resolvedTenantId) {
      try {
        const { rows } = await pool.query(`SELECT * FROM clientcare_tenants WHERE id = $1 LIMIT 1`, [resolvedTenantId]);
        const current = rows[0];
        if (current) {
          await saveTenant({
            slug: current.slug,
            name: current.name,
            status: 'pilot_paid',
            collections_fee_pct: current.collections_fee_pct,
            contact_name: current.contact_name,
            contact_email: current.contact_email,
          });
          const prior = await getOnboarding(resolvedTenantId);
          await saveOnboarding(resolvedTenantId, {
            ...prior,
            notes: `${prior.notes || ''} | BirthBill pilot paid ${new Date().toISOString()} session=${sessionId}`.trim(),
          });
        }
      } catch (err) {
        logger.warn?.({ err: err.message }, '[CLIENTCARE-SELLABLE] pilot paid tenant update failed');
      }
      await logAudit({
        tenantId: resolvedTenantId,
        actor: session.customer_email || 'stripe',
        action_type: 'birthbill_checkout_paid',
        entity_type: 'checkout',
        entity_id: String(sessionId),
        details: {
          amount_total: session.amount_total,
          payment_status: session.payment_status,
        },
      });
    }
    return {
      ok: paid,
      paid,
      tenant_id: resolvedTenantId,
      session_id: session.id,
      payment_status: session.payment_status,
      next: paid
        ? 'Connect ClientCare credentials with your onboarding specialist — forever-chase seed is next.'
        : 'Checkout not paid yet',
    };
  }

  function maskUsername(value) {
    const s = String(value || '');
    if (!s) return '';
    if (s.length <= 4) return `${s.slice(0, 1)}***`;
    return `${s.slice(0, 2)}***${s.slice(-2)}`;
  }

  async function getTenantCredentialStatus(tenantId) {
    if (!tenantId) return { connected: false };
    try {
      const { rows } = await pool.query(
        `SELECT tenant_id, base_url, username_hint, status, last_verified_at, last_error, updated_at
         FROM clientcare_tenant_credentials WHERE tenant_id = $1 LIMIT 1`,
        [tenantId]
      );
      const row = rows[0];
      if (!row) return { connected: false, tenant_id: tenantId };
      return {
        connected: true,
        tenant_id: row.tenant_id,
        base_url: row.base_url,
        username_hint: row.username_hint,
        status: row.status,
        last_verified_at: row.last_verified_at,
        last_error: row.last_error,
        updated_at: row.updated_at,
      };
    } catch (error) {
      if (isMissingRelation(error)) return { connected: false, tenant_id: tenantId, error: 'credentials_table_missing' };
      throw error;
    }
  }

  async function getTenantCredentials(tenantId) {
    if (!tenantId) return null;
    const { rows } = await pool.query(
      `SELECT * FROM clientcare_tenant_credentials WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      tenantId: row.tenant_id,
      baseUrl: row.base_url,
      username: row.username,
      password: decrypt(row.encrypted_password),
      mfaMode: row.mfa_mode || null,
      mfaSecret: row.encrypted_mfa_secret ? decrypt(row.encrypted_mfa_secret) : null,
      status: row.status,
    };
  }

  async function saveTenantCredentials(tenantId, {
    baseUrl = 'https://clientcarewest.net',
    username = '',
    password = '',
    mfaMode = null,
    mfaSecret = null,
  } = {}) {
    if (!tenantId) return { ok: false, error: 'tenant_id required' };
    const user = String(username || '').trim();
    const pass = String(password || '');
    if (!user || !pass) return { ok: false, error: 'username and password required' };
    const encPass = encrypt(pass);
    if (!encPass) return { ok: false, error: 'encryption_failed — set TCO_ENCRYPTION_KEY' };
    const encMfa = mfaSecret ? encrypt(String(mfaSecret)) : null;
    const url = String(baseUrl || 'https://clientcarewest.net').trim().replace(/\/$/, '') || 'https://clientcarewest.net';
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_tenant_credentials (
           tenant_id, base_url, username, encrypted_password, mfa_mode, encrypted_mfa_secret,
           username_hint, status, last_error, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'stored',NULL,NOW())
         ON CONFLICT (tenant_id) DO UPDATE SET
           base_url=EXCLUDED.base_url,
           username=EXCLUDED.username,
           encrypted_password=EXCLUDED.encrypted_password,
           mfa_mode=EXCLUDED.mfa_mode,
           encrypted_mfa_secret=COALESCE(EXCLUDED.encrypted_mfa_secret, clientcare_tenant_credentials.encrypted_mfa_secret),
           username_hint=EXCLUDED.username_hint,
           status='stored',
           last_error=NULL,
           updated_at=NOW()
         RETURNING tenant_id, base_url, username_hint, status, updated_at`,
        [tenantId, url, user, encPass, mfaMode || null, encMfa, maskUsername(user)]
      );
      const prior = await getOnboarding(tenantId);
      await saveOnboarding(tenantId, { ...prior, browser_ready: true });
      await logAudit({
        tenantId,
        actor: user,
        action_type: 'birthbill_clientcare_connected',
        entity_type: 'credentials',
        entity_id: String(tenantId),
        details: { base_url: url, username_hint: maskUsername(user) },
      });
      return { ok: true, credentials: rows[0], onboarding: await getOnboarding(tenantId) };
    } catch (error) {
      if (isMissingRelation(error)) return { ok: false, error: 'credentials_table_missing — redeploy migration' };
      throw error;
    }
  }

  async function connectClientCareAfterPay({
    tenantId = null,
    sessionId = null,
    baseUrl = '',
    username = '',
    password = '',
    mfaMode = null,
    mfaSecret = null,
  } = {}) {
    if (!tenantId) return { ok: false, error: 'tenant_id required' };
    const { rows } = await pool.query(`SELECT * FROM clientcare_tenants WHERE id = $1 LIMIT 1`, [tenantId]);
    const tenant = rows[0];
    if (!tenant) return { ok: false, error: 'tenant_not_found' };
    const paidStatuses = new Set(['pilot_paid', 'active', 'live']);
    let paid = paidStatuses.has(String(tenant.status || ''));
    if (!paid && sessionId) {
      const verified = await verifyPilotCheckoutSession({ tenantId, sessionId });
      paid = Boolean(verified.paid);
    }
    if (!paid) return { ok: false, error: 'pilot_payment_required_before_connect' };
    const saved = await saveTenantCredentials(tenantId, {
      baseUrl: baseUrl || 'https://clientcarewest.net',
      username,
      password,
      mfaMode,
      mfaSecret,
    });
    if (!saved.ok) return saved;
    return {
      ok: true,
      tenant_id: tenantId,
      status: saved.credentials?.status || 'stored',
      username_hint: saved.credentials?.username_hint,
      next: 'Credentials stored encrypted. Run forever-chase seed with this tenant_id next.',
    };
  }

  return {
    assertOperatorAccess,
    buildLiveValidation,
    connectClientCareAfterPay,
    createPilotCheckoutSession,
    exportAuditLogCsv,
    getPackagingOverview,
    getPublicOffer,
    getReadinessReport,
    getTenantCredentials,
    getTenantCredentialStatus,
    getValidationHistory,
    listAuditLog,
    getOnboarding,
    listOperatorAccess,
    listTenants,
    logAudit,
    resolveOperatorAccess,
    saveOnboarding,
    saveOperatorAccess,
    saveTenant,
    saveTenantCredentials,
    signupPracticeLead,
    verifyPilotCheckoutSession,
  };
}
