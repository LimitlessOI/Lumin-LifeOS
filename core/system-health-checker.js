/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SYSTEM HEALTH CHECKER                                          ║
 * ║                    Comprehensive system health validation                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class SystemHealthChecker {
  constructor(pool, allSystems = {}) {
    this.pool = pool;
    this.systems = allSystems;
  }

  /**
   * Run full health check
   */
  async runFullHealthCheck() {
    const results = {
      database: await this.checkDatabase(),
      systems: await this.checkSystems(),
      dependencies: await this.checkDependencies(),
      overall: 'healthy',
      timestamp: new Date().toISOString(),
    };

    // Determine overall health
    const hasErrors = Object.values(results).some(r => r && r.status === 'error');
    const hasWarnings = Object.values(results).some(r => r && r.status === 'warning');
    
    if (hasErrors) {
      results.overall = 'unhealthy';
    } else if (hasWarnings) {
      results.overall = 'degraded';
    }

    return results;
  }

  /**
   * Check database connection
   */
  async checkDatabase() {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'healthy', message: 'Database connected' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Check all systems
   */
  async checkSystems() {
    const systemStatus = {};
    
    for (const [name, system] of Object.entries(this.systems)) {
      try {
        if (system && typeof system.getStatus === 'function') {
          const status = await system.getStatus();
          systemStatus[name] = { status: 'healthy', ...status };
        } else if (system) {
          systemStatus[name] = { status: 'healthy', message: 'System exists' };
        } else {
          systemStatus[name] = { status: 'warning', message: 'System not initialized' };
        }
      } catch (error) {
        systemStatus[name] = { status: 'error', message: error.message };
      }
    }

    return systemStatus;
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    try {
      const { dependencyAuditor } = await import('./dependency-auditor.js');
      const audit = await dependencyAuditor.auditAll();
      
      if (audit.npmPackages.missing.length > 0) {
        return { 
          status: 'warning', 
          message: `${audit.npmPackages.missing.length} dependencies missing`,
          missing: audit.npmPackages.missing,
        };
      }
      
      return { status: 'healthy', message: 'All dependencies present' };
    } catch (error) {
      return { status: 'warning', message: 'Could not check dependencies', error: error.message };
    }
  }
}
