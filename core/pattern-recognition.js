/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              CODEBASE PATTERN RECOGNITION SYSTEM                                ║
 * ║              Finds patterns and anti-patterns across entire codebase            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * CAPABILITIES:
 * - Design pattern detection
 * - Anti-pattern identification
 * - Code duplication analysis
 * - Architectural pattern recognition
 * - Inconsistency detection
 * - Best practice suggestions
 *
 * BETTER THAN HUMAN because:
 * - Analyzes 100% of codebase (human samples)
 * - Never forgets patterns (human rediscovers)
 * - Cross-file pattern detection (human misses)
 * - Quantifies pattern usage (human estimates)
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import fs from 'fs';
import path from 'path';

export class PatternRecognition {
  constructor(aiCouncil, pool) {
    this.aiCouncil = aiCouncil;
    this.pool = pool;
    this.patterns = new Map();
    this.antiPatterns = new Map();
    this.duplicates = [];
  }

  /**
   * Analyze entire codebase for patterns
   */
  async analyzeCodebase(directory = './') {
    console.log(`🔍 [PATTERNS] Analyzing codebase: ${directory}`);

    const analysis = {
      startedAt: new Date().toISOString(),
      directory,
      filesAnalyzed: 0,
      patternsFound: [],
      antiPatternsFound: [],
      duplicatesFound: [],
      inconsistencies: [],
    };

    try {
      // Find all JavaScript files
      const files = this.findJavaScriptFiles(directory);
      console.log(`📁 [PATTERNS] Found ${files.length} files to analyze`);

      // Analyze each file
      for (const file of files) {
        await this.analyzeFile(file, analysis);
        analysis.filesAnalyzed++;
      }

      // Detect cross-file patterns
      console.log(`🔗 [PATTERNS] Detecting cross-file patterns...`);
      await this.detectCrossFilePatterns(files, analysis);

      // Detect code duplication
      console.log(`📋 [PATTERNS] Detecting code duplication...`);
      await this.detectDuplication(files, analysis);

      // Detect inconsistencies
      console.log(`⚠️ [PATTERNS] Detecting inconsistencies...`);
      await this.detectInconsistencies(files, analysis);

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      analysis.completedAt = new Date().toISOString();

      // Store analysis
      await this.storeAnalysis(analysis);

      console.log(`✅ [PATTERNS] Analysis complete: ${analysis.patternsFound.length} patterns, ${analysis.antiPatternsFound.length} anti-patterns`);

      return {
        ok: true,
        analysis,
      };
    } catch (error) {
      console.error(`❌ [PATTERNS] Analysis failed: ${error.message}`);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze single file for patterns
   */
  async analyzeFile(filePath, analysis) {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');

      // Detect design patterns
      const patterns = this.detectDesignPatterns(code, filePath);
      analysis.patternsFound.push(...patterns);

      // Detect anti-patterns
      const antiPatterns = this.detectAntiPatterns(code, filePath);
      analysis.antiPatternsFound.push(...antiPatterns);
    } catch (error) {
      console.error(`Failed to analyze ${filePath}:`, error.message);
    }
  }

  /**
   * Detect design patterns in code
   */
  detectDesignPatterns(code, filePath) {
    const patterns = [];

    // Singleton pattern
    if (code.match(/class\s+\w+\s*\{[^}]*static\s+instance/)) {
      patterns.push({
        pattern: 'Singleton',
        file: filePath,
        confidence: 'high',
        description: 'Singleton pattern detected',
      });
    }

    // Factory pattern
    if (code.match(/create\w+\s*\([^)]*\)\s*\{[^}]*return\s+new/i)) {
      patterns.push({
        pattern: 'Factory',
        file: filePath,
        confidence: 'medium',
        description: 'Factory pattern detected',
      });
    }

    // Observer pattern
    if (code.match(/addEventListener|subscribe|on\(/)) {
      patterns.push({
        pattern: 'Observer',
        file: filePath,
        confidence: 'medium',
        description: 'Observer pattern (event listeners) detected',
      });
    }

    // Decorator pattern
    if (code.match(/@\w+/)) {
      patterns.push({
        pattern: 'Decorator',
        file: filePath,
        confidence: 'high',
        description: 'Decorator pattern (decorators) detected',
      });
    }

    // Strategy pattern
    if (code.match(/strategy\s*:|setStrategy|getStrategy/i)) {
      patterns.push({
        pattern: 'Strategy',
        file: filePath,
        confidence: 'medium',
        description: 'Strategy pattern detected',
      });
    }

    return patterns;
  }

  /**
   * Detect anti-patterns in code
   */
  detectAntiPatterns(code, filePath) {
    const antiPatterns = [];

    // God Object
    const classMatch = code.match(/class\s+\w+/g);
    if (classMatch) {
      const lines = code.split('\n').length;
      if (lines > 500) {
        antiPatterns.push({
          antiPattern: 'God Object',
          file: filePath,
          severity: 'high',
          description: `Large class (${lines} lines) - consider splitting`,
        });
      }
    }

    // Callback Hell
    const callbackDepth = this.detectCallbackDepth(code);
    if (callbackDepth > 3) {
      antiPatterns.push({
        antiPattern: 'Callback Hell',
        file: filePath,
        severity: 'high',
        description: `Deeply nested callbacks (${callbackDepth} levels) - use async/await`,
      });
    }

    // Magic Numbers
    const magicNumbers = code.match(/\b(?!0|1|2|100|1000)\d{3,}\b/g);
    if (magicNumbers && magicNumbers.length > 5) {
      antiPatterns.push({
        antiPattern: 'Magic Numbers',
        file: filePath,
        severity: 'medium',
        description: `${magicNumbers.length} magic numbers - use named constants`,
      });
    }

    // Tight Coupling
    if (code.match(/new\s+\w+\(/g)?.length > 10) {
      antiPatterns.push({
        antiPattern: 'Tight Coupling',
        file: filePath,
        severity: 'medium',
        description: 'Many direct instantiations - consider dependency injection',
      });
    }

    // Copy-Paste Programming
    const repeatedBlocks = this.findRepeatedCodeBlocks(code);
    if (repeatedBlocks.length > 0) {
      antiPatterns.push({
        antiPattern: 'Copy-Paste Programming',
        file: filePath,
        severity: 'high',
        description: `${repeatedBlocks.length} repeated code blocks - extract to functions`,
      });
    }

    return antiPatterns;
  }

  /**
   * Detect callback depth (callback hell indicator)
   */
  detectCallbackDepth(code) {
    let maxDepth = 0;
    let currentDepth = 0;

    for (let i = 0; i < code.length; i++) {
      if (code.slice(i, i + 8) === 'function') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (code[i] === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Find repeated code blocks
   */
  findRepeatedCodeBlocks(code) {
    const blocks = [];
    const lines = code.split('\n');
    const blockSize = 5;

    for (let i = 0; i < lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize).join('\n').trim();

      if (block.length < 50) continue;

      for (let j = i + blockSize; j < lines.length - blockSize; j++) {
        const compareBlock = lines.slice(j, j + blockSize).join('\n').trim();

        if (block === compareBlock) {
          blocks.push({ startLine: i + 1, matchLine: j + 1 });
        }
      }
    }

    return blocks;
  }

  /**
   * Detect cross-file patterns
   */
  async detectCrossFilePatterns(files, analysis) {
    // Find common imports
    const imports = new Map();

    for (const file of files) {
      try {
        const code = fs.readFileSync(file, 'utf-8');
        const importMatches = code.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);

        for (const match of importMatches) {
          const module = match[1];
          imports.set(module, (imports.get(module) || 0) + 1);
        }
      } catch (err) {
        continue;
      }
    }

    // Find most common imports
    const sortedImports = Array.from(imports.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [module, count] of sortedImports) {
      analysis.patternsFound.push({
        pattern: 'Common Dependency',
        description: `${module} imported in ${count} files`,
        file: 'codebase-wide',
        confidence: 'high',
      });
    }
  }

  /**
   * Detect code duplication
   */
  async detectDuplication(files, analysis) {
    const codeHashes = new Map();

    for (const file of files) {
      try {
        const code = fs.readFileSync(file, 'utf-8');
        const lines = code.split('\n');

        // Check for duplicate functions
        const functionMatches = code.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g);

        for (const match of functionMatches) {
          const funcBody = match[2].trim();
          const hash = this.simpleHash(funcBody);

          if (codeHashes.has(hash)) {
            analysis.duplicatesFound.push({
              function: match[1],
              file1: codeHashes.get(hash).file,
              file2: file,
              similarity: '100%',
            });
          } else {
            codeHashes.set(hash, { file, function: match[1] });
          }
        }
      } catch (err) {
        continue;
      }
    }
  }

  /**
   * Simple hash function for code comparison
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Detect coding inconsistencies
   */
  async detectInconsistencies(files, analysis) {
    let quoteSingleCount = 0;
    let quoteDoubleCount = 0;
    let semicolonYes = 0;
    let semicolonNo = 0;

    for (const file of files) {
      try {
        const code = fs.readFileSync(file, 'utf-8');

        // Quote style
        quoteSingleCount += (code.match(/'/g) || []).length;
        quoteDoubleCount += (code.match(/"/g) || []).length;

        // Semicolon usage
        const lines = code.split('\n');
        for (const line of lines) {
          if (line.trim() && !line.trim().startsWith('//')) {
            if (line.trim().endsWith(';')) semicolonYes++;
            else if (line.match(/[a-zA-Z0-9)]$/)) semicolonNo++;
          }
        }
      } catch (err) {
        continue;
      }
    }

    // Report inconsistencies
    const quoteDiff = Math.abs(quoteSingleCount - quoteDoubleCount);
    if (quoteDiff < Math.min(quoteSingleCount, quoteDoubleCount)) {
      analysis.inconsistencies.push({
        type: 'Quote Style',
        description: `Inconsistent quote usage (single: ${quoteSingleCount}, double: ${quoteDoubleCount})`,
        recommendation: quoteSingleCount > quoteDoubleCount ? 'Standardize on single quotes' : 'Standardize on double quotes',
      });
    }

    const semiDiff = Math.abs(semicolonYes - semicolonNo);
    if (semiDiff < Math.min(semicolonYes, semicolonNo)) {
      analysis.inconsistencies.push({
        type: 'Semicolon Usage',
        description: `Inconsistent semicolon usage (with: ${semicolonYes}, without: ${semicolonNo})`,
        recommendation: semicolonYes > semicolonNo ? 'Always use semicolons' : 'Remove semicolons (use linter)',
      });
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Anti-pattern recommendations
    if (analysis.antiPatternsFound.length > 0) {
      const godObjects = analysis.antiPatternsFound.filter(ap => ap.antiPattern === 'God Object');
      if (godObjects.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'Architecture',
          recommendation: `Refactor ${godObjects.length} large classes using Single Responsibility Principle`,
          files: godObjects.map(go => go.file),
        });
      }

      const callbackHells = analysis.antiPatternsFound.filter(ap => ap.antiPattern === 'Callback Hell');
      if (callbackHells.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'Code Quality',
          recommendation: `Convert ${callbackHells.length} callback-heavy files to async/await`,
          files: callbackHells.map(ch => ch.file),
        });
      }
    }

    // Duplication recommendations
    if (analysis.duplicatesFound.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'DRY Principle',
        recommendation: `Extract ${analysis.duplicatesFound.length} duplicated code blocks into reusable functions`,
        count: analysis.duplicatesFound.length,
      });
    }

    // Inconsistency recommendations
    for (const inconsistency of analysis.inconsistencies) {
      recommendations.push({
        priority: 'low',
        category: 'Code Style',
        recommendation: inconsistency.recommendation,
      });
    }

    return recommendations;
  }

  /**
   * Find JavaScript files
   */
  findJavaScriptFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
      return fileList;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          if (!file.match(/node_modules|\.git|\.next|dist|build|coverage/)) {
            this.findJavaScriptFiles(filePath, fileList);
          }
        } else if (file.match(/\.js$/)) {
          fileList.push(filePath);
        }
      } catch (err) {
        continue;
      }
    }

    return fileList;
  }

  /**
   * Store analysis in database
   */
  async storeAnalysis(analysis) {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO pattern_analysis
           (directory, files_analyzed, patterns_found, anti_patterns_found,
            duplicates_found, inconsistencies, recommendations, started_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            analysis.directory,
            analysis.filesAnalyzed,
            JSON.stringify(analysis.patternsFound),
            JSON.stringify(analysis.antiPatternsFound),
            JSON.stringify(analysis.duplicatesFound),
            JSON.stringify(analysis.inconsistencies),
            JSON.stringify(analysis.recommendations),
            analysis.startedAt,
            analysis.completedAt,
          ]
        );
      } catch (err) {
        console.error('Failed to store analysis:', err.message);
      }
    }
  }
}

// Export
export function createPatternRecognition(aiCouncil, pool) {
  return new PatternRecognition(aiCouncil, pool);
}
