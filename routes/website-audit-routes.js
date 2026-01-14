export function registerWebsiteAuditRoutes(app, {
  requireKey,
  callCouncilWithFailover,
}) {
  async function requestStrictJson(prompt) {
    const jsonPrompt = `${prompt}\n\nReturn ONLY valid JSON. No markdown. No code fences.`;
    let response = await callCouncilWithFailover(jsonPrompt, "ollama_deepseek", false, {
      useOpenSourceCouncil: true,
      taskType: "analysis",
      complexity: "medium",
    });

    const tryParse = (text) => {
      const cleaned = text.replace(/```json\s*|```/g, "").trim();
      return JSON.parse(cleaned);
    };

    try {
      return tryParse(response);
    } catch {
      const retryPrompt = `${prompt}\n\nSTRICT: Return ONLY valid JSON. No prose. No markdown.`;
      response = await callCouncilWithFailover(retryPrompt, "ollama_deepseek", false, {
        useOpenSourceCouncil: true,
        taskType: "analysis",
        complexity: "medium",
      });
      return tryParse(response);
    }
  }

  app.post("/api/v1/website/audit", requireKey, async (req, res) => {
    try {
      const {
        business_type,
        location,
        competitor_urls = [],
        goals = [],
      } = req.body || {};

      if (!business_type || !location) {
        return res.status(400).json({
          error: "business_type and location are required",
        });
      }

      const prompt = `You are an AI website strategist. Create a fast audit for a ${business_type} based in ${location}.
Competitors: ${competitor_urls.join(", ") || "none"}
Goals: ${goals.join(", ") || "none"}

Return JSON with keys:
- summary (string)
- site_map (array of strings)
- copy_blocks (array of objects with section + copy)
- seo (array of strings)
- conversion_funnels (array of strings)
- schema_markup (array of strings)
- actions_next_72h (array of strings)
- proof (object with model and timestamp)
`;

      const result = await requestStrictJson(prompt);
      const timestamp = new Date().toISOString();

      const payload = {
        summary: result.summary || "",
        site_map: Array.isArray(result.site_map) ? result.site_map : [],
        copy_blocks: Array.isArray(result.copy_blocks) ? result.copy_blocks : [],
        seo: Array.isArray(result.seo) ? result.seo : [],
        conversion_funnels: Array.isArray(result.conversion_funnels)
          ? result.conversion_funnels
          : [],
        schema_markup: Array.isArray(result.schema_markup)
          ? result.schema_markup
          : [],
        actions_next_72h: Array.isArray(result.actions_next_72h)
          ? result.actions_next_72h
          : [],
        proof: {
          model: result.proof?.model || "open_source_council",
          timestamp: result.proof?.timestamp || timestamp,
        },
      };

      res.json(payload);
    } catch (error) {
      console.error("Website audit error:", error.message);
      res.status(502).json({ error: "Website audit failed" });
    }
  });
}
