/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                         TCO SAVINGS TRACKER (TCO-E01)                             ║
 * ║          Savings ledger per request - before/after tokens, cost, quality          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * STATUS: IN_BUILD
 * TYPE: PROOF
 * MECHANISM: Track every request with before/after metrics to prove savings
 * METRIC: Verified savings report (monthly)
 */

export class TCOTracker {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Track a proxied request with full before/after metrics
   * This is the core of TCO-E01: Savings ledger
   */
  async trackRequest({
    customerId,
    customerApiKey,
    originalProvider, // 'openai', 'anthropic', 'google'
    originalModel, // What they would have called
    actualProvider, // Where we routed it
    actualModel, // What we actually used
    originalTokens, // Estimated tokens without optimization
    actualTokens, // Actual tokens used after compression
    originalCost, // What they would have paid
    actualCost, // What we actually paid
    savings, // originalCost - actualCost
    savingsPercent, // (savings / originalCost) * 100
    cacheHit, // Boolean - was this cached?
    compressionUsed, // Boolean - did we use MICRO compression?
    qualityScore, // 0-100 quality score (if available)
    latencyMs, // Response time
    requestMetadata, // { prompt_tokens, completion_tokens, etc }
  }) {
    try {
      const result = await this.pool.query(
        `INSERT INTO tco_requests (
          customer_id,
          customer_api_key,
          original_provider,
          original_model,
          actual_provider,
          actual_model,
          original_tokens,
          actual_tokens,
          original_cost,
          actual_cost,
          savings,
          savings_percent,
          cache_hit,
          compression_used,
          quality_score,
          latency_ms,
          request_metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        RETURNING id`,
        [
          customerId,
          customerApiKey,
          originalProvider,
          originalModel,
          actualProvider,
          actualModel,
          originalTokens || 0,
          actualTokens || 0,
          originalCost || 0,
          actualCost || 0,
          savings || 0,
          savingsPercent || 0,
          cacheHit || false,
          compressionUsed || false,
          qualityScore || null,
          latencyMs || null,
          JSON.stringify(requestMetadata || {}),
        ]
      );

      return {
        success: true,
        requestId: result.rows[0].id,
      };
    } catch (error) {
      console.error('TCO Tracker Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get savings report for a customer
   */
  async getSavingsReport(customerId, startDate = null, endDate = null) {
    try {
      let dateFilter = '';
      const params = [customerId];

      if (startDate && endDate) {
        dateFilter = 'AND created_at BETWEEN $2 AND $3';
        params.push(startDate, endDate);
      } else if (startDate) {
        dateFilter = 'AND created_at >= $2';
        params.push(startDate);
      }

      // Summary metrics
      const summary = await this.pool.query(
        `SELECT
          COUNT(*) as total_requests,
          SUM(original_cost) as total_would_have_cost,
          SUM(actual_cost) as total_actual_cost,
          SUM(savings) as total_savings,
          AVG(savings_percent) as avg_savings_percent,
          SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
          SUM(CASE WHEN compression_used THEN 1 ELSE 0 END) as compression_used_count,
          AVG(quality_score) as avg_quality_score,
          AVG(latency_ms) as avg_latency_ms
         FROM tco_requests
         WHERE customer_id = $1 ${dateFilter}`,
        params
      );

      // Breakdown by model
      const byModel = await this.pool.query(
        `SELECT
          original_provider,
          original_model,
          COUNT(*) as request_count,
          SUM(savings) as total_savings,
          AVG(savings_percent) as avg_savings_percent
         FROM tco_requests
         WHERE customer_id = $1 ${dateFilter}
         GROUP BY original_provider, original_model
         ORDER BY total_savings DESC`,
        params
      );

      // Daily breakdown (last 30 days)
      const daily = await this.pool.query(
        `SELECT
          DATE(created_at) as date,
          COUNT(*) as requests,
          SUM(savings) as savings,
          AVG(savings_percent) as savings_percent
         FROM tco_requests
         WHERE customer_id = $1 ${dateFilter}
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        params
      );

      return {
        success: true,
        customerId,
        period: {
          start: startDate || 'all time',
          end: endDate || 'now',
        },
        summary: summary.rows[0],
        byModel: byModel.rows,
        daily: daily.rows,
      };
    } catch (error) {
      console.error('Error generating savings report:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate our revenue (20% of savings)
   */
  async calculateRevenue(customerId, startDate = null, endDate = null) {
    const report = await this.getSavingsReport(customerId, startDate, endDate);

    if (!report.success) {
      return report;
    }

    const totalSavings = parseFloat(report.summary.total_savings || 0);
    const ourRevenue = totalSavings * 0.20; // 20% of savings

    return {
      success: true,
      customerId,
      totalSavings,
      ourRevenue,
      revenueShare: 0.20,
      period: report.period,
    };
  }

  /**
   * Get customer monthly invoice data
   */
  async getMonthlyInvoice(customerId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const report = await this.getSavingsReport(customerId, startDate, endDate);
    const revenue = await this.calculateRevenue(customerId, startDate, endDate);

    return {
      success: true,
      customerId,
      month,
      year,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      metrics: report.summary,
      breakdown: report.byModel,
      billing: {
        totalSavings: revenue.totalSavings,
        ourFee: revenue.ourRevenue,
        revenueShare: '20%',
        amountDue: revenue.ourRevenue,
      },
    };
  }

  /**
   * Estimate cost savings for a request (before executing)
   * Used for the difficulty classifier (TCO-B01)
   */
  estimateSavings({
    originalProvider,
    originalModel,
    estimatedTokens,
  }) {
    // Cost per 1K tokens (approximate)
    const costs = {
      openai: {
        'gpt-4': 0.03, // $0.03/1K tokens
        'gpt-4-turbo': 0.01,
        'gpt-3.5-turbo': 0.002,
      },
      anthropic: {
        'claude-3-opus': 0.015,
        'claude-3-sonnet': 0.003,
        'claude-3-haiku': 0.00025,
      },
      google: {
        'gemini-pro': 0.00025,
        'gemini-ultra': 0.01,
      },
    };

    const originalCostPer1K = costs[originalProvider]?.[originalModel] || 0.01;
    const originalCost = (estimatedTokens / 1000) * originalCostPer1K;

    // With our optimization (90-95% reduction)
    const optimizedTokens = estimatedTokens * 0.1; // 90% reduction
    const actualCost = (optimizedTokens / 1000) * 0.0001; // Use cheap model

    const savings = originalCost - actualCost;
    const savingsPercent = (savings / originalCost) * 100;

    return {
      originalCost,
      actualCost,
      savings,
      savingsPercent,
    };
  }
}

export default TCOTracker;
