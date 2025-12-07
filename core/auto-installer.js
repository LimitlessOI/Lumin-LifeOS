/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTO-INSTALLER SYSTEM                                           ║
 * ║                    Automatically installs missing packages when needed           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class AutoInstaller {
  constructor() {
    this.installing = new Set(); // Track packages being installed
    this.installed = new Set(); // Cache of installed packages
  }

  /**
   * Check if a package is installed
   */
  async isInstalled(packageName) {
    try {
      // Check node_modules
      const nodeModulesPath = path.join(process.cwd(), 'node_modules', packageName);
      if (fs.existsSync(nodeModulesPath)) {
        return true;
      }

      // Check package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        if (allDeps[packageName]) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Install a package automatically
   */
  async install(packageName, options = {}) {
    // Check cache
    if (this.installed.has(packageName)) {
      return { success: true, cached: true };
    }

    // Check if already installing
    if (this.installing.has(packageName)) {
      console.log(`⏳ [AUTO-INSTALL] ${packageName} is already being installed, waiting...`);
      // Wait for installation to complete
      while (this.installing.has(packageName)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return { success: true, waited: true };
    }

    // Check if already installed
    if (await this.isInstalled(packageName)) {
      this.installed.add(packageName);
      return { success: true, alreadyInstalled: true };
    }

    // Mark as installing
    this.installing.add(packageName);

    try {
      console.log(`📦 [AUTO-INSTALL] Installing ${packageName}...`);
      
      const { save = true, dev = false } = options;
      const saveFlag = save ? (dev ? '--save-dev' : '--save') : '';
      
      const command = `npm install ${packageName} ${saveFlag}`.trim();
      
      console.log(`   Running: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 300000, // 5 minutes timeout
      });

      if (stderr && !stderr.includes('npm WARN')) {
        console.warn(`⚠️ [AUTO-INSTALL] ${packageName} install warnings:`, stderr);
      }

      // Verify installation
      if (await this.isInstalled(packageName)) {
        this.installed.add(packageName);
        console.log(`✅ [AUTO-INSTALL] Successfully installed ${packageName}`);
        return { success: true, installed: true };
      } else {
        throw new Error(`Installation completed but package not found`);
      }
    } catch (error) {
      console.error(`❌ [AUTO-INSTALL] Failed to install ${packageName}:`, error.message);
      return { success: false, error: error.message };
    } finally {
      this.installing.delete(packageName);
    }
  }

  /**
   * Install multiple packages
   */
  async installMultiple(packages, options = {}) {
    const results = {};
    
    for (const pkg of packages) {
      const packageName = typeof pkg === 'string' ? pkg : pkg.name;
      const packageOptions = typeof pkg === 'object' ? { ...options, ...pkg.options } : options;
      
      results[packageName] = await this.install(packageName, packageOptions);
    }
    
    return results;
  }

  /**
   * Ensure package is installed, install if not
   */
  async ensureInstalled(packageName, options = {}) {
    if (await this.isInstalled(packageName)) {
      return { success: true, alreadyInstalled: true };
    }
    
    return await this.install(packageName, options);
  }

  /**
   * Try to require/import a package, install if missing
   */
  async requireOrInstall(packageName, options = {}) {
    try {
      // Try to import
      const module = await import(packageName);
      return { success: true, module, alreadyInstalled: true };
    } catch (error) {
      // Package not found, try to install
      console.log(`📦 [AUTO-INSTALL] ${packageName} not found, installing...`);
      const installResult = await this.install(packageName, options);
      
      if (!installResult.success) {
        return { success: false, error: installResult.error };
      }

      // Try to import again after installation
      try {
        // Clear require cache
        const modulePath = path.join(process.cwd(), 'node_modules', packageName);
        if (fs.existsSync(modulePath)) {
          const module = await import(packageName);
          return { success: true, module, installed: true };
        }
        
        // If import still fails, might need to restart
        return { 
          success: false, 
          error: 'Package installed but import failed. May need to restart.',
          installed: true 
        };
      } catch (importError) {
        return { 
          success: false, 
          error: `Installed but import failed: ${importError.message}`,
          installed: true 
        };
      }
    }
  }
}

// Export singleton instance
export const autoInstaller = new AutoInstaller();
