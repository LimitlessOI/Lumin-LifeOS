/**
 * FinancialDashboard — ledger transactions and daily financial summary.
 * Extracted from server.js.
 * @ssot docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md
 */
import dayjs from "dayjs";
import logger from '../services/logger.js';

export class FinancialDashboard {
  constructor({ pool } = {}) {
    this.pool = pool;
  }

  async recordTransaction(
    type,
    amount,
    description,
    category = "general",
    externalId = null
  ) {
    try {
      const txId =
        externalId && externalId.trim()
          ? `ext_${externalId.trim()}`
          : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (externalId) {
        const existing = await this.pool.query(
          `SELECT id FROM financial_ledger WHERE external_id = $1`,
          [externalId]
        );
        if (existing.rows.length > 0) {
          return {
            txId: `ext_${externalId.trim()}`,
            type,
            amount: 0,
            description: `[duplicate ignored] ${description}`,
            category,
            date: new Date().toISOString(),
            duplicate: true,
          };
        }
      }

      await this.pool.query(
        `INSERT INTO financial_ledger (tx_id, type, amount, description, category, external_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [txId, type, amount, description, category, externalId]
      );

      return {
        txId,
        type,
        amount,
        description,
        category,
        externalId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Financial ledger error:", { error: error.message });
      return null;
    }
  }

  async getDashboard() {
    try {
      const todayStart = dayjs().startOf("day").toDate();
      const todayEnd = dayjs().endOf("day").toDate();

      const dailyResult = await this.pool.query(
        `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses
         FROM financial_ledger
         WHERE created_at >= $1 AND created_at <= $2`,
        [todayStart, todayEnd]
      );

      const dailyRow = dailyResult.rows[0];
      return {
        daily: {
          income: parseFloat(dailyRow.total_income) || 0,
          expenses: parseFloat(dailyRow.total_expenses) || 0,
          net:
            (parseFloat(dailyRow.total_income) || 0) -
            (parseFloat(dailyRow.total_expenses) || 0),
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        daily: { income: 0, expenses: 0, net: 0 },
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

export default FinancialDashboard;
