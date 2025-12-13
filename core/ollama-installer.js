/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    OLLAMA AUTO-INSTALLER                                          ║
 * ║                    Automatically installs and configures Ollama                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class OllamaInstaller {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.installAttempted = false;
  }

  /**
   * Check if Ollama is available
   */
  async checkOllamaAvailable() {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (response.ok) {
        return { available: true, endpoint: this.ollamaEndpoint };
      }
    } catch (error) {
      // Ollama not available
    }
    
    return { available: false, endpoint: this.ollamaEndpoint };
  }

  /**
   * Attempt to install Ollama (if on Railway/local)
   */
  async attemptInstall() {
    if (this.installAttempted) {
      return { installed: false, reason: 'Already attempted installation' };
    }

    this.installAttempted = true;
    console.log('🔧 [OLLAMA] Attempting to install Ollama...');

    // Check if we're on Railway (has RAILWAY_ENVIRONMENT)
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
    const isLocal = !isRailway && process.platform !== 'win32';

    if (!isLocal && !isRailway) {
      console.log('⚠️ [OLLAMA] Cannot auto-install: Not on Railway or local Unix system');
      return { installed: false, reason: 'Unsupported platform' };
    }

    try {
      // Check if Ollama binary exists
      try {
        await execAsync('which ollama');
        console.log('✅ [OLLAMA] Ollama already installed');
        return { installed: true, reason: 'Already installed' };
      } catch {
        // Ollama not found, try to install
      }

      // Try to install based on platform
      if (isRailway) {
        // On Railway, we can't easily install system packages
        // Best approach: Use Railway's Ollama service template
        console.log('📋 [OLLAMA] On Railway - please use Railway Ollama template:');
        console.log('   1. Go to Railway dashboard');
        console.log('   2. Add new service');
        console.log('   3. Search for "Ollama" template');
        console.log('   4. Deploy it');
        console.log('   5. Set OLLAMA_ENDPOINT to the service URL');
        return { 
          installed: false, 
          reason: 'Railway requires manual Ollama service setup',
          instructions: 'Use Railway Ollama template from dashboard',
        };
      } else {
        // Local installation
        console.log('📦 [OLLAMA] Installing Ollama locally...');
        
        // Try curl installation (works on macOS/Linux)
        try {
          const installScript = 'curl -fsSL https://ollama.com/install.sh | sh';
          await execAsync(installScript, { timeout: 300000 }); // 5 min timeout
          
          // Verify installation
          await execAsync('which ollama');
          console.log('✅ [OLLAMA] Ollama installed successfully');
          
          // Start Ollama service
          try {
            await execAsync('ollama serve &');
            console.log('✅ [OLLAMA] Ollama service started');
          } catch (startError) {
            console.warn('⚠️ [OLLAMA] Could not start service automatically:', startError.message);
            console.log('   Please run: ollama serve');
          }
          
          return { installed: true, reason: 'Installed via curl script' };
        } catch (installError) {
          console.error('❌ [OLLAMA] Installation failed:', installError.message);
          return { installed: false, reason: installError.message };
        }
      }
    } catch (error) {
      console.error('❌ [OLLAMA] Install attempt failed:', error.message);
      return { installed: false, reason: error.message };
    }
  }

  /**
   * Auto-detect and configure Ollama
   */
  async autoConfigure() {
    // First check if Ollama is already available
    const check = await this.checkOllamaAvailable();
    if (check.available) {
      console.log(`✅ [OLLAMA] Ollama is available at ${check.endpoint}`);
      return { configured: true, endpoint: check.endpoint };
    }

    // Try to install
    const installResult = await this.attemptInstall();
    
    if (installResult.installed) {
      // Wait a bit for service to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check again
      const recheck = await this.checkOllamaAvailable();
      if (recheck.available) {
        console.log(`✅ [OLLAMA] Ollama configured and available at ${recheck.endpoint}`);
        return { configured: true, endpoint: recheck.endpoint };
      }
    }

    // If still not available, log instructions
    console.log('⚠️ [OLLAMA] Ollama not available. System will use cloud models instead.');
    console.log('   To enable Ollama (free Tier 0 models):');
    console.log('   - Local: Run "curl -fsSL https://ollama.com/install.sh | sh" then "ollama serve"');
    console.log('   - Railway: Add Ollama service from Railway template');
    
    return { configured: false, reason: installResult.reason || 'Installation failed' };
  }

  /**
   * Pull required models
   * Default: All open source models used by Tier 0 Council
   */
  async pullModels(models = [
    // Lightweight & Fast
    'llama3.2:1b',
    'phi3:mini',
    // Code Generation Specialists
    'deepseek-coder:latest',
    'deepseek-coder-v2:latest',
    'deepseek-coder:33b',
    'qwen2.5-coder:32b-instruct',
    'codestral:latest',
    // Reasoning & Analysis Specialists
    'deepseek-v3:latest',
    'llama3.3:70b-instruct-q4_0',
    'qwen2.5:72b-q4_0',
    'gemma2:27b-it-q4_0',
  ]) {
    const check = await this.checkOllamaAvailable();
    if (!check.available) {
      console.log('⚠️ [OLLAMA] Cannot pull models: Ollama not available');
      return { pulled: false, reason: 'Ollama not available' };
    }

    const results = {};
    
    for (const model of models) {
      try {
        console.log(`📥 [OLLAMA] Pulling model: ${model}...`);
        await execAsync(`ollama pull ${model}`, { timeout: 600000 }); // 10 min timeout
        results[model] = { pulled: true };
        console.log(`✅ [OLLAMA] Model ${model} pulled successfully`);
      } catch (error) {
        console.error(`❌ [OLLAMA] Failed to pull ${model}:`, error.message);
        results[model] = { pulled: false, error: error.message };
      }
    }

    return { pulled: Object.values(results).some(r => r.pulled), results };
  }
}
