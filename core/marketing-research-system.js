/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETING RESEARCH SYSTEM                                       ║
 * ║                    Studies Claude C. Hopkins and greatest marketers             ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class MarketingResearchSystem {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
    this.marketers = [
      'Claude C. Hopkins',
      'David Ogilvy',
      'Seth Godin',
      'Gary Vaynerchuk',
      'Neil Patel',
      'Ryan Holiday',
      'Robert Cialdini',
      'Dan Kennedy',
      'Jay Abraham',
      'Eugene Schwartz',
      'John Caples',
      'Rosser Reeves',
      'Leo Burnett',
      'Bill Bernbach',
    ];
    this.books = [
      'Scientific Advertising by Claude C. Hopkins',
      'My Life in Advertising by Claude C. Hopkins',
      'Ogilvy on Advertising by David Ogilvy',
      'This is Marketing by Seth Godin',
      'Influence by Robert Cialdini',
      'The 22 Immutable Laws of Marketing by Al Ries and Jack Trout',
      'Made to Stick by Chip Heath',
      'Contagious by Jonah Berger',
      'Hooked by Nir Eyal',
      'Growth Hacker Marketing by Ryan Holiday',
    ];
  }

  /**
   * Initialize marketing research system
   */
  async initialize() {
    console.log('📚 [MARKETING RESEARCH] Initializing...');
    
    // Start research process
    this.startResearch();
    
    console.log('✅ [MARKETING RESEARCH] Initialized');
  }

  /**
   * Start continuous research
   */
  startResearch() {
    // Research marketers every 6 hours
    setInterval(() => this.researchMarketers(), 6 * 60 * 60 * 1000);
    
    // Extract principles every 12 hours
    setInterval(() => this.extractMarketingPrinciples(), 12 * 60 * 60 * 1000);
    
    // Update marketing playbook daily
    setInterval(() => this.updateMarketingPlaybook(), 24 * 60 * 60 * 1000);
    
    // Initial runs
    setTimeout(() => this.researchMarketers(), 30000); // 30 seconds
    setTimeout(() => this.extractMarketingPrinciples(), 60000); // 1 minute
  }

  /**
   * Research all marketers
   */
  async researchMarketers() {
    console.log('🔍 [MARKETING RESEARCH] Researching marketers...');

    for (const marketer of this.marketers) {
      try {
        await this.researchMarketer(marketer);
      } catch (error) {
        console.error(`Error researching ${marketer}:`, error.message);
      }
    }
  }

  /**
   * Research a specific marketer
   */
  async researchMarketer(marketerName) {
    const prompt = `Research ${marketerName} and their marketing principles:

Focus on:
1. Key marketing principles and strategies
2. Testing methodologies (especially Claude C. Hopkins' scientific approach)
3. Copywriting techniques
4. Campaign strategies
5. How to adapt for modern times (2025)
6. Safe testing methods
7. ROI-focused approaches

Provide comprehensive analysis. Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const research = this.parseJSONResponse(response);
      const researchId = `research_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store research
      await this.storeResearch(researchId, marketerName, research);

      console.log(`✅ [MARKETING RESEARCH] Researched ${marketerName}`);
      return research;
    } catch (error) {
      console.error(`Error researching ${marketerName}:`, error.message);
      return null;
    }
  }

  /**
   * Extract marketing principles
   */
  async extractMarketingPrinciples() {
    console.log('📖 [MARKETING RESEARCH] Extracting marketing principles...');

    const prompt = `Extract the most important marketing principles from all great marketers:

Focus on Claude C. Hopkins' Scientific Advertising principles:
- Test everything
- Measure results
- Track what works
- Scientific approach to advertising
- Direct response focus

Also include principles from:
- David Ogilvy
- Seth Godin
- Robert Cialdini
- Modern growth hackers

Adapt all principles for 2025:
- Digital marketing
- Social media
- AI-powered marketing
- Automation
- Data-driven decisions

Create a comprehensive marketing playbook. Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const principles = this.parseJSONResponse(response);
      
      // Store in knowledge base
      await this.storeMarketingPlaybook(principles);

      console.log('✅ [MARKETING RESEARCH] Extracted marketing principles');
      return principles;
    } catch (error) {
      console.error('Error extracting principles:', error.message);
      return null;
    }
  }

  /**
   * Update marketing playbook
   */
  async updateMarketingPlaybook() {
    console.log('📝 [MARKETING RESEARCH] Updating marketing playbook...');

    // Get all research
    const allResearch = await this.getAllResearch();
    
    // Synthesize into playbook
    const playbook = await this.synthesizePlaybook(allResearch);
    
    // Store updated playbook
    await this.storeMarketingPlaybook(playbook, true);
  }

  /**
   * Store research
   */
  async storeResearch(researchId, marketerName, research) {
    try {
      await this.pool.query(
        `INSERT INTO marketing_research 
         (research_id, marketer_name, research_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (research_id) DO UPDATE SET research_data = $3, updated_at = NOW()`,
        [
          researchId,
          marketerName,
          JSON.stringify(research),
        ]
      );
    } catch (error) {
      console.error('Error storing research:', error.message);
    }
  }

  /**
   * Store marketing playbook
   */
  async storeMarketingPlaybook(playbook, isUpdate = false) {
    try {
      if (isUpdate) {
        await this.pool.query(
          `UPDATE marketing_playbook SET playbook_data = $1, updated_at = NOW() WHERE id = 1`,
          [JSON.stringify(playbook)]
        );
      } else {
        await this.pool.query(
          `INSERT INTO marketing_playbook (id, playbook_data, created_at, updated_at)
           VALUES (1, $1, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET playbook_data = $1, updated_at = NOW()`,
          [JSON.stringify(playbook)]
        );
      }
    } catch (error) {
      console.error('Error storing playbook:', error.message);
    }
  }

  /**
   * Get all research
   */
  async getAllResearch() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM marketing_research ORDER BY created_at DESC`
      );
      return result.rows.map(row => ({
        ...row,
        research_data: typeof row.research_data === 'string' ? JSON.parse(row.research_data) : row.research_data,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Synthesize playbook from all research
   */
  async synthesizePlaybook(allResearch) {
    const prompt = `Synthesize all this marketing research into a comprehensive playbook:

${JSON.stringify(allResearch, null, 2)}

Create:
1. Core principles (from Claude C. Hopkins and others)
2. Testing methodologies
3. Copywriting frameworks
4. Campaign strategies
5. Modern adaptations (2025)
6. Safe testing protocols
7. ROI measurement

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error synthesizing playbook:', error.message);
      return {};
    }
  }

  /**
   * Get marketing playbook
   */
  async getPlaybook() {
    try {
      const result = await this.pool.query(
        `SELECT playbook_data FROM marketing_playbook WHERE id = 1`
      );
      
      if (result.rows.length > 0) {
        return typeof result.rows[0].playbook_data === 'string' 
          ? JSON.parse(result.rows[0].playbook_data)
          : result.rows[0].playbook_data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting playbook:', error.message);
      return null;
    }
  }

  /**
   * Parse JSON response
   */
  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return {};
    }
  }
}
