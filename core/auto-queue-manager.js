/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTO-QUEUE MANAGER                                            ║
 * ║                    Ensures queue is never empty, generates ideas automatically  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class AutoQueueManager {
  constructor(pool, callCouncilMember, executionQueue, modelRouter = null) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.executionQueue = executionQueue;
    this.modelRouter = modelRouter;
    this.lastIdeaGeneration = null;
    this.ideaGenerationInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.minQueueSize = 5; // Always keep at least 5 tasks
  }

  /**
   * Ensure queue is never empty
   */
  async ensureQueuePopulated() {
    const queueStatus = this.executionQueue.getStatus();
    const queueSize = (queueStatus.active || []).length + (queueStatus.pending || []).length;
    
    if (queueSize < this.minQueueSize) {
      console.log(`📋 [QUEUE] Queue low (${queueSize} items), generating ideas...`);
      await this.generateAndQueueIdeas(this.minQueueSize - queueSize);
    }
  }

  /**
   * Generate ideas using enhanced generator (each AI gives 25, council debates, votes)
   */
  async generateDailyIdeasEnhanced() {
    try {
      const { EnhancedIdeaGenerator } = await import('./enhanced-idea-generator.js');
      const generator = new EnhancedIdeaGenerator(
        this.pool,
        this.callCouncilMember,
        this.modelRouter
      );
      
      const result = await generator.runFullPipeline(this.executionQueue);
      return result;
    } catch (error) {
      console.error('Enhanced idea generation failed:', error.message);
      // Fallback to simple generation
      return await this.generateDailyIdeas();
    }
  }

  /**
   * Generate 25 improvement ideas and queue highest rated (simple version)
   */
  async generateDailyIdeas() {
    const now = new Date();
    
    // Check if we need to generate (once per day)
    if (this.lastIdeaGeneration && 
        (now - this.lastIdeaGeneration) < this.ideaGenerationInterval) {
      return { skipped: true, reason: 'Ideas generated recently' };
    }

    this.lastIdeaGeneration = now;

    console.log('💡 [QUEUE] Generating 25 improvement ideas...');

    const prompt = `Generate 25 revolutionary ideas that will improve and revolutionize the industry. Think outside the box. Consider unintended consequences. Focus on high-impact innovations.

For each idea, provide:
1. The core concept
2. Potential impact (high/medium/low)
3. Unintended consequences to consider
4. Implementation difficulty (easy/medium/hard)
5. Revenue potential (high/medium/low)

Return as JSON array with fields: concept, impact, consequences, difficulty, revenue, rating (1-10)`;

    try {
      const response = await this.callCouncilMember('gemini', prompt);
      
      // Parse ideas from response
      const ideas = this.parseIdeasFromResponse(response);
      
      // Rate and prioritize ideas
      const ratedIdeas = await this.rateIdeas(ideas);
      
      // Sort by rating (highest first)
      ratedIdeas.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      // Queue top ideas
      const queued = await this.queueTopIdeas(ratedIdeas);
      
      // Store all ideas in database
      await this.storeIdeas(ratedIdeas);
      
      return {
        generated: ideas.length,
        rated: ratedIdeas.length,
        queued,
        topIdeas: ratedIdeas.slice(0, 10),
      };
    } catch (error) {
      console.error('Error generating ideas:', error.message);
      return { error: error.message };
    }
  }

  parseIdeasFromResponse(response) {
    const ideas = [];
    
    try {
      // Sanitize JSON first
      let cleaned = (response || '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();
      
      // Try to parse JSON
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ideas.push(...JSON.parse(jsonMatch[0]));
      } else {
        // Fallback: parse markdown list
        const lines = response.split('\n');
        let currentIdea = null;
        
        for (const line of lines) {
          if (line.match(/^\d+[\.\)]\s+/)) {
            if (currentIdea) ideas.push(currentIdea);
            currentIdea = {
              concept: line.replace(/^\d+[\.\)]\s+/, '').trim(),
              impact: 'medium',
              difficulty: 'medium',
              revenue: 'medium',
            };
          } else if (currentIdea && line.trim()) {
            if (line.toLowerCase().includes('impact')) {
              currentIdea.impact = this.extractValue(line, ['high', 'medium', 'low']);
            } else if (line.toLowerCase().includes('difficulty')) {
              currentIdea.difficulty = this.extractValue(line, ['easy', 'medium', 'hard']);
            } else if (line.toLowerCase().includes('revenue')) {
              currentIdea.revenue = this.extractValue(line, ['high', 'medium', 'low']);
            } else if (line.toLowerCase().includes('consequence')) {
              currentIdea.consequences = line.trim();
            } else {
              currentIdea.concept += ' ' + line.trim();
            }
          }
        }
        
        if (currentIdea) ideas.push(currentIdea);
      }
    } catch (error) {
      console.error('Error parsing ideas:', error.message);
    }
    
    return ideas;
  }

  extractValue(line, options) {
    const lower = line.toLowerCase();
    for (const opt of options) {
      if (lower.includes(opt)) return opt;
    }
    return 'medium';
  }

  async rateIdeas(ideas) {
    // Rate each idea based on multiple factors
    return ideas.map(idea => {
      let rating = 5; // Base rating
      
      // Impact weighting
      if (idea.impact === 'high') rating += 3;
      else if (idea.impact === 'medium') rating += 1;
      
      // Revenue weighting
      if (idea.revenue === 'high') rating += 2;
      else if (idea.revenue === 'medium') rating += 1;
      
      // Difficulty (easier = higher rating)
      if (idea.difficulty === 'easy') rating += 2;
      else if (idea.difficulty === 'hard') rating -= 1;
      
      // Concept length (more detailed = better)
      if (idea.concept && idea.concept.length > 100) rating += 1;
      
      return {
        ...idea,
        rating: Math.min(10, Math.max(1, rating)),
      };
    });
  }

  async queueTopIdeas(ratedIdeas, count = 10) {
    const topIdeas = ratedIdeas.slice(0, count);
    const queued = [];
    
    for (const idea of topIdeas) {
      try {
        // ExecutionQueue.addTask takes (type, description) format
        const description = `Implement: ${idea.concept}
        
Impact: ${idea.impact}
Revenue Potential: ${idea.revenue}
Difficulty: ${idea.difficulty}
Consequences: ${idea.consequences || 'None specified'}
Rating: ${idea.rating}/10

Think outside the box. Consider unintended consequences.`;
        
        const taskId = await this.executionQueue.addTask('idea_implementation', description);
        
        queued.push({ taskId, idea: idea.concept });
      } catch (error) {
        console.error('Error queueing idea:', error.message);
      }
    }
    
    return queued;
  }

  async storeIdeas(ideas) {
    try {
      for (const idea of ideas) {
        await this.pool.query(
          `INSERT INTO daily_ideas (idea_text, impact, revenue_potential, difficulty, consequences, rating, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT DO NOTHING`,
          [
            idea.concept,
            idea.impact,
            idea.revenue,
            idea.difficulty,
            idea.consequences || '',
            idea.rating || 5,
            'pending',
          ]
        );
      }
    } catch (error) {
      console.error('Error storing ideas:', error.message);
    }
  }

  /**
   * Generate and queue ideas immediately
   */
  async generateAndQueueIdeas(count = 5) {
    const ideas = await this.generateDailyIdeas();
    
    if (ideas.error) {
      // Fallback: use simple idea generation
      return await this.generateSimpleIdeas(count);
    }
    
    return ideas;
  }

  async generateSimpleIdeas(count) {
    // Simple fallback idea generation
    const fallbackIdeas = [
      'Optimize API costs through better caching',
      'Improve response time with model selection',
      'Enhance user experience with better UI',
      'Add new revenue streams',
      'Improve system reliability',
    ];
    
    const ideas = fallbackIdeas.slice(0, count).map((concept, i) => ({
      concept,
      impact: 'medium',
      revenue: 'medium',
      difficulty: 'medium',
      rating: 6 + i,
    }));
    
    await this.queueTopIdeas(ideas, count);
    return { generated: count, queued: count };
  }

  /**
   * Start auto-queue management
   */
  start() {
    // Check queue every hour
    setInterval(async () => {
      try {
        await this.ensureQueuePopulated();
      } catch (error) {
        console.error('Queue management error:', error.message);
      }
    }, 60 * 60 * 1000); // Every hour

    // Generate daily ideas
    setInterval(async () => {
      try {
        await this.generateDailyIdeas();
      } catch (error) {
        console.error('Daily idea generation error:', error.message);
      }
    }, this.ideaGenerationInterval);

    // Initial check
    setTimeout(async () => {
      await this.ensureQueuePopulated();
      await this.generateDailyIdeas();
    }, 30000); // After 30 seconds
  }
}
