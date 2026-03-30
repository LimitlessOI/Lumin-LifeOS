# AMENDMENT 01 — AI Council System

> **Y-STATEMENT:** In the context of a platform that makes many AI calls daily,
> facing the risk of runaway API costs and vendor lock-in,
> we decided to build a council routing layer that routes every task to the cheapest
> capable model to achieve near-zero AI spend, accepting added routing complexity
> and the need to maintain model-capability knowledge as providers evolve.

| Field | Value |
|---|---|
| **Lifecycle** | `production` |
| **Reversibility** | `one-way-door` — all features depend on this layer |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-03-30 |
| **Verification Command** | `node scripts/verify-project.mjs --project ai_council` |
| **Manifest** | `docs/projects/AMENDMENT_01_AI_COUNCIL.manifest.json` |

---

## Mission
Route every AI task to the cheapest capable model. Zero unnecessary spend. Free providers first, paid providers never unless explicitly authorized.

## North Star Anchor
Maximum Leverage — the council multiplies every feature's value by routing intelligently. It also generates revenue directly (API Cost Savings Service sells this system to clients).

---

## Scope / Non-Scope

**In scope:**
- Model routing, selection, and failover
- Token compression (TOON, IR compiler, whitespace, phrase table, caching)
- Free tier governor — tracks daily limits per provider
- Savings ledger — records actual savings per call to DB
- HAB (Human Attention Budget) enforcement
- AI safety gate (REALITY_MISMATCH, AI kill switch)
- Provider health monitoring and cooldown management

**Out of scope:**
- What the AI actually says (that's the feature using the council)
- UI for displaying AI responses (→ AMENDMENT_12)
- Autonomous self-improvement loops (blocked by LIFEOS_DIRECTED_MODE)

---

## Owned Files
```
services/council-service.js
services/token-optimizer.js
services/savings-ledger.js
services/free-tier-governor.js
services/ai-model-selector.js
services/consensus-service.js
services/response-cache.js
services/ai-guard.js
config/council-members.js
```

## Protected Files (read-only for this project)
```
server.js           — composition root only
```

---

## Design Spec

### Model Priority Chain (all free, in order)
1. **Groq** — 13,950 req/day (3% buffer from 14,400)
2. **Gemini Flash** — 1,455 req/day, 970k tokens/day
3. **Cerebras** — 970 req/day
4. **OpenRouter** — 195 req/day (free models only)
5. **Mistral** — 485 req/day
6. **Together** — 970 req/day
7. **Ollama** — unlimited (local, always last fallback)

**Paid providers:** Anthropic, OpenAI — only fire if `MAX_DAILY_SPEND > 0` AND free providers all exhausted.

### Token Compression Stack (applied in order)
1. Exact cache hit → 100% savings
2. Whitespace/noise strip → ~5% savings (`\n{2,}` → `\n`)
3. TOON JSON compression → 20-40% on JSON tasks
4. IR compiler → removes redundant instruction patterns
5. Phrase table → domain abbreviations (100+ LifeOS-specific phrases)
6. History truncation → keep last N turns

**TOON is enabled for ALL task types including codegen** (was previously disabled for codegen — fixed 2026-03-27).

### Key Environment Variables
| Var | Default | Purpose |
|---|---|---|
| `MAX_DAILY_SPEND` | `0` | Hard cap — $0 means never spend money |
| `HAB_DAILY_LIMIT` | `100` | Human attention budget per key per day |
| `LIFEOS_DIRECTED_MODE` | `true` | Disables all autonomous AI schedulers |
| `PAUSE_AUTONOMY` | `1` | Secondary kill switch |
| `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER` | `false` | Auto-builder off |
| `OLLAMA_ENDPOINT` | empty on Railway unless set | Explicit URL only — no default `ollama.railway.internal` (avoids boot pings) |
| `COUNCIL_OLLAMA_MODE` | `off` on Railway, else `last_resort` | `off` = never use local Ollama; `last_resort` / `on` = after free cloud caps |

### DB Tables
| Table | Purpose |
|---|---|
| `token_usage_log` | Per-call savings receipt |
| `free_tier_usage` | Provider daily usage tracking |

---

## Build Plan

- [x] **Council routing + failover** *(est: 8h \| actual: 10h)* `[high-risk]`
- [x] **Token compression stack** *(est: 6h \| actual: 8h)* `[needs-review]`
- [x] **Free tier governor** *(est: 4h \| actual: 4h)* `[safe]`
- [x] **Savings ledger DB recording** *(est: 3h \| actual: 4h)* `[safe]`
- [x] **savings_pct fix — was always writing 0** *(est: 1h \| actual: 1h)* `[safe]`
- [x] **TOON enabled for codegen task type** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Free tier buffer reduced 10% → 3%** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **HAB limit 10 → 100** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Ollama spam 30-min cooldown** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **AI guard lazy hash (REALITY_MISMATCH fix)** *(est: 1h \| actual: 0.5h)* `[needs-review]`
- [ ] **→ NEXT: Improve `general` task type savings from 4% → 15%+** *(est: 3h)* `[needs-review]`
- [ ] **Investigate Ollama 7,327 avg tokens/call — likely bloated system prompts** *(est: 2h)* `[safe]`
- [ ] **Persist provider cooldowns to DB (survive restarts)** *(est: 2h)* `[safe]`
- [x] **Move COUNCIL_MEMBERS config fully to config/council-members.js** *(est: 1h \| actual: 1h)* `[safe]`
- [x] **Extract runtime route composition out of server.js** *(est: 1.5h \| actual: 1.5h)* `[safe]`

**Progress:** 12/15 steps complete | Est. remaining: ~7h

---

## Anti-Drift Assertions
```bash
# TOON enabled for codegen — verify in council-service.js
grep "isCritical" services/council-service.js | grep -v "codegen\|code"
# Should NOT see: taskType !== 'codegen'

# savings_pct writes to DB
grep "savings_pct" services/savings-ledger.js | grep "INSERT"

# configureAiGuard does NOT call ensureExpectedRealityHash
grep -A 10 "configureAiGuard" services/ai-guard.js | grep -v "ensureExpected"

# Directed mode is ON
echo $LIFEOS_DIRECTED_MODE  # must be 'true'

# Free tier governor buffer is 97%
grep "0\.97" services/free-tier-governor.js
```

*Automated: `node scripts/verify-project.mjs --project ai_council`*

---

## Decision Log

### Decision: Free providers only, $0 default — 2026-03-13
> **Y-Statement:** In the context of a bootstrapped project with no revenue yet,
> facing real API costs that would drain resources before the product ships,
> we decided to default MAX_DAILY_SPEND=0 and route exclusively to free providers
> to achieve zero burn rate, accepting that some tasks may get lower-quality responses
> from free models vs paid ones.

**Reversibility:** `two-way-door` — can enable paid spend with one env var

### Decision: TOON compression enabled for all task types — 2026-03-27
> **Y-Statement:** In the context of codegen tasks getting only 1.4% savings,
> facing the fact that TOON was explicitly disabled for codegen,
> we decided to enable TOON for all task types (using 'general' fallback for code)
> to achieve consistent compression across all call types, accepting minimal risk
> that TOON might slightly alter code structure (mitigated by 'general' mode).

**Alternatives rejected:**
- *Keep codegen disabled* — left 482 calls/day at 1.4% vs ~20% potential
- *Custom code-specific TOON mode* — over-engineered for now

### Decision: Lazy reality hash — 2026-03-27
> See AMENDMENT_12 Decision Log — same decision, recorded here for AI Council context.
> ai-guard.js must NOT call ensureExpectedRealityHash() at config time.

---

## Why Not Other Approaches
| Approach | Why We Didn't Use It |
|---|---|
| Single AI provider (Anthropic only) | $3/M tokens vs $0 on free tier — unacceptable burn |
| LangChain/LlamaIndex routing | Heavy dependency, less control, more tokens in overhead |
| Base64 prompt compression | Increases size by 33% — net negative |
| AI-based compression (compress with AI) | Spends tokens to save tokens — net loss at small scale |

---

## Test Criteria
- [ ] `/api/v1/chat` uses Groq first (check token_usage_log provider column)
- [ ] When Groq exhausted, falls back to Gemini automatically
- [ ] `savings_pct` > 0 for most calls in token_usage_log
- [ ] Codegen task type shows >10% savings (TOON now enabled)
- [ ] LIFEOS_DIRECTED_MODE=true → no autonomous scheduler fires
- [ ] HAB limit blocks at 100 calls/day per key

---

## Handoff (Fresh AI Context)
**Current blocker:** None — core system is live and working

**Last decision:** TOON enabled for codegen, savings_pct fix deployed, free tier buffer 3%

**Do NOT change:**
- `configureAiGuard()` — must not call `ensureExpectedRealityHash()` inside it
- `persistToDB` in token-optimizer.js — intentionally a no-op (savings-ledger.js owns DB writes)
- Free tier buffer at 3% — was deliberately reduced from 10%

**Read first:** `services/council-service.js`, `services/token-optimizer.js`, `services/free-tier-governor.js`

**Known traps:**
- `persistToDB` in token-optimizer.js looks broken (is a no-op) but is intentional — savings-ledger.js writes to DB
- Ollama spam in logs is suppressed with 30-min cooldown — this is intentional, not a logging bug
- RAILWAY_ENVIRONMENT shows as `production` even in testing — normal Railway behavior

---

## Runbook (Operations)

| Symptom | Likely Cause | Fix |
|---|---|---|
| All calls failing with 503 | Groq + Gemini both exhausted | Check free_tier_usage table; wait for midnight UTC reset |
| savings_pct = 0 in DB | savings-ledger.js not called | Check council-service.js calls ledger.record() |
| Ollama ping / routing on Railway | Implicit Ollama URL or Mac tunnel | Default is `COUNCIL_OLLAMA_MODE=off`; set `COUNCIL_OLLAMA_MODE=last_resort` only when you want Ollama after cloud caps |
| Chat returns 409 REALITY_MISMATCH | ensureExpectedRealityHash called too early | Check ai-guard.js configureAiGuard — lazy init must be preserved |

---

## Decision Debt
- [ ] **Ollama 7,327 avg tokens/call** — system prompts are too large; needs investigation
- [ ] **`general` task type at 4% savings** — phrase table not firing; IR compiler needs tuning
- [ ] **Provider cooldowns lost on restart** — in-memory only; should persist to free_tier_usage table

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-03-30 | Open Source Council startup banner in `core/two-tier-system-init.js` aligned with `COUNCIL_OLLAMA_MODE` + Railway endpoint rules (no longer implies enabling is only `OLLAMA_ENDPOINT`) | Startup logs match council policy | ✅ | pending | pending |
| 2026-03-30 | `COUNCIL_OLLAMA_MODE` (`off` \| `last_resort` \| `on`): Railway default **off** — no Ollama ping, excluded from free-tier cascade; `last_resort` enables Ollama only after other free providers exhausted. Removed implicit `OLLAMA_ENDPOINT` default to `ollama.railway.internal`. | Free cloud APIs first; local Ollama opt-in so Mac tunnel does not slow work | ✅ | ✅ | pending |
| 2026-03-29 | Centralized autonomy runtime defaults in `services/runtime-modes.js`, raised `HAB_DAILY_LIMIT` code default to 100, and made verification respect defaulted safe-mode values instead of requiring every kill-switch env to be explicitly present | Runtime safety semantics had drifted: some code treated missing flags as safe defaults while other checks treated them as unset/misconfigured | ✅ | ✅ | pending |
| 2026-03-29 | Verifier/manifest semantics changed so AI Council now accepts any configured provider key instead of hard-requiring Anthropic | Free-tier-first routing is constitutional here; verification should not fail just because Claude is absent when Groq/Gemini/Cerebras are available | ✅ | ✅ | pending |
| 2026-03-27 | Added `startup/register-runtime-routes.js`, moved route composition out of `server.js`, and switched domain boots to `startup/boot-domains.js` | Reduce server.js drift and keep composition root boundaries real | ✅ | ✅ | pending |
| 2026-03-27 | TOON enabled for codegen, savings_pct fix, buffer 3%, HAB 100 | Token savings optimization | ✅ | ✅ | pending |
| 2026-03-27 | Lazy reality hash in ai-guard.js | Fix REALITY_MISMATCH 409 | ✅ | ✅ | pending |
| 2026-03-13 | Initial council extraction from server.js | server.js refactor | ✅ | n/a | n/a |

---

## Pre-Build Readiness

**Status:** BUILD_READY (token optimization + free-tier routing — core is live)
**Adaptability Score:** 95/100
**Council Persona:** tesla (think 50 years ahead — what's the theoretical ideal AI routing system?)
**Last Updated:** 2026-03-30

### Gate 1 — Implementation Detail
- [x] Token optimizer, free-tier governor, savings ledger all have specific segment descriptions
- [x] DB schema live (token_usage_log, free_tier_usage, savings_ledger)
- [x] All provider API calls abstracted through council-service.js
- [x] TOON, IR compiler, phrase table, delta-context all implemented

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| OpenRouter | 200+ models, good routing | No domain-specific routing, no persona system, no cost enforcement | We route by domain + task type, not just price — right model for right job |
| LiteLLM | Open-source, self-hosted | Complex setup, no business logic, no SSOT governance | We have constitutional governance built into every call — no rogue AI spend |
| PortKey | Good observability, prompt management | SaaS, not self-hosted, no free-tier maximization | We maximize free tier ($0 per 13,950 Groq calls/day) before touching paid |
| Langchain/LangSmith | Mature ecosystem, observability | Heavyweight, opinionated, adds latency | We're 40 lines of JS vs 400 lines of Langchain — faster, no dependencies |
| Anthropic Workbench | Native Claude tooling | Single provider only | We run 12 providers with automatic failover |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Free tier limits tighten (Groq/Gemini) | High | Medium | Multi-provider redundancy built in — if Groq cuts limits we shift to Cerebras |
| New frontier model makes all routing obsolete | Medium | Low | Model-agnostic by design — add new provider in config/council-members.js, zero other changes |
| Anthropic releases native multi-model routing | Medium | Low | Our edge is the Adam-specific personas and domain routing, not just multi-model |
| Token costs drop to near-zero across the board | High | Positive | We benefit — cost enforcement becomes a non-issue, we focus on quality routing |

### Gate 4 — Adaptability Strategy
New models add in 3 lines in `config/council-members.js`. New providers add in 10 lines in `council-service.js`. No other changes. Score: 95/100.
- Tesla test: "What's the theoretical ideal?" — a single line of config that routes any task to the theoretically perfect model. We're 85% there.

### Gate 5 — How We Beat Them
Every other AI router optimizes for cost or latency alone; we optimize for the right answer — routing by task domain, persona, and proven historical performance while spending $0/day on 90% of calls through free-tier stacking.
