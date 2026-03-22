/**
 * services/web-search-service.js
 * Internet search for UX best practices, design patterns, and competitor research.
 *
 * Supports:
 *   1. Brave Search API  (BRAVE_SEARCH_API_KEY)
 *   2. Perplexity API    (PERPLEXITY_API_KEY)
 *   3. AI fallback       (uses council AI training knowledge when no search key available)
 *
 * Exports: createWebSearchService(deps) → { search, searchUXPatterns, searchCompetitors, getBestPractices, researchFeature }
 */

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search';
const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';

export function createWebSearchService({ BRAVE_SEARCH_API_KEY, PERPLEXITY_API_KEY, callAI }) {
  // ── Raw web search ──────────────────────────────────────────────────────────
  async function search(query, { count = 5 } = {}) {
    // Try Brave first
    if (BRAVE_SEARCH_API_KEY) {
      try {
        const url = `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const results = (data.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            description: r.description,
          }));
          console.log(`🔍 [WEB-SEARCH] Brave: "${query}" → ${results.length} results`);
          return { source: 'brave', results };
        }
      } catch (err) {
        console.warn(`[WEB-SEARCH] Brave search failed: ${err.message}`);
      }
    }

    // Try Perplexity
    if (PERPLEXITY_API_KEY) {
      try {
        const res = await fetch(PERPLEXITY_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a research assistant. Answer concisely with key facts and URLs when available.',
              },
              { role: 'user', content: query },
            ],
            max_tokens: 800,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          console.log(`🔍 [WEB-SEARCH] Perplexity: "${query}"`);
          return { source: 'perplexity', results: [{ title: query, description: content, url: null }] };
        }
      } catch (err) {
        console.warn(`[WEB-SEARCH] Perplexity failed: ${err.message}`);
      }
    }

    // AI fallback — use training knowledge
    if (callAI) {
      const content = await callAI(
        `You are a UX researcher and product designer. Based on your training knowledge, provide a detailed, structured answer to this query. Include: specific patterns, common mistakes, measurable impact where known, and concrete implementation guidance.\n\nQuery: ${query}\n\nFormat your answer with clear sections and bullet points. Be specific — avoid generic advice.`
      );
      console.log(`🔍 [WEB-SEARCH] AI fallback: "${query}"`);
      return { source: 'ai_knowledge', results: [{ title: query, description: content, url: null }] };
    }

    return { source: 'none', results: [] };
  }

  // ── UX patterns for a feature type ─────────────────────────────────────────
  async function searchUXPatterns(featureType) {
    const queries = [
      `UX best practices for ${featureType} 2024 2025`,
      `user interface patterns ${featureType} intuitive design`,
      `${featureType} UX mistakes to avoid`,
    ];

    const allResults = [];
    for (const q of queries) {
      const { results } = await search(q, { count: 3 });
      allResults.push(...results);
    }

    // Synthesize with AI
    if (callAI && allResults.length > 0) {
      const context = allResults.map(r => `${r.title}: ${r.description}`).join('\n\n');
      const synthesis = await callAI(
        `You are a senior UX designer. Based on the research below (or your training knowledge if research is sparse), give me the TOP 10 UX best practices for building a "${featureType}" interface.\n\nFor each practice:\n- State the rule clearly\n- Explain WHY it matters (user psychology or measurable impact)\n- Give one concrete implementation example\n\nFocus on: reducing cognitive load, clear affordances, error prevention, visual hierarchy, and mobile-first patterns.\n\nResearch:\n${context}`
      );
      return synthesis;
    }

    return allResults.map(r => r.description).join('\n\n');
  }

  // ── Competitor research ─────────────────────────────────────────────────────
  async function searchCompetitors(productType) {
    const { results } = await search(
      `best ${productType} software 2024 2025 user experience design`,
      { count: 5 }
    );

    if (callAI && results.length > 0) {
      const context = results.map(r => `${r.title}: ${r.description}`).join('\n\n');
      return await callAI(
        `You are a product strategist and UX expert. Analyze these competitor examples for "${productType}" and extract:\n\n1. **Common UI patterns** — what navigation, layout, CTA placement do they use?\n2. **What makes the best ones intuitive** — specific design decisions that reduce friction\n3. **Gaps and opportunities** — what do they all do poorly that we can do better?\n4. **Conversion patterns** — how do they guide users toward the key action?\n\nBe specific with names of patterns (e.g. "sticky CTA bar", "social proof below fold", "3-step wizard").\n\nContext:\n${context || 'No external data — use training knowledge about top SaaS products in this category.'}`
      );
    }

    return results.map(r => r.description).join('\n\n');
  }

  // ── Best practices for a specific topic ────────────────────────────────────
  async function getBestPractices(topic) {
    const { results } = await search(`${topic} best practices standards 2024`, { count: 4 });

    if (callAI) {
      const context = results.map(r => `${r.title}: ${r.description}`).join('\n\n');
      return await callAI(
        `You are a UX and accessibility expert. Give me the current best practices for "${topic}".\n\nStructure your answer as:\n**Must-haves** (non-negotiable, impacts all users)\n**Should-haves** (strong best practice, most products implement this)\n**Nice-to-haves** (differentiators that delight users)\n\nFor each item, include: the rule, a one-sentence rationale, and any WCAG/Nielsen/platform standard it maps to.\n\nResearch:\n${context || 'No external research available — use training knowledge.'}`
      );
    }

    return results.map(r => r.description).join('\n');
  }

  // ── Full feature research (combines all above) ──────────────────────────────
  /**
   * Run comprehensive research before building a feature.
   * Returns a research brief the builder injects into every component prompt.
   *
   * @param {string} productName
   * @param {string} productDescription
   * @param {string} componentType  — 'landing_page'|'dashboard'|'form'|'checkout'|'api'|etc
   */
  async function researchFeature(productName, productDescription, componentType = 'web_app') {
    console.log(`🔬 [WEB-SEARCH] Researching: ${productName} / ${componentType}`);

    const [uxPatterns, bestPractices] = await Promise.allSettled([
      searchUXPatterns(`${componentType} for ${productDescription}`),
      getBestPractices(`${componentType} usability and conversion`),
    ]);

    const sections = [];

    if (uxPatterns.status === 'fulfilled' && uxPatterns.value) {
      sections.push(`## UX Best Practices\n${uxPatterns.value}`);
    }

    if (bestPractices.status === 'fulfilled' && bestPractices.value) {
      sections.push(`## Usability Standards\n${bestPractices.value}`);
    }

    if (sections.length === 0) {
      return null;
    }

    return `# Research Brief: ${productName}\n\n${sections.join('\n\n')}`;
  }

  return { search, searchUXPatterns, searchCompetitors, getBestPractices, researchFeature };
}
