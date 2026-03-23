/**
 * Web Intelligence Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_15_BUSINESS_TOOLS.md
 */
import logger from '../services/logger.js';

export function createWebIntelligenceRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    webScraper,
    enhancedConversationScraper,
  } = ctx;

// ==================== WEB SCRAPER ENDPOINTS ====================
app.post("/api/v1/scraper/scrape", requireKey, async (req, res) => {
  try {
    if (!webScraper) {
      return res.status(503).json({ error: "Web Scraper not initialized" });
    }

    const { url, options } = req.body;
    const result = await webScraper.scrapeWebsite(url, options || {});
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/scraper/competitors", requireKey, async (req, res) => {
  try {
    if (!webScraper) {
      return res.status(503).json({ error: "Web Scraper not initialized" });
    }

    const { urls } = req.body;
    const result = await webScraper.scrapeCompetitors(urls);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/scraper/scrapes", requireKey, async (req, res) => {
  try {
    if (!webScraper) {
      return res.status(503).json({ error: "Web Scraper not initialized" });
    }

    const { limit = 50 } = req.query;
    const scrapes = await webScraper.getScrapes(parseInt(limit));
    res.json({ ok: true, count: scrapes.length, scrapes });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== ENHANCED CONVERSATION SCRAPER ENDPOINTS ====================
app.post("/api/v1/conversations/store-credentials", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const { provider, credentials } = req.body;
    
    if (!provider || !credentials) {
      return res.status(400).json({ error: "Provider and credentials required" });
    }

    const validProviders = ['chatgpt', 'gemini', 'claude', 'grok', 'deepseek'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
    }

    const success = await enhancedConversationScraper.storeCredentials(provider, credentials);
    
    if (success) {
      res.json({ ok: true, message: `Credentials stored securely for ${provider}` });
    } else {
      res.status(500).json({ ok: false, error: "Failed to store credentials" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/conversations/scrape", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: "Provider required" });
    }

    // Start scraping in background
    enhancedConversationScraper.scrapeAllConversations(provider)
      .then(result => {
        console.log(`✅ [SCRAPER] Completed scraping ${provider}:`, result);
      })
      .catch(error => {
        console.error(`❌ [SCRAPER] Error scraping ${provider}:`, error.message);
      });

    res.json({ 
      ok: true, 
      message: `Started scraping ${provider} conversations. Check status endpoint for progress.`,
      note: "Scraping runs in background. Use status endpoint to check progress."
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/conversations/scrape-status/:statusId", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const status = enhancedConversationScraper.getStatus(req.params.statusId);
    
    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    res.json({ ok: true, status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/conversations/stored-credentials", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const credentials = await enhancedConversationScraper.listStoredCredentials();
    res.json({ ok: true, count: credentials.length, credentials });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete("/api/v1/conversations/credentials/:provider", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const success = await enhancedConversationScraper.deleteCredentials(req.params.provider);
    
    if (success) {
      res.json({ ok: true, message: `Credentials deleted for ${req.params.provider}` });
    } else {
      res.status(500).json({ ok: false, error: "Failed to delete credentials" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
