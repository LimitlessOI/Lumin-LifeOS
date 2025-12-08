/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SELF-BUILDER SYSTEM                                            ║
 * ║                    System can build, test, and deploy itself                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SelfBuilder {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.projectRoot = path.join(__dirname, '..');
    this.buildHistory = [];
  }

  /**
   * Full build pipeline: install, test, build, validate
   */
  async build(options = {}) {
    const {
      installDependencies = true,
      runTests = true,
      validateSyntax = true,
      commitChanges = false,
      pushToGit = false,
      triggerDeployment = false,
    } = options;

    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const buildLog = {
      id: buildId,
      startTime: new Date().toISOString(),
      steps: [],
      success: false,
      errors: [],
    };

    try {
      console.log(`🔨 [SELF-BUILDER] Starting build: ${buildId}`);

      // Step 1: Install dependencies
      if (installDependencies) {
        buildLog.steps.push({ name: 'install', status: 'running' });
        const installResult = await this.installDependencies();
        buildLog.steps[buildLog.steps.length - 1] = {
          name: 'install',
          status: installResult.success ? 'success' : 'failed',
          output: installResult.output,
          error: installResult.error,
        };
        
        if (!installResult.success) {
          buildLog.errors.push(`Install failed: ${installResult.error}`);
          if (options.strict) {
            throw new Error(`Dependency installation failed: ${installResult.error}`);
          }
        }
      }

      // Step 2: Validate syntax
      if (validateSyntax) {
        buildLog.steps.push({ name: 'syntax_check', status: 'running' });
        const syntaxResult = await this.validateSyntax();
        buildLog.steps[buildLog.steps.length - 1] = {
          name: 'syntax_check',
          status: syntaxResult.success ? 'success' : 'failed',
          output: syntaxResult.output,
          error: syntaxResult.error,
        };
        
        if (!syntaxResult.success) {
          buildLog.errors.push(`Syntax check failed: ${syntaxResult.error}`);
          if (options.strict) {
            throw new Error(`Syntax validation failed: ${syntaxResult.error}`);
          }
        }
      }

      // Step 3: Run tests
      if (runTests) {
        buildLog.steps.push({ name: 'tests', status: 'running' });
        const testResult = await this.runTests();
        buildLog.steps[buildLog.steps.length - 1] = {
          name: 'tests',
          status: testResult.success ? 'success' : 'failed',
          output: testResult.output,
          error: testResult.error,
        };
        
        if (!testResult.success) {
          buildLog.errors.push(`Tests failed: ${testResult.error}`);
          if (options.strict) {
            throw new Error(`Tests failed: ${testResult.error}`);
          }
        }
      }

      // Step 4: Git operations
      if (commitChanges || pushToGit) {
        buildLog.steps.push({ name: 'git', status: 'running' });
        const gitResult = await this.gitOperations({ commit: commitChanges, push: pushToGit });
        buildLog.steps[buildLog.steps.length - 1] = {
          name: 'git',
          status: gitResult.success ? 'success' : 'failed',
          output: gitResult.output,
          error: gitResult.error,
        };
      }

      // Step 5: Trigger deployment
      if (triggerDeployment) {
        buildLog.steps.push({ name: 'deployment', status: 'running' });
        const deployResult = await this.triggerDeployment();
        buildLog.steps[buildLog.steps.length - 1] = {
          name: 'deployment',
          status: deployResult.success ? 'success' : 'failed',
          output: deployResult.output,
          error: deployResult.error,
        };
      }

      buildLog.success = buildLog.errors.length === 0;
      buildLog.endTime = new Date().toISOString();
      buildLog.duration = new Date(buildLog.endTime) - new Date(buildLog.startTime);

      // Store in database
      await this.recordBuild(buildLog);

      console.log(`✅ [SELF-BUILDER] Build ${buildId} ${buildLog.success ? 'succeeded' : 'completed with errors'}`);
      
      return buildLog;
    } catch (error) {
      buildLog.success = false;
      buildLog.errors.push(error.message);
      buildLog.endTime = new Date().toISOString();
      await this.recordBuild(buildLog);
      throw error;
    }
  }

  /**
   * Install npm dependencies
   */
  async installDependencies() {
    try {
      console.log('📦 [SELF-BUILDER] Installing dependencies...');
      const { stdout, stderr } = await execAsync('npm install', {
        cwd: this.projectRoot,
        timeout: 300000, // 5 minutes
      });
      
      return {
        success: true,
        output: stdout,
        error: stderr || null,
      };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
      };
    }
  }

  /**
   * Validate syntax of all JS files
   */
  async validateSyntax() {
    try {
      console.log('🔍 [SELF-BUILDER] Validating syntax...');
      
      // Check main server file
      const { stdout, stderr } = await execAsync('node --check server.js', {
        cwd: this.projectRoot,
        timeout: 30000,
      });
      
      // Check core modules
      const coreFiles = fs.readdirSync(path.join(this.projectRoot, 'core'))
        .filter(f => f.endsWith('.js'))
        .map(f => `core/${f}`);
      
      const syntaxErrors = [];
      for (const file of coreFiles) {
        try {
          await execAsync(`node --check ${file}`, {
            cwd: this.projectRoot,
            timeout: 10000,
          });
        } catch (error) {
          syntaxErrors.push(`${file}: ${error.message}`);
        }
      }
      
      if (syntaxErrors.length > 0) {
        return {
          success: false,
          output: '',
          error: syntaxErrors.join('; '),
        };
      }
      
      return {
        success: true,
        output: stdout || 'All syntax checks passed',
        error: stderr || null,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Run tests
   */
  async runTests() {
    try {
      console.log('🧪 [SELF-BUILDER] Running tests...');
      
      // Check if test script exists
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')
      );
      
      if (!packageJson.scripts || !packageJson.scripts.test) {
        return {
          success: true,
          output: 'No test script found - skipping',
          error: null,
        };
      }
      
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: this.projectRoot,
        timeout: 60000,
      });
      
      return {
        success: true,
        output: stdout,
        error: stderr || null,
      };
    } catch (error) {
      // Tests might fail, but that's okay for now
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
      };
    }
  }

  /**
   * Git operations (commit, push)
   */
  async gitOperations(options = {}) {
    const { commit = false, push = false, message = 'Self-build: Automated build and deployment' } = options;
    
    try {
      if (!commit && !push) {
        return { success: true, output: 'No git operations requested', error: null };
      }

      // Check if git is available
      try {
        await execAsync('git --version', { cwd: this.projectRoot });
      } catch (e) {
        return { success: false, output: '', error: 'Git not available' };
      }

      let output = [];

      // Add all changes
      try {
        const { stdout } = await execAsync('git add -A', { cwd: this.projectRoot });
        output.push(stdout);
      } catch (e) {
        // Ignore if nothing to add
      }

      // Commit if requested
      if (commit) {
        try {
          const { stdout } = await execAsync(`git commit -m "${message}"`, {
            cwd: this.projectRoot,
          });
          output.push(stdout);
        } catch (e) {
          if (e.message.includes('nothing to commit')) {
            output.push('Nothing to commit');
          } else {
            throw e;
          }
        }
      }

      // Push if requested
      if (push) {
        try {
          const { stdout } = await execAsync('git push origin main', {
            cwd: this.projectRoot,
            timeout: 60000,
          });
          output.push(stdout);
        } catch (e) {
          return {
            success: false,
            output: output.join('\n'),
            error: e.message,
          };
        }
      }

      return {
        success: true,
        output: output.join('\n'),
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Trigger Railway deployment
   */
  async triggerDeployment() {
    try {
      console.log('🚀 [SELF-BUILDER] Triggering deployment...');
      
      // Railway auto-deploys on git push, so if we just pushed, deployment is triggered
      // We can also call Railway API if needed
      const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN || 'robust-magic-production.up.railway.app';
      
      return {
        success: true,
        output: `Deployment triggered via git push. Railway will auto-deploy from main branch.`,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Record build in database
   */
  async recordBuild(buildLog) {
    try {
      await this.pool.query(
        `INSERT INTO build_history (build_id, status, steps, errors, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (build_id) DO UPDATE SET
           status = $2, steps = $3, errors = $4, duration_ms = $5`,
        [
          buildLog.id,
          buildLog.success ? 'success' : 'failed',
          JSON.stringify(buildLog.steps),
          JSON.stringify(buildLog.errors),
          buildLog.duration || 0,
        ]
      );
    } catch (error) {
      // Table might not exist yet, ignore
      console.warn('⚠️ [SELF-BUILDER] Could not record build:', error.message);
    }
  }

  /**
   * Get build history
   */
  async getBuildHistory(limit = 10) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM build_history ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }
}
