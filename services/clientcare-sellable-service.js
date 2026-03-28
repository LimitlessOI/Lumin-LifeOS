/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-sellable-service.js
 * Multi-tenant packaging, onboarding, and audit helpers for ClientCare billing recovery.
 */

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
    if (!tenantId) return [];
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_operator_access WHERE tenant_id = $1 ORDER BY created_at ASC`, [tenantId]);
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


  async function resolveOperatorAccess({ tenantId = null, operatorEmail = '' } = {}) {
    const normalizedEmail = String(operatorEmail || '').trim().toLowerCase();
    const operators = tenantId ? await listOperatorAccess(tenantId) : [];
    if (!operators.length) {
      return { enforced: false, allowed: true, operator: null, operators: [] };
    }
    const operator = operators.find((entry) => String(entry.operator_email || '').trim().toLowerCase() === normalizedEmail) || null;
    return {
      enforced: true,
      allowed: Boolean(operator?.active),
      operator: operator || null,
      operators,
    };
  }

  async function assertOperatorAccess({ tenantId = null, operatorEmail = '', roles = [] } = {}) {
    const result = await resolveOperatorAccess({ tenantId, operatorEmail });
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

  return {
    exportAuditLogCsv,
    getPackagingOverview,
    getReadinessReport,
    listAuditLog,
    getOnboarding,
    listOperatorAccess,
    listTenants,
    logAudit,
    saveOnboarding,
    saveOperatorAccess,
    saveTenant,
  };
}
