/**
 * Idea Engine — generates and stores daily business ideas by querying an AI
 * council member (Ollama or GPT-4o-mini), deduplicating against existing DB records.
 *
 * Dependencies: dayjs, ../core/json-sanitizer.js, pool (pg), callCouncilWithFailover,
 *               executionQueue, systemMetrics (all injected via constructor)
 * Exports: IdeaEngine (class)
 */
import dayjs from "dayjs";
import { sanitizeJsonResponse } from "../core/json-sanitizer.js";

export class IdeaEngine {
  constructor({
    pool,
    callCouncilWithFailover,
    executionQueue,
    systemMetrics,
    councilMembers = ["chatgpt"],
    ollamaEndpoint = null,
  }) {
    this.pool = pool;
    this.callCouncilWithFailover = callCouncilWithFailover;
    this.executionQueue = executionQueue;
    this.systemMetrics = systemMetrics;
    this.dailyIdeas = [];
    this.lastIdeaGeneration = null;
    this.councilMembers = Array.isArray(councilMembers)
      ? councilMembers
      : ["chatgpt"];
    this.ollamaEndpoint = ollamaEndpoint;
  }

  getIdeas() {
    return [...this.dailyIdeas];
  }

  getIdeaCount() {
    return this.dailyIdeas.length;
  }

  async generateDailyIdeas() {
    const today = dayjs().format("YYYY-MM-DD");
    if (this.lastIdeaGeneration === today) return this.dailyIdeas;

    const memberToUse = this.ollamaEndpoint ? "ollama_deepseek" : "chatgpt";
    const modelConfig = memberToUse === "chatgpt" ? { model: "gpt-4o-mini" } : {};
    const modelName = modelConfig.model || "llama3.2:1b";
    const modelSize = getModelSize(modelName);
    const ideaPrompt = getIdeasPromptForModel(modelSize);

    const iterations = modelSize === "small" ? 1 : 3;
    const allIdeas = [];
    let hasSuccessfulResponse = false;

    for (let i = 0; i < iterations; i++) {
      try {
        const response = await this.callCouncilWithFailover(
          ideaPrompt,
          memberToUse
        );

        if (response) {
          hasSuccessfulResponse = true;
        }

        const parsedIdeas = parseIdeasFromResponse(response, modelSize);
        allIdeas.push(...parsedIdeas);
      } catch (error) {
        console.warn(`⚠️ [IDEAS] Iteration ${i + 1} failed: ${error.message}`);
      }
    }

    const seen = new Set();
    const uniqueIdeas = allIdeas.filter((idea) => {
      const key = (idea.name || idea.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const normalizedIdeas = uniqueIdeas.map((idea) => ({
      title: idea.name || idea.title || `Idea ${Math.random().toString(36).slice(2, 8)}`,
      description: idea.description || "",
      difficulty: idea.difficulty || "medium",
      impact: idea.impact || "medium",
    }));

    if (normalizedIdeas.length === 0) {
      for (let i = 1; i <= 5; i++) {
        normalizedIdeas.push({
          title: `Template Idea ${i}`,
          description: `Improve LifeOS system (offers, funnels, automation, billing). Variant #${i}.`,
          difficulty: i <= 2 ? "easy" : i <= 4 ? "medium" : "hard",
          impact: "medium",
        });
      }
    }

    this.dailyIdeas = [];

    for (const idea of normalizedIdeas) {
      const ideaId = `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await this.pool.query(
        `INSERT INTO daily_ideas (idea_id, idea_title, idea_description, proposed_by, implementation_difficulty)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idea_id) DO NOTHING`,
        [ideaId, idea.title, idea.description, hasSuccessfulResponse ? "council" : "fallback", idea.difficulty]
      );

      this.dailyIdeas.push({
        id: ideaId,
        title: idea.title,
        description: idea.description,
        votes: { for: 0, against: 0 },
      });
    }

    this.lastIdeaGeneration = today;
    if (this.systemMetrics) {
      this.systemMetrics.dailyIdeasGenerated += this.dailyIdeas.length;
    }

    setTimeout(() => this.voteOnDailyIdeas().catch((error) => {
      console.error("Idea voting error (scheduled):", error.message);
    }), 5000);

    return this.dailyIdeas;
  }

  async voteOnDailyIdeas() {
    try {
      const pendingIdeas = await this.pool.query(
        `SELECT * FROM daily_ideas WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10`
      );

      for (const idea of pendingIdeas.rows) {
        const votePrompt = `Should we implement this idea?
      Title: ${idea.idea_title}
      Description: ${idea.idea_description}
      Difficulty: ${idea.implementation_difficulty}

      Vote YES or NO with brief reasoning. Focus on ROI, feasibility, and alignment with online revenue generation.`;

      const councilMembers =
        this.councilMembers.length > 0 ? this.councilMembers : ["chatgpt"];
        let yesVotes = 0;
        let noVotes = 0;

        for (const member of councilMembers) {
          try {
            const response = await this.callCouncilWithFailover(
              votePrompt,
              member
            );
            const vote = response.includes("YES") ? "yes" : "no";

            if (vote === "yes") yesVotes++;
            else noVotes++;

            await this.pool.query(
              `UPDATE daily_ideas 
             SET votes_for = votes_for + $1, votes_against = votes_against + $2
             WHERE idea_id = $3`,
              [vote === "yes" ? 1 : 0, vote === "no" ? 1 : 0, idea.idea_id]
            );
          } catch (error) {
            console.error(`Vote error for ${member}:`, error.message);
          }
        }

        const status = yesVotes > noVotes ? "approved" : "rejected";
        await this.pool.query(
          `UPDATE daily_ideas SET status = $1 WHERE idea_id = $2`,
          [status, idea.idea_id]
        );

        if (status === "approved" && this.executionQueue) {
          await this.executionQueue.addTask(
            "implement_idea",
            `Implement: ${idea.idea_title}`
          );
        }
      }
    } catch (error) {
      console.error("Idea voting error:", error.message);
    }
  }
}

function getModelSize(modelName) {
  const lower = (modelName || "").toLowerCase();
  if (lower.includes("70b") || lower.includes("72b") || lower.includes("120b")) return "xlarge";
  if (lower.includes("33b") || lower.includes("32b") || lower.includes("30b")) return "large";
  if (lower.includes("7b") || lower.includes("8b") || lower.includes("13b")) return "medium";
  return "small";
}

function getIdeasPromptForModel(modelSize) {
  if (modelSize === "small") {
    return `List 5 simple software business ideas.

Format EXACTLY like this:
1. Name: Description in one sentence
2. Name: Description in one sentence
3. Name: Description in one sentence
4. Name: Description in one sentence
5. Name: Description in one sentence

Example:
1. API Monitor: Track API costs for startups
2. Resume AI: Improve resumes with AI

Your 5 ideas:`;
  }

  if (modelSize === "medium") {
    return `Generate 8 software/AI business ideas.

For each idea provide:
- Name (2-3 words)
- Description (1 sentence)
- How it makes money (1 sentence)

Format as numbered list:
1. **Name**: Description. Revenue: how it makes money.
2. **Name**: Description. Revenue: how it makes money.`;
  }

  return `Generate 15 innovative AI/software business ideas with market analysis.
For each: name, description, target market, revenue model, competition level.
Return as JSON array.`;
}

function parseIdeasFromResponse(response, modelSize) {
  const ideas = [];
  if (!response || typeof response !== "string") return ideas;

  try {
    const sanitized = sanitizeJsonResponse(response);
    const jsonMatch = sanitized.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item, i) => ({
          id: `idea_${Date.now()}_${i}`,
          name: item.name || item.title || item.concept || `Idea ${i + 1}`,
          description: item.description || item.desc || item.concept || "",
          revenue: item.revenue || item.revenue_model || "",
          difficulty: item.difficulty || "medium",
          impact: item.impact || "medium",
          source: "ollama_json",
        }));
      }
    }
  } catch (error) {
    /* fallback to text parsing */
  }

  const lines = response.split("\n");
  for (const line of lines) {
    const match = line.match(/^\d+[\.\)]\s*\*{0,2}([^:*]+)\*{0,2}:\s*(.+)/);
    if (match) {
      ideas.push({
        id: `idea_${Date.now()}_${ideas.length}`,
        name: match[1].trim(),
        description: match[2].trim(),
        difficulty: "medium",
        impact: "medium",
        source: "ollama_text",
      });
    }

    const titleMatch = line.match(/TITLE:\s*(.+)/i);
    const descMatch = line.match(/DESCRIPTION:\s*(.+)/i);
    if (titleMatch && descMatch && !ideas.find((i) => i.name === titleMatch[1].trim())) {
      ideas.push({
        id: `idea_${Date.now()}_${ideas.length}`,
        name: titleMatch[1].trim(),
        description: descMatch[1].trim(),
        difficulty: "medium",
        impact: "medium",
        source: "ollama_text",
      });
    }
  }

  if (ideas.length === 0 && modelSize !== "small") {
    const sentences = response
      .split(/[\.\!\?]\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (let i = 0; i < Math.min(sentences.length, 5); i++) {
      ideas.push({
        id: `idea_${Date.now()}_${i}`,
        name: `Extracted Idea ${i + 1}`,
        description: sentences[i].trim(),
        difficulty: "medium",
        impact: "medium",
        source: "ollama_fallback",
      });
    }
  }

  return ideas;
}
