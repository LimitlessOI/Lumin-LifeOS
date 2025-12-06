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

export class LogMonitor {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
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
      /Cannot find package ['"]([^'"]+)['"]/,
      {
        type: 'missing_package',
        fix: async (match) => {
          const packageName = match[1];
          return {
            action: 'install_package',
            package: packageName,
            command: `npm install ${packageName}`,
            description: `Install missing package: ${packageName}`,
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
  }

  /**
   * Monitor logs for errors
   */
  async monitorLogs() {
    try {
      // Read recent logs (last 100 lines)
      const logs = await this.getRecentLogs();
      
      // Check for errors
      const errors = this.extractErrors(logs);
      
      if (errors.length > 0) {
        console.log(`🔍 [LOG MONITOR] Found ${errors.length} error(s)`);
        
        for (const error of errors) {
          await this.attemptAutoFix(error);
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
      // Ask AI to analyze and fix syntax error
      const prompt = `There's a syntax error in the code:\n\n${errorText}\n\nAnalyze the error and provide the fix. Return only the fixed code, no explanations.`;
      
      const response = await this.callCouncilMember('deepseek', prompt);
      
      // This would need to be integrated with self-programming system
      // For now, just log it
      console.log(`🔍 [LOG MONITOR] Syntax analysis: ${response.substring(0, 200)}`);
      
      return false; // Not fully automated yet
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
}
