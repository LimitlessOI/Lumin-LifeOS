/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    POST-UPGRADE CHECKER                                           ║
 * ║                    Automatically checks logs and fixes errors after upgrades     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class PostUpgradeChecker {
  constructor(logMonitor, callCouncilMember) {
    this.logMonitor = logMonitor;
    this.callCouncilMember = callCouncilMember;
    this.lastUpgradeTime = null;
    this.checkInterval = null;
  }

  /**
   * Check logs after upgrade and fix automatically
   */
  async checkAfterUpgrade() {
    if (!this.logMonitor) {
      console.warn('⚠️ [POST-UPGRADE] Log monitor not available');
      return { errors: [], fixed: 0 };
    }

    console.log('🔍 [POST-UPGRADE] Checking logs after upgrade...');
    
    try {
      // Wait a moment for errors to appear
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check logs with AI council assistance
      const result = await this.logMonitor.monitorLogs(true);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`🔍 [POST-UPGRADE] Found ${result.errors.length} error(s)`);
        console.log(`✅ [POST-UPGRADE] Fixed ${result.fixed || 0} error(s) automatically`);
        
        // If there are unfixed errors, ask AI council to help
        const unfixed = result.errors.filter(e => !e.fixed);
        if (unfixed.length > 0 && this.callCouncilMember) {
          await this.escalateToAICouncil(unfixed);
        }
      } else {
        console.log('✅ [POST-UPGRADE] No errors found - system healthy');
      }
      
      this.lastUpgradeTime = new Date();
      return result;
    } catch (error) {
      console.error('Post-upgrade check failed:', error.message);
      return { errors: [], fixed: 0 };
    }
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
   * Start continuous monitoring after upgrades
   */
  start() {
    // Check every 2 minutes for first 10 minutes after upgrade
    let checkCount = 0;
    this.checkInterval = setInterval(async () => {
      if (checkCount < 5) { // 5 checks = 10 minutes
        await this.checkAfterUpgrade();
        checkCount++;
      } else {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
