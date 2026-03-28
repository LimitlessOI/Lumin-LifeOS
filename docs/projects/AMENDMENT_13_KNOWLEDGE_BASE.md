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

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 71/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] Sub-feature list is documented with file/location references
- [x] Rate limiting env vars named (`SEARCH_MAX_PER_MINUTE`, `SEARCH_MAX_PER_DAY`, `SEARCH_ENABLED`)
- [x] DB tables identified (`knowledge_base_files`, `system_source_of_truth`)
- [ ] Web scraper + marketing research endpoints not yet extracted from server.js → `routes/web-intelligence-routes.js`
- [ ] Knowledge base upload endpoint not yet extracted from server.js → `routes/knowledge-routes.js`
- [ ] Vector embedding strategy not specified — "add pgvector or Pinecone" is not implementation-level
- [ ] Token budget for context injection not defined — no documented max_tokens cap or truncation strategy
- [ ] Search API provider not known (KNOW: not confirmed which provider is wired)
- [ ] Malware scanning for uploaded files not implemented — flagged as non-negotiable but no implementation specified

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Perplexity AI | Best-in-class web search + AI synthesis, clean UI | No knowledge base upload, no RAG over your own docs, no system integration | We combine web search AND private knowledge base in the same context injection pipeline |
| Notion AI | Knowledge base over your own pages, widely trusted | No real-time web search, no scraping, limited to Notion-structured content | We accept any uploaded file + do live web scraping — not locked to one content structure |
| Pinecone + LangChain | Production-grade vector search, developer-grade RAG | Raw library stack — no hosted product, no web search integration, requires significant engineering | We ship the complete pipeline — upload → embed → retrieve → inject — with no client-side engineering required |
| Tavily (web search API for AI) | Clean API designed for AI agents, good results | Web search only — no private knowledge base, no file upload, no context injection management | We add private knowledge alongside web results in the same ranked context injection call |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| pgvector performance degrades at scale (>500K embeddings) | Medium | Medium — search latency increases beyond usable | Mitigate: implement embedding chunking strategy with max 512 tokens per chunk; paginate retrieval |
| Search provider blocks or rate-limits our IP (scraping at scale) | HIGH | Medium — web intelligence features fail | Mitigate: rotate user-agent; respect robots.txt; use search API (SerpAPI, Brave Search) instead of direct scraping |
| Uploaded file triggers malware / prompt injection attack | Medium | HIGH — could corrupt AI council outputs | Mitigate: file content is never executed — it is text context only; add prompt injection detection to uploaded content scan |
| Context window overflows from too many knowledge base hits | HIGH (no token budget defined) | High — API calls fail or truncate important content | Mitigate: define token budget (e.g., 2000 tokens max from knowledge base per call); implement ranked truncation |

### Gate 4 — Adaptability Strategy
The context injection layer (`services/knowledge-context.js`) sits between the knowledge store and the AI council — swapping pgvector for Pinecone requires only changing the retrieval function, not the injection logic or any route. If a competitor ships semantic chunking that outperforms our approach, we update the chunking function in the knowledge ingestion pipeline only. Adding a new knowledge category (e.g., `competitor_intelligence`) is a DB row, not a code change. Score: 71/100 — the injection architecture is sound; the missing vector implementation and token budget are the gaps.

### Gate 5 — How We Beat Them
While Perplexity gives you web search and Notion AI gives you document search, LifeOS is the only system that injects both your private wellness-industry knowledge base AND real-time competitor web research into every AI council call — so when you ask "should I add yoga to my offerings?", the answer is grounded in your uploaded industry research and today's competitor pricing, not just the model's training data.
