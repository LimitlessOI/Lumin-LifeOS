/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTO-INSTALLER                                                 ║
 * ║                    Automatically installs missing packages and dependencies      ║
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

export class AutoInstaller {
  constructor() {
    this.installedPackages = new Set();
    this.installQueue = [];
    this.isInstalling = false;
  }

  /**
   * Check if a package is installed
   */
  async isPackageInstalled(packageName) {
    try {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      return packageName in allDeps;
    } catch (error) {
      return false;
    }
  }

  /**
   * Install a package automatically
   */
  async installPackage(packageName, options = {}) {
    if (this.installedPackages.has(packageName)) {
      return { success: true, message: `${packageName} already installed` };
    }

    if (this.isInstalling) {
      // Queue for later
      this.installQueue.push({ packageName, options });
      return { success: false, message: 'Installation queued', queued: true };
    }

    this.isInstalling = true;

    try {
      console.log(`📦 [AUTO-INSTALL] Installing ${packageName}...`);

      const { dev = false, version = 'latest' } = options;
      const flag = dev ? '--save-dev' : '--save';
      const versionSpec = version === 'latest' ? packageName : `${packageName}@${version}`;

      const command = `npm install ${versionSpec} ${flag}`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(__dirname, '..'),
        timeout: 120000, // 2 minutes
      });

      this.installedPackages.add(packageName);
      console.log(`✅ [AUTO-INSTALL] ${packageName} installed successfully`);

      // Process queue
      this.isInstalling = false;
      if (this.installQueue.length > 0) {
        const next = this.installQueue.shift();
        return await this.installPackage(next.packageName, next.options);
      }

      return { success: true, message: `${packageName} installed successfully`, stdout };
    } catch (error) {
      console.error(`❌ [AUTO-INSTALL] Failed to install ${packageName}:`, error.message);
      this.isInstalling = false;

      // Process queue even on error
      if (this.installQueue.length > 0) {
        const next = this.installQueue.shift();
        await this.installPackage(next.packageName, next.options);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Install multiple packages
   */
  async installPackages(packages) {
    const results = [];
    for (const pkg of packages) {
      const name = typeof pkg === 'string' ? pkg : pkg.name;
      const options = typeof pkg === 'string' ? {} : pkg.options || {};
      const result = await this.installPackage(name, options);
      results.push({ package: name, ...result });
    }
    return results;
  }

  /**
   * Check and install common dependencies
   */
  async ensureCommonDependencies() {
    const commonPackages = [
      'stripe',
      'puppeteer',
      'express-session',
      'cookie-parser',
    ];

    const missing = [];
    for (const pkg of commonPackages) {
      if (!(await this.isPackageInstalled(pkg))) {
        missing.push(pkg);
      }
    }

    if (missing.length > 0) {
      console.log(`📦 [AUTO-INSTALL] Installing missing packages: ${missing.join(', ')}`);
      await this.installPackages(missing);
    }

    return { missing, installed: missing.length };
  }
}
