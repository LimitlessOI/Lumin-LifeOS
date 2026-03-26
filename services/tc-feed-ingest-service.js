/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-feed-ingest-service.js
 * Normalizes official MLS/showing-system feed payloads into canonical TC reporting data.
 */

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function median(values = []) {
  const nums = values.map(numberOrNull).filter((v) => v != null).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function average(values = []) {
  const nums = values.map(numberOrNull).filter((v) => v != null);
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeComp(item = {}) {
  return {
    status: String(item.status || item.listing_status || '').toLowerCase(),
    list_price: numberOrNull(item.list_price || item.listPrice || item.price),
    sold_price: numberOrNull(item.sold_price || item.sale_price || item.soldPrice),
    dom: numberOrNull(item.dom || item.days_on_market || item.daysOnMarket),
    price_reduced: !!(item.price_reduced || item.priceReduced || item.reduced),
    save_count: numberOrNull(item.save_count || item.saves),
    inquiry_count: numberOrNull(item.inquiry_count || item.inquiries || item.leads),
  };
}

export function createTCFeedIngestService({ coordinator, reportService, pool, logger = console }) {
  async function findShowingByExternalId(transactionId, externalId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_showings
       WHERE transaction_id=$1
         AND metadata->>'external_id' = $2
       LIMIT 1`,
      [transactionId, String(externalId)]
    );
    return rows[0] || null;
  }

  async function ingestMarketSnapshot(transactionId, payload = {}) {
    const comps = asArray(payload.comps || payload.listings || payload.records).map(normalizeComp);
    const active = comps.filter((item) => item.status === 'active');
    const pending = comps.filter((item) => item.status === 'pending' || item.status === 'under_contract');
    const sold = comps.filter((item) => item.status === 'sold' || item.status === 'closed');

    const snapshot = await reportService.createMarketSnapshot(transactionId, {
      snapshot_date: payload.snapshot_date || payload.snapshotDate || new Date().toISOString().slice(0, 10),
      active_comp_count: payload.active_comp_count ?? active.length,
      pending_comp_count: payload.pending_comp_count ?? pending.length,
      sold_comp_count: payload.sold_comp_count ?? sold.length,
      price_reduction_count: payload.price_reduction_count ?? comps.filter((item) => item.price_reduced).length,
      avg_dom: payload.avg_dom ?? average(comps.map((item) => item.dom)),
      median_list_price: payload.median_list_price ?? median(active.map((item) => item.list_price)),
      median_sold_price: payload.median_sold_price ?? median(sold.map((item) => item.sold_price || item.list_price)),
      view_count: payload.view_count ?? null,
      save_count: payload.save_count ?? average(comps.map((item) => item.save_count)),
      inquiry_count: payload.inquiry_count ?? average(comps.map((item) => item.inquiry_count)),
      metadata: {
        provider: payload.provider || 'manual_feed',
        comp_count: comps.length,
        comps,
        raw: payload,
      },
    });

    await coordinator.logEvent(transactionId, 'market_feed_ingested', {
      provider: payload.provider || 'manual_feed',
      snapshot_id: snapshot.id,
      comp_count: comps.length,
    });
    return snapshot;
  }

  async function ingestShowings(transactionId, payload = {}) {
    const feedItems = asArray(payload.showings || payload.events || payload.items);
    const results = [];

    for (const item of feedItems) {
      const externalId = item.external_id || item.externalId || item.id || null;
      const existing = externalId ? await findShowingByExternalId(transactionId, externalId) : null;
      const normalized = {
        showing_at: item.showing_at || item.showingAt || item.start_time || item.startTime,
        status: String(item.status || 'scheduled').toLowerCase(),
        showing_agent_name: item.showing_agent_name || item.agent_name || item.agentName || null,
        showing_agent_email: item.showing_agent_email || item.agent_email || item.agentEmail || null,
        showing_agent_phone: item.showing_agent_phone || item.agent_phone || item.agentPhone || null,
        source: payload.provider || item.source || 'feed',
        notes: item.notes || null,
        metadata: {
          external_id: externalId,
          provider: payload.provider || 'manual_feed',
          raw: item,
        },
      };

      if (existing) {
        results.push(await reportService.updateShowing(existing.id, normalized));
      } else if (normalized.showing_at) {
        results.push(await reportService.createShowing(transactionId, normalized));
      }
    }

    await coordinator.logEvent(transactionId, 'showing_feed_ingested', {
      provider: payload.provider || 'manual_feed',
      count: results.length,
    });

    return results;
  }

  return {
    ingestMarketSnapshot,
    ingestShowings,
  };
}

export default createTCFeedIngestService;
