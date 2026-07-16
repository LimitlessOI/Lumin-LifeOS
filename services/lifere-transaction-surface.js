/**
 * SYNOPSIS: LifeRE transaction surface — Am 17 tc-status-engine integration.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createTCStatusEngine } from './tc-status-engine.js';

export function createLifeRETransactionSurface({ pool = null } = {}) {
  const statusEngine = createTCStatusEngine();

  async function getDealStatus({ dealId }) {
    if (!pool) {
      return {
        ok: true,
        deal_id: dealId,
        stage: 'unknown',
        blockers: [],
        label: 'THINK',
        source: 'stub_no_db',
      };
    }

    try {
      const { rows } = await pool.query('SELECT * FROM tc_transactions WHERE id = $1 LIMIT 1', [dealId]);
      if (!rows[0]) {
        return { ok: true, deal_id: dealId, stage: 'not_found', blockers: [], label: 'KNOW' };
      }

      const { rows: events } = await pool.query(
        `SELECT * FROM tc_transaction_events WHERE transaction_id = $1 ORDER BY created_at DESC`,
        [dealId]
      );

      const state = statusEngine.deriveTransactionState({ transaction: rows[0], events });
      return {
        ok: true,
        deal_id: dealId,
        property_address: rows[0].address || rows[0].property_address,
        close_date: rows[0].close_date,
        ...state,
        label: 'KNOW',
        source: 'am17',
      };
    } catch (err) {
      return {
        ok: true,
        deal_id: dealId,
        stage: 'tc_error',
        blockers: [{ message: err.message }],
        label: 'THINK',
        source: 'am17_error',
      };
    }
  }

  async function listActiveDeals({ limit = 25 } = {}) {
    if (!pool) return { ok: true, deals: [] };
    try {
      const { rows } = await pool.query(
        `SELECT id, address AS property_address, status, close_date FROM tc_transactions
         WHERE status IN ('active','pending') ORDER BY close_date ASC NULLS LAST LIMIT $1`,
        [limit],
      );
      return { ok: true, deals: rows };
    } catch (err) {
      return { ok: true, deals: [], error: err.message, label: 'THINK', source: 'am17_list_error' };
    }
  }

  async function getDealDetail({ dealId }) {
    const status = await getDealStatus({ dealId });
    if (!pool || status.stage === 'not_found') {
      return { ok: true, ...status, events: [], documents: [] };
    }
    try {
      const { rows: events } = await pool.query(
        `SELECT event_type, created_at, payload FROM tc_transaction_events
         WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 30`,
        [dealId]
      );
      const { rows: txRows } = await pool.query('SELECT documents FROM tc_transactions WHERE id = $1', [dealId]);
      const documents = txRows[0]?.documents || {};
      return {
        ok: true,
        ...status,
        events,
        documents,
        next_actions: (status.blockers || []).map((b) => b.message || b).slice(0, 5),
        label: 'KNOW',
      };
    } catch (err) {
      return { ok: true, ...status, events: [], error: err.message, label: 'THINK' };
    }
  }

  async function getWorkspace({ limit = 20 } = {}) {
    const listed = await listActiveDeals({ limit });
    const deals = [];
    for (const row of listed.deals || []) {
      const status = await getDealStatus({ dealId: row.id });
      const docs = status.documents || status.missing_documents || [];
      const missing = Array.isArray(docs)
        ? docs
        : (typeof docs === 'object' ? Object.keys(docs).filter((k) => !docs[k]) : []);
      deals.push({
        deal_id: row.id,
        property_address: row.property_address || status.property_address,
        close_date: row.close_date || status.close_date,
        stage: status.stage || row.status || 'unknown',
        blockers: status.blockers || [],
        missing_documents: missing,
        portal_links: {
          agent: `/tc/agent-portal.html?deal=${encodeURIComponent(row.id)}`,
          client: `/tc/client-portal.html?deal=${encodeURIComponent(row.id)}`,
        },
        label: status.label || listed.label || 'THINK',
        source: status.source || listed.source || 'am17',
      });
    }
    const critical = deals.reduce((n, d) => n + ((d.blockers || []).length > 0 ? 1 : 0), 0);
    return {
      ok: true,
      summary: {
        active_count: deals.length,
        critical_blockers: critical,
        list_error: listed.error || null,
      },
      deals,
      label: deals.length ? 'KNOW' : (listed.error ? 'THINK' : 'KNOW'),
    };
  }

  return { getDealStatus, listActiveDeals, getDealDetail, getWorkspace };
}
