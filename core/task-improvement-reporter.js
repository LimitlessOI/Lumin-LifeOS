/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    TASK IMPROVEMENT REPORTER                                     ║
 * ║                    Each AI employee reports improvements after tasks           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class TaskImprovementReporter {
  constructor(pool, tier0Council, callCouncilMember) {
    this.pool = pool;
    this.tier0Council = tier0Council;
    this.callCouncilMember = callCouncilMember;
  }

  /**
   * After task completion, AI reports improvements and votes on the idea
   */
  async reportAfterTask(task, result, aiModel) {
    console.log(`💡 [IMPROVEMENT] AI ${aiModel} reporting after task ${task.id}`);

    // Generate improvement ideas from the task execution
    const improvements = await this.generateImprovements(task, result, aiModel);
    
    // Vote on the original idea (task completion = vote)
    const vote = await this.voteOnIdea(task, result, aiModel);

    // Store improvements and vote
    await this.storeReport(task, improvements, vote, aiModel);

    // Send to Tier 0 council for deduplication and voting
    if (improvements.length > 0) {
      await this.tier0Council.processImprovementIdeas(improvements, vote);
    }

    return {
      improvements: improvements.length,
      vote,
      reported: true,
    };
  }

  /**
   * AI generates improvement ideas based on task execution
   */
  async generateImprovements(task, result, aiModel) {
    const prompt = `After completing this task, identify ways to improve how we do things:

TASK: ${task.description}
RESULT: ${result.substring(0, 1000)}
MODEL USED: ${aiModel}

Generate improvement ideas:
1. How could this task be done better?
2. What processes could be improved?
3. What automation could help?
4. What inefficiencies did you notice?
5. What would make this faster/cheaper/better?

Return as JSON array:
[
  {
    "improvement": "Detailed improvement idea",
    "category": "process|automation|cost|quality|speed",
    "impact": "high|medium|low",
    "effort": "easy|medium|hard",
    "reasoning": "Why this would help"
  }
]`;

    try {
      const response = await this.callCouncilMember(aiModel, prompt, {
        useTwoTier: false, // Use same model that did the task
        maxTokens: 2000,
      });

      const ideas = this.parseImprovements(response);
      return ideas;
    } catch (error) {
      console.warn(`Failed to generate improvements: ${error.message}`);
      return [];
    }
  }

  parseImprovements(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }

    // Fallback parsing
    const ideas = [];
    const lines = response.split('\n');
    let currentIdea = null;

    for (const line of lines) {
      if (line.match(/^\d+[\.\)]\s+/)) {
        if (currentIdea) ideas.push(currentIdea);
        currentIdea = {
          improvement: line.replace(/^\d+[\.\)]\s+/, '').trim(),
          category: 'process',
          impact: 'medium',
          effort: 'medium',
        };
      } else if (currentIdea && line.trim()) {
        currentIdea.improvement += ' ' + line.trim();
      }
    }

    if (currentIdea) ideas.push(currentIdea);
    return ideas;
  }

  /**
   * AI votes on the original idea (task completion = implicit vote)
   */
  async voteOnIdea(task, result, aiModel) {
    const prompt = `Vote on this idea based on your task execution:

ORIGINAL IDEA: ${task.description}
YOUR RESULT: ${result.substring(0, 500)}
MODEL: ${aiModel}

Rate this idea 1-10 based on:
- Was it worth doing?
- Did it work well?
- Would you recommend it?
- Impact achieved?

Return JSON:
{
  "vote": 8,
  "reasoning": "Why this score",
  "recommend": true,
  "suggestions": "How to improve the idea"
}`;

    try {
      const response = await this.callCouncilMember(aiModel, prompt, {
        useTwoTier: false,
        maxTokens: 500,
      });

      const vote = this.parseVote(response);
      return vote;
    } catch (error) {
      // Default vote if parsing fails
      return {
        vote: 7, // Task completed = positive vote
        reasoning: 'Task completed successfully',
        recommend: true,
        suggestions: '',
      };
    }
  }

  parseVote(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }

    // Extract vote number
    const voteMatch = response.match(/vote[:\s]+(\d+)/i);
    const vote = voteMatch ? parseInt(voteMatch[1]) : 7;

    return {
      vote,
      reasoning: response.substring(0, 200),
      recommend: vote >= 5,
      suggestions: '',
    };
  }

  /**
   * Store improvement report in database
   */
  async storeReport(task, improvements, vote, aiModel) {
    try {
      await this.pool.query(
        `INSERT INTO task_improvement_reports
         (task_id, task_description, ai_model, improvements, vote, vote_reasoning, 
          recommend, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          task.id,
          task.description,
          aiModel,
          JSON.stringify(improvements),
          vote.vote,
          vote.reasoning,
          vote.recommend,
        ]
      );
    } catch (error) {
      console.warn('Failed to store improvement report:', error.message);
    }
  }
}
