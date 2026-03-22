# AMENDMENT 10 — API Cost Savings Service
**Status:** IN_BUILD (live components exist; full product not yet end-to-end verified)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-21

> **SSOT Rule:** Only label something LIVE when verified in production with receipts.
> Components below are individually marked. Do not promote to LIVE until savings ledger
> is recording real per-request data and quality has been confirmed over 100+ calls.

---

## WHAT THIS IS
A B2B service that reduces clients' AI API costs by 60–90% through prompt compression,
intelligent caching, model routing, and free-tier provider substitution. The platform's
own cost optimization engine is packaged and sold as a standalone service to other
companies with high AI bills.

**Mission:** Every $1 a client spends on AI, we make it cost $0.10–$0.40 — and charge
them a portion of what we save them.

**Moat:** No competitor combines compression + routing + caching + drift protection +
verified savings ledger in a single provider-agnostic proxy. The ledger — signed proof
of savings per request — is what nobody else ships.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---|---|---|
| Cost savings share | 20–40% of verified savings | Client pays us portion of what we save them |
| Monthly SaaS fee | $297–$2,997/mo | Based on API call volume |
| Enterprise contract | Custom | For high-volume clients |
| **Target first client:** | $500/mo | Any business spending $2,500+/mo on AI |

### Value Proposition
- Client spending $5,000/mo on GPT-4o
- We reduce to $500–$2,000/mo (60–90% savings)
- We charge $500/mo
- Client nets: saves $2,500–$4,000/mo | We earn: $500/mo

---

## ARCHITECTURE — THE 5-LAYER STACK

```
Request IN
    │
    ▼
[1] Prompt IR Compiler        ← T:/C:/I:/O:/R:/V: structured format
    │
    ▼
[2] Token Optimizer           ← noise strip + phrase sub + TOON + Chain of Draft
    │
    ▼
[3] Delta Context             ← stable prefix cached, only send delta
    │
    ▼
[4] Provider Router           ← free tier cascade → paid only if exhausted
    │
    ▼
[5] Savings Ledger            ← record before/after, quality score, receipt
    │
    ▼
Response OUT
```

---

## COMPONENT STATUS

| ID | Component | Status | File | Notes |
|---|---|---|---|---|
| TCO-A01 | Phrase substitution dictionary | LIVE | `services/token-optimizer.js` | 15 phrases, reversible |
| TCO-A03 | Context registry / template ID reuse | LIVE | `services/token-optimizer.js` | SHA-256 dedup |
| TCO-A04 | Delta context (stop resending history) | IN_BUILD | `services/delta-context.js` | Building 2026-03-21 |
| TCO-A06 | History truncation | LIVE | `services/token-optimizer.js` | Keep last 6 turns |
| TCO-A08 | Semantic dedup cache | LIVE | `ai_response_cache` table | Hit count tracked |
| TCO-B01 | Difficulty classifier / model routing | LIVE | `services/council-service.js` | Free tier cascade |
| TCO-B04 | Cheap→expensive ladder | LIVE | `services/free-tier-governor.js` | Groq→Gemini→…→Ollama |
| TCO-C01 | Critical-fields whitelist | PLANNED | — | Needed for drift protection |
| TCO-C02 | Meaning checksum | PLANNED | — | Round-trip validation |
| TCO-D04 | Adaptive compression (TOON) | IN_BUILD | `services/toon-formatter.js` | Building 2026-03-21 |
| TCO-E01 | Savings ledger per request | IN_BUILD | `services/savings-ledger.js` | Building 2026-03-21 |
| —  | Chain of Draft output compression | IN_BUILD | `services/prompt-ir.js` | Building 2026-03-21 |
| —  | Prompt IR compiler | IN_BUILD | `services/prompt-ir.js` | Building 2026-03-21 |

---

## WHAT IS ACTUALLY WORKING (VERIFIED)

**KNOW (confirmed in code):**
- `services/token-optimizer.js` — phrase table, context registry, history truncation, noise strip. Returns structured `{ text, savedTokens, savingsPct }` object.
- `services/free-tier-governor.js` — daily usage tracking per provider, stops at 90% of free limit, cascades to next provider.
- `services/council-service.js` — now correctly calls token-optimizer (shadowing bug fixed 2026-03-21). The local `optimizePrompt` function was shadowing the import, causing system prompts to be sent as `undefined`. Fixed by renaming local to `_legacySimpleClean`.
- `ai_response_cache` table — exists in Neon production with hit_count tracking.
- Free API keys live in Railway: `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `TOGETHER_API_KEY`.

**THINK (inferred, not fully verified):**
- Cache hit rate is not yet surfaced to clients.
- Actual compression % per call is logged to console but not stored in DB.

**DON'T KNOW:**
- Whether any paying clients are using this service.
- Exact token savings achieved per day in production.

---

## TECHNICAL FILES

| File | Purpose |
|---|---|
| `services/token-optimizer.js` | Core compression engine — phrase sub, noise strip, context registry, history truncation |
| `services/free-tier-governor.js` | Daily quota tracking, provider cascade, stop-before-paid |
| `services/council-service.js` | AI council + routing — token optimizer now wired correctly |
| `services/savings-ledger.js` | Per-request savings receipt (IN_BUILD) |
| `services/toon-formatter.js` | JSON → TOON compact notation (IN_BUILD) |
| `services/delta-context.js` | Conversation snapshot + delta-only sending (IN_BUILD) |
| `services/prompt-ir.js` | Prompt IR compiler + Chain of Draft injection (IN_BUILD) |
| `core/api-cost-savings-revenue.js` | Core savings business logic |
| `db/migrations/20260321_token_usage_log.sql` | Savings ledger DB schema |

### API Endpoints (planned — extract from server.js)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/cost-savings/analyze` | Analyze client's current AI spend |
| GET | `/api/v1/cost-savings/report` | Savings report with proof |
| POST | `/api/v1/cost-savings/optimize` | Run optimization on a prompt |
| GET | `/api/v1/cost-savings/dashboard` | Client-facing savings dashboard |

---

## BUILD HISTORY

### 2026-03-21 (this session)
- **Identified critical shadowing bug** in `council-service.js`: local `optimizePrompt`
  function declaration hoisted and shadowed the `compress` import from `token-optimizer.js`,
  causing all AI calls to send `undefined` as the system prompt and record no token savings.
- **Fixed:** renamed local function to `_legacySimpleClean`, wired correctly.
- **Added free API keys to Railway:** Groq, Gemini, Cerebras, OpenRouter, Mistral, Together.
- **Researched compression techniques:** CompactPrompt (60% savings, <5% accuracy loss),
  TOON (61% savings on JSON, neutral accuracy), Chain of Draft (92% output reduction),
  LLMLingua-2 (80% savings). Source: arXiv 2510.18043, arXiv 2502.18600.
- **Codex review:** Identified correct product framing — "verified savings without quality
  regression" is the product, not compression alone. Added: tokenizer-aware symbol design,
  prompt IR, break-even optimizer, protected spans, delta context, model-specific policies,
  compression confidence score, decompression for audits, evaluation harness, savings ledger.
- **Amendment 10 status corrected:** LIVE → IN_BUILD per SSOT honesty standard.
- **Starting build of 5 components:** savings ledger, TOON, Chain of Draft, delta context,
  prompt IR compiler.

### 2026-03-13 (prior session)
- `core/api-cost-savings-revenue.js` created.
- MICRO Protocol v2 compression added to council-service (later found to use base64 which
  increases size — deprecated in favour of token-optimizer approach).
- `ai_response_cache` table created in Neon production.
- Amendment 10 incorrectly labeled LIVE.

---

## NON-NEGOTIABLES (unchanged)
- Savings calculations must be accurate — never inflate numbers for marketing.
- Client API keys must be stored encrypted — never logged.
- Cache must be per-client isolated — client A's cached responses never served to client B.
- Savings reporting must match actual DB records — no synthetic metrics.
- If compression causes quality regression → auto-revert that rule, never suppress the signal.
- Protected spans: never compress code, URLs, IDs, SQL, JSON keys used by parsers, user quotes.
