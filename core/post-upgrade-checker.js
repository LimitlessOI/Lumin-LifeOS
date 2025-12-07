/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    POST-UPGRADE CHECKER                                           ║
 * ║                    Automatically checks logs and fixes errors after upgrades     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class PostUpgradeChecker {
  constructor(logMonitor, callCouncilMember, pool = null) {
    this.logMonitor = logMonitor;
    this.callCouncilMember = callCouncilMember;
    this.pool = pool;
    this.lastUpgradeTime = null;
    this.checkInterval = null;
    this.errorAppearanceTimes = []; // Track when errors first appear
    this.checkCount = 0;
    this.stableChecks = 0; // Count consecutive checks with no errors
    this.isStable = false;
  }

  /**
   * Check logs after upgrade and fix automatically
   * Tracks when errors first appear to optimize check timing
   */
  async checkAfterUpgrade() {
    if (!this.logMonitor) {
      console.warn('⚠️ [POST-UPGRADE] Log monitor not available');
      return { errors: [], fixed: 0 };
    }

    const checkStartTime = Date.now();
    const timeSinceUpgrade = this.lastUpgradeTime 
      ? (checkStartTime - this.lastUpgradeTime.getTime()) / 1000 
      : 0;
    
    console.log(`🔍 [POST-UPGRADE] Checking logs (${timeSinceUpgrade.toFixed(1)}s since upgrade)...`);
    
    try {
      // Check logs with AI council assistance
      const result = await this.logMonitor.monitorLogs(true);
      
      if (result.errors && result.errors.length > 0) {
        // Track when errors first appeared
        if (!this.errorAppearanceTimes.find(t => Math.abs(t - timeSinceUpgrade) < 5)) {
          this.errorAppearanceTimes.push(timeSinceUpgrade);
          console.log(`📊 [POST-UPGRADE] Error first appeared at ${timeSinceUpgrade.toFixed(1)}s`);
          
          // Store in database if available
          if (this.pool) {
            try {
              await this.pool.query(
                `INSERT INTO error_appearance_times (seconds_after_upgrade, error_count, created_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT DO NOTHING`,
                [timeSinceUpgrade, result.errors.length]
              );
            } catch (e) {
              // Ignore DB errors
            }
          }
        }
        
        console.log(`🔍 [POST-UPGRADE] Found ${result.errors.length} error(s)`);
        console.log(`✅ [POST-UPGRADE] Fixed ${result.fixed || 0} error(s) automatically`);
        
        // Reset stability counter
        this.stableChecks = 0;
        this.isStable = false;
        
        // If there are unfixed errors, ask AI council to help
        const unfixed = result.errors.filter(e => !e.fixed);
        if (unfixed.length > 0 && this.callCouncilMember) {
          await this.escalateToAICouncil(unfixed);
        }
      } else {
        this.stableChecks++;
        console.log(`✅ [POST-UPGRADE] No errors found - system healthy (${this.stableChecks} stable checks)`);
        
        // Consider stable after 3 consecutive clean checks
        if (this.stableChecks >= 3 && !this.isStable) {
          this.isStable = true;
          console.log('✅ [POST-UPGRADE] System appears stable - switching to 5-minute intervals');
        }
      }
      
      this.checkCount++;
      return result;
    } catch (error) {
      console.error('Post-upgrade check failed:', error.message);
      return { errors: [], fixed: 0 };
    }
  }

  /**
   * Calculate average time for errors to appear
   */
  getAverageErrorTime() {
    if (this.errorAppearanceTimes.length === 0) return null;
    const sum = this.errorAppearanceTimes.reduce((a, b) => a + b, 0);
    return sum / this.errorAppearanceTimes.length;
  }

  /**
   * Get next check interval based on adaptive timing
   */
  getNextCheckInterval() {
    // If stable, use 5 minutes
    if (this.isStable) {
      return 5 * 60 * 1000; // 5 minutes
    }
    
    const avgErrorTime = this.getAverageErrorTime();
    const timeSinceUpgrade = this.lastUpgradeTime 
      ? (Date.now() - this.lastUpgradeTime.getTime()) / 1000 
      : 0;
    
    // First few checks: every 5-10 seconds
    if (this.checkCount < 3) {
      return 5 * 1000 + (this.checkCount * 2.5 * 1000); // 5s, 7.5s, 10s
    }
    
    // If we have error timing data, check 30s before average
    if (avgErrorTime && timeSinceUpgrade < avgErrorTime - 30) {
      return 30 * 1000; // 30 seconds
    }
    
    // After average error time, check every 30 seconds
    if (avgErrorTime && timeSinceUpgrade < avgErrorTime + 60) {
      return 30 * 1000; // 30 seconds
    }
    
    // Gradually increase: 1 min, 2 min, 3 min, then 5 min
    if (this.checkCount < 10) {
      return Math.min(60 * 1000 * (this.checkCount - 2), 3 * 60 * 1000);
    }
    
    // Default to 5 minutes
    return 5 * 60 * 1000;
  }

  /**
   * Escalate unfixed errors to AI council
   */
  async escalateToAICouncil(unfixedErrors) {
    console.log(`🤖 [POST-UPGRADE] Escalating ${unfixedErrors.length} unfixed errors to AI council...`);
    
    const errorSummary = unfixedErrors.map((e, i) => 
      `${i + 1}. ${e.type}: ${e.text.substring(0, 100)}`
    ).join('\n');
    
    const prompt = `The system has these unfixed errors after an upgrade:\n\n${errorSummary}\n\nAnalyze each error and provide fixes. For each error, return:\nERROR ${index}:\nFIX: [action to take]\nCODE: [if code fix needed]\n\nPrioritize critical errors first.`;
    
    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });
      
      // Parse AI response and apply fixes
      const fixes = this.parseAIFixes(response);
      
      for (const fix of fixes) {
        await this.applyAIFix(fix, unfixedErrors[fix.errorIndex]);
      }
      
      console.log(`✅ [POST-UPGRADE] AI council processed ${fixes.length} fixes`);
    } catch (error) {
      console.error('AI council escalation failed:', error.message);
    }
  }

  parseAIFixes(response) {
    const fixes = [];
    const errorBlocks = response.split(/ERROR\s+(\d+):/i);
    
    for (let i = 1; i < errorBlocks.length; i += 2) {
      const errorIndex = parseInt(errorBlocks[i]) - 1;
      const block = errorBlocks[i + 1] || '';
      
      const fixMatch = block.match(/FIX:\s*([^\n]+)/i);
      const codeMatch = block.match(/CODE:\s*([\s\S]+?)(?=\nERROR|$)/i);
      
      if (fixMatch || codeMatch) {
        fixes.push({
          errorIndex,
          action: fixMatch ? fixMatch[1].trim() : 'unknown',
          code: codeMatch ? codeMatch[1].trim() : null,
        });
      }
    }
    
    return fixes;
  }

  async applyAIFix(fix, error) {
    try {
      if (fix.action.toLowerCase().includes('install')) {
        const packageMatch = fix.action.match(/(?:install|add)\s+([^\s]+)/i);
        if (packageMatch) {
          await this.logMonitor.installPackage(packageMatch[1]);
        }
      } else if (fix.code) {
        // Code fix - would need file path from error
        console.log(`🔧 [POST-UPGRADE] AI council provided code fix for: ${error.type}`);
        // Could integrate with self-programming system here
      }
    } catch (error) {
      console.warn('Failed to apply AI fix:', error.message);
    }
  }

  /**
   * Start adaptive continuous monitoring after upgrades
   * Uses intelligent timing based on when errors typically appear
   */
  start() {
    this.lastUpgradeTime = new Date();
    this.checkCount = 0;
    this.stableChecks = 0;
    this.isStable = false;
    
    // Load historical error timing from database
    this.loadHistoricalTiming();
    
    // Start adaptive checking
    this.scheduleNextCheck();
  }

  /**
   * Schedule next check with adaptive timing
   */
  scheduleNextCheck() {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
    }
    
    const interval = this.getNextCheckInterval();
    
    this.checkInterval = setTimeout(async () => {
      await this.checkAfterUpgrade();
      
      // Continue checking if not stable or within first hour
      const timeSinceUpgrade = this.lastUpgradeTime 
        ? (Date.now() - this.lastUpgradeTime.getTime()) / 1000 
        : 0;
      
      if (!this.isStable && timeSinceUpgrade < 3600) { // First hour
        this.scheduleNextCheck();
      } else if (!this.isStable) {
        // After 1 hour, switch to 5-minute intervals
        this.isStable = true;
        this.checkInterval = setInterval(async () => {
          await this.checkAfterUpgrade();
        }, 5 * 60 * 1000);
      }
    }, interval);
    
    console.log(`⏰ [POST-UPGRADE] Next check in ${(interval / 1000).toFixed(1)}s`);
  }

  /**
   * Load historical error timing from database
   */
  async loadHistoricalTiming() {
    if (!this.pool) return;
    
    try {
      const result = await this.pool.query(
        `SELECT seconds_after_upgrade 
         FROM error_appearance_times 
         ORDER BY created_at DESC 
         LIMIT 20`
      );
      
      if (result.rows.length > 0) {
        this.errorAppearanceTimes = result.rows.map(r => r.seconds_after_upgrade);
        console.log(`📊 [POST-UPGRADE] Loaded ${this.errorAppearanceTimes.length} historical error timings`);
      }
    } catch (error) {
      // Table might not exist yet, ignore
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
