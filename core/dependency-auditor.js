/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    DEPENDENCY AUDITOR                                             ║
 * ║                    Pre-flight check for all required dependencies               ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { autoInstaller } from './auto-installer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DependencyAuditor {
  constructor() {
    this.requiredPackages = [
      'stripe',
      'twilio',
      'puppeteer',
    ];
    this.requiredCoreModules = [
      './core/tier0-council.js',
      './core/tier1-council.js',
      './core/model-router.js',
      './core/outreach-automation.js',
      './core/white-label.js',
      './core/knowledge-base.js',
      './core/file-cleanup-analyzer.js',
      './core/cost-re-examination.js',
      './core/log-monitor.js',
      './core/post-upgrade-checker.js',
      './core/comprehensive-idea-tracker.js',
      './core/enhanced-income-drone.js',
      './core/business-center.js',
      './core/game-generator.js',
      './core/business-duplication.js',
      './core/code-services.js',
      './core/makecom-generator.js',
      './core/legal-checker.js',
      './core/self-funding-system.js',
      './core/marketing-research-system.js',
      './core/marketing-agency.js',
      './core/web-scraper.js',
      './core/enhanced-conversation-scraper.js',
      './core/api-cost-savings-revenue.js',
      './core/auto-installer.js',
      './core/auto-queue-manager.js',
      './core/enhanced-idea-generator.js',
      './core/ai-account-bot.js',
      './core/conversation-extractor-bot.js',
      './core/task-improvement-reporter.js',
      './core/user-simulation.js',
      './core/ai-effectiveness-tracker.js',
      './core/vapi-integration.js',
    ];
  }

  /**
   * Audit all dependencies
   */
  async auditAll() {
    console.log('🔍 [DEPENDENCY AUDITOR] Starting full audit...');
    
    const results = {
      npmPackages: await this.auditNpmPackages(),
      coreModules: await this.auditCoreModules(),
      missing: [],
      installed: [],
    };

    // Install missing packages
    for (const pkg of results.npmPackages.missing) {
      console.log(`📦 [AUDITOR] Installing missing package: ${pkg}`);
      const result = await autoInstaller.install(pkg, { save: true });
      if (result.success) {
        results.installed.push(pkg);
        results.missing = results.missing.filter(p => p !== pkg);
      }
    }

    console.log(`✅ [DEPENDENCY AUDITOR] Audit complete`);
    console.log(`   Missing packages: ${results.npmPackages.missing.length}`);
    console.log(`   Installed: ${results.installed.length}`);
    console.log(`   Core modules: ${results.coreModules.missing.length} missing`);

    return results;
  }

  /**
   * Audit NPM packages
   */
  async auditNpmPackages() {
    const missing = [];
    const present = [];

    for (const pkg of this.requiredPackages) {
      const isInstalled = await autoInstaller.isInstalled(pkg);
      if (isInstalled) {
        present.push(pkg);
      } else {
        missing.push(pkg);
      }
    }

    return { missing, present };
  }

  /**
   * Audit core modules
   */
  async auditCoreModules() {
    const missing = [];
    const present = [];

    for (const modulePath of this.requiredCoreModules) {
      const fullPath = path.join(process.cwd(), modulePath.replace('./', ''));
      if (fs.existsSync(fullPath)) {
        present.push(modulePath);
      } else {
        missing.push(modulePath);
      }
    }

    return { missing, present };
  }
}

export const dependencyAuditor = new DependencyAuditor();
