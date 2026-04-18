/**
 * LifeOS Personal Finance — budgets, categories, goals, IPS text (non-advisory mirror layer).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createLifeOSFinance({ pool }) {
  async function listAccounts(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_finance_accounts WHERE user_id=$1 AND active=true ORDER BY name`,
      [userId],
    );
    return rows;
  }

  async function createAccount(userId, { name, account_type, currency, external_ref }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_finance_accounts (user_id, name, account_type, currency, external_ref)
       VALUES ($1,$2,$3,COALESCE($4,'USD'),$5) RETURNING *`,
      [userId, name, account_type || 'other', currency, external_ref || null],
    );
    return rows[0];
  }

  async function listCategories(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_finance_categories WHERE user_id=$1 ORDER BY sort_order, name`,
      [userId],
    );
    return rows;
  }

  async function createCategory(userId, { name, values_tag, monthly_cap, sort_order }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_finance_categories (user_id, name, values_tag, monthly_cap, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, name, values_tag || null, monthly_cap ?? null, sort_order ?? 0],
    );
    return rows[0];
  }

  async function listTransactions(userId, { limit = 100, from, to } = {}) {
    let sql = `SELECT t.*, c.name AS category_name
      FROM lifeos_finance_transactions t
      LEFT JOIN lifeos_finance_categories c ON c.id = t.category_id
      WHERE t.user_id=$1`;
    const p = [userId];
    if (from) {
      p.push(from);
      sql += ` AND t.txn_date >= $${p.length}`;
    }
    if (to) {
      p.push(to);
      sql += ` AND t.txn_date <= $${p.length}`;
    }
    // Clamp limit to a positive integer; protects against NaN / non-numeric input.
    const parsed = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, parsed)) : 100;
    sql += ` ORDER BY t.txn_date DESC, t.id DESC LIMIT ${safeLimit}`;
    const { rows } = await pool.query(sql, p);
    return rows;
  }

  async function createTransaction(userId, { account_id, category_id, amount, txn_date, memo, source }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_finance_transactions
        (user_id, account_id, category_id, amount, txn_date, memo, source)
       VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,COALESCE($7,'manual')) RETURNING *`,
      [userId, account_id || null, category_id || null, amount, txn_date || null, memo || null, source || 'manual'],
    );
    return rows[0];
  }

  async function summaryMonth(userId, yyyymm) {
    let start;
    if (yyyymm && /^\d{4}-\d{2}$/.test(String(yyyymm))) {
      start = `${yyyymm}-01`;
    } else {
      const { rows: cur } = await pool.query(`SELECT date_trunc('month', CURRENT_DATE)::date AS d`);
      start = cur[0].d;
    }
    const { rows: spend } = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS spent
       FROM lifeos_finance_transactions
       WHERE user_id=$1 AND txn_date >= $2::date AND txn_date < ($2::date + INTERVAL '1 month')`,
      [userId, start],
    );
    const { rows: caps } = await pool.query(
      `SELECT name, monthly_cap FROM lifeos_finance_categories WHERE user_id=$1 AND monthly_cap IS NOT NULL`,
      [userId],
    );
    return { month_start: start, net_cents_agnostic: spend[0]?.spent, categories_with_cap: caps };
  }

  async function listGoals(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_finance_goals WHERE user_id=$1 ORDER BY target_date NULLS LAST, name`,
      [userId],
    );
    return rows;
  }

  async function upsertGoal(userId, payload) {
    const { id, name, target_amount, current_amount, target_date, dream_id, notes } = payload;
    if (id) {
      const { rows } = await pool.query(
        `UPDATE lifeos_finance_goals SET
          name=COALESCE($2,name), target_amount=COALESCE($3,target_amount),
          current_amount=COALESCE($4,current_amount), target_date=$5, dream_id=$6, notes=$7, updated_at=NOW()
         WHERE id=$1 AND user_id=$8 RETURNING *`,
        [id, name, target_amount, current_amount, target_date || null, dream_id || null, notes || null, userId],
      );
      return rows[0] || null;
    }
    const { rows } = await pool.query(
      `INSERT INTO lifeos_finance_goals (user_id, name, target_amount, current_amount, target_date, dream_id, notes)
       VALUES ($1,$2,$3,COALESCE($4,0),$5,$6,$7) RETURNING *`,
      [userId, name, target_amount ?? null, current_amount, target_date || null, dream_id || null, notes || null],
    );
    return rows[0];
  }

  async function getIps(userId) {
    const { rows } = await pool.query(`SELECT * FROM lifeos_finance_ips WHERE user_id=$1`, [userId]);
    return rows[0] || null;
  }

  async function putIps(userId, { statement_text, risk_notes }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_finance_ips (user_id, statement_text, risk_notes)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET
         statement_text = EXCLUDED.statement_text,
         risk_notes = EXCLUDED.risk_notes,
         updated_at = NOW()
       RETURNING *`,
      [userId, statement_text ?? '', risk_notes ?? ''],
    );
    return rows[0];
  }

  return {
    listAccounts,
    createAccount,
    listCategories,
    createCategory,
    listTransactions,
    createTransaction,
    summaryMonth,
    listGoals,
    upsertGoal,
    getIps,
    putIps,
  };
}
