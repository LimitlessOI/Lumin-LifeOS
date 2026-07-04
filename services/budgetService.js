/**
 * SYNOPSIS: Exports createBudgetService — services/budgetService.js.
 */
export function createBudgetService({ pool, logger }) {
  const MODE_SET = new Set([
    'fixed',
    'percentage',
    'envelope',
    'zero_based',
    'needs_based',
    'hybrid',
  ]);

  function normalizeMode(mode) {
    const value = String(mode || '').trim().toLowerCase();
    return MODE_SET.has(value) ? value : 'fixed';
  }

  function safeJson(value, fallback = {}) {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  async function getUserBudgetMode(ownerId) {
    const { rows } = await pool.query(
      `SELECT user_id, budget_mode, metadata, created_at, updated_at
         FROM user_budget_preferences
        WHERE user_id = $1
        LIMIT 1`,
      [ownerId],
    );
    const row = rows[0];
    if (!row) {
      return {
        user_id: ownerId,
        budget_mode: 'fixed',
        metadata: {},
        created_at: null,
        updated_at: null,
      };
    }
    return {
      ...row,
      budget_mode: normalizeMode(row.budget_mode),
      metadata: safeJson(row.metadata, {}),
    };
  }

  async function setUserBudgetMode(ownerId, budgetMode, metadata = {}) {
    const normalizedMode = normalizeMode(budgetMode);
    const metadataJson = JSON.stringify(safeJson(metadata, {}));

    const { rows } = await pool.query(
      `INSERT INTO user_budget_preferences (user_id, budget_mode, metadata)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id)
       DO UPDATE SET budget_mode = EXCLUDED.budget_mode,
                     metadata = EXCLUDED.metadata,
                     updated_at = NOW()
       RETURNING user_id, budget_mode, metadata, created_at, updated_at`,
      [ownerId, normalizedMode, metadataJson],
    );

    const row = rows[0];
    return {
      ...row,
      budget_mode: normalizeMode(row.budget_mode),
      metadata: safeJson(row.metadata, {}),
    };
  }

  async function listSupportedBudgetModes() {
    return Array.from(MODE_SET);
  }

  async function getBudgetModeSummary(ownerId) {
    const pref = await getUserBudgetMode(ownerId);
    return {
      user_id: ownerId,
      budget_mode: pref.budget_mode,
      metadata: pref.metadata,
      supported_modes: await listSupportedBudgetModes(),
    };
  }

  return {
    getUserBudgetMode,
    setUserBudgetMode,
    listSupportedBudgetModes,
    getBudgetModeSummary,
  };
}