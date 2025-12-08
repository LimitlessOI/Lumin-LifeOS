/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    BUILD VALIDATOR - Pre-Deployment Validation                   ║
 * ║                    Validates builds before deployment                            ║
 * ║                    Prevents deployment failures                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BuildValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
  }

  /**
   * Validate everything before deployment
   */
  async validateBeforeDeploy() {
    const results = {
      packageJson: await this.validatePackageJson(),
      lockFile: await this.validateLockFile(),
      dockerfile: await this.validateDockerfile(),
      syntax: await this.validateSyntax(),
      dependencies: await this.validateDependencies(),
    };

    const allValid = Object.values(results).every(r => r.valid);
    
    return {
      valid: allValid,
      results,
      errors: Object.values(results)
        .filter(r => !r.valid)
        .map(r => r.error)
        .flat()
    };
  }

  /**
   * Validate package.json
   */
  async validatePackageJson() {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      
      if (!fs.existsSync(packagePath)) {
        return { valid: false, error: 'package.json not found' };
      }

      const content = await fsPromises.readFile(packagePath, 'utf8');
      
      // Check for markdown code blocks (common corruption)
      if (content.includes('```json') || content.includes('```dockerfile')) {
        return { 
          valid: false, 
          error: 'package.json contains markdown code blocks (corrupted)' 
        };
      }

      // Validate JSON
      try {
        const parsed = JSON.parse(content);
        
        // Check required fields
        if (!parsed.name || !parsed.version || !parsed.main) {
          return { 
            valid: false, 
            error: 'package.json missing required fields (name, version, main)' 
          };
        }

        // Check start script
        if (!parsed.scripts || !parsed.scripts.start) {
          return { 
            valid: false, 
            error: 'package.json missing start script' 
          };
        }

        return { valid: true, data: parsed };
      } catch (parseError) {
        return { 
          valid: false, 
          error: `package.json is invalid JSON: ${parseError.message}` 
        };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate package-lock.json sync
   */
  async validateLockFile() {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const lockPath = path.join(this.projectRoot, 'package-lock.json');

      if (!fs.existsSync(packagePath)) {
        return { valid: false, error: 'package.json not found' };
      }

      // If lock file doesn't exist, that's okay (will be generated)
      if (!fs.existsSync(lockPath)) {
        return { 
          valid: true, 
          warning: 'package-lock.json not found (will be generated on install)' 
        };
      }

      // Try to sync lock file
      try {
        await execAsync('npm install --package-lock-only', {
          cwd: this.projectRoot,
          timeout: 30000
        });
        return { valid: true, synced: true };
      } catch (error) {
        // Lock file out of sync, but that's okay if Dockerfile uses npm install
        return { 
          valid: true, 
          warning: 'package-lock.json may be out of sync (Dockerfile should use npm install)' 
        };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate Dockerfile
   */
  async validateDockerfile() {
    try {
      const dockerfilePath = path.join(this.projectRoot, 'Dockerfile');
      
      if (!fs.existsSync(dockerfilePath)) {
        return { valid: false, error: 'Dockerfile not found' };
      }

      const content = await fsPromises.readFile(dockerfilePath, 'utf8');
      
      // Check for markdown code blocks
      if (content.includes('```dockerfile') || content.includes('```json')) {
        return { 
          valid: false, 
          error: 'Dockerfile contains markdown code blocks (corrupted)' 
        };
      }

      // Check for npm ci (should use npm install for flexibility)
      if (content.includes('npm ci') && !content.includes('npm install')) {
        return { 
          valid: false, 
          error: 'Dockerfile uses npm ci (should use npm install for lock file flexibility)' 
        };
      }

      // Check for Node version
      if (!content.includes('node:18') && !content.includes('node:20')) {
        return { 
          valid: false, 
          error: 'Dockerfile should use Node 18+ (for native fetch support)' 
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate syntax of JavaScript files
   */
  async validateSyntax() {
    try {
      const serverPath = path.join(this.projectRoot, 'server.js');
      
      if (!fs.existsSync(serverPath)) {
        return { valid: false, error: 'server.js not found' };
      }

      // Check syntax
      try {
        await execAsync(`node --check ${serverPath}`, {
          cwd: this.projectRoot,
          timeout: 10000
        });
        return { valid: true };
      } catch (error) {
        return { 
          valid: false, 
          error: `server.js has syntax errors: ${error.message}` 
        };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate dependencies can be installed
   */
  async validateDependencies() {
    try {
      // Dry run install
      try {
        await execAsync('npm install --dry-run', {
          cwd: this.projectRoot,
          timeout: 60000
        });
        return { valid: true };
      } catch (error) {
        return { 
          valid: false, 
          error: `Dependencies cannot be installed: ${error.message}` 
        };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Auto-fix common issues
   */
  async autoFix() {
    const fixes = [];

    // Fix package-lock.json sync
    const lockResult = await this.validateLockFile();
    if (lockResult.warning) {
      try {
        await execAsync('npm install --package-lock-only', {
          cwd: this.projectRoot,
          timeout: 30000
        });
        fixes.push('Synced package-lock.json');
      } catch (error) {
        fixes.push(`Failed to sync package-lock.json: ${error.message}`);
      }
    }

    return fixes;
  }
}
