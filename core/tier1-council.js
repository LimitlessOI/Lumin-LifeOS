/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    TIER 1: PREMIUM COUNCIL (PC)                                  ║
 * ║                    Elite Models - Validation & Correction Only                   ║
 * ║                    Cost: $1-$20 per million tokens                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 * 
 * This is the "executive" tier - expensive models that validate/correct Tier 0 output.
 * They see ONLY:
 * - Tier 0 summary
 * - Proposed action/result
 * - Compressed MICRO version
 * - Metadata (risk, revenue impact)
 * 
 * This reduces premium model usage by 90-98%.
 */

const TIER1_MODELS = {
  chatgpt: {
    name: "ChatGPT-4o",
    model: "gpt-4o",
    provider: "openai",
    cost: 2.5, // $2.50 per million input tokens
    specialties: ["execution", "user_modeling", "patterns"],
  },
  gemini: {
    name: "Gemini 2.5 Pro",
    model: "gemini-2.5-pro",
    provider: "google",
    cost: 1.25, // $1.25 per million tokens
    specialties: ["analysis", "creativity", "ideation"],
  },
  deepseek: {
    name: "DeepSeek Coder",
    model: "deepseek-coder",
    provider: "deepseek",
    cost: 0.1, // $0.10 per million tokens (cheapest premium)
    specialties: ["infrastructure", "testing", "performance"],
  },
  grok: {
    name: "Grok 2",
    model: "grok-2-1212",
    provider: "xai",
    cost: 5.0, // $5.00 per million tokens
    specialties: ["innovation", "reality_check", "risk"],
  },
};

// Tier1Council - no imports needed
export class Tier1Council {
  constructor(pool, callCouncilMemberFn) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMemberFn;
    this.validationCache = new Map();
  }

  /**
   * Validate Tier 0 output - quick sanity check (Tier 0.5)
   * Returns: { valid: boolean, confidence: number, issues: [] }
   */
  async quickValidate(tier0Output, originalTask, tier0Summary) {
    // Use cheapest premium model for quick validation
    const validationPrompt = `Quick validation check (YES/NO only):

TASK: ${originalTask.substring(0, 200)}
TIER0 OUTPUT: ${tier0Summary || tier0Output.substring(0, 300)}

Does this output look:
1. Relevant to the task?
2. Reasonable/coherent?
3. Safe to use?

Respond with only: YES or NO`;

    try {
      const response = await this.callCouncilMember('deepseek', validationPrompt, {
        maxTokens: 10, // Just YES/NO
        compress: true,
      });

      const isValid = response.trim().toUpperCase().includes('YES');
      const confidence = isValid ? 0.8 : 0.2;

      return {
        valid: isValid,
        confidence,
        model: 'deepseek',
        cost: 0.00001, // Tiny cost for validation
      };
    } catch (error) {
      // If validation fails, assume needs full review
      return {
        valid: false,
        confidence: 0.5,
        error: error.message,
      };
    }
  }

  /**
   * Full validation and correction (Tier 1)
   * Only called when Tier 0.5 validation fails or high-risk task
   */
  async validateAndCorrect(tier0Output, originalTask, context = {}) {
    const {
      riskLevel = 'medium',
      userFacing = false,
      revenueImpact = 'low',
      tier0Summary,
    } = context;

    // Compress context to MICRO for cost savings
    const microContext = this.compressContext(context);
    const microTask = this.compressToMicro(originalTask);

    const validationPrompt = `TIER 0 OUTPUT REVIEW (MICRO format):

TASK: ${microTask}
TIER0_RESULT: ${tier0Summary || tier0Output.substring(0, 500)}
RISK: ${riskLevel}
USER_FACING: ${userFacing}
REV_IMPACT: ${revenueImpact}

Review and:
1. Validate correctness
2. Identify issues
3. Provide corrected version if needed

Respond in MICRO format: ~valid:Y/N~ ~issues:[]~ ~corrected:~`;

    // Use appropriate premium model based on risk
    const model = riskLevel === 'high' ? 'chatgpt' : 'deepseek';

    try {
      const response = await this.callCouncilMember(model, validationPrompt, {
        compress: true,
        useCache: true,
      });

      // Parse MICRO response
      const parsed = this.parseMicroResponse(response);

      return {
        valid: parsed.valid !== false,
        issues: parsed.issues || [],
        corrected: parsed.corrected || tier0Output,
        model,
        tier: 1,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        corrected: tier0Output, // Fallback to Tier 0 output
      };
    }
  }

  /**
   * Full escalation - premium council does the work
   * Only for high-risk, user-facing, or Tier 0 completely failed
   */
  async escalate(task, context = {}) {
    const {
      riskLevel = 'high',
      userFacing = true,
      tier0Attempts = [],
    } = context;

    // Use full council for critical tasks
    const members = riskLevel === 'high' 
      ? ['chatgpt', 'gemini', 'deepseek'] 
      : ['deepseek', 'chatgpt'];

    const microTask = this.compressToMicro(task);
    const escalationPrompt = `ESCALATED TASK (MICRO):

${microTask}

TIER0_ATTEMPTS: ${tier0Attempts.length}
RISK: ${riskLevel}
USER_FACING: ${userFacing}

Provide complete solution in MICRO format.`;

    const results = [];
    for (const member of members) {
      try {
        const response = await this.callCouncilMember(member, escalationPrompt, {
          compress: true,
        });
        results.push({ member, response });
      } catch (error) {
        console.warn(`${member} escalation failed: ${error.message}`);
      }
    }

    // Consensus from premium council
    if (results.length > 0) {
      return {
        success: true,
        result: results[0].response, // Use first successful
        consensus: results.length,
        tier: 1,
        escalated: true,
      };
    }

    return {
      success: false,
      error: 'All premium models failed',
    };
  }

  compressContext(context) {
    // Compress context to MICRO symbols
    const micro = {
      r: context.riskLevel?.[0] || 'm', // l/m/h
      u: context.userFacing ? 'Y' : 'N',
      rev: context.revenueImpact?.[0] || 'l', // l/m/h
    };
    return JSON.stringify(micro);
  }

  compressToMicro(text) {
    // Aggressive MICRO compression for Tier 1
    let micro = String(text);
    
    const microDict = {
      'check blind spots': '~cbs~',
      'generate': '~gen~',
      'analyze': '~a~',
      'propose': '~p~',
      'evaluate': '~e~',
      'ROI': '~roi~',
      'monetization': '~mon~',
      'revenue': '~rev~',
      'cost': '~cost~',
      'risk': '~risk~',
      'validate': '~val~',
      'correct': '~cor~',
      'approve': '~app~',
    };

    for (const [full, token] of Object.entries(microDict)) {
      micro = micro.replace(new RegExp(full, 'gi'), token);
    }

    return micro;
  }

  parseMicroResponse(response) {
    // Parse MICRO format response
    const parsed = {
      valid: true,
      issues: [],
      corrected: null,
    };

    // Extract ~valid:Y/N~
    const validMatch = response.match(/~valid:([YN])~/i);
    if (validMatch) {
      parsed.valid = validMatch[1].toUpperCase() === 'Y';
    }

    // Extract ~issues:[...]~
    const issuesMatch = response.match(/~issues:\[(.*?)\]~/);
    if (issuesMatch) {
      parsed.issues = issuesMatch[1].split(',').map(i => i.trim());
    }

    // Extract ~corrected:...~
    const correctedMatch = response.match(/~corrected:(.*?)(?:~|$)/s);
    if (correctedMatch) {
      parsed.corrected = correctedMatch[1].trim();
    }

    return parsed;
  }
}
