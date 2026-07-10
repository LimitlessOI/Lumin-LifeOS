/**
 * SYNOPSIS: Service module — Builder Runtime Mode Service.
 */
const VALID_MODES = new Set(['run', 'dry_run', 'paused']);
const SENTINEL_ID = 'builder_runtime_config_singleton';

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const value = mode.trim();
  return VALID_MODES.has(value) ? value : null;
}

function assertValidMode(mode) {
  const normalized = normalizeMode(mode);
  if (!normalized) {
    throw new Error("Invalid mode. Allowed values: 'run', 'dry_run', 'paused'.");
  }
  return normalized;
}

async function getCurrentMode(db) {
  const { rows } = await db.query(
    'SELECT mode, updated_at, updated_by FROM builder_runtime_config WHERE id = $1 LIMIT 1',
    [SENTINEL_ID]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  return {
    mode: null,
    updated_at: null,
    updated_by: null,
  };
}

async function setMode(db, mode, triggeredBy, receiptPayload) {
  const normalizedMode = assertValidMode(mode);

  const upsertResult = await db.query(
    `
      INSERT INTO builder_runtime_config (id, mode, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (id)
      DO UPDATE SET
        mode = EXCLUDED.mode,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING mode, updated_at, updated_by
    `,
    [SENTINEL_ID, normalizedMode, triggeredBy ?? null]
  );

  const receiptResult = await db.query(
    `
      INSERT INTO builder_mode_receipts (mode, triggered_by, receipt_payload)
      VALUES ($1, $2, $3)
      RETURNING id, mode, triggered_by, receipt_payload, created_at
    `,
    [normalizedMode, triggeredBy ?? null, receiptPayload ?? null]
  );

  return {
    current: upsertResult.rows[0],
    receipt: receiptResult.rows[0],
  };
}

async function getReceipts(db, limit = 25) {
  const parsedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.trunc(limit))) : 25;

  const { rows } = await db.query(
    `
      SELECT id, mode, triggered_by, receipt_payload, created_at
      FROM builder_mode_receipts
      ORDER BY created_at DESC, id DESC
      LIMIT $1
    `,
    [parsedLimit]
  );

  return rows;
}

export { getCurrentMode, setMode, getReceipts };