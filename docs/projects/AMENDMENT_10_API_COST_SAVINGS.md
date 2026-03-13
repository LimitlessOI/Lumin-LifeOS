# AMENDMENT 10 — API Cost Savings Service
**Status:** LIVE (Priority 1 revenue)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
A B2B service that reduces clients' AI API costs by 90–98% through prompt compression, intelligent caching, model routing, and Tier 0 (free local model) substitution. The platform's own cost optimization engine is packaged and sold as a standalone service to other companies with high AI bills.

**Mission:** Every $1 a client spends on AI, we make it cost $0.02–$0.10 — and charge them $0.05 as our margin.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| Cost savings share | 20–40% of savings | Client pays us portion of what we save them |
| Monthly SaaS fee | $297–$2,997/mo | Based on API call volume |
| Enterprise contract | Custom | For high-volume clients |
| **Target first client:** | $500/mo | Any business spending $2,500+/mo on AI |

### Value Proposition
- Client spending $5,000/mo on GPT-4o
- We reduce to $250/mo (95% savings)
- We charge $500/mo
- Client nets: saves $4,250/mo | We earn: $500/mo

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `core/api-cost-savings-revenue.js` | Core savings logic |
| `server.js` (lines 6128–6155, 6572–6832) | API cost savings + savings service endpoints — NEEDS EXTRACTION |

### Cost Reduction Techniques
| Technique | Savings | Implementation |
|-----------|---------|---------------|
| MICRO Protocol v2 compression | 70–85% token reduction | `compressPrompt()` in council-service |
| Response caching | 50–90% on repeated queries | `ai_response_cache` table |
| Tier 0 routing | 95–100% cost on routable tasks | Ollama local models |
| Model selection (small → large) | 80–95% | `gpt-4o-mini` vs `gpt-4o` |
| Batch processing | 20–40% | Queue similar requests |

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/cost-savings/analyze` | Analyze client's current AI spend |
| GET | `/api/v1/cost-savings/report` | Savings report with proof |
| POST | `/api/v1/cost-savings/optimize` | Run optimization on a prompt |
| GET | `/api/v1/cost-savings/dashboard` | Client-facing savings dashboard |

---

## CURRENT STATE
- **KNOW:** `core/api-cost-savings-revenue.js` exists
- **KNOW:** MICRO Protocol compression implemented in `council-service.js`
- **KNOW:** `ai_response_cache` table exists with `hit_count` tracking
- **THINK:** Cache hit rate is not being reported to clients yet
- **DON'T KNOW:** Whether any paying clients are using this service

---

## REFACTOR PLAN
1. Extract endpoints → `routes/cost-savings-routes.js`
2. Build client-facing savings dashboard (show: before/after cost, cache hit rate, model usage breakdown)
3. Add white-label option — client sees their own branding on the dashboard
4. Create API proxy mode — clients route all their AI calls through us; we optimize transparently
5. Add savings proof export (PDF report) for sales demos

---

## NON-NEGOTIABLES (this project)
- Savings calculations must be accurate — never inflate numbers for marketing
- Client API keys must be stored encrypted — never logged
- Cache must be per-client isolated — client A's cached responses never served to client B
- Savings reporting must match actual DB records — no synthetic metrics
