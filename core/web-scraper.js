/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    WEB SCRAPER FOR COMPETITIVE INTELLIGENCE                        ║
 * ║                    Scrapes all info we can for business intelligence            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class WebScraper {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
  }

  /**
   * Scrape website for competitive intelligence
   */
  async scrapeWebsite(url, options = {}) {
    console.log(`🔍 [WEB SCRAPER] Scraping ${url}...`);

    const {
      extractText = true,
      extractLinks = true,
      extractImages = false,
      extractPricing = true,
      extractFeatures = true,
      extractTestimonials = true,
    } = options;

    const prompt = `Scrape and analyze this website: ${url}

Extract:
${extractText ? '- All text content' : ''}
${extractLinks ? '- All links' : ''}
${extractPricing ? '- Pricing information' : ''}
${extractFeatures ? '- Product/service features' : ''}
${extractTestimonials ? '- Customer testimonials/reviews' : ''}
- Business model
- Target audience
- Marketing strategies
- Competitive advantages
- Weaknesses

Since I can't directly access the web, use your knowledge and any available tools to analyze this business.

Return as JSON with comprehensive analysis.`;

    try {
      const response = await this.callCouncilMember('grok', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const analysis = this.parseJSONResponse(response);
      const scrapeId = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store scrape data
      await this.storeScrapeData(scrapeId, url, analysis);

      console.log(`✅ [WEB SCRAPER] Scraped ${url}`);
      return { scrapeId, analysis };
    } catch (error) {
      console.error('Error scraping website:', error.message);
      throw error;
    }
  }

  /**
   * Scrape multiple competitors
   */
  async scrapeCompetitors(competitorUrls) {
    console.log(`🔍 [WEB SCRAPER] Scraping ${competitorUrls.length} competitors...`);

    const analyses = [];
    
    for (const url of competitorUrls) {
      try {
        const result = await this.scrapeWebsite(url, {
          extractText: true,
          extractPricing: true,
          extractFeatures: true,
        });
        analyses.push(result);
        
        // Small delay between scrapes
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
      }
    }

    // Compare competitors
    const comparison = await this.compareCompetitors(analyses);
    
    return { analyses, comparison };
  }

  /**
   * Compare competitors
   */
  async compareCompetitors(analyses) {
    const prompt = `Compare these competitor analyses:

${JSON.stringify(analyses, null, 2)}

Provide:
1. Competitive landscape overview
2. Pricing comparison
3. Feature comparison
4. Market positioning
5. Opportunities for LifeOS
6. How to beat each competitor (10-20% better)

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error comparing competitors:', error.message);
      return {};
    }
  }

  /**
   * Store scrape data
   */
  async storeScrapeData(scrapeId, url, data) {
    try {
      await this.pool.query(
        `INSERT INTO web_scrapes 
         (scrape_id, url, scrape_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (scrape_id) DO UPDATE SET scrape_data = $3, updated_at = NOW()`,
        [
          scrapeId,
          url,
          JSON.stringify(data),
        ]
      );
    } catch (error) {
      console.error('Error storing scrape data:', error.message);
    }
  }

  /**
   * Get all scrapes
   */
  async getScrapes(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM web_scrapes ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(row => ({
        ...row,
        scrape_data: typeof row.scrape_data === 'string' ? JSON.parse(row.scrape_data) : row.scrape_data,
      }));
    } catch (error) {
      console.error('Error getting scrapes:', error.message);
      return [];
    }
  }

  /**
   * Parse JSON response (with sanitization)
   */
  parseJSONResponse(response) {
    try {
      // Sanitize JSON to remove comments and trailing commas
      let cleaned = (response || '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();
      
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(cleaned);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return {};
    }
  }
}
