/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ERROR RECOVERY SYSTEM                                          ║
 * ║                    Retries operations with automatic fixes                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ErrorRecovery {
  constructor(maxRetries = 3, callCouncilMember = null) {
    this.maxRetries = maxRetries;
    this.errorHistory = [];
    this.callCouncilMember = callCouncilMember; // Optional: for AI-powered fixes
  }

  /**
   * Execute operation with retry and auto-fix
   */
  async withRetry(operation, context = {}) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [ERROR-RECOVERY] Attempt ${attempt}/${this.maxRetries}`);
        const result = await operation();
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        this.errorHistory.push({
          attempt,
          error: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString()
        });
        
        console.log(`❌ [ERROR-RECOVERY] Attempt ${attempt} failed: ${error.message}`);
        
        // If not last attempt, try to fix
        if (attempt < this.maxRetries) {
          const fix = await this.generateFix(error, context);
          if (fix) {
            console.log(`🔧 [ERROR-RECOVERY] Applying fix: ${fix.description}`);
            try {
              await fix.apply();
              console.log(`✅ [ERROR-RECOVERY] Fix applied, retrying...`);
            } catch (fixError) {
              console.warn(`⚠️ [ERROR-RECOVERY] Fix application failed: ${fixError.message}`);
            }
          } else {
            console.log(`⚠️ [ERROR-RECOVERY] No automatic fix available for: ${error.message}`);
          }
        }
      }
    }
    
    return { 
      success: false, 
      error: lastError, 
      attempts: this.maxRetries,
      history: this.errorHistory.slice(-this.maxRetries) // Last N errors
    };
  }

  /**
   * Generate automatic fix for common error patterns
   */
  async generateFix(error, context = {}) {
    const errorMessage = error.message || String(error);
    
    // Pattern 1: Missing module
    const missingModuleMatch = errorMessage.match(/Cannot find module ['"]([^'"]+)['"]/);
    if (missingModuleMatch) {
      const moduleName = missingModuleMatch[1];
      return {
        description: `Install missing module: ${moduleName}`,
        apply: async () => {
          const rootDir = context.rootDir || path.join(__dirname, '..');
          execSync(`npm install ${moduleName}`, { 
            stdio: 'inherit',
            cwd: rootDir,
            timeout: 120000
          });
        }
      };
    }

    // Pattern 2: Variable/function not defined
    const notDefinedMatch = errorMessage.match(/(\w+) is not defined/);
    if (notDefinedMatch && this.callCouncilMember) {
      const undefinedVar = notDefinedMatch[1];
      return {
        description: `Add missing definition for: ${undefinedVar}`,
        apply: async () => {
          // Use AI to generate fix
          const fixPrompt = `The code has an error: "${errorMessage}"

Context: ${JSON.stringify(context, null, 2)}

Generate a fix that defines ${undefinedVar} or imports it. Return only the code fix, no explanation.`;
          
          const fixCode = await this.callCouncilMember('ollama_deepseek', fixPrompt);
          // This would need to be integrated with the file modification system
          console.log(`[ERROR-RECOVERY] AI-generated fix: ${fixCode.substring(0, 200)}...`);
        }
      };
    }

    // Pattern 3: Syntax error
    const syntaxErrorMatch = errorMessage.match(/SyntaxError|Unexpected token|Unexpected end/);
    if (syntaxErrorMatch && context.filePath) {
      return {
        description: `Fix syntax error in ${context.filePath}`,
        apply: async () => {
          // Try to read and validate the file
          const filePath = context.filePath;
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Basic syntax check - if it fails, we know there's an issue
            // The actual fix would need AI or manual intervention
            console.log(`[ERROR-RECOVERY] Syntax error detected in ${filePath}`);
          } catch (e) {
            // File read failed
          }
        }
      };
    }

    // Pattern 4: Database/table doesn't exist
    const dbErrorMatch = errorMessage.match(/relation ["'](\w+)["'] does not exist|table ["'](\w+)["'] doesn't exist/i);
    if (dbErrorMatch) {
      const tableName = dbErrorMatch[1] || dbErrorMatch[2];
      return {
        description: `Create missing database table: ${tableName}`,
        apply: async () => {
          // This would trigger migration generation
          console.log(`[ERROR-RECOVERY] Need to create table: ${tableName}`);
          // Would call migration generator here
        }
      };
    }

    // Pattern 5: Port already in use
    const portErrorMatch = errorMessage.match(/EADDRINUSE.*?(\d+)/);
    if (portErrorMatch) {
      const port = portErrorMatch[1];
      return {
        description: `Port ${port} is in use - kill existing process`,
        apply: async () => {
          try {
            // Try to find and kill process on that port (Unix/Mac)
            execSync(`lsof -ti:${port} | xargs kill -9`, { timeout: 5000 });
            console.log(`[ERROR-RECOVERY] Killed process on port ${port}`);
          } catch (e) {
            // Process might not exist or command failed
            console.log(`[ERROR-RECOVERY] Could not kill process on port ${port}`);
          }
        }
      };
    }

    // No automatic fix available
    return null;
  }

  /**
   * Get error history
   */
  getErrorHistory(limit = 10) {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
  }
}

// Export class (not singleton, as it may need different configs)
export default ErrorRecovery;
