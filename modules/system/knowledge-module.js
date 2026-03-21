import { requireKey } from "../../src/server/auth/requireKey.js";
import { getKnowledgeContext } from "../../services/knowledge-context.js";

function ensureEntries() {
  const knowledgeContext = getKnowledgeContext();
  if (!knowledgeContext || !Array.isArray(knowledgeContext.entries)) {
    throw new Error("Knowledge context not loaded. Run: node scripts/process-knowledge.js");
  }
  return knowledgeContext.entries;
}

function collectIdeas(entries = []) {
  const allIdeas = [];
  const sources = new Set();

  for (const entry of entries) {
    if (entry.ideas && Array.isArray(entry.ideas)) {
      sources.add(entry.filename || "unknown");
      for (const idea of entry.ideas) {
        allIdeas.push({
          text: idea.text || idea,
          source: entry.filename,
          topics: entry.topics || [],
          context: idea.context || null,
        });
      }
    }
  }

  return { ideas: allIdeas, sources };
}

export class KnowledgeModule {
  constructor({ knowledgeBase, callCouncilWithFailover } = {}) {
    this.knowledgeBase = knowledgeBase;
    this.callCouncilWithFailover = callCouncilWithFailover;
    this.routes = [
      {
        path: "/api/v1/knowledge/business-ideas",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleBusinessIdeas.bind(this),
      },
      {
        path: "/api/v1/knowledge/security",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleSecurityDocs.bind(this),
      },
      {
        path: "/api/v1/knowledge/ideas",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleIdeas.bind(this),
      },
      {
        path: "/api/v1/knowledge/stats",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleStats.bind(this),
      },
      {
        path: "/api/v1/knowledge/rank",
        method: "POST",
        middleware: [requireKey],
        handler: this.handleRank.bind(this),
      },
      {
        path: "/api/v1/knowledge/search",
        method: "GET",
        middleware: [requireKey],
        handler: this.handleSearch.bind(this),
      },
    ];
  }

  async handleBusinessIdeas(req, res) {
    try {
      if (!this.knowledgeBase) {
        return res.status(503).json({ error: "Knowledge base not initialized" });
      }
      const ideas = await this.knowledgeBase.getBusinessIdeas();
      res.json({ ok: true, ideas, count: ideas.length });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleSecurityDocs(req, res) {
    try {
      if (!this.knowledgeBase) {
        return res.status(503).json({ error: "Knowledge base not initialized" });
      }
      const docs = await this.knowledgeBase.getSecurityDocs();
      res.json({ ok: true, docs, count: docs.length });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleIdeas(req, res) {
    try {
      const entries = ensureEntries();
      const { ideas, sources } = collectIdeas(entries);
      res.json({
        ok: true,
        total: ideas.length,
        sources_count: sources.size,
        ideas,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleStats(req, res) {
    try {
      const entries = ensureEntries();
      const topicFreq = {};
      const sourceStats = {};

      for (const entry of entries) {
        if (entry.topics && Array.isArray(entry.topics)) {
          for (const topic of entry.topics) {
            topicFreq[topic] = (topicFreq[topic] || 0) + 1;
          }
        }

        const source = entry.filename || "unknown";
        if (!sourceStats[source]) {
          sourceStats[source] = { ideas_count: 0, topics_count: 0 };
        }
        sourceStats[source].ideas_count += (entry.ideas?.length || 0);
        sourceStats[source].topics_count += (entry.topics?.length || 0);
      }

      const topTopics = Object.entries(topicFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      const knowledgeContext = getKnowledgeContext();
      res.json({
        ok: true,
        total_entries: knowledgeContext?.totalEntries || 0,
        total_ideas: entries.reduce((sum, e) => sum + (e.ideas?.length || 0), 0),
        has_true_vision: !!knowledgeContext?.trueVision,
        has_core_truths: !!knowledgeContext?.coreTruths,
        has_project_context: !!knowledgeContext?.projectContext,
        top_topics: topTopics,
        sources: sourceStats,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleRank(req, res) {
    try {
      const entries = ensureEntries();
      const { criteria, limit = 50 } = req.body;
      if (!criteria) {
        return res.status(400).json({ error: "criteria required in body" });
      }

      const allIdeas = collectIdeas(entries).ideas;
      const ideasToRank = allIdeas.slice(0, Math.min(limit, allIdeas.length));

      const rankingPrompt = `Rank these ${ideasToRank.length} business/software ideas based on this criteria:

Criteria: ${criteria}

Ideas to rank:
${ideasToRank
  .map(
    (idea, i) =>
      `${i + 1}. ${idea.text.substring(0, 200)} (Source: ${idea.source})`
  )
  .join("\n")}

Return a JSON array with ranked ideas, each with:
- rank: number (1 = best)
- idea_text: string
- score: number (0-100)
- reasoning: string (why this rank)

Return ONLY valid JSON array. Start with [ end with ].`;

      const rankingResponse = await this.callCouncilWithFailover(
        rankingPrompt,
        "ollama_deepseek",
        false,
        { maxTokens: 4000 }
      );

      let ranking = [];
      try {
        const { extractAndParseJSON } = await import("../../core/json-sanitizer.js");
        ranking = extractAndParseJSON(rankingResponse, []);
        if (!Array.isArray(ranking)) {
          ranking = [];
        }
      } catch (error) {
        console.warn("Failed to parse ranking response:", error.message);
      }

      res.json({
        ok: true,
        criteria,
        total_ideas_analyzed: ideasToRank.length,
        ranking: ranking.slice(0, 20),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleSearch(req, res) {
    try {
      const entries = ensureEntries();
      const { q, topic } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' required" });
      }

      const queryLower = q.toLowerCase();
      const topicFilter = topic ? topic.toLowerCase() : null;
      const results = [];

      for (const entry of entries) {
        if (topicFilter && entry.topics) {
          const hasTopic = entry.topics.some((t) =>
            t.toLowerCase().includes(topicFilter)
          );
          if (!hasTopic) continue;
        }

        if (entry.ideas && Array.isArray(entry.ideas)) {
          for (const idea of entry.ideas) {
            const ideaText = (idea.text || idea).toLowerCase();
            if (ideaText.includes(queryLower)) {
              results.push({
                text: idea.text || idea,
                source: entry.filename,
                topics: entry.topics || [],
                context: idea.context || null,
              });
            }
          }
        }
      }

      res.json({
        ok: true,
        query: q,
        topic_filter: topic || null,
        results_count: results.length,
        results: results.slice(0, 50),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
}
