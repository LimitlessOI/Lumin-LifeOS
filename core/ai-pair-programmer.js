/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              AI PAIR PROGRAMMER                                                 ║
 * ║              Works alongside you like a senior developer partner                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * CAPABILITIES:
 * - Real-time code suggestions
 * - Completes partially written code
 * - Suggests improvements and best practices
 * - Catches bugs as you type
 * - Explains complex code
 * - Refactoring suggestions
 *
 * BETTER THAN HUMAN because:
 * - Always available (human partner has meetings)
 * - Instant responses (human takes minutes)
 * - Never gets tired (human energy drops)
 * - Knows entire codebase (human knows subset)
 */

import fs from 'fs';

export class AIPairProgrammer {
  constructor(aiCouncil, pool) {
    this.aiCouncil = aiCouncil;
    this.pool = pool;
    this.sessionHistory = [];
    this.codebaseContext = new Map();
  }

  /**
   * Complete partially written code
   */
  async completeCode(partialCode, context = {}) {
    console.log(`💡 [PAIR] Completing code...`);

    const prompt = `You are pair programming. Complete this partially written code.

CONTEXT:
${context.description || 'No context provided'}

FILE: ${context.filePath || 'unknown'}

PARTIAL CODE:
\`\`\`javascript
${partialCode}
\`\`\`

Complete the code to:
1. Implement the intended functionality
2. Follow best practices
3. Include error handling
4. Add helpful comments

Return ONLY the completed code.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);
      const completedCode = this.extractCode(response);

      // Store suggestion
      await this.storeSuggestion({
        type: 'code_completion',
        partialCode,
        suggestion: completedCode,
        accepted: false,
      });

      return {
        ok: true,
        completedCode,
        type: 'completion',
      };
    } catch (error) {
      console.error('Code completion failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Suggest improvements for existing code
   */
  async suggestImprovements(code, context = {}) {
    console.log(`💡 [PAIR] Suggesting improvements...`);

    const prompt = `Review this code and suggest improvements.

CODE:
\`\`\`javascript
${code}
\`\`\`

Suggest improvements for:
1. Code quality
2. Performance
3. Readability
4. Error handling
5. Best practices

Be specific and actionable.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);
      const improvements = this.parseImprovements(response);

      // Store suggestions
      for (const improvement of improvements) {
        await this.storeSuggestion({
          type: 'improvement',
          originalCode: code,
          suggestion: improvement.suggestion,
          reason: improvement.reason,
          accepted: false,
        });
      }

      return {
        ok: true,
        improvements,
      };
    } catch (error) {
      console.error('Improvement suggestions failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse improvements from AI response
   */
  parseImprovements(aiResponse) {
    const improvements = [];
    const lines = aiResponse.split('\n');
    let currentImprovement = null;

    for (const line of lines) {
      if (line.match(/^[\d\-\*]/)) {
        if (currentImprovement) {
          improvements.push(currentImprovement);
        }

        currentImprovement = {
          suggestion: line.replace(/^[\d\-\*\.\s]+/, '').trim(),
          reason: '',
          priority: 'medium',
        };
      } else if (currentImprovement && line.trim()) {
        currentImprovement.reason += line.trim() + ' ';
      }
    }

    if (currentImprovement) {
      improvements.push(currentImprovement);
    }

    return improvements.slice(0, 5);
  }

  /**
   * Catch potential bugs in code
   */
  async catchBugs(code, context = {}) {
    console.log(`🐛 [PAIR] Checking for bugs...`);

    const prompt = `Analyze this code for potential bugs.

CODE:
\`\`\`javascript
${code}
\`\`\`

Look for:
1. Null/undefined errors
2. Off-by-one errors
3. Race conditions
4. Memory leaks
5. Logic errors
6. Edge cases not handled

Report bugs with severity (critical/high/medium/low) and line numbers if possible.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);
      const bugs = this.parseBugs(response);

      return {
        ok: true,
        bugs,
        hasBugs: bugs.length > 0,
      };
    } catch (error) {
      console.error('Bug detection failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse bugs from AI response
   */
  parseBugs(aiResponse) {
    const bugs = [];
    const lines = aiResponse.split('\n');

    for (const line of lines) {
      const match = line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.+)/i);

      if (match) {
        bugs.push({
          severity: match[1].toLowerCase(),
          description: match[2].trim(),
        });
      }
    }

    return bugs;
  }

  /**
   * Explain complex code
   */
  async explainCode(code, context = {}) {
    console.log(`📖 [PAIR] Explaining code...`);

    const prompt = `Explain this code in simple terms.

CODE:
\`\`\`javascript
${code}
\`\`\`

Provide:
1. What it does (high-level)
2. How it works (step-by-step)
3. Why it's structured this way
4. Potential gotchas or edge cases

Explain as if teaching a junior developer.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        explanation: response,
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
   * Suggest refactorings
   */
  async suggestRefactoring(code, context = {}) {
    console.log(`🔄 [PAIR] Suggesting refactorings...`);

    const prompt = `Suggest refactorings for this code.

CODE:
\`\`\`javascript
${code}
\`\`\`

Suggest refactorings that:
1. Improve readability
2. Reduce complexity
3. Follow design patterns
4. Improve testability

Provide refactored code with explanations.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);
      const refactored = this.extractCode(response);

      return {
        ok: true,
        refactoredCode: refactored,
        explanation: response,
      };
    } catch (error) {
      console.error('Refactoring suggestion failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Answer coding questions
   */
  async answerQuestion(question, context = {}) {
    console.log(`❓ [PAIR] Answering question: ${question.slice(0, 50)}...`);

    const prompt = `You are an expert pair programming partner. Answer this coding question.

QUESTION:
${question}

CONTEXT:
${context.codeContext || 'No code context'}

Provide a clear, technical answer with code examples if relevant.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      // Store interaction
      this.sessionHistory.push({
        type: 'question',
        question,
        answer: response,
        timestamp: new Date().toISOString(),
      });

      return {
        ok: true,
        answer: response,
      };
    } catch (error) {
      console.error('Question answering failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Review a pull request or code change
   */
  async reviewCode(code, context = {}) {
    console.log(`👀 [PAIR] Reviewing code...`);

    const prompt = `Perform a thorough code review.

CODE:
\`\`\`javascript
${code}
\`\`\`

CONTEXT:
Purpose: ${context.purpose || 'Not specified'}
Changes: ${context.changes || 'Not specified'}

Review for:
1. Correctness
2. Performance
3. Security
4. Best practices
5. Maintainability

Provide:
- Approval (approve/request changes)
- Issues found
- Suggestions for improvement

Be constructive and specific.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      const review = {
        approved: response.toLowerCase().includes('approve'),
        comments: this.parseReviewComments(response),
        timestamp: new Date().toISOString(),
      };

      return {
        ok: true,
        review,
      };
    } catch (error) {
      console.error('Code review failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse review comments
   */
  parseReviewComments(aiResponse) {
    const comments = [];
    const lines = aiResponse.split('\n');

    for (const line of lines) {
      if (line.match(/^[\d\-\*]/)) {
        comments.push(line.replace(/^[\d\-\*\.\s]+/, '').trim());
      }
    }

    return comments;
  }

  /**
   * Get context from codebase
   */
  async getCodebaseContext(query) {
    // Search through codebase for relevant context
    // In production, this would use vector embeddings
    const context = [];

    // For now, return cached context if available
    if (this.codebaseContext.has(query)) {
      return this.codebaseContext.get(query);
    }

    return context;
  }

  /**
   * Extract code from AI response
   */
  extractCode(response) {
    const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      return codeMatch[1];
    }
    return response;
  }

  /**
   * Store suggestion in database
   */
  async storeSuggestion(suggestion) {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO pair_programming_suggestions
           (type, original_code, suggestion, reason, accepted, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            suggestion.type,
            suggestion.partialCode || suggestion.originalCode || '',
            suggestion.suggestion,
            suggestion.reason || '',
            suggestion.accepted,
          ]
        );
      } catch (err) {
        console.error('Failed to store suggestion:', err.message);
      }
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      interactions: this.sessionHistory.length,
      questions: this.sessionHistory.filter(h => h.type === 'question').length,
      suggestions: this.sessionHistory.filter(h => h.type === 'suggestion').length,
      sessionDuration: this.sessionHistory.length > 0
        ? new Date() - new Date(this.sessionHistory[0].timestamp)
        : 0,
    };
  }

  /**
   * Start pair programming session
   */
  startSession(sessionInfo = {}) {
    console.log('👥 [PAIR] Pair programming session started');

    this.sessionHistory = [];
    this.sessionInfo = {
      started: new Date().toISOString(),
      ...sessionInfo,
    };

    return {
      ok: true,
      message: 'Pair programming session started',
      capabilities: [
        'Code completion',
        'Improvement suggestions',
        'Bug detection',
        'Code explanation',
        'Refactoring suggestions',
        'Question answering',
        'Code review',
      ],
    };
  }

  /**
   * End pair programming session
   */
  endSession() {
    const stats = this.getSessionStats();

    console.log(`👥 [PAIR] Session ended - ${stats.interactions} interactions`);

    return {
      ok: true,
      stats,
      message: 'Pair programming session ended',
    };
  }
}

// Export
export function createAIPairProgrammer(aiCouncil, pool) {
  return new AIPairProgrammer(aiCouncil, pool);
}
