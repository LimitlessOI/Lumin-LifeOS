/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETING AGENCY SYSTEM                                         ║
 * ║                    Best marketing agency for us first, then public               ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class MarketingAgency {
  constructor(pool, callCouncilMember, modelRouter, marketingResearch) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
    this.marketingResearch = marketingResearch;
    this.activeCampaigns = new Map();
  }

  /**
   * Initialize marketing agency
   */
  async initialize() {
    console.log('📢 [MARKETING AGENCY] Initializing...');
    
    // Load marketing playbook
    const playbook = await this.marketingResearch.getPlaybook();
    if (!playbook) {
      console.warn('⚠️ [MARKETING AGENCY] No playbook found, will generate one');
    }
    
    // Start agency operations
    this.startAgencyOperations();
    
    console.log('✅ [MARKETING AGENCY] Initialized');
  }

  /**
   * Start agency operations
   */
  startAgencyOperations() {
    // Create campaigns for LifeOS every 2 hours
    setInterval(() => this.createLifeOSCampaigns(), 2 * 60 * 60 * 1000);
    
    // Optimize campaigns every hour
    setInterval(() => this.optimizeCampaigns(), 60 * 60 * 1000);
    
    // Generate marketing content daily
    setInterval(() => this.generateMarketingContent(), 24 * 60 * 60 * 1000);
    
    // Initial runs
    setTimeout(() => this.createLifeOSCampaigns(), 60000); // 1 minute
  }

  /**
   * Create marketing campaigns for LifeOS
   */
  async createLifeOSCampaigns() {
    console.log('🎯 [MARKETING AGENCY] Creating LifeOS campaigns...');

    const playbook = await this.marketingResearch.getPlaybook();
    
    const prompt = `Create marketing campaigns for LifeOS using proven marketing principles:

Marketing Playbook:
${JSON.stringify(playbook, null, 2)}

Create 5 campaigns:
1. Content marketing campaign
2. Social media campaign
3. Paid advertising campaign
4. Partnership campaign
5. Viral/growth campaign

For each campaign:
- Target audience
- Key message
- Channels
- Budget recommendation
- Expected ROI
- Testing strategy (Claude C. Hopkins style)
- Metrics to track

Return as JSON array.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const campaigns = this.parseJSONResponse(response);
      
      for (const campaign of campaigns) {
        await this.storeCampaign(campaign, 'lifeos');
      }

      console.log(`✅ [MARKETING AGENCY] Created ${campaigns.length} campaigns`);
      return campaigns;
    } catch (error) {
      console.error('Error creating campaigns:', error.message);
      return [];
    }
  }

  /**
   * Generate marketing content
   */
  async generateMarketingContent() {
    console.log('✍️ [MARKETING AGENCY] Generating marketing content...');

    const playbook = await this.marketingResearch.getPlaybook();
    
    const prompt = `Generate marketing content for LifeOS using proven copywriting principles:

Marketing Principles:
${JSON.stringify(playbook?.copywriting || {}, null, 2)}

Create:
1. Blog post (SEO optimized)
2. Social media posts (5 variations)
3. Email campaign
4. Landing page copy
5. Ad copy (multiple variations for testing)

Use Claude C. Hopkins principles:
- Test everything
- Direct response focus
- Clear value proposition
- Scientific approach

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const content = this.parseJSONResponse(response);
      
      // Store content
      await this.storeMarketingContent(content);
      
      console.log('✅ [MARKETING AGENCY] Generated marketing content');
      return content;
    } catch (error) {
      console.error('Error generating content:', error.message);
      return null;
    }
  }

  /**
   * Optimize campaigns
   */
  async optimizeCampaigns() {
    console.log('⚡ [MARKETING AGENCY] Optimizing campaigns...');

    // Get active campaigns
    const campaigns = await this.getActiveCampaigns();
    
    for (const campaign of campaigns) {
      // Analyze performance
      // Optimize based on data
      // A/B test variations
    }
  }

  /**
   * Store campaign
   */
  async storeCampaign(campaign, client = 'lifeos') {
    try {
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      await this.pool.query(
        `INSERT INTO marketing_campaigns 
         (campaign_id, client, campaign_name, campaign_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          campaignId,
          client,
          campaign.name || campaign.campaignName,
          JSON.stringify(campaign),
          'active',
        ]
      );

      this.activeCampaigns.set(campaignId, campaign);
      return campaignId;
    } catch (error) {
      console.error('Error storing campaign:', error.message);
      return null;
    }
  }

  /**
   * Store marketing content
   */
  async storeMarketingContent(content) {
    try {
      const contentId = `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      await this.pool.query(
        `INSERT INTO marketing_content 
         (content_id, content_type, content_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          contentId,
          'mixed',
          JSON.stringify(content),
        ]
      );
    } catch (error) {
      console.error('Error storing content:', error.message);
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM marketing_campaigns WHERE status = 'active' ORDER BY created_at DESC`
      );
      return result.rows.map(row => ({
        ...row,
        campaign_data: typeof row.campaign_data === 'string' ? JSON.parse(row.campaign_data) : row.campaign_data,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse JSON response
   */
  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        return JSON.parse(objMatch[0]);
      }
      // Sanitize before parsing
      let cleaned = response
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return [];
    }
  }
}
