/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ENHANCED IDEA GENERATOR                                       ║
 * ║                    Each AI generates 25 ideas, council debates, votes, implements ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class EnhancedIdeaGenerator {
  constructor(pool, callCouncilMember, modelRouter, userSimulation = null) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.router = modelRouter;
    this.userSimulation = userSimulation;
    this.ideas = [];
    this.debatedIdeas = [];
    this.votedIdeas = [];
  }

  /**
   * Generate 25 ideas from each AI member
   */
  async generateIdeasFromAllAIs() {
    const members = ['chatgpt', 'gemini', 'deepseek', 'grok'];
    const allIdeas = [];

    console.log('💡 [IDEAS] Generating 25 ideas from each AI member...');

    for (const member of members) {
      try {
        const ideas = await this.generateIdeasFromAI(member);
        allIdeas.push(...ideas.map(idea => ({ ...idea, source: member })));
        console.log(`✅ [IDEAS] ${member}: Generated ${ideas.length} ideas`);
      } catch (error) {
        console.error(`❌ [IDEAS] ${member} failed:`, error.message);
      }
    }

    this.ideas = allIdeas;
    return allIdeas;
  }

  async generateIdeasFromAI(member) {
    const prompt = `Generate 25 revolutionary ideas that will improve and revolutionize the industry. Think outside the box. Consider unintended consequences. Focus on high-impact innovations that could change everything.

For each idea, provide:
1. The core concept (detailed)
2. Potential impact (high/medium/low) with reasoning
3. Revenue potential (high/medium/low) with reasoning
4. Implementation difficulty (easy/medium/hard) with reasoning
5. Unintended consequences to consider
6. How it could be improved
7. What exists in the market currently
8. How to make it better than existing solutions

Return as JSON array:
[
  {
    "concept": "Detailed idea description...",
    "impact": "high|medium|low",
    "impact_reasoning": "Why this impact level",
    "revenue": "high|medium|low",
    "revenue_reasoning": "Why this revenue potential",
    "difficulty": "easy|medium|hard",
    "difficulty_reasoning": "Why this difficulty",
    "consequences": "Unintended consequences to consider",
    "improvements": "How to improve this idea",
    "existing_solutions": "What exists in market",
    "how_to_beat": "How to make it better than existing"
  }
]`;

    const response = await this.callCouncilMember(member, prompt, {
      useTwoTier: false, // Use premium model for idea generation
      maxTokens: 4000,
    });

    // Parse ideas from response
    const ideas = this.parseIdeasFromResponse(response);
    return ideas;
  }

  parseIdeasFromResponse(response) {
    const ideas = [];
    
    try {
      // Try to parse JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse JSON, using fallback parser');
    }

    // Fallback: parse from text
    const lines = response.split('\n');
    let currentIdea = null;
    
    for (const line of lines) {
      if (line.match(/^\d+[\.\)]\s+/)) {
        if (currentIdea) ideas.push(currentIdea);
        currentIdea = {
          concept: line.replace(/^\d+[\.\)]\s+/, '').trim(),
          impact: 'medium',
          revenue: 'medium',
          difficulty: 'medium',
        };
      } else if (currentIdea && line.trim()) {
        const lower = line.toLowerCase();
        if (lower.includes('impact')) {
          currentIdea.impact = this.extractValue(line, ['high', 'medium', 'low']);
          currentIdea.impact_reasoning = line.trim();
        } else if (lower.includes('revenue')) {
          currentIdea.revenue = this.extractValue(line, ['high', 'medium', 'low']);
          currentIdea.revenue_reasoning = line.trim();
        } else if (lower.includes('difficulty')) {
          currentIdea.difficulty = this.extractValue(line, ['easy', 'medium', 'hard']);
          currentIdea.difficulty_reasoning = line.trim();
        } else if (lower.includes('consequence')) {
          currentIdea.consequences = line.trim();
        } else {
          currentIdea.concept += ' ' + line.trim();
        }
      }
    }
    
    if (currentIdea) ideas.push(currentIdea);
    return ideas;
  }

  extractValue(line, options) {
    const lower = line.toLowerCase();
    for (const opt of options) {
      if (lower.includes(opt)) return opt;
    }
    return options[1] || 'medium';
  }

  /**
   * Council debates ideas and creates new ones
   */
  async debateIdeas(userSimulation = null) {
    console.log('💬 [IDEAS] Council debating ideas...');

    // Get user style profile for filtering
    let userStyle = null;
    if (userSimulation) {
      userStyle = userSimulation.getStyleProfile();
    }

    // Group ideas by theme
    const themes = this.groupIdeasByTheme(this.ideas);
    
    const debated = [];
    
    for (const [theme, themeIdeas] of Object.entries(themes)) {
      // Build debate prompt with user simulation filter
      let debatePrompt = `Debate these ${theme} ideas and create NEW improved ideas:

${themeIdeas.slice(0, 10).map((idea, i) => `${i + 1}. ${idea.concept}`).join('\n')}

For each idea:
1. Critique it
2. Identify weaknesses
3. Propose improvements
4. Create a NEW combined/improved version

${userStyle ? `\nIMPORTANT: Filter through the user's decision-making style:\n${JSON.stringify(userStyle, null, 2)}\n\nConsider: Would the user approve this? Does it match their style?` : ''}

Return as JSON:
{
  "critiques": [...],
  "new_ideas": [
    {
      "concept": "Improved/new idea",
      "based_on": ["idea 1", "idea 2"],
      "improvements": "What makes this better",
      "impact": "high|medium|low",
      "revenue": "high|medium|low"
    }
  ]
}`;

      const debateResponse = await this.callCouncilMember('gemini', debatePrompt, {
        useTwoTier: false,
      });

      const debateResult = this.parseDebateResponse(debateResponse);
      debated.push(...debateResult.new_ideas.map(idea => ({
        ...idea,
        theme,
        source: 'council_debate',
      })));
    }

    // Combine original and debated ideas
    this.debatedIdeas = [...this.ideas, ...debated];
    return this.debatedIdeas;
  }

  groupIdeasByTheme(ideas) {
    const themes = {};
    
    for (const idea of ideas) {
      // Simple theme detection based on keywords
      let theme = 'general';
      const concept = idea.concept?.toLowerCase() || '';
      
      if (concept.includes('ai') || concept.includes('artificial intelligence')) {
        theme = 'ai';
      } else if (concept.includes('revenue') || concept.includes('monetiz')) {
        theme = 'revenue';
      } else if (concept.includes('cost') || concept.includes('savings')) {
        theme = 'cost_optimization';
      } else if (concept.includes('automation')) {
        theme = 'automation';
      } else if (concept.includes('security') || concept.includes('quantum')) {
        theme = 'security';
      }
      
      if (!themes[theme]) themes[theme] = [];
      themes[theme].push(idea);
    }
    
    return themes;
  }

  parseDebateResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }
    
    return {
      critiques: [],
      new_ideas: [],
    };
  }

  /**
   * Research ideas online and improve them
   */
  async researchAndImproveIdeas() {
    console.log('🔍 [IDEAS] Researching ideas online...');

    const improved = [];
    
    for (const idea of this.debatedIdeas.slice(0, 20)) { // Research top 20
      try {
        const researchPrompt = `Research this idea online and improve it:

IDEA: ${idea.concept}

1. What exists in the market for this?
2. Who are the competitors?
3. What are the weaknesses of existing solutions?
4. How can we make this idea better?
5. What's the best approach?

Return as JSON:
{
  "existing_solutions": [...],
  "competitors": [...],
  "weaknesses": [...],
  "improved_concept": "Better version of the idea",
  "best_approach": "How to implement"
}`;

        // Use web search enhanced AI
        const researchResponse = await this.router.route(researchPrompt, {
          taskType: 'research',
          riskLevel: 'low',
          userFacing: false,
        });

        if (researchResponse.success) {
          const research = this.parseResearchResponse(researchResponse.result);
          improved.push({
            ...idea,
            ...research,
            researched: true,
          });
        } else {
          improved.push(idea);
        }
      } catch (error) {
        console.warn(`Research failed for idea: ${error.message}`);
        improved.push(idea);
      }
    }

    // Add non-researched ideas
    improved.push(...this.debatedIdeas.slice(20));
    
    return improved;
  }

  parseResearchResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }
    
    return {
      existing_solutions: [],
      competitors: [],
      improved_concept: response.substring(0, 500),
    };
  }

  /**
   * Council votes on ideas
   */
  async voteOnIdeas(improvedIdeas) {
    console.log('🗳️ [IDEAS] Council voting on ideas...');

    const votingPrompt = `Vote on these ideas. Rate each from 1-10 based on:
1. Impact potential
2. Revenue potential
3. Feasibility
4. Uniqueness
5. Market opportunity

IDEAS:
${improvedIdeas.slice(0, 50).map((idea, i) => 
  `${i + 1}. ${idea.improved_concept || idea.concept}\n   Impact: ${idea.impact}, Revenue: ${idea.revenue}, Difficulty: ${idea.difficulty}`
).join('\n\n')}

Return as JSON array with votes:
[
  {
    "idea_index": 0,
    "vote": 8,
    "reasoning": "Why this score",
    "should_implement": true,
    "priority": "high|medium|low"
  }
]`;

    const votes = [];
    const members = ['chatgpt', 'gemini', 'deepseek', 'grok'];
    
    for (const member of members) {
      try {
        const voteResponse = await this.callCouncilMember(member, votingPrompt, {
          useTwoTier: false,
        });
        
        const memberVotes = this.parseVotes(voteResponse);
        votes.push(...memberVotes.map(v => ({ ...v, voter: member })));
      } catch (error) {
        console.warn(`${member} voting failed:`, error.message);
      }
    }

    // Aggregate votes
    const aggregated = this.aggregateVotes(improvedIdeas, votes);
    
    // Sort by average vote
    aggregated.sort((a, b) => (b.avgVote || 0) - (a.avgVote || 0));
    
    // Filter: discard ideas with avg vote < 5
    const acceptable = aggregated.filter(idea => (idea.avgVote || 0) >= 5);
    
    this.votedIdeas = acceptable;
    return acceptable;
  }

  parseVotes(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }
    
    return [];
  }

  aggregateVotes(ideas, votes) {
    const aggregated = ideas.map((idea, index) => {
      const ideaVotes = votes.filter(v => v.idea_index === index);
      const avgVote = ideaVotes.length > 0
        ? ideaVotes.reduce((sum, v) => sum + (v.vote || 5), 0) / ideaVotes.length
        : 5;
      
      const shouldImplement = ideaVotes.filter(v => v.should_implement).length > ideaVotes.length / 2;
      const priorities = ideaVotes.map(v => v.priority).filter(Boolean);
      const mostCommonPriority = priorities.length > 0
        ? priorities.sort((a, b) => 
            priorities.filter(x => x === a).length - priorities.filter(x => x === b).length
          ).pop()
        : 'medium';

      return {
        ...idea,
        index,
        votes: ideaVotes,
        avgVote,
        shouldImplement,
        priority: mostCommonPriority,
        voteCount: ideaVotes.length,
      };
    });

    return aggregated;
  }

  /**
   * Queue ideas for implementation (highest rated first)
   */
  async queueForImplementation(executionQueue) {
    console.log('📋 [IDEAS] Queueing ideas for implementation...');

    const queued = [];
    
    for (const idea of this.votedIdeas) {
      if (!idea.shouldImplement) continue;
      
      try {
        const taskDescription = `Implement: ${idea.improved_concept || idea.concept}

Impact: ${idea.impact} (${idea.avgVote?.toFixed(1)}/10 rating)
Revenue: ${idea.revenue}
Difficulty: ${idea.difficulty}
Priority: ${idea.priority}

${idea.existing_solutions ? `Existing solutions: ${JSON.stringify(idea.existing_solutions)}` : ''}
${idea.how_to_beat ? `How to beat competitors: ${idea.how_to_beat}` : ''}
${idea.best_approach ? `Best approach: ${idea.best_approach}` : ''}

Think outside the box. Consider unintended consequences.`;

        const taskId = await executionQueue.addTask('idea_implementation', taskDescription);
        
        queued.push({
          taskId,
          idea: idea.improved_concept || idea.concept,
          rating: idea.avgVote,
          priority: idea.priority,
        });

        // Store in database
        await this.pool.query(
          `INSERT INTO daily_ideas 
           (idea_id, idea_title, idea_description, impact, revenue_potential, difficulty, 
            rating, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (idea_id) DO UPDATE SET rating = $7`,
          [
            `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            (idea.improved_concept || idea.concept).substring(0, 200),
            JSON.stringify(idea),
            idea.impact,
            idea.revenue,
            idea.difficulty,
            idea.avgVote,
            'queued',
          ]
        );
      } catch (error) {
        console.error('Error queueing idea:', error.message);
      }
    }

    return queued;
  }

  /**
   * Full pipeline: Generate → Debate → Research → Vote → Queue
   */
  async runFullPipeline(executionQueue) {
    console.log('🚀 [IDEAS] Starting full idea generation pipeline...');

    // Step 1: Generate from all AIs
    const generated = await this.generateIdeasFromAllAIs();
    console.log(`✅ Generated ${generated.length} ideas from ${new Set(generated.map(i => i.source)).size} AIs`);

    // Step 2: Council debate (with user simulation filter)
    const debated = await this.debateIdeas(this.userSimulation);
    console.log(`✅ Debated: ${debated.length} total ideas (${debated.length - generated.length} new from debate)`);

    // Step 3: Research and improve
    const improved = await this.researchAndImproveIdeas();
    console.log(`✅ Researched and improved ${improved.filter(i => i.researched).length} ideas`);

    // Step 4: Vote
    const voted = await this.voteOnIdeas(improved);
    console.log(`✅ Voted: ${voted.length} acceptable ideas (${improved.length - voted.length} discarded)`);

    // Step 5: Queue for implementation
    const queued = await this.queueForImplementation(executionQueue);
    console.log(`✅ Queued ${queued.length} ideas for implementation`);

    return {
      generated: generated.length,
      debated: debated.length,
      improved: improved.length,
      voted: voted.length,
      queued: queued.length,
      topIdeas: voted.slice(0, 10),
    };
  }
}
