/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    DEPENDENCY MANAGER                                             ║
 * ║                    Auto-installs missing dependencies from code                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DependencyManager {
  constructor(rootDir = null) {
    this.rootDir = rootDir || path.join(__dirname, '..');
    this.packageJsonPath = path.join(this.rootDir, 'package.json');
  }

  /**
   * Extract all imports from code
   */
  async extractImports(code) {
    const imports = new Set();
    
    // Match: import X from 'package' or import { X } from 'package'
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1];
      
      // Only external packages (not relative imports or built-ins)
      if (!pkg.startsWith('.') && !pkg.startsWith('/') && !pkg.startsWith('node:')) {
        // Get base package name (handle @scoped/packages)
        const basePkg = pkg.startsWith('@') 
          ? pkg.split('/').slice(0, 2).join('/')
          : pkg.split('/')[0];
        
        // Skip built-in Node.js modules
        const builtIns = [
          'fs', 'path', 'http', 'https', 'crypto', 'util', 'stream', 'events',
          'buffer', 'url', 'querystring', 'os', 'child_process', 'cluster',
          'net', 'dgram', 'dns', 'readline', 'repl', 'vm', 'zlib', 'tls',
          'assert', 'console', 'process', 'timers', 'string_decoder', 'punycode'
        ];
        
        if (!builtIns.includes(basePkg)) {
          imports.add(basePkg);
        }
      }
    }
    
    // Also check require() statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      const pkg = match[1];
      if (!pkg.startsWith('.') && !pkg.startsWith('/') && !pkg.startsWith('node:')) {
        const basePkg = pkg.startsWith('@') 
          ? pkg.split('/').slice(0, 2).join('/')
          : pkg.split('/')[0];
        imports.add(basePkg);
      }
    }
    
    return Array.from(imports);
  }

  /**
   * Check if package is already installed
   */
  async isInstalled(packageName) {
    try {
      const pkg = JSON.parse(await fs.readFile(this.packageJsonPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      return !!allDeps[packageName];
    } catch (e) {
      console.warn(`⚠️ [DEPENDENCY-MANAGER] Could not read package.json: ${e.message}`);
      return false;
    }
  }

  /**
   * Ensure all dependencies from code are installed
   */
  async ensureDependencies(code) {
    const imports = await this.extractImports(code);
    
    if (imports.length === 0) {
      return { installed: [], skipped: [] };
    }
    
    try {
      const pkg = JSON.parse(await fs.readFile(this.packageJsonPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const missing = imports.filter(p => !allDeps[p]);
      const alreadyInstalled = imports.filter(p => allDeps[p]);
      
      if (missing.length > 0) {
        console.log(`📦 [DEPENDENCY-MANAGER] Installing missing dependencies: ${missing.join(', ')}`);
        
        try {
          // Install packages
          execSync(`npm install ${missing.join(' ')}`, { 
            stdio: 'inherit',
            cwd: this.rootDir,
            timeout: 300000 // 5 minute timeout
          });
          
          console.log(`✅ [DEPENDENCY-MANAGER] Successfully installed: ${missing.join(', ')}`);
          return { 
            installed: missing, 
            skipped: alreadyInstalled,
            total: imports.length 
          };
        } catch (installError) {
          console.error(`❌ [DEPENDENCY-MANAGER] Failed to install dependencies: ${installError.message}`);
          return { 
            installed: [], 
            skipped: alreadyInstalled,
            failed: missing,
            error: installError.message 
          };
        }
      } else {
        console.log(`✅ [DEPENDENCY-MANAGER] All dependencies already installed: ${imports.join(', ')}`);
        return { 
          installed: [], 
          skipped: alreadyInstalled,
          total: imports.length 
        };
      }
    } catch (e) {
      console.error(`❌ [DEPENDENCY-MANAGER] Error checking dependencies: ${e.message}`);
      return { 
        installed: [], 
        error: e.message 
      };
    }
  }

  /**
   * Process multiple code files and ensure all dependencies
   */
  async ensureDependenciesFromFiles(fileContents) {
    const allImports = new Set();
    
    // Extract imports from all files
    for (const content of Object.values(fileContents)) {
      const imports = await this.extractImports(content);
      imports.forEach(imp => allImports.add(imp));
    }
    
    // Combine all code to check dependencies
    const combinedCode = Object.values(fileContents).join('\n');
    return await this.ensureDependencies(combinedCode);
  }
}

// Export singleton instance
export const dependencyManager = new DependencyManager();
export default dependencyManager;
