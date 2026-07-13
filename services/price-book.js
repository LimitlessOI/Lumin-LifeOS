/**
 * SYNOPSIS: Exports compareVendors — services/price-book.js.
 */
export async function compareVendors({ pool, partnerAId, partnerBId, catalogAId = null, catalogBId = null, logger } = {}) {
  if (!pool) throw new Error('pool is required');
  if (!partnerAId || !partnerBId) throw new Error('partnerAId and partnerBId are required');

  const partnerSql = `
    select id, partner_name, partner_code, contact_email, is_active, created_at, updated_at
    from price_book_partners
    where id = any($1::uuid[])
  `;
  const partnersRes = await pool.query(partnerSql, [ [partnerAId, partnerBId] ]);
  const partnersById = new Map(partnersRes.rows.map((row) => [row.id, row]));

  const partnerA = partnersById.get(partnerAId);
  const partnerB = partnersById.get(partnerBId);

  if (!partnerA || !partnerB) {
    throw new Error('One or both partners were not found');
  }

  const catalogSql = `
    select id, partner_id, catalog_name, currency_code, effective_start_date, effective_end_date, is_active, created_at, updated_at
    from price_book_catalogs
    where partner_id = any($1::uuid[])
    order by partner_id, effective_start_date desc nulls last, created_at desc
  `;
  const catalogsRes = await pool.query(catalogSql, [[partnerAId, partnerBId]]);
  const catalogsByPartner = new Map();
  for (const row of catalogsRes.rows) {
    if (!catalogsByPartner.has(row.partner_id)) catalogsByPartner.set(row.partner_id, []);
    catalogsByPartner.get(row.partner_id).push(row);
  }

  const chosenCatalogA = catalogAId || catalogsByPartner.get(partnerAId)?.[0]?.id || null;
  const chosenCatalogB = catalogBId || catalogsByPartner.get(partnerBId)?.[0]?.id || null;

  const itemSql = `
    select id, catalog_id, sku, item_name, item_description, unit_price, setup_fee, min_quantity, max_quantity, lead_time_days, is_active, metadata, created_at, updated_at
    from price_book_items
    where catalog_id = any($1::uuid[])
    order by sku asc, created_at asc
  `;
  const itemCatalogIds = [chosenCatalogA, chosenCatalogB].filter(Boolean);
  const itemsRes = itemCatalogIds.length ? await pool.query(itemSql, [itemCatalogIds]) : { rows: [] };

  const itemsByCatalog = new Map();
  for (const row of itemsRes.rows) {
    if (!itemsByCatalog.has(row.catalog_id)) itemsByCatalog.set(row.catalog_id, []);
    itemsByCatalog.get(row.catalog_id).push(row);
  }

  const normalizeMoney = (value) => (value === null || value === undefined ? null : Number(value));
  const normalizeNumber = (value) => (value === null || value === undefined ? null : Number(value));

  const itemMap = (rows) => {
    const map = new Map();
    for (const item of rows || []) {
      const key = item.sku || item.item_name || item.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  };

  const aItems = itemsByCatalog.get(chosenCatalogA) || [];
  const bItems = itemsByCatalog.get(chosenCatalogB) || [];
  const aMap = itemMap(aItems);
  const bMap = itemMap(bItems);

  const allKeys = new Set([...aMap.keys(), ...bMap.keys()]);
  const comparisons = [...allKeys].sort((x, y) => String(x).localeCompare(String(y))).map((key) => {
    const a = aMap.get(key)?.[0] || null;
    const b = bMap.get(key)?.[0] || null;
    const fieldDiffs = [];
    const fields = [
      ['unit_price', 'price', normalizeMoney],
      ['setup_fee', 'setup fee', normalizeMoney],
      ['min_quantity', 'minimum quantity', normalizeNumber],
      ['max_quantity', 'maximum quantity', normalizeNumber],
      ['lead_time_days', 'lead time days', normalizeNumber],
      ['is_active', 'active status', (v) => Boolean(v)],
      ['item_name', 'name', (v) => v || null],
      ['item_description', 'description', (v) => v || null]
    ];

    for (const [field, label, normalizer] of fields) {
      const av = normalizer(a?.[field]);
      const bv = normalizer(b?.[field]);
      if (JSON.stringify(av) !== JSON.stringify(bv)) {
        fieldDiffs.push({
          field,
          label,
          a: av,
          b: bv
        });
      }
    }

    const honestSignals = [];
    const weakSignals = [];

    if (a?.unit_price != null && b?.unit_price != null) {
      const ap = Number(a.unit_price);
      const bp = Number(b.unit_price);
      if (ap < bp) honestSignals.push(`${partnerA.partner_name} is cheaper on ${key}`);
      if (bp < ap) honestSignals.push(`${partnerB.partner_name} is cheaper on ${key}`);
      if (ap === bp) honestSignals.push(`Same price on ${key}`);
    }

    if (a?.lead_time_days != null && b?.lead_time_days != null) {
      if (Number(a.lead_time_days) < Number(b.lead_time_days)) honestSignals.push(`${partnerA.partner_name} is faster on ${key}`);
      if (Number(b.lead_time_days) < Number(a.lead_time_days)) honestSignals.push(`${partnerB.partner_name} is faster on ${key}`);
    }

    if (!a && b) weakSignals.push(`${partnerA.partner_name} does not offer ${key} in the selected catalog`);
    if (a && !b) weakSignals.push(`${partnerB.partner_name} does not offer ${key} in the selected catalog`);

    return {
      sku: key,
      partnerA: a,
      partnerB: b,
      differences: fieldDiffs,
      honest_review: honestSignals.length ? honestSignals.join('; ') : 'No strong advantage detected',
      weak_review: weakSignals.length ? weakSignals.join('; ') : 'No obvious catalog gap detected'
    };
  });

  const summary = {
    partner_a: partnerA,
    partner_b: partnerB,
    catalog_a: chosenCatalogA ? (catalogsByPartner.get(partnerAId) || []).find((c) => c.id === chosenCatalogA) || null : null,
    catalog_b: chosenCatalogB ? (catalogsByPartner.get(partnerBId) || []).find((c) => c.id === chosenCatalogB) || null : null,
    counts: {
      items_a: aItems.length,
      items_b: bItems.length,
      compared_skus: comparisons.length
    },
    comparison: comparisons
  };

  if (logger?.info) {
    logger.info({ partnerAId, partnerBId, catalogAId: chosenCatalogA, catalogBId: chosenCatalogB, compared: comparisons.length }, 'price book vendor comparison completed');
  }

  return summary;
}

export async function comparePriceBooks(pool, partnerAId, partnerBId, options = {}) {
  return compareVendors({ pool, partnerAId, partnerBId, ...options });
}

export default compareVendors;