/**
 * SYNOPSIS: ==================== MARKETING RESEARCH ENDPOINTS ====================
 * @ssot docs/products/knowledge-base/PRODUCT_HOME.md
 */
// ==================== MARKETING RESEARCH ENDPOINTS ====================

function registerMarketingResearchRoutes(app, webScraper, requireKey) {
  app.post("/api/v1/marketing-research/competitor-analysis", requireKey, async (req, res) => {
    try {
      if (!webScraper) {
        return res.status(503).json({ error: "Web Scraper not initialized" });
      }
      const { url, depth } = req.body;
      const result = await webScraper.analyzeCompetitor(url, depth);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/marketing-research/market-sentiment", requireKey, async (req, res) => {
    try {
      if (!webScraper) {
        return res.status(503).json({ error: "Web Scraper not initialized" });
      }
      const { query, sources, limit } = req.body;
      const result = await webScraper.getMarketSentiment(query, sources, limit);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/marketing-research/trend-analysis", requireKey, async (req, res) => {
    try {
      if (!webScraper) {
        return res.status(503).json({ error: "Web Scraper not initialized" });
      }
      const { keywords, timeRange } = req.body;
      const result = await webScraper.getTrendAnalysis(keywords, timeRange);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/marketing-research/seo-audit", requireKey, async (req, res) => {
    try {
      if (!webScraper) {
        return res.status(503).json({ error: "Web Scraper not initialized" });
      }
      const { url } = req.body;
      const result = await webScraper.performSeoAudit(url);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/marketing-research/ad-campaign-analysis", requireKey, async (req, res) => {
    try {
      if (!webScraper) {
        return res.status(503).json({ error: "Web Scraper not initialized" });
      }
      const { competitorUrl } = req.body;
      const result = await webScraper.analyzeAdCampaign(competitorUrl);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/marketing-research/social-media-monitor", requireKey, async (req, res) => {
    try {
      if (!webScraper) {
        return res.status(503).json({ error: "Web Scraper not initialized" });
      }
      const { platform, query, timeRange } = req.body;
      const result = await webScraper.monitorSocialMedia(platform, query, timeRange);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}

export { registerMarketingResearchRoutes };
