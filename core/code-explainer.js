/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              CODE EXPLANATION SYSTEM                                            ║
 * ║              Explains code at any level of detail for any audience              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * CAPABILITIES:
 * - Explains code for different skill levels (beginner, intermediate, expert)
 * - Generates documentation automatically
 * - Creates learning tutorials from code
 * - Visualizes code flow and data structures
 * - Provides examples and analogies
 *
 * BETTER THAN HUMAN because:
 * - Explains at perfect detail level for audience (human misjudges)
 * - Never skips assumed knowledge (human assumes too much)
 * - Consistent terminology (human varies)
 * - Instant explanations (human takes minutes)
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

export class CodeExplainer {
  constructor(aiCouncil, pool) {
    this.aiCouncil = aiCouncil;
    this.pool = pool;
  }

  /**
   * Explain code for specific audience level
   */
  async explainCode(code, options = {}) {
    const level = options.level || 'intermediate'; // beginner, intermediate, expert
    const format = options.format || 'narrative'; // narrative, tutorial, documentation, diagram

    console.log(`📖 [EXPLAIN] Explaining code for ${level} level...`);

    const prompt = this.buildExplanationPrompt(code, level, format, options);

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      const explanation = {
        code,
        level,
        format,
        content: response,
        timestamp: new Date().toISOString(),
      };

      // Store explanation
      await this.storeExplanation(explanation);

      return {
        ok: true,
        explanation: response,
        level,
        format,
      };
    } catch (error) {
      console.error('Code explanation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Build explanation prompt based on audience and format
   */
  buildExplanationPrompt(code, level, format, options) {
    const basePrompt = `Explain this code:

\`\`\`javascript
${code}
\`\`\``;

    const levelInstructions = {
      beginner: `
Explain for someone new to programming:
- Use simple language, no jargon
- Explain every concept used
- Use analogies and real-world examples
- Break down complex parts step-by-step
- Assume no prior knowledge`,

      intermediate: `
Explain for someone with basic programming knowledge:
- Use standard programming terminology
- Focus on the logic and flow
- Highlight interesting patterns or techniques
- Point out best practices
- Assume understanding of basic concepts`,

      expert: `
Explain for an experienced developer:
- Focus on architecture and design decisions
- Discuss performance implications
- Compare alternative approaches
- Highlight edge cases and gotchas
- Use technical terminology freely`,
    };

    const formatInstructions = {
      narrative: `
Provide a narrative explanation that:
1. Describes what the code does overall
2. Walks through the logic step-by-step
3. Explains why it's structured this way
4. Points out important details`,

      tutorial: `
Create a tutorial that:
1. Introduces the problem being solved
2. Shows how the code solves it
3. Provides examples of usage
4. Suggests exercises to practice
5. Links to related concepts`,

      documentation: `
Generate documentation that includes:
1. Purpose and functionality
2. Parameters and return values
3. Usage examples
4. Error handling
5. Dependencies
6. Performance characteristics`,

      diagram: `
Describe the code flow:
1. Input/output
2. Main execution path
3. Conditional branches
4. Data transformations
5. Use text-based diagrams if helpful`,
    };

    return `${basePrompt}

${levelInstructions[level]}

${formatInstructions[format]}

${options.context ? `CONTEXT: ${options.context}` : ''}`;
  }

  /**
   * Generate interactive tutorial from code
   */
  async generateTutorial(code, topic) {
    console.log(`📚 [EXPLAIN] Generating tutorial: ${topic}`);

    const prompt = `Create an interactive tutorial for this code.

TOPIC: ${topic}

CODE:
\`\`\`javascript
${code}
\`\`\`

Generate a tutorial with:
1. Introduction (what will we learn?)
2. Prerequisites (what knowledge is needed?)
3. Step-by-step breakdown (explain each part)
4. Full code with comments
5. Practice exercises (3-5 exercises)
6. Common mistakes to avoid
7. Next steps (what to learn next)

Make it engaging and educational.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        tutorial: response,
        topic,
      };
    } catch (error) {
      console.error('Tutorial generation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Explain code changes (git diff style)
   */
  async explainChanges(oldCode, newCode, context = {}) {
    console.log(`🔄 [EXPLAIN] Explaining code changes...`);

    const prompt = `Explain what changed between these two versions of code.

OLD CODE:
\`\`\`javascript
${oldCode}
\`\`\`

NEW CODE:
\`\`\`javascript
${newCode}
\`\`\`

Explain:
1. What changed (high-level summary)
2. Why it changed (purpose of the change)
3. How it changed (specific modifications)
4. Impact (what this affects)
5. Risks (potential issues to watch for)

${context.commitMessage ? `Commit message: ${context.commitMessage}` : ''}`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        changeExplanation: response,
      };
    } catch (error) {
      console.error('Change explanation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Explain error messages
   */
  async explainError(errorMessage, code, context = {}) {
    console.log(`🐛 [EXPLAIN] Explaining error...`);

    const prompt = `Explain this error message in simple terms.

ERROR:
${errorMessage}

CODE WHERE ERROR OCCURRED:
\`\`\`javascript
${code}
\`\`\`

Explain:
1. What the error means (in plain English)
2. Why it happened (root cause)
3. How to fix it (specific steps)
4. How to prevent it in the future

Be beginner-friendly and specific.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        errorExplanation: response,
      };
    } catch (error) {
      console.error('Error explanation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate code examples
   */
  async generateExamples(concept, context = {}) {
    console.log(`💡 [EXPLAIN] Generating examples for: ${concept}`);

    const prompt = `Generate code examples demonstrating: ${concept}

Create 3 examples:
1. Basic example (simplest use case)
2. Intermediate example (more realistic)
3. Advanced example (complex scenario)

For each example provide:
- Code with comments
- Explanation of what it demonstrates
- Expected output

${context.language ? `Language: ${context.language}` : 'Language: JavaScript'}`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        examples: response,
        concept,
      };
    } catch (error) {
      console.error('Example generation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Compare code approaches
   */
  async compareApproaches(approach1, approach2, context = {}) {
    console.log(`⚖️ [EXPLAIN] Comparing approaches...`);

    const prompt = `Compare these two code approaches.

APPROACH 1:
\`\`\`javascript
${approach1}
\`\`\`

APPROACH 2:
\`\`\`javascript
${approach2}
\`\`\`

Compare:
1. Functionality (do they achieve the same goal?)
2. Performance (which is faster?)
3. Readability (which is clearer?)
4. Maintainability (which is easier to modify?)
5. Best practices (which follows standards better?)
6. Trade-offs (pros and cons of each)

Recommend which to use and why.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        comparison: response,
      };
    } catch (error) {
      console.error('Comparison failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate visual diagram from code
   */
  async generateDiagram(code, diagramType = 'flow') {
    console.log(`📊 [EXPLAIN] Generating ${diagramType} diagram...`);

    const prompt = `Create a text-based ${diagramType} diagram for this code.

CODE:
\`\`\`javascript
${code}
\`\`\`

Generate a ${diagramType} diagram using:
- ASCII art or Mermaid syntax
- Clear labels and connections
- Easy to understand at a glance

Types of diagrams:
- flow: Control flow and logic paths
- data: Data structures and transformations
- sequence: Order of operations
- architecture: Component relationships`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        diagram: response,
        diagramType,
      };
    } catch (error) {
      console.error('Diagram generation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Create code walkthrough
   */
  async createWalkthrough(code, context = {}) {
    console.log(`👣 [EXPLAIN] Creating code walkthrough...`);

    const prompt = `Create a detailed walkthrough of this code.

CODE:
\`\`\`javascript
${code}
\`\`\`

Provide a line-by-line walkthrough:
- What each line does
- Why it's needed
- What values variables hold at each step
- How data flows through the code

Make it like a step-by-step debugger trace.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        walkthrough: response,
      };
    } catch (error) {
      console.error('Walkthrough creation failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Store explanation in database
   */
  async storeExplanation(explanation) {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO code_explanations
           (code, level, format, explanation, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            explanation.code.slice(0, 5000),
            explanation.level,
            explanation.format,
            explanation.content.slice(0, 10000),
          ]
        );
      } catch (err) {
        console.error('Failed to store explanation:', err.message);
      }
    }
  }

  /**
   * Get explanation statistics
   */
  async getStats() {
    const stats = {
      totalExplanations: 0,
      byLevel: { beginner: 0, intermediate: 0, expert: 0 },
      byFormat: {},
    };

    if (this.pool) {
      try {
        const result = await this.pool.query(`
          SELECT
            COUNT(*) as total,
            level,
            COUNT(*) as level_count
          FROM code_explanations
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY level
        `);

        for (const row of result.rows) {
          stats.totalExplanations += parseInt(row.total);
          stats.byLevel[row.level] = parseInt(row.level_count);
        }
      } catch (err) {
        console.error('Failed to get stats:', err.message);
      }
    }

    return stats;
  }
}

// Export
export function createCodeExplainer(aiCouncil, pool) {
  return new CodeExplainer(aiCouncil, pool);
}
