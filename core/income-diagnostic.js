/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    INCOME GENERATION DIAGNOSTIC                                  ║
 * ║                    Checks if drones are actually generating income              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class IncomeDiagnostic {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Run full diagnostic
   */
  async runDiagnostic() {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      drones: await this.checkDrones(),
      opportunities: await this.checkOpportunities(),
      revenue: await this.checkRevenue(),
      issues: [],
      recommendations: [],
    };

    // Identify issues
    if (diagnostic.drones.active === 0) {
      diagnostic.issues.push('NO_ACTIVE_DRONES');
      diagnostic.recommendations.push('Deploy income drones immediately');
    }

    if (diagnostic.opportunities.total === 0) {
      diagnostic.issues.push('NO_OPPORTUNITIES_GENERATED');
      diagnostic.recommendations.push('Check if drones are calling AI APIs successfully');
    }

    if (diagnostic.revenue.total === 0) {
      diagnostic.issues.push('NO_REVENUE_RECORDED');
      diagnostic.recommendations.push('Check if recordRevenue is being called');
    }

    if (diagnostic.drones.active > 0 && diagnostic.opportunities.total === 0) {
      diagnostic.issues.push('DRONES_NOT_WORKING');
      diagnostic.recommendations.push('Check AI API keys and drone execution logs');
    }

    return diagnostic;
  }

  /**
   * Check drone status
   */
  async checkDrones() {
    try {
      const result = await this.pool.query(
        `SELECT 
          drone_id,
          drone_type,
          status,
          revenue_generated,
          tasks_completed,
          expected_revenue,
          deployed_at,
          updated_at
         FROM income_drones 
         ORDER BY deployed_at DESC`
      );

      return {
        active: result.rows.filter(d => d.status === 'active').length,
        total: result.rows.length,
        drones: result.rows,
        totalRevenue: result.rows.reduce((sum, d) => sum + parseFloat(d.revenue_generated || 0), 0),
        totalTasks: result.rows.reduce((sum, d) => sum + parseInt(d.tasks_completed || 0), 0),
      };
    } catch (error) {
      return {
        active: 0,
        total: 0,
        drones: [],
        error: error.message,
      };
    }
  }

  /**
   * Check opportunities generated
   */
  async checkOpportunities() {
    try {
      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT drone_id) as drones_with_opportunities,
          SUM(revenue_estimate) as total_estimated_revenue,
          opportunity_type,
          status
         FROM drone_opportunities
         GROUP BY opportunity_type, status
         ORDER BY total DESC`
      );

      const totalResult = await this.pool.query(
        `SELECT COUNT(*) as total, SUM(revenue_estimate) as total_estimated
         FROM drone_opportunities`
      );

      return {
        total: parseInt(totalResult.rows[0]?.total || 0),
        totalEstimatedRevenue: parseFloat(totalResult.rows[0]?.total_estimated || 0),
        byType: result.rows,
      };
    } catch (error) {
      return {
        total: 0,
        totalEstimatedRevenue: 0,
        error: error.message,
      };
    }
  }

  /**
   * Check revenue recorded
   */
  async checkRevenue() {
    try {
      const droneRevenue = await this.pool.query(
        `SELECT SUM(revenue_generated) as total FROM income_drones WHERE status = 'active'`
      );

      const ledgerRevenue = await this.pool.query(
        `SELECT SUM(amount) as total 
         FROM financial_ledger 
         WHERE type = 'income' 
         AND created_at > NOW() - INTERVAL '24 hours'`
      );

      return {
        total: parseFloat(droneRevenue.rows[0]?.total || 0),
        last24Hours: parseFloat(ledgerRevenue.rows[0]?.total || 0),
        source: 'drone_revenue',
      };
    } catch (error) {
      return {
        total: 0,
        last24Hours: 0,
        error: error.message,
      };
    }
  }
}
