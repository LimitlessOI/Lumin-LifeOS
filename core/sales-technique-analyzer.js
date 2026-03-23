/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SALES TECHNIQUE ANALYZER                                      ║
 * ║                    Detects poor sales techniques in real-time                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Analyzes call transcripts and identifies:
 * - Poor sales techniques (interrupting, not listening, being pushy)
 * - Good techniques to reinforce
 * - Coaching suggestions
 * - Bad habit patterns over time
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

export class SalesTechniqueAnalyzer {
  constructor(callCouncilMemberFn, pool) {
    this.callCouncilMember = callCouncilMemberFn;
    this.pool = pool;

    // Common poor sales techniques to detect
    this.poorTechniques = {
      interrupting: {
        name: 'Interrupting Client',
        severity: 'high',
        keywords: ['interrupt', 'cut off', 'talk over'],
      },
      not_listening: {
        name: 'Not Listening',
        severity: 'high',
        keywords: ['repeat', 'already said', 'mentioned that'],
      },
      too_pushy: {
        name: 'Too Pushy/Aggressive',
        severity: 'medium',
        keywords: ['must', 'have to', 'need to decide now', 'limited time'],
      },
      talking_too_much: {
        name: 'Talking Too Much',
        severity: 'medium',
        ratio: 'agent_words > client_words * 2',
      },
      feature_dumping: {
        name: 'Feature Dumping',
        severity: 'low',
        keywords: ['and', 'also', 'plus', 'features'],
      },
      negative_language: {
        name: 'Negative Language',
        severity: 'medium',
        keywords: ['problem', 'issue', 'can't', 'won't', 'don't'],
      },
      no_questions: {
        name: 'Not Asking Questions',
        severity: 'high',
        detection: 'question_count < 3',
      },
    };
  }

  /**
   * Analyze call transcript for sales techniques
   * @param {string} transcript - Full call transcript
   * @param {object} metadata - Call metadata (duration, etc.)
   * @returns {Promise<object>} - Analysis results
   */
  async analyzeCall(transcript, metadata = {}) {
    console.log('🔍 [SALES ANALYZER] Analyzing call transcript...');

    const analysisStart = Date.now();

    try {
      // Run AI analysis
      const aiAnalysis = await this.aiAnalyzeTranscript(transcript, metadata);

      // Run pattern detection
      const patterns = this.detectPatterns(transcript);

      // Combine results
      const result = {
        ok: true,
        overall_score: aiAnalysis.overall_score || 7.0,
        techniques_detected: {
          good: aiAnalysis.good_techniques || [],
          poor: aiAnalysis.poor_techniques || [],
        },
        patterns,
        coaching_suggestions: aiAnalysis.coaching_suggestions || [],
        moments_to_review: aiAnalysis.moments_to_review || [],
        summary: aiAnalysis.summary || '',
        duration: Date.now() - analysisStart,
      };

      console.log(`✅ [SALES ANALYZER] Analysis complete - Score: ${result.overall_score}/10`);

      return result;
    } catch (error) {
      console.error('❌ [SALES ANALYZER] Error:', error);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * AI-powered transcript analysis
   */
  async aiAnalyzeTranscript(transcript, metadata) {
    const prompt = `You are an expert sales coach analyzing a real estate call transcript.

Transcript:
${transcript.substring(0, 5000)}

Duration: ${metadata.duration || 'unknown'}

Analyze the agent's sales technique:
1. What did they do WELL? (good techniques to reinforce)
2. What POOR techniques did they use? (interrupting, not listening, too pushy, etc.)
3. Specific coaching suggestions
4. Identify 1-3 specific moments (with timestamps if available) to review with the agent

Rate overall sales performance: 0-10

Respond in JSON:
{
  "overall_score": 7.5,
  "good_techniques": [
    {"technique": "Active Listening", "example": "quote from transcript"},
    {"technique": "Open-Ended Questions", "example": "quote"}
  ],
  "poor_techniques": [
    {"technique": "Interrupting Client", "severity": "high", "example": "quote", "timestamp": "2:30"},
    {"technique": "Talking Too Much", "severity": "medium", "example": "quote"}
  ],
  "coaching_suggestions": [
    "Let the client finish their thoughts before responding",
    "Ask more open-ended questions about their needs"
  ],
  "moments_to_review": [
    {"timestamp": "2:30", "reason": "Interrupted client mid-sentence", "clip_type": "coaching_needed"},
    {"timestamp": "5:15", "reason": "Great rapport building", "clip_type": "good_moment"}
  ],
  "summary": "Overall solid call with good rapport, but needs to work on listening more and talking less"
}`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 2000,
        temperature: 0.4,
      });

      return this.parseJSON(response);
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        overall_score: 5.0,
        good_techniques: [],
        poor_techniques: [],
        coaching_suggestions: ['Unable to analyze - AI error'],
        moments_to_review: [],
        summary: 'Analysis failed',
      };
    }
  }

  /**
   * Detect patterns using rule-based analysis
   */
  detectPatterns(transcript) {
    const patterns = [];
    const lowerTranscript = transcript.toLowerCase();

    // Check for each poor technique
    Object.entries(this.poorTechniques).forEach(([key, technique]) => {
      if (technique.keywords) {
        const matches = technique.keywords.filter(keyword =>
          lowerTranscript.includes(keyword.toLowerCase())
        );

        if (matches.length > 0) {
          patterns.push({
            technique: technique.name,
            severity: technique.severity,
            matches: matches.length,
            type: 'poor',
          });
        }
      }
    });

    // Check for question marks (good technique if asking questions)
    const questionCount = (transcript.match(/\?/g) || []).length;
    if (questionCount >= 5) {
      patterns.push({
        technique: 'Asking Questions',
        count: questionCount,
        type: 'good',
      });
    } else if (questionCount < 3) {
      patterns.push({
        technique: 'Not Asking Enough Questions',
        severity: 'high',
        count: questionCount,
        type: 'poor',
      });
    }

    // Estimate talk ratio (rough)
    const agentLines = (transcript.match(/Agent:/gi) || []).length;
    const clientLines = (transcript.match(/Client:/gi) || []).length;

    if (agentLines > 0 && clientLines > 0) {
      const ratio = agentLines / clientLines;
      if (ratio > 2) {
        patterns.push({
          technique: 'Talking Too Much',
          severity: 'high',
          ratio: ratio.toFixed(1),
          type: 'poor',
        });
      }
    }

    return patterns;
  }

  /**
   * Store bad habit pattern in database
   */
  async storeBadHabitPattern(agentId, techniqueName, severity = 'medium') {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO sales_technique_patterns
         (agent_id, technique_name, pattern_type, frequency, last_detected, created_at)
         VALUES ($1, $2, 'bad_habit', 1, NOW(), NOW())
         ON CONFLICT (agent_id, technique_name, pattern_type)
         DO UPDATE SET
           frequency = sales_technique_patterns.frequency + 1,
           last_detected = NOW()`,
        [agentId, techniqueName]
      );

      console.log(`📝 [SALES ANALYZER] Stored bad habit: ${techniqueName} for agent ${agentId}`);
    } catch (error) {
      console.error('Error storing bad habit:', error);
    }
  }

  /**
   * Get bad habits for an agent
   */
  async getBadHabits(agentId) {
    if (!this.pool) return [];

    try {
      const result = await this.pool.query(
        `SELECT technique_name, frequency, last_detected
         FROM sales_technique_patterns
         WHERE agent_id = $1 AND pattern_type = 'bad_habit'
         ORDER BY frequency DESC, last_detected DESC
         LIMIT 10`,
        [agentId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching bad habits:', error);
      return [];
    }
  }

  /**
   * Parse JSON from AI response
   */
  parseJSON(response) {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      const directMatch = response.match(/\{[\s\S]*\}/);
      if (directMatch) {
        return JSON.parse(directMatch[0]);
      }

      return {};
    } catch (error) {
      console.warn('JSON parse error:', error.message);
      return {};
    }
  }
}
