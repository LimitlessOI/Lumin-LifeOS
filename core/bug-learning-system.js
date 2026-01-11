/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              BUG LEARNING SYSTEM                                                ║
 * ║              Learns from every bug to prevent future occurrences                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * CAPABILITIES:
 * - Bug pattern recognition
 * - Root cause analysis database
 * - Preventive code suggestions
 * - Similar bug detection
 * - Team learning from mistakes
 * - Bug prediction before they occur
 *
 * BETTER THAN HUMAN because:
 * - Never forgets a bug (human forgets in weeks)
 * - Analyzes 100% of bugs (human cherry-picks)
 * - Spots patterns across codebase (human sees local)
 * - Learns continuously (human needs meetings)
 */

import fs from 'fs';
import path from 'path';

export class BugLearningSystem {
  constructor(aiCouncil, pool) {
    this.aiCouncil = aiCouncil;
    this.pool = pool;
    this.bugPatterns = new Map(); // In-memory pattern cache
    this.preventionRules = [];
  }

  /**
   * Log a bug and learn from it
   */
  async logBug(bugData) {
    console.log(`🐛 [BUG-LEARN] Logging bug: ${bugData.title}`);

    // Enrich bug data with analysis
    const enriched = await this.analyzeBug(bugData);

    // Store in database
    const bugId = await this.storeBug(enriched);

    // Extract patterns
    await this.extractPatterns(enriched);

    // Generate prevention rules
    await this.generatePreventionRules(enriched);

    // Check for similar historical bugs
    const similar = await this.findSimilarBugs(enriched);

    console.log(`✅ [BUG-LEARN] Bug logged with ID: ${bugId}`);

    return {
      ok: true,
      bugId,
      analysis: enriched.analysis,
      similarBugs: similar,
      preventionRules: this.preventionRules.slice(-3), // Last 3 rules
    };
  }

  /**
   * Analyze bug to extract learnings
   */
  async analyzeBug(bugData) {
    console.log(`🔍 [BUG-LEARN] Analyzing bug...`);

    const prompt = `Analyze this bug to extract learnings.

BUG TITLE: ${bugData.title}

DESCRIPTION:
${bugData.description}

ERROR MESSAGE:
${bugData.errorMessage || 'N/A'}

STACK TRACE:
${bugData.stackTrace || 'N/A'}

CODE:
\`\`\`javascript
${bugData.code || 'N/A'}
\`\`\`

Provide:
1. Root Cause (single sentence)
2. Bug Category (e.g., null-reference, logic-error, race-condition, off-by-one)
3. Why It Happened (underlying reason)
4. How to Prevent (specific prevention strategy)
5. Similar Patterns to Watch (code patterns that might cause same bug)

Be specific and actionable.`;

    try {
      const analysis = await this.aiCouncil('deepseek', prompt);
      const parsed = this.parseAnalysis(analysis);

      return {
        ...bugData,
        analysis: parsed,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Bug analysis failed:', error.message);
      return {
        ...bugData,
        analysis: {
          rootCause: 'Analysis failed',
          category: 'unknown',
          prevention: [],
        },
      };
    }
  }

  /**
   * Parse AI analysis response
   */
  parseAnalysis(aiResponse) {
    const analysis = {
      rootCause: '',
      category: 'unknown',
      whyItHappened: '',
      prevention: [],
      similarPatterns: [],
    };

    // Extract root cause
    const rootCauseMatch = aiResponse.match(/Root Cause:?\s*(.+)/i);
    if (rootCauseMatch) {
      analysis.rootCause = rootCauseMatch[1].trim();
    }

    // Extract category
    const categoryMatch = aiResponse.match(/Category:?\s*(.+)/i);
    if (categoryMatch) {
      analysis.category = categoryMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
    }

    // Extract why it happened
    const whyMatch = aiResponse.match(/Why.*Happened:?\s*(.+)/i);
    if (whyMatch) {
      analysis.whyItHappened = whyMatch[1].trim();
    }

    // Extract prevention strategies
    const preventionMatch = aiResponse.match(/How to Prevent:?\s*([\s\S]*?)(?=Similar|$)/i);
    if (preventionMatch) {
      const preventions = preventionMatch[1].split(/\n/).filter(l => l.trim().match(/^[\d\-\*]/));
      analysis.prevention = preventions.map(p => p.replace(/^[\d\-\*\.\s]+/, '').trim());
    }

    // Extract similar patterns
    const patternsMatch = aiResponse.match(/Similar Patterns:?\s*([\s\S]*?)$/i);
    if (patternsMatch) {
      const patterns = patternsMatch[1].split(/\n/).filter(l => l.trim().match(/^[\d\-\*]/));
      analysis.similarPatterns = patterns.map(p => p.replace(/^[\d\-\*\.\s]+/, '').trim());
    }

    return analysis;
  }

  /**
   * Store bug in database
   */
  async storeBug(bugData) {
    if (this.pool) {
      try {
        const result = await this.pool.query(
          `INSERT INTO bug_learning
           (title, description, error_message, stack_trace, code_snippet,
            root_cause, category, prevention_strategies, similar_patterns,
            file_path, severity, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           RETURNING id`,
          [
            bugData.title,
            bugData.description,
            bugData.errorMessage || '',
            bugData.stackTrace || '',
            bugData.code || '',
            bugData.analysis.rootCause,
            bugData.analysis.category,
            JSON.stringify(bugData.analysis.prevention),
            JSON.stringify(bugData.analysis.similarPatterns),
            bugData.filePath || '',
            bugData.severity || 'medium',
          ]
        );

        return result.rows[0].id;
      } catch (err) {
        console.error('Failed to store bug:', err.message);
        return null;
      }
    }

    return Math.random(); // Fallback ID
  }

  /**
   * Extract patterns from bug
   */
  async extractPatterns(bugData) {
    const category = bugData.analysis.category;

    if (!this.bugPatterns.has(category)) {
      this.bugPatterns.set(category, {
        count: 0,
        examples: [],
        commonCauses: new Map(),
      });
    }

    const pattern = this.bugPatterns.get(category);
    pattern.count++;
    pattern.examples.push({
      title: bugData.title,
      rootCause: bugData.analysis.rootCause,
    });

    // Track common causes
    const cause = bugData.analysis.rootCause;
    pattern.commonCauses.set(cause, (pattern.commonCauses.get(cause) || 0) + 1);

    console.log(`📊 [BUG-LEARN] Pattern updated: ${category} (seen ${pattern.count} times)`);
  }

  /**
   * Generate prevention rules from bug
   */
  async generatePreventionRules(bugData) {
    for (const prevention of bugData.analysis.prevention) {
      const rule = {
        category: bugData.analysis.category,
        rule: prevention,
        severity: bugData.severity || 'medium',
        createdFrom: bugData.title,
        createdAt: new Date().toISOString(),
      };

      this.preventionRules.push(rule);

      // Store rule in database
      if (this.pool) {
        try {
          await this.pool.query(
            `INSERT INTO prevention_rules
             (category, rule_text, severity, created_from_bug, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (category, rule_text) DO NOTHING`,
            [rule.category, rule.rule, rule.severity, bugData.title]
          );
        } catch (err) {
          console.error('Failed to store prevention rule:', err.message);
        }
      }
    }

    console.log(`🛡️ [BUG-LEARN] Generated ${bugData.analysis.prevention.length} prevention rules`);
  }

  /**
   * Find similar bugs from history
   */
  async findSimilarBugs(bugData) {
    const similar = [];

    if (this.pool) {
      try {
        // Find bugs with same category
        const result = await this.pool.query(
          `SELECT id, title, root_cause, prevention_strategies, created_at
           FROM bug_learning
           WHERE category = $1
           AND id != $2
           ORDER BY created_at DESC
           LIMIT 5`,
          [bugData.analysis.category, bugData.id || 0]
        );

        return result.rows.map(row => ({
          id: row.id,
          title: row.title,
          rootCause: row.root_cause,
          preventionStrategies: row.prevention_strategies,
          when: row.created_at,
        }));
      } catch (err) {
        console.error('Failed to find similar bugs:', err.message);
      }
    }

    return similar;
  }

  /**
   * Scan code for potential bugs based on learned patterns
   */
  async scanForKnownBugPatterns(code, filePath) {
    console.log(`🔍 [BUG-LEARN] Scanning for known bug patterns: ${filePath}`);

    const potentialBugs = [];

    // Check against learned patterns
    for (const [category, pattern] of this.bugPatterns) {
      for (const similarPattern of pattern.examples) {
        // Simple heuristic: if code contains patterns similar to known bugs
        if (pattern.count >= 3) { // Only check patterns seen 3+ times
          const warning = this.checkCodeForPattern(code, category, similarPattern);
          if (warning) {
            potentialBugs.push(warning);
          }
        }
      }
    }

    // AI-powered scan using learned prevention rules
    const aiWarnings = await this.aiScanUsingRules(code, filePath);
    potentialBugs.push(...aiWarnings);

    return {
      ok: true,
      filePath,
      potentialBugs,
      count: potentialBugs.length,
      safe: potentialBugs.length === 0,
    };
  }

  /**
   * Check code for specific pattern
   */
  checkCodeForPattern(code, category, similarPattern) {
    // Simple pattern matching based on category
    const checks = {
      'null-reference': /\.\w+\s*(?!\?\.)/g,
      'undefined-property': /\[\s*\w+\s*\](?!\?)/g,
      'race-condition': /await.*await/g,
      'off-by-one': /length\s*-\s*1|<\s*length/g,
    };

    const pattern = checks[category];
    if (pattern && code.match(pattern)) {
      return {
        category,
        severity: 'low',
        message: `Potential ${category} bug (similar to "${similarPattern.title}")`,
        recommendation: `Review carefully - we've seen ${this.bugPatterns.get(category).count} bugs like this`,
      };
    }

    return null;
  }

  /**
   * AI scan using learned prevention rules
   */
  async aiScanUsingRules(code, filePath) {
    if (this.preventionRules.length === 0) {
      return [];
    }

    const rules = this.preventionRules.slice(-10).map(r => `- ${r.rule}`).join('\n');

    const prompt = `You are a bug detective. Scan this code for potential bugs based on learned prevention rules.

PREVENTION RULES (from past bugs):
${rules}

CODE:
\`\`\`javascript
${code.slice(0, 1500)} ${code.length > 1500 ? '... (truncated)' : ''}
\`\`\`

Report potential bugs that violate these rules.
Format: [SEVERITY] Line X: Description

Only report HIGH CONFIDENCE warnings.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);
      return this.parseAIWarnings(response);
    } catch (error) {
      console.error('AI scan failed:', error.message);
      return [];
    }
  }

  /**
   * Parse AI warnings
   */
  parseAIWarnings(aiResponse) {
    const warnings = [];
    const lines = aiResponse.split('\n');

    for (const line of lines) {
      const match = line.match(/\[(LOW|MEDIUM|HIGH|CRITICAL)\]\s*Line\s*(\d+):?\s*(.+)/i);

      if (match) {
        warnings.push({
          category: 'ai-detected',
          severity: match[1].toLowerCase(),
          line: parseInt(match[2]),
          message: match[3].trim(),
        });
      }
    }

    return warnings;
  }

  /**
   * Get learning statistics
   */
  async getStats() {
    const stats = {
      totalBugs: 0,
      categories: [],
      topCategories: [],
      preventionRules: this.preventionRules.length,
    };

    if (this.pool) {
      try {
        // Total bugs
        const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM bug_learning');
        stats.totalBugs = parseInt(totalResult.rows[0].count);

        // By category
        const categoryResult = await this.pool.query(`
          SELECT category, COUNT(*) as count
          FROM bug_learning
          GROUP BY category
          ORDER BY count DESC
          LIMIT 10
        `);

        stats.topCategories = categoryResult.rows.map(row => ({
          category: row.category,
          count: parseInt(row.count),
        }));
      } catch (err) {
        console.error('Failed to get stats:', err.message);
      }
    }

    // From in-memory patterns
    for (const [category, pattern] of this.bugPatterns) {
      stats.categories.push({
        category,
        count: pattern.count,
        topCause: this.getTopCause(pattern.commonCauses),
      });
    }

    return stats;
  }

  /**
   * Get top cause from common causes map
   */
  getTopCause(commonCauses) {
    let topCause = '';
    let maxCount = 0;

    for (const [cause, count] of commonCauses) {
      if (count > maxCount) {
        maxCount = count;
        topCause = cause;
      }
    }

    return topCause;
  }

  /**
   * Generate bug prevention report
   */
  async generatePreventionReport() {
    const stats = await this.getStats();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBugsLearned: stats.totalBugs,
        preventionRulesGenerated: stats.preventionRules,
        topBugCategories: stats.topCategories.slice(0, 5),
      },
      recommendations: [],
      preventionStrategies: this.preventionRules.slice(-10),
    };

    // Generate recommendations
    if (stats.topCategories.length > 0) {
      const top = stats.topCategories[0];
      report.recommendations.push(
        `Focus on preventing ${top.category} bugs (${top.count} occurrences)`
      );
    }

    if (stats.totalBugs > 50) {
      report.recommendations.push(
        'Consider team training on top 3 bug categories'
      );
    }

    return report;
  }
}

// Export
export function createBugLearningSystem(aiCouncil, pool) {
  return new BugLearningSystem(aiCouncil, pool);
}
