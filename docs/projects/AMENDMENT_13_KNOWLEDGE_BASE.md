# AMENDMENT 13 — Knowledge Base & Web Intelligence
**Status:** LIVE
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
Two capabilities bundled together: (1) A user-uploadable knowledge base that injects domain context into AI responses, and (2) Web intelligence tools — scraping, competitor analysis, marketing research, and web search.

**Mission:** Give the AI council domain expertise it wasn't trained on, and real-time awareness of the web.

---

## REVENUE MODEL
- Enables better AI output quality across all projects → indirect revenue multiplier
- Web scraping / competitor audit → feeds the Site Builder pipeline directly
- Marketing research → feeds outreach campaign personalization

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `services/knowledge-context.js` | Knowledge base context injection |
| `services/searchService.js` | Web search integration |
| `routes/website-audit-routes.js` | Website audit endpoints |
| `server.js` (lines 5975–6128, 10198–10267) | Web scraper + knowledge base endpoints — PARTIALLY EXTRACTED |

### Sub-Features
| Feature | File/Location |
|---------|--------------|
| Web scraping | server.js (lines 5975–6018) |
| Enhanced conversation scraper | server.js (lines 6018–6128) |
| Web search (rate-limited) | `services/searchService.js` |
| Website audit | `routes/website-audit-routes.js` |
| Knowledge file upload | server.js (lines 10198–10252) |
| File cleanup analyzer | server.js (lines 10252–10267) |
| Marketing research | server.js (lines 5908–5975) |
| Business duplication | server.js (lines 5638–5672) |

### DB Tables
| Table | Purpose |
|-------|---------|
| `knowledge_base_files` | Uploaded files with category + tags |
| `system_source_of_truth` | DB-backed SSOT documents |

### Rate Limits (Web Search)
- `SEARCH_MAX_PER_MINUTE` — default 10 (env var)
- `SEARCH_MAX_PER_DAY` — default 100 (env var)
- `SEARCH_ENABLED` — on by default, set to false to disable

---

## CURRENT STATE
- **KNOW:** Website audit routes extracted to `routes/website-audit-routes.js`
- **KNOW:** Search service rate limiting implemented
- **KNOW:** `services/searchService.js` exists
- **KNOW:** Knowledge base upload endpoint in server.js lines 10198–10252
- **THINK:** Web scraper endpoints are not yet extracted to their own route file
- **DON'T KNOW:** Which search API provider is configured (Bing? SerpAPI? DuckDuckGo?)

---

## REFACTOR PLAN
1. Extract web scraper + marketing research → `routes/web-intelligence-routes.js`
2. Extract knowledge base endpoints → `routes/knowledge-routes.js` (already partial)
3. Add vector search to knowledge base (pgvector or Pinecone for semantic retrieval)
4. Add auto-indexing — uploaded files are chunked + embedded automatically
5. Add knowledge base categories: `industry`, `client`, `product`, `competitor`, `regulation`
6. Wire knowledge base context injection to Site Builder — auto-inject industry knowledge when building wellness sites

---

## NON-NEGOTIABLES (this project)
- Scraped content must respect robots.txt and ToS of scraped sites
- Rate limiting is not optional — never hammer external sites
- Uploaded files are scanned for malware before processing (or flag for manual review)
- Knowledge base context injection must have a token budget — never overflow the context window
- Web search results must be attributed (source URL retained) — never present scraped content as original
