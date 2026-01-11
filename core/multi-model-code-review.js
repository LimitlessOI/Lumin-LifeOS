/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MULTI-MODEL CODE REVIEW SYSTEM                                ║
 * ║                    Better than human code review companies                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Before deploying ANY code, this system runs it through 3+ AI models:
 * - DeepSeek: Code quality, bugs, patterns
 * - ChatGPT: Architecture, design, maintainability
 * - Claude: Security, vulnerabilities, edge cases
 *
 * Result: 3 expert reviewers in 5 seconds vs 1-2 humans in 2 hours
 */

export class MultiModelCodeReview {
  constructor(callCouncilMemberFn) {
    this.callCouncilMember = callCouncilMemberFn;
    this.reviewHistory = [];
    this.minimumScore = 8.0; // Out of 10
  }

  /**
   * Review code with multiple AI models before deployment
   * @param {string} code - Code to review
   * @param {object} context - Additional context (file path, purpose, etc.)
   * @returns {Promise<object>} - Review results with scores and recommendations
   */
  async reviewCode(code, context = {}) {
    console.log('🔍 [CODE REVIEW] Starting multi-model review...');

    const reviewStart = Date.now();
    const reviews = [];

    // Run reviews in parallel for speed
    const reviewPromises = [
      this.deepSeekReview(code, context),
      this.chatGPTReview(code, context),
      this.claudeReview(code, context),
    ];

    try {
      const results = await Promise.allSettled(reviewPromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          reviews.push(result.value);
        } else {
          console.error(`❌ Review ${index + 1} failed:`, result.reason);
        }
      });

      // Calculate aggregate scores
      const aggregate = this.aggregateReviews(reviews);
      const duration = Date.now() - reviewStart;

      const result = {
        approved: aggregate.overallScore >= this.minimumScore,
        overallScore: aggregate.overallScore,
        reviews,
        aggregateFindings: aggregate.findings,
        criticalIssues: aggregate.criticalIssues,
        recommendations: aggregate.recommendations,
        duration,
        timestamp: new Date().toISOString(),
      };

      // Store in history
      this.reviewHistory.push({
        ...result,
        codeSnippet: code.substring(0, 200),
        context,
      });

      console.log(`✅ [CODE REVIEW] Complete in ${duration}ms - Score: ${aggregate.overallScore}/10`);

      return result;
    } catch (error) {
      console.error('❌ [CODE REVIEW] Fatal error:', error);
      return {
        approved: false,
        error: error.message,
        overallScore: 0,
      };
    }
  }

  /**
   * DeepSeek Review: Code quality, bugs, code smells
   */
  async deepSeekReview(code, context) {
    const prompt = `You are a senior code reviewer specializing in code quality.

Review this code for:
1. Bugs and logical errors
2. Code smells and anti-patterns
3. Performance issues
4. Best practice violations
5. Readability and maintainability

Code to review:
\`\`\`
${code}
\`\`\`

Context: ${JSON.stringify(context, null, 2)}

Respond in JSON format:
{
  "score": 0-10,
  "bugs": ["list of bugs found"],
  "codeSmells": ["list of code smells"],
  "performanceIssues": ["list of performance issues"],
  "recommendations": ["list of improvement recommendations"],
  "criticalIssues": ["list of critical issues that MUST be fixed"],
  "summary": "Brief summary of review"
}`;

    try {
      const response = await this.callCouncilMember('deepseek', prompt, {
        maxTokens: 2000,
        temperature: 0.3,
      });

      const parsed = this.parseJSONResponse(response);
      return {
        reviewer: 'DeepSeek (Code Quality)',
        ...parsed,
      };
    } catch (error) {
      return {
        reviewer: 'DeepSeek (Code Quality)',
        score: 5,
        error: error.message,
      };
    }
  }

  /**
   * ChatGPT Review: Architecture, design patterns, maintainability
   */
  async chatGPTReview(code, context) {
    const prompt = `You are a software architect reviewing code for design quality.

Review this code for:
1. Architecture and design patterns
2. Separation of concerns
3. Code organization and structure
4. Scalability considerations
5. Long-term maintainability

Code to review:
\`\`\`
${code}
\`\`\`

Context: ${JSON.stringify(context, null, 2)}

Respond in JSON format:
{
  "score": 0-10,
  "architectureIssues": ["list of architectural concerns"],
  "designPatterns": ["patterns used or suggested"],
  "scalabilityConcerns": ["scalability issues"],
  "recommendations": ["improvement suggestions"],
  "criticalIssues": ["critical design flaws"],
  "summary": "Brief architecture review"
}`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 2000,
        temperature: 0.3,
      });

      const parsed = this.parseJSONResponse(response);
      return {
        reviewer: 'ChatGPT (Architecture)',
        ...parsed,
      };
    } catch (error) {
      return {
        reviewer: 'ChatGPT (Architecture)',
        score: 5,
        error: error.message,
      };
    }
  }

  /**
   * Claude Review: Security, vulnerabilities, edge cases
   */
  async claudeReview(code, context) {
    const prompt = `You are a security expert reviewing code for vulnerabilities.

Review this code for:
1. Security vulnerabilities (SQL injection, XSS, etc.)
2. Input validation issues
3. Authentication/authorization flaws
4. Edge cases and error handling
5. Data exposure risks

Code to review:
\`\`\`
${code}
\`\`\`

Context: ${JSON.stringify(context, null, 2)}

Respond in JSON format:
{
  "score": 0-10,
  "securityVulnerabilities": ["list of security issues"],
  "inputValidationIssues": ["validation problems"],
  "edgeCases": ["unhandled edge cases"],
  "recommendations": ["security improvements"],
  "criticalIssues": ["critical security flaws that MUST be fixed"],
  "summary": "Brief security review"
}`;

    try {
      // Try claude first, fallback to gemini if unavailable
      let response;
      try {
        response = await this.callCouncilMember('claude', prompt, {
          maxTokens: 2000,
          temperature: 0.3,
        });
      } catch {
        response = await this.callCouncilMember('gemini', prompt, {
          maxTokens: 2000,
          temperature: 0.3,
        });
      }

      const parsed = this.parseJSONResponse(response);
      return {
        reviewer: 'Claude/Gemini (Security)',
        ...parsed,
      };
    } catch (error) {
      return {
        reviewer: 'Claude/Gemini (Security)',
        score: 5,
        error: error.message,
      };
    }
  }

  /**
   * Aggregate reviews from all models
   */
  aggregateReviews(reviews) {
    if (reviews.length === 0) {
      return {
        overallScore: 0,
        findings: [],
        criticalIssues: [],
        recommendations: [],
      };
    }

    // Calculate weighted average score
    const scores = reviews.map(r => r.score || 5).filter(s => !isNaN(s));
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Collect all critical issues
    const criticalIssues = [];
    reviews.forEach(review => {
      if (review.criticalIssues && Array.isArray(review.criticalIssues)) {
        criticalIssues.push(...review.criticalIssues);
      }
    });

    // Collect all recommendations
    const recommendations = [];
    reviews.forEach(review => {
      if (review.recommendations && Array.isArray(review.recommendations)) {
        recommendations.push(...review.recommendations);
      }
    });

    // Deduplicate
    const uniqueCritical = [...new Set(criticalIssues)];
    const uniqueRecommendations = [...new Set(recommendations)];

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      findings: reviews.map(r => ({
        reviewer: r.reviewer,
        score: r.score,
        summary: r.summary,
      })),
      criticalIssues: uniqueCritical,
      recommendations: uniqueRecommendations,
    };
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  parseJSONResponse(response) {
    try {
      // Try to extract JSON from markdown code block
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse as direct JSON
      const directMatch = response.match(/\{[\s\S]*\}/);
      if (directMatch) {
        return JSON.parse(directMatch[0]);
      }

      // Fallback
      return {
        score: 5,
        summary: response.substring(0, 200),
        error: 'Could not parse JSON from response',
      };
    } catch (error) {
      return {
        score: 5,
        summary: response.substring(0, 200),
        error: 'JSON parse error: ' + error.message,
      };
    }
  }

  /**
   * Get review statistics
   */
  getStats() {
    if (this.reviewHistory.length === 0) {
      return {
        totalReviews: 0,
        averageScore: 0,
        approvalRate: 0,
      };
    }

    const approved = this.reviewHistory.filter(r => r.approved).length;
    const avgScore = this.reviewHistory.reduce((sum, r) => sum + (r.overallScore || 0), 0) / this.reviewHistory.length;

    return {
      totalReviews: this.reviewHistory.length,
      averageScore: Math.round(avgScore * 10) / 10,
      approvalRate: Math.round((approved / this.reviewHistory.length) * 100),
      recentReviews: this.reviewHistory.slice(-10),
    };
  }
}
