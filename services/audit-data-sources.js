/**
 * SYNOPSIS: ASSUMPTIONS:
 */
export async function fetchAuditData(deps, source, options = {}) {
  const {
    pool,
    logger = console,
    callCouncilMember,
  } = deps || {};

  if (!pool || typeof pool.query !== "function") {
    throw new Error("deps.pool is required");
  }

  const normalizedSource = String(source || "").trim().toLowerCase();

  const limit = clampInt(options.limit ?? 50, 1, 500);
  const offset = clampInt(options.offset ?? 0, 0, 100000);

  if (normalizedSource === "manual intake") {
    return fetchManualIntakeAudit(pool, { limit, offset, logger });
  }

  if (normalizedSource === "plaid") {
    return fetchPlaidAudit(pool, { limit, offset, logger, callCouncilMember, options });
  }

  if (normalizedSource.startsWith("oauth:")) {
    const vendor = normalizedSource.slice("oauth:".length).trim();
    if (!vendor) {
      throw new Error("OAuth vendor is required");
    }
    return fetchOAuthVendorAudit(pool, { vendor, limit, offset, logger, callCouncilMember, options });
  }

  throw new Error(`Unsupported audit data source: ${source}`);
}

async function fetchPlaidAudit(pool, { limit, offset, logger, callCouncilMember, options }) {
  const vendor = "plaid";
  const audited = await queryBusinessAudits(pool, vendor, limit, offset);

  if (!audited.length && typeof callCouncilMember === "function") {
    try {
      await callCouncilMember(
        "audit-integrator",
        `No direct audit rows found for ${vendor}. Summarize the expected live audit signal shape from existing LifeOS audit sources so the caller can fall back safely.`,
        { vendor, source: "plaid", limit, offset }
      );
    } catch (err) {
      logger?.warn?.({ err, vendor }, "plaid audit enrichment call failed");
    }
  }

  return {
    source: "plaid",
    vendor,
    records: audited,
    count: audited.length,
    limit,
    offset,
    cursor: null,
    meta: {
      source_kind: "business_audits",
      vendor_auth: vendor,
      requested: options,
    },
  };
}

async function fetchManualIntakeAudit(pool, { limit, offset, logger }) {
  const rows = await pool.query(
    `
      SELECT id, tenant_id, actor, action_type, entity_type, entity_id, details, created_at
      FROM clientcare_audit_log
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  return {
    source: "manual intake",
    records: rows.rows,
    count: rows.rows.length,
    limit,
    offset,
    cursor: null,
    meta: {
      source_kind: "clientcare_audit_log",
    },
  };
}

async function fetchOAuthVendorAudit(pool, { vendor, limit, offset, logger, callCouncilMember, options }) {
  const normalizedVendor = vendor.toLowerCase();

  const direct = await queryBusinessAudits(pool, normalizedVendor, limit, offset);

  if (direct.length > 0) {
    return {
      source: `oauth:${normalizedVendor}`,
      vendor: normalizedVendor,
      records: direct,
      count: direct.length,
      limit,
      offset,
      cursor: null,
      meta: {
        source_kind: "business_audits",
        vendor_auth: normalizedVendor,
        requested: options,
      },
    };
  }

  const fallbackTables = [
    {
      name: "railway_env_sync_audit",
      sql: `
        SELECT id, env_name AS vendor, action, actor, status, details, created_at
        FROM railway_env_sync_audit
        WHERE lower(actor) = $1 OR lower(env_name) = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2 OFFSET $3
      `,
    },
    {
      name: "tc_alert_deliveries",
      sql: `
        SELECT id, alert_id, channel, status, payload, created_at
        FROM tc_alert_deliveries
        ORDER BY created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
    },
    {
      name: "conductor_builder_audit",
      sql: `
        SELECT id, created_at, domain, task_preview, model_used, output_chars, cache_hit, placement_json
        FROM conductor_builder_audit
        ORDER BY created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
    },
    {
      name: "kingsman_audit_log",
      sql: `
        SELECT id, created_at, member, task_type, prompt_hash, risk_score, notes, timestamp, pattern, evidence, consensus
        FROM kingsman_audit_log
        ORDER BY created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
    },
  ];

  for (const table of fallbackTables) {
    try {
      const result = table.name === "railway_env_sync_audit"
        ? await pool.query(table.sql, [normalizedVendor, limit, offset])
        : await pool.query(table.sql, [limit, offset]);

      if (result.rows.length > 0) {
        return {
          source: `oauth:${normalizedVendor}`,
          vendor: normalizedVendor,
          records: result.rows,
          count: result.rows.length,
          limit,
          offset,
          cursor: null,
          meta: {
            source_kind: table.name,
            vendor_auth: normalizedVendor,
            requested: options,
          },
        };
      }
    } catch (err) {
      logger?.warn?.({ err, table: table.name, vendor: normalizedVendor }, "oauth vendor fallback query failed");
    }
  }

  if (typeof callCouncilMember === "function") {
    try {
      await callCouncilMember(
        "audit-integrator",
        `No OAuth vendor audit rows were found for ${normalizedVendor}. Return a concise suggestion for where live audit evidence is most likely to exist in the current LifeOS schema.`,
        { vendor: normalizedVendor, source: `oauth:${normalizedVendor}`, limit, offset }
      );
    } catch (err) {
      logger?.warn?.({ err, vendor: normalizedVendor }, "oauth audit enrichment call failed");
    }
  }

  return {
    source: `oauth:${normalizedVendor}`,
    vendor: normalizedVendor,
    records: [],
    count: 0,
    limit,
    offset,
    cursor: null,
    meta: {
      source_kind: null,
      vendor_auth: normalizedVendor,
      requested: options,
    },
  };
}

async function queryBusinessAudits(pool, vendorAuth, limit, offset) {
  const result = await pool.query(
    `
      SELECT id, stack, vendor_auth, created_at
      FROM business_audits
      WHERE lower(vendor_auth) = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `,
    [String(vendorAuth).toLowerCase(), limit, offset]
  );

  return result.rows;
}

function clampInt(value, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// ASSUMPTIONS:
// - "Plaid" audit data is represented by live rows in business_audits with vendor_auth = 'plaid'.
// - "manual intake" maps to clientcare_audit_log.
// - "OAuth per vendor" prefers business_audits by vendor_auth, then falls back to other live audit tables when no direct vendor rows exist.