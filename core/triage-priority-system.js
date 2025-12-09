/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    TRIAGE & PRIORITY SYSTEM                                       ║
 * ║                    Always work on highest priority, most profitable first         ║
 * ║                    Auto-scale if not completing in reasonable time                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class TriagePrioritySystem {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.priorityLevels = {
      'A1': { weight: 100, description: 'Critical - Highest profit, immediate impact' },
      'A2': { weight: 90, description: 'High - Very profitable, high impact' },
      'A3': { weight: 80, description: 'High - Profitable, significant impact' },
      'B1': { weight: 70, description: 'Medium-High - Good profit, good impact' },
      'B2': { weight: 60, description: 'Medium - Moderate profit, moderate impact' },
      'B3': { weight: 50, description: 'Medium - Some profit, some impact' },
      'C1': { weight: 40, description: 'Low-Medium - Low profit, low impact' },
      'C2': { weight: 30, description: 'Low - Minimal profit, minimal impact' },
      'C3': { weight: 20, description: 'Very Low - Questionable value' }
    };
  }

  /**
   * Assign priority to a task/idea/proposal
   */
  async assignPriority(item, context = {}) {
    const prompt = `Assign a PRIORITY LEVEL to this task/idea:

Title: ${item.title || item.name || 'Task'}
Description: ${item.description || item.instruction || ''}
Type: ${item.type || 'general'}

Context:
- Revenue potential: ${context.revenuePotential || 'unknown'}
- Time to complete: ${context.estimatedTime || 'unknown'}
- Complexity: ${context.complexity || 'unknown'}
- Dependencies: ${context.dependencies || 'none'}

Priority Levels:
A1: Critical - Highest profit, immediate impact, must do now
A2: High - Very profitable, high impact, do soon
A3: High - Profitable, significant impact
B1: Medium-High - Good profit, good impact
B2: Medium - Moderate profit, moderate impact
B3: Medium - Some profit, some impact
C1: Low-Medium - Low profit, low impact
C2: Low - Minimal profit, minimal impact
C3: Very Low - Questionable value

Consider:
1. Profitability (revenue potential, ROI, time to value)
2. Urgency (how pressing is this?)
3. Impact (how much does this move us toward goals?)
4. Dependencies (what blocks other work?)
5. Effort vs Reward (is this worth the time?)

Return ONLY the priority level (A1, A2, B1, etc.) and a brief reason.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 500,
        temperature: 0.3
      });

      // Extract priority level
      const priorityMatch = response.match(/\b([ABC][123])\b/);
      const priority = priorityMatch ? priorityMatch[1] : 'C3';

      // Calculate score
      const score = this.calculatePriorityScore(priority, context);

      return {
        priority,
        score,
        reasoning: response,
        weight: this.priorityLevels[priority]?.weight || 20
      };
    } catch (error) {
      return {
        priority: 'C3',
        score: 20,
        reasoning: 'Error assigning priority',
        error: error.message
      };
    }
  }

  /**
   * Get prioritized queue (highest priority first)
   */
  async getPrioritizedQueue(limit = 50) {
    const result = await this.pool.query(
      `SELECT 
        t.*,
        COALESCE(t.priority_score, 0) as score,
        CASE 
          WHEN t.priority IS NULL THEN 'C3'
          ELSE t.priority
        END as priority
       FROM execution_tasks t
       WHERE t.status IN ('pending', 'queued')
       ORDER BY 
         CASE 
           WHEN t.priority = 'A1' THEN 1
           WHEN t.priority = 'A2' THEN 2
           WHEN t.priority = 'A3' THEN 3
           WHEN t.priority = 'B1' THEN 4
           WHEN t.priority = 'B2' THEN 5
           WHEN t.priority = 'B3' THEN 6
           WHEN t.priority = 'C1' THEN 7
           WHEN t.priority = 'C2' THEN 8
           WHEN t.priority = 'C3' THEN 9
           ELSE 10
         END,
         COALESCE(t.priority_score, 0) DESC,
         t.created_at ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Check if we need to scale up
   */
  async checkScalingNeeds() {
    // Get high-priority tasks that are taking too long
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as high_priority_pending,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_wait_time_seconds
       FROM execution_tasks
       WHERE status IN ('pending', 'queued')
         AND priority IN ('A1', 'A2', 'A3')
         AND created_at < NOW() - INTERVAL '1 hour'`
    );

    const { high_priority_pending, avg_wait_time_seconds } = result.rows[0] || {};

    const needsScaling = 
      high_priority_pending > 5 || // More than 5 high-priority tasks waiting
      avg_wait_time_seconds > 3600; // Average wait time > 1 hour

    return {
      needsScaling,
      highPriorityPending: parseInt(high_priority_pending || 0),
      avgWaitTimeHours: (avg_wait_time_seconds || 0) / 3600,
      recommendation: needsScaling ? 'scale_up' : 'current_capacity_ok'
    };
  }

  /**
   * Calculate priority score
   */
  calculatePriorityScore(priority, context = {}) {
    const baseWeight = this.priorityLevels[priority]?.weight || 20;
    
    // Adjust based on context
    let adjustment = 0;
    
    // Revenue potential boost
    if (context.revenuePotential === 'high') adjustment += 10;
    if (context.revenuePotential === 'medium') adjustment += 5;
    
    // Urgency boost
    if (context.urgency === 'critical') adjustment += 15;
    if (context.urgency === 'high') adjustment += 10;
    
    // Impact boost
    if (context.impact === 'high') adjustment += 10;
    if (context.impact === 'medium') adjustment += 5;
    
    // Time to value boost (faster = better)
    if (context.timeToValue === 'immediate') adjustment += 10;
    if (context.timeToValue === 'fast') adjustment += 5;
    
    return Math.min(100, baseWeight + adjustment);
  }

  /**
   * Update task priority
   */
  async updateTaskPriority(taskId, priority, score, reasoning) {
    await this.pool.query(
      `UPDATE execution_tasks
       SET 
         priority = $1,
         priority_score = $2,
         priority_reasoning = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [priority, score, reasoning, taskId]
    );
  }

  /**
   * Get priority distribution
   */
  async getPriorityDistribution() {
    const result = await this.pool.query(
      `SELECT 
        COALESCE(priority, 'C3') as priority,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('pending', 'queued')) as pending,
        AVG(priority_score) as avg_score
       FROM execution_tasks
       GROUP BY priority
       ORDER BY 
         CASE 
           WHEN priority = 'A1' THEN 1
           WHEN priority = 'A2' THEN 2
           WHEN priority = 'A3' THEN 3
           WHEN priority = 'B1' THEN 4
           WHEN priority = 'B2' THEN 5
           WHEN priority = 'B3' THEN 6
           WHEN priority = 'C1' THEN 7
           WHEN priority = 'C2' THEN 8
           WHEN priority = 'C3' THEN 9
           ELSE 10
         END`
    );

    return result.rows;
  }

  /**
   * Auto-assign priorities to pending tasks
   */
  async autoAssignPriorities() {
    const result = await this.pool.query(
      `SELECT id, title, description, instruction, type
       FROM execution_tasks
       WHERE status IN ('pending', 'queued')
         AND (priority IS NULL OR priority = 'C3')
       LIMIT 20`
    );

    const updates = [];
    for (const task of result.rows) {
      const priorityResult = await this.assignPriority(task);
      await this.updateTaskPriority(
        task.id,
        priorityResult.priority,
        priorityResult.score,
        priorityResult.reasoning
      );
      updates.push({
        taskId: task.id,
        priority: priorityResult.priority,
        score: priorityResult.score
      });
    }

    return { updated: updates.length, updates };
  }
}
