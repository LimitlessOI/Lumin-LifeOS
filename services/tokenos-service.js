/**
 * @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
 *
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                         TOKENOS CORE SERVICE                                      ║
 * ║   Customer registration, API key management, onboarding, savings reports         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Responsibilities:
 *   - registerCustomer: create account + generate API key
 *   - rotateApiKey: invalidate old key, issue new one
 *   - getCustomerByKey: resolves api_key → customer row (used by proxy auth)
 *   - getSavingsSummary: aggregate savings across all requests for a customer
 *   - getInvoice: monthly invoice data (for billing / revenue share)
 *   - onboardCustomer: full onboarding flow (register + send welcome + store encrypted keys)
 *
 * Revenue model: we keep 20% of verified savings. Customer pays nothing until savings happen.
 */

import crypto from 'crypto';
import { encrypt, decrypt } from '../core/tco-encryption.js';

/**
 * Create a TokenOS service instance
 * @param {{ pool: import('pg').Pool, logger?: object }} opts
 */
export function createTokenOSService({ pool, logger = console }) {

  // ── Customer lifecycle ──────────────────────────────────────────────────────

  /**
   * Register a new B2B customer.
   * Returns the created customer row + their first API key.
   */
  async function registerCustomer({ name, email, company = null, plan = 'starter' }) {
    if (!name || !email) throw new Error('name and email are required');

    // Generate a unique API key: tok_live_<32 hex chars>
    const apiKey = generateApiKey();

    const result = await pool.query(
      `INSERT INTO tco_customers (name, email, company, plan, api_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING *`,
      [name, email, company, plan, apiKey]
    );

    if (result.rows.length === 0) {
      // Already exists — return existing customer without revealing their key
      const existing = await pool.query(
        'SELECT id, name, email, company, plan, status, created_at FROM tco_customers WHERE email = $1',
        [email]
      );
      return { success: false, error: 'email_exists', customer: existing.rows[0] };
    }

    const customer = result.rows[0];
    logger.info?.({ customerId: customer.id, plan }, '[TOKENOS] New customer registered');

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        plan: customer.plan,
        status: customer.status,
        created_at: customer.created_at,
      },
      apiKey, // Only returned once at registration
      instructions: {
        endpoint: 'POST /api/v1/tokenos/proxy',
        header: 'Authorization: Bearer <your-api-key>',
        docs: '/token-os',
      },
    };
  }

  /**
   * Rotate the API key for a customer (old key immediately invalidated).
   */
  async function rotateApiKey(customerId) {
    const newKey = generateApiKey();
    const result = await pool.query(
      `UPDATE tco_customers SET api_key = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'active'
       RETURNING id, name, email`,
      [newKey, customerId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Customer not found or not active' };
    }

    logger.info?.({ customerId }, '[TOKENOS] API key rotated');
    return { success: true, newApiKey: newKey };
  }

  /**
   * Look up a customer by their API key.
   * Used by the proxy on every request — must be fast.
   */
  async function getCustomerByKey(apiKey) {
    if (!apiKey) return null;
    const result = await pool.query(
      'SELECT * FROM tco_customers WHERE api_key = $1 AND status = $2',
      [apiKey, 'active']
    );
    return result.rows[0] ?? null;
  }

  /**
   * Store encrypted versions of the customer's AI provider API keys.
   * We encrypt them so we can call their providers on their behalf.
   */
  async function storeProviderKeys(customerId, providerKeys) {
    // providerKeys: { openai: 'sk-...', anthropic: 'sk-ant-...' }
    const encrypted = {};
    for (const [provider, key] of Object.entries(providerKeys)) {
      if (key) encrypted[provider] = encrypt(key);
    }

    await pool.query(
      `UPDATE tco_customers SET encrypted_keys = encrypted_keys || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(encrypted), customerId]
    );

    return { success: true, storedProviders: Object.keys(encrypted) };
  }

  /**
   * Retrieve decrypted provider keys for a customer (internal use only — never expose to API).
   */
  async function getProviderKeys(customerId) {
    const result = await pool.query(
      'SELECT encrypted_keys FROM tco_customers WHERE id = $1',
      [customerId]
    );
    if (!result.rows[0]) return {};

    const decrypted = {};
    for (const [provider, encKey] of Object.entries(result.rows[0].encrypted_keys || {})) {
      decrypted[provider] = decrypt(encKey);
    }
    return decrypted;
  }

  // ── Savings reporting ───────────────────────────────────────────────────────

  /**
   * Aggregate savings summary for a customer.
   * @param {number} customerId
   * @param {{ days?: number, startDate?: string, endDate?: string }} opts
   */
  async function getSavingsSummary(customerId, { days = 30, startDate, endDate } = {}) {
    const params = [customerId];
    let dateClause = '';

    if (startDate && endDate) {
      dateClause = 'AND created_at BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    } else {
      dateClause = `AND created_at >= NOW() - ($2 * INTERVAL '1 day')`;
      params.push(days);
    }

    const summary = await pool.query(
      `SELECT
         COUNT(*)                                          AS total_requests,
         COALESCE(SUM(original_tokens), 0)                AS original_tokens,
         COALESCE(SUM(actual_tokens), 0)                  AS actual_tokens,
         COALESCE(SUM(original_cost), 0)                  AS total_would_have_cost,
         COALESCE(SUM(actual_cost), 0)                    AS total_actual_cost,
         COALESCE(SUM(savings), 0)                        AS total_savings,
         COALESCE(AVG(savings_percent), 0)                AS avg_savings_pct,
         COALESCE(SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END), 0) AS cache_hits,
         COALESCE(SUM(CASE WHEN compression_used THEN 1 ELSE 0 END), 0) AS compressions,
         COALESCE(AVG(quality_score), 0)                  AS avg_quality_score,
         COALESCE(AVG(latency_ms), 0)                     AS avg_latency_ms
       FROM tco_requests
       WHERE customer_id = $1 ${dateClause}`,
      params
    );

    const byModel = await pool.query(
      `SELECT
         original_provider,
         original_model,
         COUNT(*)            AS requests,
         SUM(savings)        AS savings,
         AVG(savings_percent) AS avg_pct
       FROM tco_requests
       WHERE customer_id = $1 ${dateClause}
       GROUP BY original_provider, original_model
       ORDER BY savings DESC`,
      params
    );

    const daily = await pool.query(
      `SELECT
         DATE(created_at)     AS day,
         COUNT(*)             AS requests,
         SUM(savings)         AS savings,
         AVG(savings_percent) AS avg_pct
       FROM tco_requests
       WHERE customer_id = $1 ${dateClause}
       GROUP BY DATE(created_at)
       ORDER BY day DESC
       LIMIT 30`,
      params
    );

    const s = summary.rows[0];
    const totalSavings = parseFloat(s.total_savings) || 0;
    const ourRevenue = totalSavings * 0.20;

    return {
      success: true,
      customerId,
      period: { days, startDate: startDate || `last ${days} days`, endDate: endDate || 'now' },
      summary: {
        ...s,
        our_revenue_usd: ourRevenue.toFixed(6),
        revenue_share: '20%',
      },
      byModel: byModel.rows,
      daily: daily.rows,
    };
  }

  /**
   * Monthly invoice data for billing.
   */
  async function getMonthlyInvoice(customerId, year, month) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const report = await getSavingsSummary(customerId, { startDate, endDate });
    if (!report.success) return report;

    const totalSavings = parseFloat(report.summary.total_savings) || 0;
    const ourFee = totalSavings * 0.20;

    return {
      success: true,
      customerId,
      period: { year, month, startDate, endDate },
      metrics: report.summary,
      breakdown: report.byModel,
      billing: {
        totalSavings: totalSavings.toFixed(4),
        feeUsd: ourFee.toFixed(4),
        revenueShare: '20%',
        amountDue: ourFee.toFixed(4),
        note: 'You only pay when we save you money.',
      },
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * List all customers (admin endpoint).
   */
  async function listCustomers({ limit = 50, offset = 0, status = null } = {}) {
    const params = [limit, offset];
    const statusClause = status ? 'WHERE status = $3' : '';
    if (status) params.push(status);

    const result = await pool.query(
      `SELECT id, name, email, company, plan, status, created_at
       FROM tco_customers ${statusClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tco_customers ${statusClause}`,
      status ? [status] : []
    );

    return {
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    };
  }

  /**
   * Suspend or reactivate a customer account.
   */
  async function setCustomerStatus(customerId, status) {
    if (!['active', 'suspended', 'cancelled'].includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    await pool.query(
      'UPDATE tco_customers SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, customerId]
    );
    return { success: true, customerId, status };
  }

  /**
   * Full onboarding: register + optional provider key storage.
   */
  async function onboardCustomer({ name, email, company, plan, providerKeys = {} }) {
    const registration = await registerCustomer({ name, email, company, plan });
    if (!registration.success) return registration;

    if (Object.keys(providerKeys).length > 0) {
      await storeProviderKeys(registration.customer.id, providerKeys);
    }

    return registration;
  }

  // ── Platform savings (internal — Lumin's own compression stack) ─────────────

  /**
   * Pull aggregate stats from token_usage_log (internal compression, not B2B).
   * Shows how much Lumin's own AI calls have saved.
   */
  async function getPlatformSavings({ days = 30 } = {}) {
    try {
      const result = await pool.query(
        `SELECT
           COUNT(*)                          AS total_calls,
           SUM(original_tokens)              AS original_tokens,
           SUM(compressed_tokens)            AS compressed_tokens,
           SUM(original_tokens - compressed_tokens) AS saved_tokens,
           AVG(savings_pct)                  AS avg_savings_pct,
           SUM(saved_cost_usd)               AS total_saved_usd,
           AVG(quality_score)                AS avg_quality,
           SUM(CASE WHEN provider_was_free THEN 1 ELSE 0 END) AS free_calls,
           SUM(CASE WHEN fallback_triggered THEN 1 ELSE 0 END) AS fallbacks
         FROM token_usage_log
         WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')`,
        [days]
      );
      return { success: true, period: `last ${days} days`, ...result.rows[0] };
    } catch (err) {
      // token_usage_log may not exist in all envs
      return { success: false, error: err.message };
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  function generateApiKey() {
    return `tok_live_${crypto.randomBytes(16).toString('hex')}`;
  }

  return {
    registerCustomer,
    rotateApiKey,
    getCustomerByKey,
    storeProviderKeys,
    getProviderKeys,
    getSavingsSummary,
    getMonthlyInvoice,
    listCustomers,
    setCustomerStatus,
    onboardCustomer,
    getPlatformSavings,
  };
}

export default createTokenOSService;
