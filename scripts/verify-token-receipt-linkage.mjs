/**
 * SYNOPSIS: Verify token↔build linkage rate (S00). Prefer live DB; fall back to control-plane API.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import pg from 'pg';

async function fromDb() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS sample,
         COUNT(*) FILTER (WHERE token_receipt_id IS NOT NULL OR unmetered_exception_id IS NOT NULL)::int AS linked
       FROM (
         SELECT token_receipt_id, unmetered_exception_id
         FROM build_task_ledger
         WHERE start_time >= NOW() - INTERVAL '7 days'
           AND status IN ('done', 'failed')
         ORDER BY start_time DESC
         LIMIT 50
       ) recent`,
    );
    const sample = rows[0]?.sample || 0;
    const linked = rows[0]?.linked || 0;
    const linkage_rate = sample > 0 ? linked / sample : null;
    return {
      ok: true,
      source: 'database',
      sample,
      linked,
      linkage_rate,
      linkage_gap: sample === 0 ? true : linkage_rate < 0.5,
      linkage_gap_note: sample === 0
        ? 'No recent done/failed builds in ledger — cannot prove spend→outcome join yet'
        : linkage_rate < 0.5
          ? `Only ${linked}/${sample} recent builds have token_receipt_id — kernel linker + request_id tagging still incomplete`
          : 'Linkage rate ≥50% on recent sample',
      checked_at: new Date().toISOString(),
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function fromApi(baseUrl, commandKey) {
  const url = new URL('/api/v1/builderos/control-plane/linkage', baseUrl).toString();
  const res = await fetch(url, {
    headers: { 'x-command-key': commandKey, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok && data.ok !== false,
    source: 'api',
    ...data,
    checked_at: new Date().toISOString(),
  };
}

export async function runTokenReceiptLinkageVerification({ baseUrl, commandKey } = {}) {
  if (process.env.DATABASE_URL) {
    try {
      return await fromDb();
    } catch (err) {
      /* fall through */
      if (!baseUrl) {
        return {
          ok: false,
          linkage_gap: true,
          linkage_gap_note: err.message,
          checked_at: new Date().toISOString(),
        };
      }
    }
  }
  if (baseUrl && commandKey) {
    try {
      return await fromApi(baseUrl, commandKey);
    } catch (err) {
      return {
        ok: false,
        linkage_gap: true,
        linkage_gap_note: err.message,
        checked_at: new Date().toISOString(),
      };
    }
  }
  return {
    ok: false,
    linkage_gap: true,
    linkage_gap_note: 'Need DATABASE_URL or baseUrl+commandKey',
    checked_at: new Date().toISOString(),
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('verify-token-receipt-linkage.mjs')) {
  const baseUrl = process.env.APP_URL || process.env.BASE_URL || '';
  const commandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_COMMAND_KEY || '';
  runTokenReceiptLinkageVerification({ baseUrl, commandKey }).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.linkage_gap ? 1 : 0);
  });
}