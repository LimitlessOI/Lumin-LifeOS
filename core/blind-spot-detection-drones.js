/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    BLIND SPOT DETECTION DRONES                                    ║
 * ║                    AI bots that scour system for missed opportunities            ║
 * ║                    Pattern detection, obvious connections, auto-improvements      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class BlindSpotDetectionDrones {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.detectionHistory = [];
    this.patterns = new Map();
  }

  /**
   * Run blind spot detection (call this 2-3x daily)
   */
  async detectBlindSpots(options = {}) {
    const {
      checkPatterns = true,
      checkConnections = true,
      checkStruggles = true,
      checkOpportunities = true,
      useBestModels = true
    } = options;

    const findings = [];

    // Rotate through best models
    const models = useBestModels 
      ? ['chatgpt', 'gemini', 'deepseek', 'grok'] 
      : ['chatgpt'];

    // 1. PATTERN DETECTION: "I see you struggling with this over and over"
    if (checkPatterns) {
      const patterns = await this.detectRepeatedPatterns(models);
      findings.push(...patterns);
    }

    // 2. OBVIOUS CONNECTIONS: "If we use this product + that product = value"
    if (checkConnections) {
      const connections = await this.findObviousConnections(models);
      findings.push(...connections);
    }

    // 3. REPEATED STRUGGLES: Auto-code solutions
    if (checkStruggles) {
      const struggles = await this.detectRepeatedStruggles(models);
      findings.push(...struggles);
    }

    // 4. MISSED OPPORTUNITIES: Ideas from what we're doing
    if (checkOpportunities) {
      const opportunities = await this.findMissedOpportunities(models);
      findings.push(...opportunities);
    }

    // Store findings
    await this.storeFindings(findings);

    // Auto-implement high-value findings
    const highValueFindings = findings.filter(f => f.value === 'high');
    for (const finding of highValueFindings) {
      if (finding.autoImplement) {
        await this.autoImplementFinding(finding);
      }
    }

    return {
      findings,
      highValueCount: highValueFindings.length,
      totalFindings: findings.length
    };
  }

  /**
   * Detect repeated patterns in system
   */
  async detectRepeatedPatterns(models) {
    // Get recent errors, logs, tasks
    const errors = await this.pool.query(
      `SELECT error_message, COUNT(*) as count
       FROM error_logs
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY error_message
       HAVING COUNT(*) > 3
       ORDER BY count DESC
       LIMIT 10`
    );

    const tasks = await this.pool.query(
      `SELECT instruction, COUNT(*) as count
       FROM execution_tasks
       WHERE created_at > NOW() - INTERVAL '7 days'
         AND status = 'failed'
       GROUP BY instruction
       HAVING COUNT(*) > 2
       ORDER BY count DESC
       LIMIT 10`
    );

    const patterns = [];

    for (const model of models) {
      const prompt = `Analyze these REPEATED PATTERNS in our system:

Repeated Errors:
${errors.rows.map(e => `- ${e.error_message} (${e.count} times)`).join('\n')}

Repeated Failed Tasks:
${tasks.rows.map(t => `- ${t.instruction} (${t.count} times)`).join('\n')}

Find PATTERNS:
1. What are we struggling with repeatedly?
2. What keeps breaking?
3. What keeps failing?
4. What obvious solution are we missing?

For each pattern found:
- Describe the pattern
- Why it keeps happening
- What we should build to fix it permanently
- Priority (high/medium/low)
- Should we auto-code a solution? (yes/no)

Format as structured findings.`;

      try {
        const response = await this.callCouncilMember(model, prompt, {
          maxTokens: 2000,
          temperature: 0.6
        });

        let parsed;
        try {
          parsed = JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { patterns: [{ description: response }] };
        }

        if (parsed.patterns) {
          for (const pattern of parsed.patterns) {
            patterns.push({
              type: 'repeated_pattern',
              model,
              description: pattern.description,
              solution: pattern.solution,
              priority: pattern.priority || 'medium',
              autoImplement: pattern.autoImplement === 'yes',
              value: pattern.priority === 'high' ? 'high' : 'medium'
            });
          }
        }
      } catch (error) {
        console.error(`Pattern detection error (${model}):`, error.message);
      }
    }

    return patterns;
  }

  /**
   * Find obvious connections between products/tools
   */
  async findObviousConnections(models) {
    // Get all tools/products we're using
    const tools = await this.pool.query(
      `SELECT DISTINCT tool_name, tool_type, usage_count
       FROM tool_usage
       WHERE created_at > NOW() - INTERVAL '30 days'
       ORDER BY usage_count DESC
       LIMIT 20`
    );

    for (const model of models) {
      const prompt = `Find OBVIOUS CONNECTIONS between these tools/products:

Tools in use:
${tools.rows.map(t => `- ${t.tool_name} (${t.tool_type}, used ${t.usage_count} times)`).join('\n')}

Find:
1. What tools should be connected but aren't?
2. What combinations would create value?
3. What integrations are we missing?
4. What would happen if we connected X + Y?

For each connection:
- Describe the connection
- What value it creates
- How to implement
- Priority (high/medium/low)

Format as structured findings.`;

      try {
        const response = await this.callCouncilMember(model, prompt, {
          maxTokens: 2000,
          temperature: 0.7
        });

        let parsed;
        try {
          parsed = JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { connections: [{ description: response }] };
        }

        // Process connections...
        // (similar structure to patterns)
      } catch (error) {
        console.error(`Connection detection error (${model}):`, error.message);
      }
    }

    return [];
  }

  /**
   * Detect repeated struggles and auto-code solutions
   */
  async detectRepeatedStruggles(models) {
    // Get tasks that failed multiple times
    const struggles = await this.pool.query(
      `SELECT instruction, COUNT(*) as failures, 
              MAX(created_at) as last_failure,
              STRING_AGG(DISTINCT error_message, '; ') as errors
       FROM execution_tasks
       WHERE status = 'failed'
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY instruction
       HAVING COUNT(*) > 2
       ORDER BY failures DESC
       LIMIT 10`
    );

    const findings = [];

    for (const struggle of struggles.rows) {
      for (const model of models) {
        const prompt = `We keep struggling with this:

Task: ${struggle.instruction}
Failures: ${struggle.failures} times
Errors: ${struggle.errors}
Last failure: ${struggle.last_failure}

This is a REPEATED STRUGGLE. We need to:
1. Understand why it keeps failing
2. Build a permanent solution
3. Auto-code it so we never struggle with this again

Provide:
- Root cause analysis
- Permanent solution design
- Code to implement the solution
- Priority (high/medium/low)
- Should we auto-implement? (yes/no)

Format solution as complete code if possible.`;

        try {
          const response = await this.callCouncilMember(model, prompt, {
            maxTokens: 3000,
            temperature: 0.4
          });

          findings.push({
            type: 'repeated_struggle',
            model,
            task: struggle.instruction,
            failures: struggle.failures,
            solution: response,
            priority: 'high', // Repeated struggles are always high priority
            autoImplement: true,
            value: 'high'
          });
        } catch (error) {
          console.error(`Struggle detection error:`, error.message);
        }
      }
    }

    return findings;
  }

  /**
   * Find missed opportunities from what we're doing
   */
  async findMissedOpportunities(models) {
    // Get recent activities, ideas, implementations
    const activities = await this.pool.query(
      `SELECT 
        'idea' as type, title, description, impact_score, revenue_potential
       FROM tier0_improvement_ideas
       WHERE created_at > NOW() - INTERVAL '7 days'
       UNION ALL
       SELECT 
         'task' as type, title, instruction as description, 
         priority_score as impact_score, NULL as revenue_potential
       FROM execution_tasks
       WHERE created_at > NOW() - INTERVAL '7 days'
       LIMIT 50`
    );

    for (const model of models) {
      const prompt = `Analyze our recent activities and find MISSED OPPORTUNITIES:

Recent Activities:
${activities.rows.map(a => `- ${a.type}: ${a.title} - ${a.description}`).join('\n')}

Find:
1. What opportunities are we missing?
2. What ideas can we create from what we're doing?
3. What obvious next steps are we not seeing?
4. What would make this 10x better?

For each opportunity:
- Describe the opportunity
- How it relates to what we're doing
- Potential value/impact
- How to pursue it
- Priority (high/medium/low)

Format as structured findings.`;

      try {
        const response = await this.callCouncilMember(model, prompt, {
          maxTokens: 2000,
          temperature: 0.8 // Higher creativity for opportunities
        });

        // Process opportunities...
      } catch (error) {
        console.error(`Opportunity detection error:`, error.message);
      }
    }

    return [];
  }

  /**
   * Store findings
   */
  async storeFindings(findings) {
    for (const finding of findings) {
      await this.pool.query(
        `INSERT INTO blind_spot_findings
         (type, description, solution, priority, value, auto_implement, model, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          finding.type,
          finding.description || finding.task,
          finding.solution,
          finding.priority,
          finding.value,
          finding.autoImplement || false,
          finding.model
        ]
      );
    }
  }

  /**
   * Auto-implement a finding
   */
  async autoImplementFinding(finding) {
    // Call self-programming to implement
    // This would integrate with handleSelfProgramming
    console.log(`🤖 [BLIND SPOT] Auto-implementing: ${finding.description}`);
    
    // Implementation would go here
    // For now, just log it
    return { ok: true, finding: finding.description };
  }
}
