/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    CODE VALIDATOR                                                 ║
 * ║                    Validates code quality, security, and correctness            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodeValidator {
  constructor(rootDir = null) {
    this.rootDir = rootDir || path.join(__dirname, '..');
  }

  /**
   * Validate code file (syntax, security, quality)
   */
  async validateFile(filePath, content) {
    const issues = [];
    const warnings = [];

    // 1. Syntax validation
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      const syntaxResult = await this.validateSyntax(filePath, content);
      if (!syntaxResult.valid) {
        issues.push(...syntaxResult.errors);
      }
    }

    // 2. Security validation
    const securityResult = this.validateSecurity(content);
    if (securityResult.issues.length > 0) {
      issues.push(...securityResult.issues);
    }
    if (securityResult.warnings.length > 0) {
      warnings.push(...securityResult.warnings);
    }

    // 3. Quality checks
    const qualityResult = this.validateQuality(content);
    if (qualityResult.issues.length > 0) {
      warnings.push(...qualityResult.issues);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      filePath
    };
  }

  /**
   * Validate JavaScript syntax
   */
  async validateSyntax(filePath, content) {
    const errors = [];
    
    try {
      // Write to temp file and check syntax
      const tempPath = path.join(this.rootDir, '.temp_validation.js');
      await fs.writeFile(tempPath, content, 'utf-8');
      
      try {
        execSync(`node --check "${tempPath}"`, { 
          stdio: 'pipe',
          timeout: 5000,
          cwd: this.rootDir
        });
      } catch (syntaxError) {
        const errorMsg = syntaxError.stderr?.toString() || syntaxError.message;
        errors.push({
          type: 'syntax',
          message: `Syntax error: ${errorMsg.split('\n')[0]}`,
          severity: 'error'
        });
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      errors.push({
        type: 'syntax',
        message: `Could not validate syntax: ${error.message}`,
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate security patterns
   */
  validateSecurity(content) {
    const issues = [];
    const warnings = [];

    // Dangerous patterns
    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/,
        message: 'Use of eval() detected - security risk',
        severity: 'error'
      },
      {
        pattern: /Function\s*\(/,
        message: 'Use of Function() constructor - security risk',
        severity: 'error'
      },
      {
        pattern: /require\s*\([^)]*req\.(?:body|query|params)/,
        message: 'Dynamic require() with user input - security risk',
        severity: 'error'
      },
      {
        pattern: /process\.env\.\w+.*password/i,
        message: 'Potential hardcoded password in code',
        severity: 'warning'
      },
      {
        pattern: /(?:password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/i,
        message: 'Potential hardcoded credentials',
        severity: 'warning'
      },
      {
        pattern: /sql.*\+.*req\./i,
        message: 'Potential SQL injection - use parameterized queries',
        severity: 'error'
      },
      {
        pattern: /innerHTML\s*=\s*[^;]*req\./i,
        message: 'Potential XSS - user input in innerHTML',
        severity: 'error'
      },
      {
        pattern: /fs\.(?:writeFile|unlink|rmdir).*req\./i,
        message: 'File operations with user input - validate paths',
        severity: 'warning'
      }
    ];

    for (const { pattern, message, severity } of dangerousPatterns) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        const issue = {
          type: 'security',
          message: `${message} (line ${lineNumber})`,
          severity,
          pattern: match[0].substring(0, 50)
        };

        if (severity === 'error') {
          issues.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Validate code quality
   */
  validateQuality(content) {
    const issues = [];

    // Check for placeholders
    if (/TODO|FIXME|XXX|PLACEHOLDER|implement this|add code here/i.test(content)) {
      issues.push({
        type: 'quality',
        message: 'Code contains placeholders (TODO, FIXME, etc.)',
        severity: 'warning'
      });
    }

    // Check for console.log in production code (warning only)
    const consoleLogCount = (content.match(/console\.(log|debug)/g) || []).length;
    if (consoleLogCount > 5) {
      issues.push({
        type: 'quality',
        message: `Excessive console.log statements (${consoleLogCount}) - consider using proper logging`,
        severity: 'warning'
      });
    }

    // Check for very long functions (warning)
    const functionRegex = /function\s+\w+[^{]*\{[\s\S]{500,}?\}/g;
    if (functionRegex.test(content)) {
      issues.push({
        type: 'quality',
        message: 'Very long function detected - consider breaking into smaller functions',
        severity: 'warning'
      });
    }

    // Check for missing error handling
    const asyncFunctions = (content.match(/async\s+function/g) || []).length;
    const tryCatchBlocks = (content.match(/try\s*\{/g) || []).length;
    if (asyncFunctions > 0 && tryCatchBlocks < asyncFunctions * 0.5) {
      issues.push({
        type: 'quality',
        message: 'Async functions may be missing error handling',
        severity: 'warning'
      });
    }

    return { issues };
  }

  /**
   * Run ESLint if available (optional)
   */
  async runLinter(filePath) {
    try {
      const eslintPath = path.join(this.rootDir, 'node_modules', '.bin', 'eslint');
      await fs.access(eslintPath);
      
      // ESLint is available, run it
      try {
        const result = execSync(`"${eslintPath}" "${filePath}" --format json`, {
          stdio: 'pipe',
          timeout: 10000,
          cwd: this.rootDir
        });
        
        const lintResults = JSON.parse(result.toString());
        return {
          available: true,
          results: lintResults
        };
      } catch (lintError) {
        // ESLint found issues
        const output = lintError.stdout?.toString() || lintError.stderr?.toString();
        try {
          const lintResults = JSON.parse(output);
          return {
            available: true,
            results: lintResults,
            hasErrors: true
          };
        } catch {
          return {
            available: true,
            error: output
          };
        }
      }
    } catch {
      // ESLint not available
      return {
        available: false,
        message: 'ESLint not installed'
      };
    }
  }
}

export const codeValidator = new CodeValidator();
export default codeValidator;
