/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    CODEBASE READER                                                 ║
 * ║                    Reads existing files to provide context for AI                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodebaseReader {
  constructor(rootDir = null) {
    this.rootDir = rootDir || path.join(__dirname, '..');
    this.cache = new Map();
  }

  /**
   * Read file with caching
   */
  async readFile(filePath) {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(this.rootDir, filePath);
    
    if (!this.cache.has(fullPath)) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        this.cache.set(fullPath, content);
        return content;
      } catch (e) {
        // File doesn't exist or can't be read
        return null;
      }
    }
    return this.cache.get(fullPath);
  }

  /**
   * Get all files that would be affected by a change (via imports)
   */
  async getRelatedFiles(targetFile) {
    const content = await this.readFile(targetFile);
    if (!content) return [];
    
    const relatedFiles = new Set();
    
    // Extract imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Only relative imports (not node_modules)
      if (importPath.startsWith('.')) {
        const targetDir = path.dirname(targetFile);
        const resolvedPath = path.resolve(this.rootDir, targetDir, importPath);
        
        // Try to resolve .js extension
        let resolvedFile = resolvedPath;
        if (!resolvedFile.endsWith('.js') && !resolvedFile.endsWith('.json')) {
          // Try .js first
          try {
            await fs.access(resolvedFile + '.js');
            resolvedFile = resolvedFile + '.js';
          } catch {
            // Try /index.js
            try {
              await fs.access(path.join(resolvedFile, 'index.js'));
              resolvedFile = path.join(resolvedFile, 'index.js');
            } catch {
              // File doesn't exist, skip
              continue;
            }
          }
        }
        
        // Convert to relative path from root
        const relativePath = path.relative(this.rootDir, resolvedFile);
        if (relativePath && !relativePath.startsWith('..')) {
          relatedFiles.add(relativePath);
        }
      }
    }
    
    return Array.from(relatedFiles);
  }

  /**
   * Identify files that might need to be read based on instruction
   */
  async identifyRelatedFiles(instruction, existingFileChanges = []) {
    const filesToRead = new Set();
    
    // Add files that will be modified
    for (const change of existingFileChanges) {
      filesToRead.add(change.filePath);
      
      // Get related files via imports
      const related = await this.getRelatedFiles(change.filePath);
      related.forEach(f => filesToRead.add(f));
    }
    
    // Infer files from instruction keywords
    const instructionLower = instruction.toLowerCase();
    
    if (instructionLower.includes('endpoint') || instructionLower.includes('api') || instructionLower.includes('route')) {
      filesToRead.add('server.js');
      filesToRead.add('routes/index.js');
    }
    
    if (instructionLower.includes('database') || instructionLower.includes('table') || instructionLower.includes('schema')) {
      filesToRead.add('server.js');
      // Look for migration files
      try {
        const migrationsDir = path.join(this.rootDir, 'migrations');
        const files = await fs.readdir(migrationsDir);
        // Add most recent migration
        if (files.length > 0) {
          const sorted = files.sort().reverse();
          filesToRead.add(path.join('migrations', sorted[0]));
        }
      } catch {
        // Migrations dir doesn't exist
      }
    }
    
    if (instructionLower.includes('frontend') || instructionLower.includes('ui') || instructionLower.includes('component')) {
      filesToRead.add('public/overlay/index.html');
      filesToRead.add('public/overlay/command-center.html');
    }
    
    return Array.from(filesToRead);
  }

  /**
   * Build context object for AI prompt
   */
  async buildContext(files) {
    const context = {};
    
    for (const file of files) {
      const content = await this.readFile(file);
      if (content) {
        // Use relative path as key
        const relativePath = path.isAbsolute(file) 
          ? path.relative(this.rootDir, file)
          : file;
        context[relativePath] = content;
      }
    }
    
    return context;
  }

  /**
   * Clear cache (useful after modifications)
   */
  clearCache(filePath = null) {
    if (filePath) {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(this.rootDir, filePath);
      this.cache.delete(fullPath);
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const codebaseReader = new CodebaseReader();
export default codebaseReader;
