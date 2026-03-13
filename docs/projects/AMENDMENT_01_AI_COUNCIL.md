# AMENDMENT 01 — AI Council System
**Status:** LIVE
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
The AI Council is the intelligence backbone of the entire platform. It routes every AI task to the right model at the right cost — local free models first (Tier 0), expensive cloud models only for oversight (Tier 1). It enforces cost limits, handles failover, compresses prompts, caches responses, and tracks performance across all models.

**Mission:** Route AI work to the cheapest capable model. Zero unnecessary spend.

---

## REVENUE ALIGNMENT
- Enables all other revenue-generating projects (site builder, outreach, auto-builder, etc.)
- Cost savings ARE revenue (API Cost Savings Service sells this to clients)
- Target: 1–5% of original AI costs via Tier 0 + caching + compression

---

## TECHNICAL SPEC

### Files (Current)
| File | Purpose |
|------|---------|
| `services/council-service.js` | Core: routing, cost calc, failover, compression |
| `services/logger.js` | Pino structured logging (replaces Winston) |
| `server.js` (lines 2215–2750, 4077–4560) | Council members config, rotation, two-tier init — NEEDS EXTRACTION |

### Models
| Tier | Models | Use |
|------|--------|-----|
| Tier 0 (free) | Ollama: deepseek-coder, llama3, gemma2, phi3 | All primary work |
| Tier 1 (paid) | GPT-4o, Claude 3.5, Gemini 2.5 Flash, Grok-2 | Oversight/validation only |

### Key Constants (env vars)
- `MAX_DAILY_SPEND` — hard cap, default $0
- `COST_SHUTDOWN_THRESHOLD` — % of daily spend that triggers fallback to free
- `OLLAMA_ENDPOINT` — local Ollama server URL
- `COUNCIL_TIMEOUT_MS` — max wait per council call (default 300s)
- `COUNCIL_PING_TIMEOUT_MS` — health check timeout (default 5s)

### Canonical Queue Names
`idea-pipeline` | `video-generate` | `game-build` | `self-program` | `outreach`

---

## CURRENT STATE
- **KNOW:** `services/council-service.js` exports `callCouncilMember`, `callCouncilWithFailover`, `resolveCouncilMember`, `calculateCost`, `getDailySpend`, `updateDailySpend`, `pingCouncilMember`, `compressPrompt`, `decompressResponse`, `detectBlindSpots`
- **KNOW:** Two-tier system initializes in server.js startup block (~line 4466)
- **KNOW:** `COUNCIL_ALIAS_MAP` and `COUNCIL_MEMBERS` defined in server.js (lines 2229–2412) — should move to council-service.js or a config file
- **KNOW:** AI performance tracking writes to `ai_performance` DB table
- **KNOW:** Provider cooldowns tracked in-memory `Map` — lost on restart
- **THINK:** Ollama circuit breaker exists but may not be wired to cooldown map

---

## REFACTOR PLAN
1. Move `COUNCIL_MEMBERS` and `COUNCIL_ALIAS_MAP` out of server.js → `config/council-members.js`
2. Move all council-related server.js sections → `routes/council-routes.js`
3. Persist provider cooldowns in DB (survive restarts)
4. Wire BullMQ queue → council workers (currently jobs added but no persistent worker process)
5. Add `/api/v1/council/health` endpoint (ping all Tier 0 models, return status)

---

## NON-NEGOTIABLES (this project)
- Tier 0 ALWAYS runs first — never go straight to paid models
- `MAX_DAILY_SPEND = 0` default — spending requires explicit env var
- Never log API keys or raw prompts containing sensitive data
- `callCouncilWithFailover` must always have a free-model fallback
- Cost is tracked per-call and rolled up to daily total before any paid call
