/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    FILE CLEANUP ANALYZER                                         ║
 * ║                    Identify unused/redundant files from self-programming        ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileCleanupAnalyzer {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.usedFiles = new Set();
    this.imports = new Map();
    this.redundantFiles = [];
    this.unusedFiles = [];
  }

  /**
   * Analyze codebase for unused files
   */
  async analyze() {
    console.log('🔍 Analyzing codebase for unused files...');

    // 1. Find all entry points
    const entryPoints = [
      'server.js',
      'public/overlay/index.html',
      'package.json',
    ];

    // 2. Trace all imports/requires
    for (const entry of entryPoints) {
      await this.traceImports(entry);
    }

    // 3. Find all JS files
    const allFiles = await this.findAllFiles(this.rootDir, ['.js', '.mjs', '.ts']);

    // 4. Identify unused files
    for (const file of allFiles) {
      if (!this.usedFiles.has(file)) {
        // Check if it's a test file, config, or should be kept
        if (this.shouldKeepFile(file)) {
          continue;
        }
        this.unusedFiles.push(file);
      }
    }

    // 5. Find redundant files (duplicates, old versions)
    await this.findRedundantFiles();

    return {
      unused: this.unusedFiles,
      redundant: this.redundantFiles,
      totalFiles: allFiles.length,
      usedFiles: this.usedFiles.size,
    };
  }

  /**
   * Trace imports from a file
   */
  async traceImports(filePath) {
    if (this.usedFiles.has(filePath)) return;
    if (!fs.existsSync(filePath)) return;

    this.usedFiles.add(filePath);

    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const imports = this.extractImports(content);

      for (const imp of imports) {
        const resolved = this.resolveImport(imp, filePath);
        if (resolved) {
          await this.traceImports(resolved);
        }
      }
    } catch (error) {
      console.warn(`Failed to trace ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract imports from file content
   */
  extractImports(content) {
    const imports = [];

    // ES6 imports
    const es6ImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6ImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // require() calls
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Resolve import path
   */
  resolveImport(importPath, fromFile) {
    // Skip node_modules, URLs, etc.
    if (importPath.startsWith('http') || 
        importPath.startsWith('node_modules') ||
        importPath.startsWith('@')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, importPath);

    // Try with .js extension
    if (!resolved.endsWith('.js') && !resolved.endsWith('.mjs')) {
      if (fs.existsSync(resolved + '.js')) {
        resolved += '.js';
      } else if (fs.existsSync(resolved + '.mjs')) {
        resolved += '.mjs';
      } else if (fs.existsSync(resolved + '/index.js')) {
        resolved = path.join(resolved, 'index.js');
      }
    }

    return fs.existsSync(resolved) ? resolved : null;
  }

  /**
   * Find all files recursively
   */
  async findAllFiles(dir, extensions) {
    const files = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, etc.
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' ||
          entry.name === 'knowledge') {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.findAllFiles(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Check if file should be kept (tests, configs, etc.)
   */
  shouldKeepFile(filePath) {
    const name = path.basename(filePath);
    const dir = path.dirname(filePath);

    // Keep test files
    if (name.includes('test') || name.includes('spec')) return true;

    // Keep config files
    if (name.includes('config') || name.includes('Config')) return true;

    // Keep core modules
    if (dir.includes('core/')) return true;

    // Keep public files
    if (dir.includes('public/')) return true;

    // Keep documentation
    if (name.endsWith('.md')) return true;

    // Keep package files
    if (name === 'package.json' || name === 'package-lock.json') return true;

    return false;
  }

  /**
   * Find redundant files (duplicates, old versions)
   */
  async findRedundantFiles() {
    const files = await this.findAllFiles(this.rootDir, ['.js', '.mjs']);

    // Group by base name
    const byBaseName = {};
    files.forEach(file => {
      const base = path.basename(file, path.extname(file));
      if (!byBaseName[base]) {
        byBaseName[base] = [];
      }
      byBaseName[base].push(file);
    });

    // Find duplicates
    Object.entries(byBaseName).forEach(([base, paths]) => {
      if (paths.length > 1) {
        // Check for old versions (e.g., file.js, file_old.js, file_backup.js)
        const sorted = paths.sort();
        for (let i = 1; i < sorted.length; i++) {
          const name = path.basename(sorted[i]);
          if (name.includes('_old') || 
              name.includes('_backup') || 
              name.includes('_bak') ||
              name.includes('.old')) {
            this.redundantFiles.push({
              file: sorted[i],
              reason: 'Old/backup version',
              keep: sorted[0], // Keep the first one
            });
          }
        }
      }
    });

    // Find single-letter files (likely test/scratch files)
    files.forEach(file => {
      const name = path.basename(file, path.extname(file));
      if (name.length === 1 && /^[A-Z]$/.test(name)) {
        this.redundantFiles.push({
          file,
          reason: 'Single letter file (likely scratch/test)',
        });
      }
    });
  }

  /**
   * Generate cleanup report
   */
  generateReport() {
    return {
      unused: this.unusedFiles.map(f => ({
        file: path.relative(this.rootDir, f),
        reason: 'Not imported by any entry point',
      })),
      redundant: this.redundantFiles.map(f => ({
        file: path.relative(this.rootDir, f.file),
        reason: f.reason,
        keep: f.keep ? path.relative(this.rootDir, f.keep) : null,
      })),
      summary: {
        totalUnused: this.unusedFiles.length,
        totalRedundant: this.redundantFiles.length,
        canDelete: this.unusedFiles.length + this.redundantFiles.length,
      },
    };
  }
}
