/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    LOG MONITORING & AUTO-FIX SYSTEM                              ║
 * ║                    Reads logs and automatically fixes errors                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { AutoSchemaFixer } from './auto-schema-fixer.js';

export class LogMonitor {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.schemaFixer = new AutoSchemaFixer(pool, callCouncilMember);
    this.errorPatterns = new Map();
    this.fixHistory = [];
    this.lastLogCheck = null;
    this.logFile = process.env.LOG_FILE || '/tmp/lifeos.log';
    this.processLogs = []; // Store process output
    this.maxProcessLogs = 1000; // Keep last 1000 lines
    
    this.initializeErrorPatterns();
    this.captureProcessOutput();
  }

  /**
   * Capture process stdout/stderr
   */
  captureProcessOutput() {
    // Intercept console.error
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.map(a => String(a)).join(' ');
      this.processLogs.push({ level: 'error', message, timestamp: new Date().toISOString() });
      if (this.processLogs.length > this.maxProcessLogs) {
        this.processLogs.shift();
      }
      originalError.apply(console, args);
    };

    // Intercept console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args.map(a => String(a)).join(' ');
      this.processLogs.push({ level: 'warn', message, timestamp: new Date().toISOString() });
      if (this.processLogs.length > this.maxProcessLogs) {
        this.processLogs.shift();
      }
      originalWarn.apply(console, args);
    };
  }

  initializeErrorPatterns() {
    // Common error patterns and their fixes
    this.errorPatterns.set(
      /Cannot find package ['"]([^'"]+)['"]|puppeteer is not defined|ReferenceError.*puppeteer|Cannot find package.*imported from/i,
      {
        type: 'missing_package',
        fix: async (match, fullError) => {
          // Extract package name from error - clean up path references
          let packageName = match?.[1];
          
          // Clean up: remove paths, node_modules, etc.
          if (packageName) {
            // Remove /app/node_modules/ prefix
            packageName = packageName.replace(/^\/app\/node_modules\//, '');
            // Remove node_modules/ prefix
            packageName = packageName.replace(/^node_modules\//, '');
            // Remove any path separators and get just the package name
            packageName = packageName.split('/')[0].split('\\')[0];
            // Remove quotes if present
            packageName = packageName.replace(/['"]/g, '');
          }
          
          // Special cases
          if (!packageName && fullError.includes('puppeteer')) {
            packageName = 'puppeteer';
          } else if (!packageName && fullError.includes('node-fetch')) {
            // node-fetch is not needed in Node 18+ - this is a code issue, not package issue
            return {
              action: 'code_fix',
              error: fullError,
              description: 'Replace node-fetch with native fetch (Node 18+)',
              fix: 'Use globalThis.fetch instead of importing node-fetch',
            };
          }
          
          if (packageName && packageName.length > 0 && !packageName.includes('/') && !packageName.includes('\\')) {
            return {
              action: 'install_package',
              package: packageName,
              command: `npm install ${packageName}`,
              description: `Install missing package: ${packageName}`,
            };
          }
          
          // Fallback: ask AI to identify package
          return {
            action: 'ai_identify_package',
            error: fullError,
            description: 'Identify and install missing package',
          };
        },
      }
    );

    this.errorPatterns.set(
      /Error: Cannot find module ['"]([^'"]+)['"]/,
      {
        type: 'missing_module',
        fix: async (match) => {
          const moduleName = match[1];
          // Check if it's a local file
          if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
            return {
              action: 'create_file',
              file: moduleName,
              description: `Create missing module: ${moduleName}`,
            };
          }
          return {
            action: 'install_package',
            package: moduleName,
            command: `npm install ${moduleName}`,
            description: `Install missing package: ${moduleName}`,
          };
        },
      }
    );

    this.errorPatterns.set(
      /SyntaxError|ReferenceError|TypeError.*line (\d+)/,
      {
        type: 'syntax_error',
        fix: async (match, fullError) => {
          return {
            action: 'analyze_syntax',
            error: fullError,
            description: 'Analyze and fix syntax error',
          };
        },
      }
    );

    this.errorPatterns.set(
      /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/,
      {
        type: 'connection_error',
        fix: async (match) => {
          return {
            action: 'check_connection',
            description: 'Check network connection and retry',
          };
        },
      }
    );

    this.errorPatterns.set(
      /Database.*error|PostgreSQL.*error|connection.*failed/i,
      {
        type: 'database_error',
        fix: async (match) => {
          return {
            action: 'check_database',
            description: 'Check database connection and configuration',
          };
        },
      }
    );

    // Database schema errors - column/table does not exist
    this.errorPatterns.set(
      /column\s+["'][^"']+["']\s+of\s+relation\s+["'][^"']+["']\s+does\s+not\s+exist|relation\s+["'][^"']+["']\s+does\s+not\s+exist/i,
      {
        type: 'schema_error',
        fix: async (match, fullError) => {
          return {
            action: 'fix_schema',
            error: fullError,
            description: 'Fix database schema mismatch - add missing column or table',
          };
        },
      }
    );

    // ES Module error: require is not defined
    this.errorPatterns.set(
      /require is not defined|ReferenceError.*require/i,
      {
        type: 'es_module_error',
        fix: async (match, fullError) => {
          // Extract the file and line if possible
          const fileMatch = fullError.match(/file:\/\/[^\s]+:(\d+)/);
          const requireMatch = fullError.match(/require\(['"]([^'"]+)['"]\)/);
          
          if (requireMatch && fileMatch) {
            const moduleName = requireMatch[1];
            const lineNum = fileMatch[1];
            return {
              action: 'fix_require_import',
              file: fileMatch[0],
              line: lineNum,
              module: moduleName,
              description: `Fix require() to import in ES module at line ${lineNum}: Change require('${moduleName}') to import ${moduleName} from '${moduleName}'`,
            };
          }
          
          return {
            action: 'fix_require_import',
            error: fullError,
            description: 'Fix require() usage in ES module - convert to import statement',
          };
        },
      }
    );
  }

  /**
   * Monitor logs for errors (with AI council assistance for complex fixes)
   */
  async monitorLogs(useAICouncil = true) {
    try {
      // Read recent logs (last 100 lines)
      const logs = await this.getRecentLogs();
      
      // Check for errors
      const errors = this.extractErrors(logs);
      
      if (errors.length > 0) {
        console.log(`🔍 [LOG MONITOR] Found ${errors.length} error(s)`);
        
        for (const error of errors) {
          // Try standard auto-fix first
          const fixed = await this.attemptAutoFix(error);
          
          // If not fixed and AI council enabled, use AI to fix
          if (!fixed && useAICouncil) {
            await this.attemptAICouncilFix(error);
          }
        }
      }
      
      this.lastLogCheck = new Date();
      return { errors, fixed: errors.filter(e => e.fixed).length };
    } catch (error) {
      console.error('Log monitoring error:', error.message);
      return { errors: [], fixed: 0 };
    }
  }

  /**
   * Use AI council to fix complex errors
   */
  async attemptAICouncilFix(error) {
    try {
      console.log(`🤖 [LOG MONITOR] Asking AI council to fix: ${error.text.substring(0, 100)}`);
      
      const prompt = `Fix this error automatically:\n\n${error.text}\n\nContext:\n${error.context}\n\nProvide the exact fix needed. If it's a missing package, say "INSTALL: package-name". If it's a code error, provide the fixed code.`;
      
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 2000,
      });
      
      // Check if it's an install command
      const installMatch = response.match(/INSTALL:\s*([^\s\n]+)/i);
      if (installMatch) {
        const packageName = installMatch[1];
        const success = await this.installPackage(packageName);
        if (success) {
          error.fixed = true;
          return true;
        }
      }
      
      // Check if it's a code fix
      const codeMatch = response.match(/FILE:\s*([^\n]+)\n([\s\S]+?)(?=\nFILE:|$)/i);
      if (codeMatch) {
        const filePath = codeMatch[1].trim();
        const code = codeMatch[2].trim();
        
        const fs = await import('fs');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), filePath);
        
        if (fs.existsSync(fullPath)) {
          await fs.promises.writeFile(fullPath, code, 'utf8');
          console.log(`✅ [LOG MONITOR] AI council fixed: ${filePath}`);
          error.fixed = true;
          return true;
        }
      }
      
      console.log(`⚠️ [LOG MONITOR] AI council response unclear: ${response.substring(0, 200)}`);
      return false;
    } catch (error) {
      console.error(`❌ [LOG MONITOR] AI council fix failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs() {
    try {
      let logs = '';
      
      // Get from process logs (captured output)
      const recentProcessLogs = this.processLogs
        .filter(log => log.level === 'error' || log.level === 'warn')
        .slice(-100)
        .map(log => log.message)
        .join('\n');
      
      logs += recentProcessLogs;
      
      // Also try to read from log file
      if (fs.existsSync(this.logFile)) {
        const content = await fs.promises.readFile(this.logFile, 'utf8');
        const lines = content.split('\n');
        logs += '\n' + lines.slice(-100).join('\n'); // Last 100 lines
      }
      
      return logs.trim();
    } catch (error) {
      // Return process logs only if file read fails
      return this.processLogs
        .filter(log => log.level === 'error')
        .slice(-50)
        .map(log => log.message)
        .join('\n');
    }
  }

  /**
   * Extract errors from logs
   */
  extractErrors(logs) {
    const errors = [];
    const lines = logs.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check each error pattern
      for (const [pattern, handler] of this.errorPatterns.entries()) {
        const match = line.match(pattern);
        if (match) {
          errors.push({
            line: i + 1,
            text: line,
            pattern: pattern.toString(),
            type: handler.type,
            match,
            context: lines.slice(Math.max(0, i - 2), i + 3).join('\n'),
            timestamp: new Date().toISOString(),
          });
          break; // Only match first pattern
        }
      }
    }
    
    return errors;
  }

  /**
   * Attempt to auto-fix an error
   */
  async attemptAutoFix(error) {
    try {
      const pattern = Array.from(this.errorPatterns.keys()).find(
        p => error.pattern === p.toString()
      );
      
      if (!pattern) {
        console.log(`⚠️ [LOG MONITOR] No fix pattern for: ${error.text}`);
        return false;
      }

      const handler = this.errorPatterns.get(pattern);
      const fix = await handler.fix(error.match, error.text);

      console.log(`🔧 [LOG MONITOR] Attempting fix: ${fix.description}`);

      // Execute fix based on type
      let success = false;
      
      switch (fix.action) {
        case 'install_package':
          success = await this.installPackage(fix.package, fix.command);
          break;
        
        case 'code_fix':
          // For code fixes (like node-fetch -> native fetch), log but don't auto-fix
          console.log(`💡 [LOG MONITOR] Code fix needed: ${fix.description}`);
          console.log(`   Fix: ${fix.fix}`);
          // Could integrate with self-programming here if needed
          success = false; // Don't mark as fixed automatically
          break;
        
        case 'create_file':
          success = await this.createMissingFile(fix.file);
          break;
        
        case 'analyze_syntax':
          success = await this.analyzeAndFixSyntax(fix.error);
          break;
        
        case 'check_connection':
          success = await this.checkConnection();
          break;
        
        case 'check_database':
          success = await this.checkDatabase();
          break;
        
        case 'ai_identify_package':
          success = await this.aiIdentifyPackage(fix.error);
          break;
        
        case 'fix_require_import':
          success = await this.fixRequireImport(fix);
          break;
        
        case 'fix_schema':
          success = await this.fixSchema(fix.error);
          break;
      }

      if (success) {
        error.fixed = true;
        error.fixApplied = fix;
        this.fixHistory.push({
          error,
          fix,
          timestamp: new Date().toISOString(),
          success: true,
        });
        
        console.log(`✅ [LOG MONITOR] Fixed: ${fix.description}`);
        
        // Store in database
        await this.recordFix(error, fix, true);
      } else {
        console.log(`❌ [LOG MONITOR] Fix failed: ${fix.description}`);
        await this.recordFix(error, fix, false);
      }

      return success;
    } catch (error) {
      console.error(`⚠️ [LOG MONITOR] Auto-fix error: ${error.message}`);
      return false;
    }
  }

  async installPackage(packageName, command) {
    try {
      console.log(`📦 [LOG MONITOR] Installing ${packageName}...`);
      
      // Use npm install directly
      const installCommand = `npm install ${packageName}`;
      const { stdout, stderr } = await execAsync(installCommand, {
        cwd: process.cwd(),
        timeout: 120000, // 2 minute timeout for installs
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      
      if (stderr && !stderr.includes('npm WARN') && !stderr.includes('added')) {
        console.warn(`⚠️ [LOG MONITOR] Install warning: ${stderr}`);
      }
      
      console.log(`✅ [LOG MONITOR] Package installed: ${packageName}`);
      console.log(`   Run 'npm install' in production to persist the change`);
      
      // Also update package.json if possible
      try {
        const fs = await import('fs');
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
          if (!packageJson.dependencies) packageJson.dependencies = {};
          if (!packageJson.dependencies[packageName]) {
            packageJson.dependencies[packageName] = 'latest';
            await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`   Updated package.json`);
          }
        }
      } catch (e) {
        // Ignore package.json update errors
      }
      
      return true;
    } catch (error) {
      console.error(`❌ [LOG MONITOR] Install failed: ${error.message}`);
      console.error(`   You may need to run: npm install ${packageName}`);
      return false;
    }
  }

  async createMissingFile(filePath) {
    try {
      // Ask AI to generate the missing file
      const prompt = `A file is missing: ${filePath}. Based on the error and system context, generate the minimal code needed for this file to work. Return only the code, no explanations.`;
      
      const response = await this.callCouncilMember('deepseek', prompt);
      
      // Extract code from response
      const codeMatch = response.match(/```[\s\S]*?```/);
      const code = codeMatch ? codeMatch[0].replace(/```\w*\n?/g, '').replace(/```/g, '') : response;
      
      // Write file
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), filePath);
      
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, code, 'utf8');
      
      console.log(`✅ [LOG MONITOR] Created file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ [LOG MONITOR] File creation failed: ${error.message}`);
      return false;
    }
  }

  async analyzeAndFixSyntax(errorText) {
    try {
      // Use AI council to analyze and fix syntax error
      const prompt = `There's a syntax error in the codebase:\n\n${errorText}\n\nAnalyze the error, identify the file and line, and provide the exact fix needed. Return JSON:\n{\n  "file": "path/to/file.js",\n  "line": 123,\n  "issue": "description",\n  "fix": "exact code to replace or add",\n  "action": "replace|add|remove"\n}`;
      
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 2000,
      });
      
      // Parse AI response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const fix = JSON.parse(jsonMatch[0]);
          
          if (fix.file && fix.fix) {
            // Apply the fix
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.join(process.cwd(), fix.file);
            
            if (fs.existsSync(fullPath)) {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const lines = content.split('\n');
              
              if (fix.action === 'replace' && fix.line) {
                // Replace specific line
                lines[fix.line - 1] = fix.fix;
                await fs.promises.writeFile(fullPath, lines.join('\n'), 'utf8');
                console.log(`✅ [LOG MONITOR] Fixed syntax error in ${fix.file} line ${fix.line}`);
                return true;
              } else if (fix.action === 'add') {
                // Add code
                const newContent = content + '\n' + fix.fix;
                await fs.promises.writeFile(fullPath, newContent, 'utf8');
                console.log(`✅ [LOG MONITOR] Added fix to ${fix.file}`);
                return true;
              }
            }
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse AI fix response:', parseError.message);
      }
      
      // Fallback: log for manual review
      console.log(`🔍 [LOG MONITOR] Syntax analysis needed: ${response.substring(0, 200)}`);
      return false;
    } catch (error) {
      console.error(`❌ [LOG MONITOR] Syntax fix failed: ${error.message}`);
      return false;
    }
  }

  async checkConnection() {
    // Simple connection check
    try {
      const test = await fetch('https://www.google.com', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return test.ok;
    } catch {
      return false;
    }
  }

  async checkDatabase() {
    try {
      await this.pool.query('SELECT NOW()');
      return true;
    } catch {
      return false;
    }
  }

  async aiIdentifyPackage(errorText) {
    try {
      // Ask AI to identify missing package from error
      const prompt = `This error indicates a missing package:\n\n${errorText}\n\nIdentify the exact npm package name needed and return only: "PACKAGE: package-name"`;
      
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 100,
      });
      
      const packageMatch = response.match(/PACKAGE:\s*([^\s\n]+)/i);
      if (packageMatch) {
        const packageName = packageMatch[1].trim();
        return await this.installPackage(packageName);
      }
      
      return false;
    } catch (error) {
      console.error('AI package identification failed:', error.message);
      return false;
    }
  }

  async recordFix(error, fix, success) {
    try {
      await this.pool.query(
        `INSERT INTO log_fixes (error_text, error_type, fix_action, fix_description, success, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [error.text, error.type, fix.action, fix.description, success]
      );
    } catch (err) {
      console.warn('Failed to record fix:', err.message);
    }
  }

  /**
   * Get fix history
   */
  async getFixHistory(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM log_fixes 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * Fix require() to import in ES modules
   */
  async fixRequireImport(fix) {
    try {
      if (!fix.file || !fix.module) {
        console.warn('⚠️ [LOG MONITOR] Cannot fix require - missing file or module info');
        return false;
      }

      // This would need file system access and AI to generate the fix
      // For now, log it so we can fix manually
      console.log(`🔧 [LOG MONITOR] Need to fix: Change require('${fix.module}') to import in ${fix.file}`);
      
      // Could use AI council to generate the fix
      if (this.callCouncilMember) {
        const prompt = `Fix this ES module error: ${fix.description}\n\nFile: ${fix.file}\nLine: ${fix.line}\n\nProvide the exact import statement to replace the require() call.`;
        const response = await this.callCouncilMember('chatgpt', prompt, {
          useTwoTier: false,
          maxTokens: 500,
        });
        
        console.log(`💡 [LOG MONITOR] AI suggests: ${response}`);
        // Could integrate with self-programming system here
      }
      
      return false; // Manual fix needed for now
    } catch (error) {
      console.error(`⚠️ [LOG MONITOR] Fix require import error:`, error.message);
      return false;
    }
  }

  /**
   * Fix database schema errors
   */
  async fixSchema(errorText) {
    try {
      console.log(`🔧 [LOG MONITOR] Fixing schema error: ${errorText.substring(0, 100)}`);
      const result = await this.schemaFixer.detectAndFix(errorText);
      
      if (result.fixed) {
        console.log(`✅ [LOG MONITOR] Schema fixed: ${result.action}`);
        return true;
      } else {
        console.log(`⚠️ [LOG MONITOR] Schema fix failed: ${result.reason || result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`⚠️ [LOG MONITOR] Schema fix error:`, error.message);
      return false;
    }
  }
}
