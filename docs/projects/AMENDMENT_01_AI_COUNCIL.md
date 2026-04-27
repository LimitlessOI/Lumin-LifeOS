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
| **Last Updated** | 2026-04-27 — **`services/council-model-availability.js`** committed (was untracked, crashing Railway boot). Prior: 2026-04-26 — **future-back consensus artifact** required for gate-change debate; runtime authority from Memory Intelligence may override static model routing. Prior: 2026-04-25 — **`council.builder.code_execute`** → **`groq_llama`** (builder **`execution_only: true`** + `mode: code`, no `model` override). Prior: 2026-04-24 — **`services/savings-ledger.js` `getSavingsReport`:** exposes full monetization columns from rebuilt `tsos_savings_report` view. Prior: **`maxOutputTokens`** in **`council-service.js`**. Prior: explicit **`council.builder.code` / `plan` / `review`**. Prior: **`@ssot`** council-service. Prior: **`POST /gate-change/run-preset`:** server-side debate. |
| **Verification Command** | `node scripts/verify-project.mjs --project ai_council` |
| **Manifest** | `docs/projects/AMENDMENT_01_AI_COUNCIL.manifest.json` |

---

## Mission
Route every AI task to the cheapest capable model. Zero unnecessary spend. Free providers first, paid providers never unless explicitly authorized.

### North Star §2.12 — Technical decisions and debate (constitutional)

**Supreme text:** `docs/SSOT_NORTH_STAR.md` **Article II §2.12**. This amendment **implements** the council side: multi-model evaluation, gate-change debate with opposite-argument rounds, mandatory **future-back** review, and recorded verdicts. **Load-bearing technical decisions** must be run through this layer (plus **best-practice / authoritative research** when facts are not in-repo) **before** implementation is treated as approved. **If consensus fails:** full protocol — not single-model shortcut. **Adam** only for §2.12 human scope (blueprint, infeasibility, prohibitive cost, legal/constitutional). **Construction supervisor / Conductor:** `docs/SSOT_COMPANION.md` **§0.5E** (SSOT re-read + drift vs verifiers every session).

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
- Proposal scoring and model-performance grading for council recommendations

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
services/prompt-translator.js      ← NEW: LCL compression + routing tier logic
services/lifeos-gate-change-proposals.js   ← §2.6 ¶8 proposal persistence (LifeOS route)
routes/lifeos-gate-change-routes.js
db/migrations/20260422_gate_change_proposals.sql
config/council-members.js
config/codebook-v1.js              ← NEW: LCL versioned symbol table (pre-shared key)
config/task-model-routing.js       ← NEW: 30+ task types → cheapest capable model
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
6. LCL instruction alias → replaces 100-500 token instruction blocks with `[CI:xx]` tokens
7. LCL code symbols → replaces common code patterns with 2-4 char symbols
8. History truncation → keep last N turns

**TOON is enabled for ALL task types including codegen** (was previously disabled for codegen — fixed 2026-03-27).

**LCL codebook system block is injected once per model session then KV-cached** — costs 0 tokens after first call.

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

### Council Evaluation Contract
Every non-trivial council answer that is meant to drive code or workflow change must produce a structured proposal payload:
- `problem`
- `recommended_solution`
- `risks`
- `edge_cases`
- `cheaper_or_faster_option`
- `confidence`
- `verification_plan`

That proposal is scored independently from execution quality. The council is responsible for the planning half of the loop, not for declaring its own code successful.

### Council Scoring Rubric
Each proposal should be graded on:
1. `correctness` — did it identify the real problem?
2. `completeness` — did it include the important moving parts and edge cases?
3. `practicality` — can the recommendation actually be implemented in this repo/runtime?
4. `ssot_alignment` — does it fit the owning amendment, env rules, and non-negotiables?
5. `missed_risks` — what material risks did it fail to name before execution?

The council may recommend, but a separate verifier/reviewer must decide whether the final implementation succeeded.

### Runtime routing authority (cross-link: Amendment 39)
Static task routing is a **preference**, not permission. Runtime task authority from the memory system may mark a model `watch` or `blocked` for a task type based on protocol violations, intent drift, skipped verification, or poor historical accuracy. When that happens, runtime authority overrides the static map.

### Gate-change & efficiency proposals (North Star §2.6 ¶8 — operational)

**Problem this solves:** A component may **feel** that the platform is inefficient, or that specific steps **X / Y / Z** “look like” corner-cutting if removed but **might** preserve the same verified results with less cost, latency, or human friction.

**Allowed flow (only this flow for gate changes):**
1. **Raise** — Structured input to the council (or council-builder / multi-model session) stating: current pain, hypothesis labeled **THINK** or **GUESS**, what would be removed or merged, and what **evidence** would falsify the hypothesis.
2. **Debate** — Multiple council roles (see `docs/SSOT_COMPANION.md` §5.1–5.2) argue for and against; explicitly name what honesty, verification, or safety could be lost.
3. **Future-back** — Assume the change shipped and it is now two years later. Record what worked, what broke down, what we wish we had known on day one, and what telemetry would have exposed that sooner.
4. **Decide** — Vote + confidence per this amendment’s evaluation contract; high-risk or constitutional-impact changes require Human Guardian per North Star Article III.
5. **Implement** — If the council approves a **better** way to operate: ship the change, run the agreed **verification_plan**, update **SSOT Change Receipts**, and retain **rollback**.

**Hard rule:** No single agent or job may **unilaterally** remove or bypass honesty, evidence, or verification gates for “efficiency.” Silent shortcut = North Star §2.6 ¶6 violation, not this subsection.

**SSOT ops:** Full protocol text: `docs/SSOT_COMPANION.md` §5.5.

**HTTP (shipped):** Mounted at `/api/v1/lifeos/gate-change` (see `routes/lifeos-gate-change-routes.js`):
- `POST /run-preset` — body: `{ "preset": "maturity" | "program-start", "models"?: [...] }` — **one call:** create row + full **server-side** debate (uses **deploy** `callCouncilMember` keys — preferred for operators/agents; only `x-command-key` required from client)
- `POST /proposals` — body: `title`, `pain_summary`, `hypothesis_label` (`THINK`|`GUESS`), `steps_to_remove` (array or string), optional `proposed_equivalence_metrics`, `created_by`
- `GET /proposals?status=&limit=`
- `GET /proposals/:id`
- `POST /proposals/:id/run-council` — optional body `{ "models": ["gemini_flash","groq_llama","deepseek"] }`; requires status `raised`; executes consensus protocol:
  1) round-1 per model,
  2) if disagreement, opposite-argument round per model,
  3) mandatory future-back analysis in each model output,
  4) persisted `council_rounds_json`, `consensus_reached`, `consensus_summary`, and final `council_verdict`.
- `PATCH /proposals/:id/status` — body `{ "status": "approved"|"rejected"|"implemented" }`; requires prior status `debated`

---

## LifeOS Compression Language (LCL) — Architecture Vision

> **The Core Insight:** If both ends of the conversation already know the key,
> the key never needs to travel. Every message shrinks to just the compressed content.

This is a pre-shared codebook system. The AI council models know the symbol table.
Prompts are written in shorthand. Models decode natively. Nobody outside this system
has our codebook, giving us an efficiency advantage that compounds with every deploy.

### Why This Matters for a Coding System

Cache hits help mature apps (static content, repeated queries). A coding system has
mostly unique prompts — cache hits rarely fire. The only reliable compression for
unique content is making the content itself smaller before it's sent. LCL does this
at the prompt level, not the cache level.

### Three Implementation Phases

**Phase 1 — Codebook in System Prompt (BUILT — `config/codebook-v1.js`)**
- The codebook (INSTRUCTION_IDS + CODE_SYMBOLS) is injected once as a system block
- Provider KV-caches it — costs 0 tokens after first call per model session
- Every subsequent message uses shorthand — model decodes from its cached context
- Estimated savings: 30-50% on typical coding council calls
- Files: `config/codebook-v1.js`, `services/prompt-translator.js`

**Phase 2 — Custom BPE Tokenizer (FUTURE — when budget allows)**
- Train a domain-specific Byte Pair Encoding tokenizer on the LifeOS codebase
- Generic models tokenize `pool.query` as 3 tokens; our tokenizer makes it 1
- `async function` → 1 token instead of 2-3
- Full route patterns → 2-3 tokens instead of 15-20
- Runs at the inference server level — transparent to prompts
- Tool: HuggingFace `tokenizers` library, train on `routes/` + `services/` + `db/migrations/`
- Estimated savings: additional 40-60% on top of Phase 1

**Phase 3 — LoRA Fine-Tuned Model (FUTURE — the competitive moat)**
- Fine-tune Llama 3 or Mistral on LifeOS compressed language
- The codebook is baked into model weights — costs ZERO tokens at inference, forever
- Nobody can replicate this efficiency without our training data + codebook
- A generic competitor sends 2000 tokens for the same task; we send 80
- Target: 10-25x more efficient than generic LLMs
- Tools: Axolotl, LoRA, RunPod (A100) or Lambda Labs when budget allows
- Estimated savings: 85-95% vs current baseline

### Routing Tier Logic (BUILT — `services/prompt-translator.js`)

```
Every prompt → prompt-translator.js
  ├── Compress (all layers above)
  ├── Classify routing tier:
  │     FREE  → groq_llama  (default — all standard coding tasks)
  │     SMART → gemini_flash (prompt > 1500 tokens, needs larger context window)
  │     PAID  → only if HIGH_STAKES keyword + all free providers exhausted
  │                (medical, billing, legal, compliance)
  └── Return compressed prompt + routing recommendation to council-service.js
```

**Paid models are essentially never used.** The only path to a paid call:
1. `MAX_DAILY_SPEND > 0` (it's 0 by default — a hard env var gate)
2. AND all free providers exhausted for the day
3. AND the task contains a HIGH_STAKES keyword

In normal operation: $0 spend, 100% free tier.

### Versioning Rule

`config/codebook-v1.js` is append-only while deployed. Never modify existing entries
after a model has been trained/primed on them — changing a symbol silently breaks
the model's decoding. To change symbols, create `config/codebook-v2.js` and update
the version string. The translator auto-injects the right version.

### Competitive Position

| System | Tokens/coding task | Monthly cost at 10k calls |
|---|---|---|
| GPT-4o | ~2,000 input + 800 output | ~$500 |
| Claude Sonnet | ~2,000 input + 800 output | ~$300 |
| Our system (Phase 1) | ~1,000 input + 400 output (free) | $0 |
| Our system (Phase 2) | ~400 input + 160 output (free) | $0 |
| Our system (Phase 3) | ~80 input + 32 output (self-hosted) | ~$20 infra |

At Phase 3 we are 15-25x cheaper per call and the gap widens with volume.

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
- [x] **LCL codebook-v1 + prompt-translator.js built** *(2026-04-19)* `[safe]`
- [x] **task-model-routing.js — 30+ task types mapped to cheapest capable free model** *(2026-04-19)* `[safe]`
- [x] **Wire prompt-translator.js into council-service.js as Layer 1.5** *(2026-04-19)* `[safe]`
- [ ] **Improve `general` task type savings from 4% → 15%+** *(est: 3h)* `[needs-review]`
- [ ] **Investigate Ollama 7,327 avg tokens/call — likely bloated system prompts** *(est: 2h)* `[safe]`
- [ ] **Persist provider cooldowns to DB (survive restarts)** *(est: 2h)* `[safe]`
- [ ] **Phase 2: Custom BPE tokenizer on LifeOS codebase** *(FUTURE — needs budget)* `[safe]`
- [ ] **Phase 3: LoRA fine-tune Llama/Mistral on LCL language** *(FUTURE — needs A100)* `[safe]`
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
**Last updated:** 2026-04-24

**Current state (VERIFIED):**
- 15,374+ AI calls in production; $56.16 cost avoided (KNOW — verified via Railway API)
- `services/savings-ledger.js` `getSavingsReport` updated — now returns full monetization proof: `baseline_cost_usd`, `actual_cost_usd`, `total_saved_usd`, `savings_pct`, per-mechanism breakdown. View rebuilt via `db/migrations/20260424_tsos_monetization_view.sql`.
- `services/council-service.js` — `callCouncilMember` accepts `options.maxOutputTokens` (clamped to 128k) to override per-taskType default (codegen default remains 1500 when unset)
- LCL codebook v1 live: `config/codebook-v1.js` + `services/prompt-translator.js` — translator is built but NOT YET wired into `council-service.js`
- ⚠️ builder `POST /build` reports `github_token: false` from `/ready` endpoint — THINK: deploy drift or wrong base URL; `GITHUB_TOKEN` is ✅ SET in Railway vault per ENV_REGISTRY.md deploy inventory + operator screenshots. Diagnose: confirm `PUBLIC_BASE_URL` points at production, redeploy if behind main, check env scope. Do NOT ask Adam to add it again.

**⚠️ INCOMPLETE: prompt-translator.js not yet wired into council-service.js**
When this is done:
- Import `createPromptTranslator` at the top
- Create one instance: `const translator = createPromptTranslator({ logger })`
- In the main call path (before `callCouncilMember` fires): call `translator.prepareCall(systemPrompt, userPrompt, memberKey)`
- Use returned `systemPrompt` and `userPrompt` for the actual API call; log `stats.totalSaved` to savings ledger

**NEXT PRIORITY TASKS:**
1. Diagnose why `/ready` reports `github_token: false` — confirm `PUBLIC_BASE_URL` → production, redeploy if behind, check env scope. Token IS in vault (KNOW).
2. Wire `prompt-translator.js` into `council-service.js` (described above)
3. Log conductor sessions at cold-start — POST /api/v1/tsos/savings/session with compact_tokens=1038, full_tokens=26105

**Do NOT change:**
- `configureAiGuard()` — must not call `ensureExpectedRealityHash()` inside it
- `persistToDB` in token-optimizer.js — intentionally a no-op (savings-ledger.js owns DB writes)
- Free tier buffer at 3% — was deliberately reduced from 10%
- `config/codebook-v1.js` entries — append-only while v1 is deployed. Create v2 for breaking changes.

**Read first:** `services/council-service.js` (Layer 1.5 at ~line 1060), `services/prompt-translator.js`, `config/codebook-v1.js`

**LCL layer is live.** It fires after Layer 1 (noise_phrase), before Layer 2 (TOON). It applies CODE_SYMBOLS then prepends a tiny inline key listing only the symbols that actually fired in that specific prompt. Works with all free stateless providers — no KV cache required. Savings tracked in `compressionLayers.lcl_codebook` and rolled into `totalSavedInputTokens`.

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

## Decision Log (continued)

### Decision: LCL Pre-shared Codebook — 2026-04-19
> **Y-Statement:** In the context of a coding system where most AI calls are unique
> (cache hits rare), facing the fact that caching alone cannot achieve 50-70% savings,
> we decided to build a pre-shared compression language (LCL) where both sender and
> model know the symbol table — so the key never travels, and every unique prompt is
> compressed before it's sent.
>
> Phase 1: codebook in KV-cached system block.
> Phase 2 (future): custom BPE tokenizer.
> Phase 3 (future): LoRA fine-tune where codebook is baked into weights — 0 key tokens, forever.
>
> **Competitive moat:** nobody else has our codebook + fine-tuned model combination.
> At Phase 3, we are 15-25x cheaper per call than GPT-4o or Claude Sonnet.

**Reversibility:** `two-way-door` — translator is a pass-through, can be disabled per call with `critical: true`

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-04-27 | **`services/council-model-availability.js`** (new): `filterAvailableCouncilMembers(memberKeys)` filters council model keys by whether their provider API key is present in `process.env`. `getCouncilMemberAvailability(memberKey)` returns `{ available, reason }` per model. Used by builder routing to exclude un-configured models at runtime. GAP-FILL: file existed locally but was never committed — Railway boot crashed with ERR_MODULE_NOT_FOUND. | File untracked from prior session; builder runs on Railway which was crashing on boot, so builder couldn't fix itself. | ✅ | n/a | `node --check` |
| 2026-04-26 | **`config/council-members.js`:** Added `claude_via_openrouter` member (provider: openrouter, model: `anthropic/claude-sonnet-4-5`, maxTokens: 16000, tier1). Added `claude_sonnet` member as placeholder for when ANTHROPIC_API_KEY is added to Railway. Updated `COUNCIL_ALIAS_MAP`: `claude`+`anthropic` → `claude_via_openrouter` (bridge). **`config/task-model-routing.js`:** All `council.builder.*` code/review/debate tasks → `claude_via_openrouter`. **`services/council-service.js`:** Added Anthropic Messages API fetch handler (x-api-key, anthropic-version, system field, content[0].text). | ANTHROPIC_API_KEY is NOT in Railway vault (only USE_CLAUDE=false). OPENROUTER_API_KEY IS set. claude_via_openrouter uses the existing openrouter/OpenAI-compatible path — no new handler needed. Session summary claimed ANTHROPIC_API_KEY confirmed — that was incorrect. OpenRouter bridge is the correct fix. | ✅ | manifest | `node --check` all files |
| 2026-04-26 | **`config/council-members.js`:** Added `claude_sonnet` council member (provider: anthropic, model: claude-sonnet-4-6, maxTokens: 16000, tier1). Updated `COUNCIL_ALIAS_MAP`: `claude` + `anthropic` now route to `claude_sonnet` (was `groq_llama`). **`config/task-model-routing.js`:** `council.builder.code`, `council.builder.code_execute`, `council.builder.task`, `council.builder.review`, `council.builder.code_review`, and `council.gate_change.debate` now route to `claude_sonnet`. **`services/council-service.js`:** Added full Anthropic Messages API fetch handler (provider=anthropic: `x-api-key` header, `anthropic-version: 2023-06-01`, `system` field, `content[0].text` response, token tracking, savings ledger, cost tracking). | Builder council was using Gemini Flash for all code generation — Gemini Flash produces CJS `require()` in ESM projects, truncates files, and loses task context. `ANTHROPIC_API_KEY` confirmed set on Railway (101-key vault). Real Claude Sonnet is the fix. | ✅ | n/a | `node --check` all 3 files |
| 2026-04-25 | **`config/task-model-routing.js`:** **`council.builder.code_execute`** → **`groq_llama`** — used when builder **`mode: code`** + **`execution_only: true`** and no body **`model`** (frozen-spec literal codegen). Tier guide updated. **`prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md`** documents think vs execute. | Adam: stronger models for thinking; fast/cheap model for executing an already-thought-out spec — Conductor must not use execute tier on ambiguous scope. | ✅ | n/a | `node --check config/task-model-routing.js` |
| 2026-04-24 | **`services/savings-ledger.js` `getSavingsReport`:** updated to map all columns from rebuilt `tsos_savings_report` view — `baseline_cost_usd`, `actual_cost_usd`, `total_saved_usd`, `savings_pct`, `saved_by_free_routing_usd`, `saved_by_compression_usd`, `saved_by_cache_usd`, `saved_by_compact_rules_usd`. API summary now shows `BASELINE $X → ACTUAL $Y → SAVED $Z (N%)`. | Savings were hidden — no baseline or overall % meant Adam couldn't document or bill for savings. | ✅ | n/a | `node --check services/savings-ledger.js` |
| 2026-04-25 | **`services/council-service.js`:** `callCouncilMember(..., options)` may set **`maxOutputTokens`** (positive number, clamped to 128000). When set, it replaces the per-`taskType` `scopedMaxTokens` for OpenAI-compatible, Gemini, and DeepSeek paths. Default **`codegen` remains 1500** when unset — council builder passes a higher budget for `files[]`-backed full-file codegen. | Builder HTML was “successfully” generated but capped at ~1500 completion tokens, producing tiny stubs; callers that need long outputs must opt into a higher ceiling explicitly. | ✅ | n/a | `node --check services/council-service.js` |
| 2026-04-25 | **`config/task-model-routing.js`:** added explicit **`council.builder.code`**, **`council.builder.plan`**, **`council.builder.review`** (keep legacy `council.builder.task`). Builder dispatch uses `council.builder.${mode}` — entries now resolve from map instead of only `DEFAULT_MODEL`. | Clear routing for §2.11 `/builder/task` + `/build`; enables future per-mode model tuning. | ✅ | n/a | `node --check config/task-model-routing.js` |
| 2026-04-22 | **`@ssot` JSDoc** added at top of `services/council-service.js` (imports follow block comment). | Pre-commit / `ssot-check` alignment; council is load-bearing; file previously had no top-level tag. | ✅ | n/a | `node --check services/council-service.js` |
| 2026-04-22 | **`POST /gate-change/run-preset` + `lifeos-gate-change-council-run.js` + `config/gate-change-presets.js`:** server-side create+debate in one call (uses deploy provider keys; CLI preset uses this). Route refactor; `scripts/council-gate-change-run.mjs` uses run-preset for `--preset`. Companion §5.5 HTTP. | Adam: use **system** as tool — not laptop keys for council. | ✅ | `node --check` on new modules |
| 2026-04-22 | **North Star §2.12 + Companion §0.5E + contract/QUICK_LAUNCH/CLAUDE cross-links:** Constitutional **technical decision law** (council + research + consensus/deadlock); **Conductor/Construction supervisor** mandatory **SSOT re-read** and **drift detection**; §2.12 **non-derogable** (Article VII only). | Adam: technical forks and supervision must not drift silently; single-model or “chat consensus” cannot override. | ✅ | pending | pending |
| 2026-04-19 | **Consensus protocol upgrade for gate-change debate:** `routes/lifeos-gate-change-routes.js` now runs multi-model panel (`gemini_flash`,`groq_llama`,`deepseek` default), then forces an opposite-argument round when round-1 is not unanimous. Final verdict is computed from round-2 votes; debate trace is stored in `council_rounds_json` + `consensus_reached` + `consensus_summary` (`db/migrations/20260422_gate_change_proposals.sql`, `services/lifeos-gate-change-proposals.js`, prompt update). | Adam required full protocol behavior: disagreement must trigger opposite-side argument before final council disposition. | ✅ | pending | pending |
| 2026-04-19 | **§2.6 ¶8 runtime — gate-change API:** `db/migrations/20260422_gate_change_proposals.sql` (`gate_change_proposals`); `services/lifeos-gate-change-proposals.js`; `routes/lifeos-gate-change-routes.js` at `/api/v1/lifeos/gate-change` (POST/GET proposals, POST run-council, PATCH status); `startup/register-runtime-routes.js` mount; `config/task-model-routing.js` key `council.gate_change.debate`; `prompts/lifeos-gate-change-proposal.md`; `scripts/lifeos-verify.mjs` + Amendment 21 manifest owned_files; Companion §5.5 HTTP paragraph. | Adam: implement “raise to council” without removing safety nets — user-triggered council pass + audit rows. | ✅ | pending | pending |
| 2026-04-19 | **North Star §2.6 ¶8 + Companion §5.5 — Gate-change & efficiency proposals:** New subsection under *Council Evaluation Contract*: any “feels inefficient / could remove X,Y,Z” hypothesis must be **THINK|GUESS**, go through **multi-agent council debate** (steel-man risk, equivalence metrics, rollback), then implement + SSOT receipts — **never** unilateral gate removal. Cross-links `docs/SSOT_NORTH_STAR.md` ¶8, `docs/SSOT_COMPANION.md` §5.5; `prompts/00` + Amendment 21 one-liner. | Adam: system should be able to **report** inefficiency and suspected optimizations to the **AI Council** for debate and **approved** implementation — the lawful alternative to silent corner-cutting. | ✅ | pending | pending |
| 2026-04-19 | **LCL hardening + domain overlays:** `services/council-service.js` now imports `CODE_SYMBOLS` statically (removes hot-path dynamic import); Ollama responses run `lclMonitor.inspect` like Groq/Gemini; `translate()` accepts optional `domain` for `config/codebook-domains.js` overlays; `kingsmanAudit()` fires at council entry (see Amendment 33 + `kingsman_audit_log` migration). | Removes async import cost on every call; closes Ollama blind spot in drift telemetry; optional domain compression for LifeOS/TC/ClientCare prompts. | ✅ | pending | pending |
| 2026-04-19 | Built `config/codebook-v1.js` (LCL versioned symbol table: 10 instruction aliases + 30+ code symbols) and `services/prompt-translator.js` (full compression stack + routing tier logic). Phase 1 of LCL vision complete. Next: wire translator into council-service.js pre-send. | Unique coding calls can't be cached — need per-prompt compression. Pre-shared codebook means the key costs 0 tokens after first session injection. | ✅ | pending | pending |
| 2026-04-19 | Built `config/task-model-routing.js` (30+ task type → model mappings), `routes/lifeos-council-builder-routes.js` (5 council builder endpoints), and 7 domain prompt files in `prompts/`. | Agent continuity architecture — any cold agent reads domain file and continues in 30 seconds without asking Adam for context. | ✅ | pending | pending |
| 2026-04-01 | Added the formal council evaluation contract and scoring rubric so proposal quality is recorded separately from implementation/debug quality | Self-programming needs planner quality evidence, not just whether code eventually passed | ✅ | pending | pending |
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
