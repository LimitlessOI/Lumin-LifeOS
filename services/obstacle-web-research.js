/**
 * SYNOPSIS: Web research for obstacle lessons — how others solved similar blockers.
 * WIRED: point-b-navigator + obstacle-lesson-loop
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { createWebSearchService } from './web-search-service.js';

export function createObstacleWebResearch({ callAI, logger = console } = {}) {
  const search = createWebSearchService({
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    callAI,
  });

  function buildQuery({ phase, violations = [], mission_id, kind }) {
    const blob = violations.slice(0, 5).join(' ').slice(0, 400);
    return [
      'software engineering pipeline obstacle fix',
      mission_id || '',
      phase || '',
      kind || '',
      blob,
      'concrete solution steps not generic advice',
    ].filter(Boolean).join(' ');
  }

  async function researchObstacle(context = {}) {
    const query = buildQuery(context);
    try {
      const result = await search.search(query, { count: 4 });
      const snippets = (result.results || [])
        .map((r) => ({ title: r.title, url: r.url, snippet: String(r.description || '').slice(0, 500) }))
        .filter((r) => r.snippet || r.url);
      return {
        ok: true,
        query,
        source: result.source || 'unknown',
        snippets,
        fix_hints: snippets.slice(0, 3).map((s) => s.snippet).filter(Boolean),
      };
    } catch (err) {
      logger.warn?.({ err: err.message }, '[OBSTACLE-WEB-RESEARCH] search failed');
      return { ok: false, query, error: err.message, snippets: [], fix_hints: [] };
    }
  }

  return { researchObstacle, buildQuery };
}

export async function researchObstacleBlocker(context, deps = {}) {
  const svc = createObstacleWebResearch(deps);
  return svc.researchObstacle(context);
}
