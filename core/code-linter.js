/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    CODE LINTER                                                   ║
 * ║                    Basic linting for generated code                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodeLinter {
  constructor(rootDir = null) {
    this.rootDir = rootDir || path.join(__dirname, '..');
    this.eslintAvailable = null; // Cache ESLint availability
  }

  /**
   * Lint generated code file
   */
  async lintGeneratedCode(filePath, content) {
    // Only lint JS/TS files
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return { valid: true, errors: [], criticalCount: 0, warningCount: 0 };
    }

    const errors = [];
    const warnings = [];

    // Basic rule checks (without ESLint)
    const basicChecks = this.runBasicChecks(content);
    errors.push(...basicChecks.errors);
    warnings.push(...basicChecks.warnings);

    // Try ESLint if available
    const eslintResult = await this.runESLint(filePath, content);
    if (eslintResult.available) {
      if (eslintResult.hasErrors) {
        // Parse ESLint results
        const eslintErrors = this.parseESLintResults(eslintResult.results);
        errors.push(...eslintErrors.errors);
        warnings.push(...eslintErrors.warnings);
      }
    }

    const criticalCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = warnings.length + errors.filter(e => e.severity === 'warning').length;

    return {
      valid: criticalCount === 0,
      errors: [...errors, ...warnings],
      criticalCount,
      warningCount,
    };
  }

  /**
   * Run basic code checks (no ESLint required)
   */
  runBasicChecks(content) {
    const errors = [];
    const warnings = [];

    // Check for undefined variables (basic pattern)
    const undefinedPattern = /(\w+)\s+is\s+not\s+defined/gi;
    if (undefinedPattern.test(content)) {
      warnings.push({
        rule: 'no-undef',
        message: 'Potential undefined variable detected',
        severity: 'warning',
      });
    }

    // Check for duplicate keys in objects
    const objectKeys = new Set();
    const keyPattern = /(\w+)\s*:/g;
    let match;
    while ((match = keyPattern.exec(content)) !== null) {
      const key = match[1];
      if (objectKeys.has(key)) {
        errors.push({
          rule: 'no-dupe-keys',
          message: `Duplicate key '${key}' detected`,
          severity: 'error',
        });
      }
      objectKeys.add(key);
    }

    // Check for unreachable code (basic)
    if (/return\s+[^;]+;\s*[^}]/.test(content)) {
      warnings.push({
        rule: 'no-unreachable',
        message: 'Potential unreachable code after return',
        severity: 'warning',
      });
    }

    // Check for invalid typeof
    const invalidTypeof = /typeof\s+\w+\s*===?\s*['"]\w+['"]/g;
    if (invalidTypeof.test(content)) {
      warnings.push({
        rule: 'valid-typeof',
        message: 'Potential invalid typeof comparison',
        severity: 'warning',
      });
    }

    return { errors, warnings };
  }

  /**
   * Run ESLint if available
   */
  async runESLint(filePath, content) {
    // Check if ESLint is available (cache result)
    if (this.eslintAvailable === false) {
      return { available: false };
    }

    try {
      const eslintPath = path.join(this.rootDir, 'node_modules', '.bin', 'eslint');
      await fs.access(eslintPath);
      this.eslintAvailable = true;

      // Write content to temp file
      const tempPath = path.join(this.rootDir, '.temp_lint.js');
      await fs.writeFile(tempPath, content, 'utf-8');

      try {
        // Run ESLint with basic rules
        const result = execSync(
          `"${eslintPath}" "${tempPath}" --format json --no-eslintrc --config '{"rules":{"no-undef":"error","no-unused-vars":"warn","no-const-assign":"error","no-dupe-keys":"error","no-unreachable":"warn","valid-typeof":"warn"}}'`,
          {
            stdio: 'pipe',
            timeout: 10000,
            cwd: this.rootDir,
          }
        );

        const lintResults = JSON.parse(result.toString());
        await fs.unlink(tempPath).catch(() => {});

        return {
          available: true,
          results: lintResults,
          hasErrors: lintResults.some(file => file.errorCount > 0),
        };
      } catch (lintError) {
        // ESLint found issues
        const output = lintError.stdout?.toString() || lintError.stderr?.toString();
        await fs.unlink(tempPath).catch(() => {});

        try {
          const lintResults = JSON.parse(output);
          return {
            available: true,
            results: lintResults,
            hasErrors: true,
          };
        } catch {
          return {
            available: true,
            error: output,
            hasErrors: true,
          };
        }
      }
    } catch {
      this.eslintAvailable = false;
      return { available: false };
    }
  }

  /**
   * Parse ESLint results into errors/warnings
   */
  parseESLintResults(results) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(results)) {
      return { errors, warnings };
    }

    for (const file of results) {
      if (file.messages) {
        for (const message of file.messages) {
          const issue = {
            rule: message.ruleId || 'unknown',
            message: message.message,
            line: message.line,
            column: message.column,
            severity: message.severity === 2 ? 'error' : 'warning',
          };

          if (message.severity === 2) {
            errors.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      }
    }

    return { errors, warnings };
  }
}

export const codeLinter = new CodeLinter();
export default codeLinter;
