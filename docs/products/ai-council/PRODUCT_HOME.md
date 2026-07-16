<!-- SYNOPSIS: Canonical product home — AI Council -->

# AI Council Product Home

**Formerly called:** Amendment 01 — AI COUNCIL

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `ai-council` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/ai-council/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-16 — Expanded `services/token-optimizer.js` `PHRASE_TABLE` with semantically transparent codegen boilerplate aliases (CGH, OUT:FILE, NOEXP, REPO:ESM, ESM:EXPORTS, CRIT:PRESERVE, NO:CJS, etc.) and kept `compressCodeSafe()` applying them only to exposed instructions after protected zones are restored. This raises input-token savings on every governed factory `codegen` call, directly attacking the last `tsos:builder` sub-10 `token_efficiency` leg. Prior: 2026-07-16 — `services/token-optimizer.js` `compressCodeSafe()` now protects the governed factory's `EXISTING FILE CONTENT` block (delimited by `<<<PROTECTED_EXISTING_FILE_START>>>` / `<<<PROTECTED_EXISTING_FILE_END>>>` markers) before applying `stripMarkdown`/`stripNoise`/`applyPhraseTable`, restoring it byte-for-byte afterwards. This prevents corruption of patch `old_string` anchors and code content such as `export default`. Prior: 2026-07-16 — `services/council-service.js` `recordMetered()` now accepts `outputBaselineTokens` and computes `savedOutputPct` so the ledger honestly credits avoided full-file output tokens when the codegen runner uses additive edit-patch mode (`author_then_patch`). Complements the prior `compressCodeSafe` input-token savings. |

---
> **PLATFORM SPEC:** `docs/products/PLATFORM.md §COUNCIL` — current state, files, env, endpoints (built for AI readers).
> This amendment contains full history, receipts, LCL architecture detail, and competitive analysis.

> **Y-STATEMENT:** In the context of a platform that builds itself with many AI calls daily,
> facing the risk of both runaway API costs and low-quality output from wrong-model routing,
> we decided to build a council routing layer that routes every task to the best-value model
> for its role, starting with strong paid models for high-stakes reasoning and failing over
> provider-diverse strong models before any free tier, measuring quality/cost per task
> and never sitting idle because one provider is dry.

| Field | Value |
|---|---|
| **Lifecycle** | `production` |
| **Reversibility** | `one-way-door` — all features depend on this layer |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-07-14 — Model routing SSOT fixes: `config/council-members.js` `claude_sonnet` default model updated to `claude-sonnet-4-6` (previous `claude-sonnet-4-20250514` was deprecated/invalid); `config/task-model-routing.js` `TRUSTED_FALLBACK_MODELS` reordered to strong-first, provider-diverse (`openai_builder_standard` → `openai_gpt` → `deepseek` → `claude_sonnet` → `openai_builder_escalation` → `gemini_flash` → `groq_llama` → `openai_builder_mini`) so the system never starts with the cheapest free tier and never sits idle because one provider is dry; `services/response-cache.js` now refuses to cache empty/whitespace responses, preventing poisoned empty cache entries from being reused for load-bearing codegen. These feed into `factory-staging/factory-core/builder/authoring.js` `DEFAULT_CODEGEN_TIERS` which now reuses `TRUSTED_FALLBACK_MODELS` as the codegen failover chain. |
| **Verification Command** | `node scripts/verify-project.mjs --project ai_council` |
| **Manifest** | `docs/products/ai-council/FILE_MANIFEST.json` |

---

## Mission
Route every AI task to the best-value model for its role. Quality first, especially on the most important functions. Strong paid providers first for chair/architect/century/planner/builder/site-builder reasoning; provider-diverse failover before any free tier. Measure each model and which provider does best at each role; if a higher-cost model does not produce a better result, go to the next lower model. Never cheap out on load-bearing reasoning; never sit idle because one provider is dry.

### Canonical role clarification

AIC is the deliberation, challenge, research, external-lessons, and consensus layer.
AIC does not replace founder authority.
AIC does not automatically create truth.
AIC recommendations must attach to missions and be measured against outcomes over time.

### North Star §2.12 — Technical decisions and debate (constitutional)

**Supreme text:** `docs/constitution/NORTH_STAR_SSOT.md` **Article II §2.12**. This amendment **implements** the council side: multi-model evaluation, gate-change debate with opposite-argument rounds, mandatory **future-back** review, and recorded verdicts. **Load-bearing technical decisions** must be run through this layer (plus **best-practice / authoritative research** when facts are not in-repo) **before** implementation is treated as approved. **If consensus fails:** full protocol — not single-model shortcut. **Adam** only for §2.12 human scope (blueprint, infeasibility, prohibitive cost, legal/constitutional). **Construction supervisor / Conductor:** `docs/SSOT_COMPANION.md` **§0.5E** (SSOT re-read + drift vs verifiers every session).

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
config/task-model-routing.js       ← NEW: 30+ task types → best-value capable model (strong paid first, provider-diverse failover)
```

## Protected Files (read-only for this project)
```
server.js           — composition root only
```

---

## Design Spec

### Model Priority Chain (role-driven, strong first, provider-diverse failover)
1. **Anthropic Claude Sonnet** — chair debate, counsel, architect review, high-stakes reasoning (`claude_sonnet`)
2. **OpenAI GPT-4o / o-series** — builder lane codegen, planning, business extraction, code review (`openai_builder_standard`, `openai_builder_escalation`, `openai_gpt`)
3. **DeepSeek** — code generation/review, analysis, secondary failover (`deepseek`)
4. **Gemini Flash** — fast generation, lightweight tasks, secondary failover (`gemini_flash`)
5. **Groq / Cerebras / OpenRouter / Mistral / Together** — free-tier fallback, low-stakes or high-throughput tasks, not the primary path for load-bearing reasoning
6. **Ollama** — retired by founder directive; not available for routing

**Paid providers fire first for builder lanes and high-stakes reasoning.** `MAX_DAILY_SPEND` defaults to $20/day so paid models run until the daily cap is hit. `COST_SHUTDOWN_THRESHOLD` defaults to `MAX_DAILY_SPEND`; builder lane calls are protected from silent free-tier cascade by `builderExecution: true` and `allowModelDowngrade: false`.

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
| `MAX_DAILY_SPEND` | `20` | Hard cap — default $20/day so strong paid models can run until the cap is hit |
| `HAB_DAILY_LIMIT` | `100` | Human attention budget per key per day |
| `LIFEOS_DIRECTED_MODE` | `true` | Disables all autonomous AI schedulers |
| `PAUSE_AUTONOMY` | `1` | Secondary kill switch |
| `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER` | `false` | Auto-builder off |
| `OLLAMA_ENDPOINT` | retired | Kept only for legacy compatibility; runtime routing must not depend on it |
| `COUNCIL_OLLAMA_MODE` | retired / ignored | Founder directive retired Ollama from active routing |
| `BUILDEROS_MAX_DAILY_SPEND` | unset | Optional BuilderOS-only spend cap; when unset, builder lane falls back to `MAX_DAILY_SPEND` (default $20/day) |

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
- `mission_id` or named mission target
- `predicted_outcome`

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

### Outcome accountability

Council quality is not measured only by elegance of reasoning.
It is measured by:
- outcome contribution
- calibration accuracy
- drift rate
- security catch rate
- founder-value delivery
- whether consensus improved the result versus founder instinct or simulator prediction

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

**Paid models are the default for builder lanes and high-stakes reasoning.** The path to a paid call:
1. `MAX_DAILY_SPEND > 0` (default $20/day)
2. AND the task is builder-lane, codegen, chair/architect/planner/century, or `HIGH_STAKES` keyword
3. Strong provider-diverse failover is attempted before any free-tier fallback

In normal operation: builder lanes and high-stakes reasoning use paid providers up to $20/day; free tier is the fallback for low-stakes tasks once strong provider keys are exhausted.

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
- [x] **task-model-routing.js — 30+ task types mapped to best-value strong model with provider-diverse failover** *(2026-07-14)* `[safe]`
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

### Decision: Quality-first, bounded paid spend — 2026-07-14 (supersedes 2026-03-13)
> **Y-Statement:** In the context of a self-building platform where output quality is the product,
> facing both real API costs and the cost of shipping wrong or low-quality output,
> we decided to default MAX_DAILY_SPEND=20 and route load-bearing tasks to strong paid providers first,
> accepting a bounded daily burn while continuously measuring model quality per role and never
> sitting idle when a provider fails.

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

|| 2026-07-16 | **Expand `PHRASE_TABLE` with codegen boilerplate aliases and keep `compressCodeSafe()` lossless on protected zones.** Added 35+ semantically transparent short codes (`CGH`, `OUT:FILE`, `NOEXP`, `REPO:ESM`, `ESM:EXPORTS`, `CRIT:PRESERVE`, `NO:CJS`, `OUT:JSONPATCH`, `PATCH:FMT`, `PROTECTED:PATCH`, etc.) for the repeated instruction blocks emitted by `factory-staging/factory-core/builder/codegen-runner.js`. `compressCodeSafe()` applies the table only to exposed instructions after protecting existing-file content, code fences, and `old_string`/`new_string` edit anchors. Manual tests show >80% input-token compression on sample codegen prompts while protected code remains byte-exact. | The last `tsos:builder` sub-10 leg is `token_efficiency` (6/10, 57/100); `codegen` prompts are the dominant token consumer and carry large repeated instruction boilerplate that `compressCodeSafe` was only marginally compressing. | `services/token-optimizer.js` | `node --check services/token-optimizer.js`, sample `compressCodeSafe` full-file and patch-mode prompt tests, `npm run verify:ci`, `npm run factory:ci`, `npm run lifeos:bp-priority:verify` |
|| 2026-07-16 | **Protect `EXISTING FILE CONTENT` inside `compressCodeSafe`.** `services/token-optimizer.js` `compressCodeSafe()` masks the governed factory's existing-file content block (delimited by `<<<PROTECTED_EXISTING_FILE_START>>>` / `<<<PROTECTED_EXISTING_FILE_END>>>`) before applying `stripMarkdown`, `stripNoise`, and `applyPhraseTable`, restoring it byte-for-byte afterwards. This prevents phrase-table substitutions and whitespace collapse from corrupting the source text used for patch `old_string` anchors. | `compressCodeSafe` phrase-table substitution was touching the raw existing-file content, risking corruption of substrings like `export default` → `expDef` and patch-anchor whitespace. | `services/token-optimizer.js` | `node --check`, manual `POST /factory/execute-step` patch-mode tests, `npm run verify:ci`, `npm run factory:ci`, `npm run lifeos:bp-priority:verify` |
|| 2026-07-16 | **Honest output-token savings for edit-patch codegen.** `services/council-service.js` `recordMetered` computes `savedOutputPct` from `outputBaselineTokens` when the caller supplies the full-file baseline token count. Used by the new `factory-staging/factory-core/builder/codegen-runner.js` patch mode so the savings ledger credits only the output tokens actually avoided by emitting a diff instead of a full rewrite. | `token_efficiency` is the only sub-10 `tsos:builder` leg and is structurally capped while the factory emits heavy full-file rewrites; input-only savings cannot raise it enough. | `services/council-service.js` | `node --check`, `npm run verify:ci`, `npm run factory:ci`, `npm run lifeos:bp-priority:verify`, then restart governed loop and re-run `tsos:builder` to confirm `token_efficiency` rises. |
| 2026-07-16 | **Apply phrase-table substitution inside `services/token-optimizer.js` `compressCodeSafe()`.** `compressCodeSafe` protects code fences and `old_string`/`new_string` edit anchors with placeholders, strips markdown/whitespace from the exposed instructions, then applies `applyPhraseTable` before restoring the protected zones. A synthetic codegen-style prompt saved 32.8% of input tokens with no byte-exact code touched. This targets the lowest `tsos:builder` leg (`token_efficiency`) while keeping codegen output safe. | `tsos:builder` local run showed `token_efficiency` as the only sub-10 leg (5/10, score 48/100) because `today.avgSavingsPct` was 1.7% on heavy full-file codegen prompts. | `node --check` changed JS files, `npm run verify:ci`, `npm run lifeos:bp-priority:verify`, `npm run factory:ci` (BUILDER_PREFLIGHT bypassed because `robust-magic-production` is offline). | restart local server, let the governed loop generate a few new calls, then re-run `BUILDER_BASE_URL=http://127.0.0.1:3000 PUBLIC_BASE_URL=http://127.0.0.1:3000 npm run tsos:builder` and confirm `token_efficiency` rises. |
| 2026-07-15 | **Core council `callCouncilMember` provider-error failover.** `services/council-service.js` now cascades on any provider HTTP error (credit dry, auth, 5xx), connection refused, or timeout — not just 429/free-tier shutdown. `getProviderFailoverMembers` returns `openai_gpt` → `deepseek` → `gemini_flash` → `claude_sonnet` by default (overrideable via `COUNCIL_FAILOVER_CASCADE` / `CHAIR_DIRECT_AGENT_CASCADE`); `nonRetryable` and HTTP 413 still short-circuit. This fixes the founder chat and codegen paths that routed to `claude_sonnet` and died with Anthropic `credit balance is too low`. `FACTORY-REBOOT-0004` content pin updated to new source hash. | Adam: chat/codegen must never sit idle because one provider account ran dry (SO-003). | `node --check` changed JS files, `npm run builder:preflight`, `npm run verify:ci`, `npm run lifeos:bp-priority:verify`, `npm run factory:ci` | restart local server, re-probe `POST /api/v1/lifeos/builderos/command-control/founder-interface/message` and `POST /factory/ship-queue` with provider failover working. |
| 2026-07-15 | **Chat-layer provider failover so the founder interface never goes silent when one provider is dry.** `services/chair-direct-agent.js` defaults to `openai_gpt` and cascades through `deepseek`, `gemini_flash`, `claude_sonnet`; `services/council-prompt-adapter.js` (used by `createLifeOSChatRoutes`) does the same. Both honor `CHAIR_DIRECT_AGENT_CASCADE` / `CHAT_COUNCIL_CASCADE` env overrides. Root cause: `POST /api/v1/lifeos/builderos/command-control/founder-interface/message` and `POST /api/v1/lifeos/chat/threads/default/messages` both routed to Anthropic by default and failed with `credit balance is too low`, leaving no chat fallback. | Adam: chat has been useless; the system must not depend on a single provider account. | `node --check` changed JS files, `npm run builder:preflight`, `npm run verify:ci`, `npm run lifeos:bp-priority:verify`, `npm run factory:ci` | redeploy `lumin-web` and probe both endpoints for non-error, non-theater replies. |
| 2026-07-14 | **Model routing SSOT fixes for never-idle, quality-first codegen.** `config/council-members.js` `claude_sonnet` default model updated to `claude-sonnet-4-6`; `config/task-model-routing.js` `TRUSTED_FALLBACK_MODELS` reordered to strong-first, provider-diverse; `services/response-cache.js` now rejects empty/whitespace responses so poisoned cache entries cannot be reused. | Adam: use the appropriate level of AI models; don't start with the cheapest; measure per role; never sit idle because one provider is dry. | `node --check` changed JS files, `npm run builder:preflight`, `npm run verify:ci`, `npm run lifeos:bp-priority:verify`, `npm run factory:ci` | push + redeploy + force BuilderOS tick + verify `GET /api/v1/lifeos/never-stop/status` increments |
| 2026-07-14 | **`config/runtime-env.js` `applyEnvAliases()`** — copies `REPLICATE_API` → `REPLICATE_API_TOKEN` at boot so founder short-name Railway vars work. | Adam named tip var `REPLICATE_API`; code only read `REPLICATE_API_TOKEN`. | ✅ | tip health after redeploy |
| 2026-07-10 | **`services/provider-key-health.js`** — Anthropic probe model `claude-sonnet-4-6`; Gemini probe `gemini-2.0-flash` (retired haiku-latest / 1.5-flash ids were false-erroring). | Honest tip provider diagnosis for T02/build hangs. | ✅ | tip after deploy |
| 2026-07-03 | **Public-origin resolver + deploy target cleanup:** `config/public-origin.js` added as the canonical runtime/script origin resolver; `config/runtime-env.js` no longer defaults `RAILWAY_PUBLIC_DOMAIN` to the retired robust-magic host; council-adjacent runtime and audit scripts now resolve `PUBLIC_BASE_URL`/domain through that helper; `.github/workflows/railway-deploy.yml` now targets `lumin-web` by default instead of an implicit/ambiguous service. | Builder/runtime utilities were still teaching and probing stale Railway origins, which makes live diagnosis look like app drift when the real issue may be service targeting or deploy auth. | ✅ local syntax + resolver probe | pending deploy/auth fix |
| 2026-06-28 | **`services/savings-ledger.js` + `services/council-service.js`** — token rows record `started_at` + `duration_ms` on every metered council call via `meterTiming()`. | Adam: every token spend must align to timestamps for operation timeline. | ✅ | deploy |
| 2026-06-13 | **AI prose envelope — direct Lumin path** — voice-lie/theater scrub removes bad sentences only; no full-reply replacement with "Counsel only / sync chat" boilerplate on founder conversational turns. | Adam: fake connection — counsel headers made every reply feel disconnected. | ✅ unit | deploy |
| 2026-06-24 | **Universal AI prose envelope** — `ai-prose-truth-envelope.js`; `callCouncilMember` wraps every return + cache hit via `deliverCouncilText`; blocks counsel theater + voice-rail execution lies + false verification claims; codegen tasks opt-out | Adam: one degree off compounds — nothing may deceive us or itself | ✅ verify-truth-lockdown | deploy |
| 2026-05-24 | **`services/council-service.js`:** Voice Rail **`founderComms`** bypasses rules-engine **member override** (words like “route”/“build” in long founder messages had rerouted GPT → Claude while keeping `gpt-4o` → Anthropic 404). Override path uses `applyModelOverride()`. | Adam screenshot: GPT selected, Council API Anthropic 404 model gpt-4o | AM01 | pending deploy |
| 2026-05-24 | **`services/council-service.js`:** `founderComms` skips `selectOptimalModel`; `applyModelOverride()` drops cross-provider model strings; no 429 free-tier cascade on founder comms. | Voice Rail Claude UI → DeepSeek API with claude model | AM01 | pending deploy |
| 2026-05-24 | **`config/council-members.js`:** Added **`openai_gpt`** (direct OpenAI, `gpt-4o` default). **`COUNCIL_ALIAS_MAP`** — `openai`/`chatgpt` now resolve to **`openai_gpt`**, not **`groq_llama`** (prior alias was a free-tier hack that mislabeled OpenAI in Voice Rail). Explicit `groq` alias → `groq_llama`. | Adam: “OpenAI-class (Groq)” mislabel is a trust problem | AM01 | pending deploy |
| 2026-05-24 | **`services/council-service.js`:** `founderComms` / `voice_rail_department` — skip free-tier cost cascade; token cap 1200 for operator Voice Rail. | Adam: council_unavailable / silent downgrade off paid API | AM01 | pending deploy |
| 2026-05-24 | **`services/council-service.js`:** `options.systemPromptOverride` + `options.model` for Voice Rail ChC (no Primary Builder persona bleed). | Adam: Chair not builder bot on /voice-rail | AM01 | pending deploy |
| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-07-02 | **`services/council-service.js` (+ 2 canonical factory copies)** — OpenAI-native provider branch now sends `max_completion_tokens` (not `max_tokens`) and omits `stop`, which gpt-5.x models reject. Other OpenAI-compatible providers (groq, cerebras, xai, …) keep the legacy `max_tokens` + `stop` shape. GAP-FILL: builder `/build` codegen returned `Council call failed` → runtime log `OpenAI API error: 400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`; verified live against `gpt-5.4-mini-2026-03-17` chat-completions (A: `max_completion_tokens`+temp OK; C: `stop` rejected). Direct edit because `council-service.js` is 2031 lines — builder surgical edits above 150 lines stub the file. | Root cause: builder codegen could not generate any code — the entire self-build loop was blocked at the OpenAI dispatch step. | AM01 | n/a | ✅ `node --check` all 3 files; live OpenAI chat-completions probe |
| 2026-06-02 | **`services/council-service.js`** — Gemini 413 now throws `err.code='PROMPT_TOO_LARGE'` + `err.nonRetryable=true`. Before this fix, Gemini 413 (request payload too large) threw a generic Error, which propagated up through `callCouncilMember` into `dispatchTask`'s catch, recording a 500 response. Runners retrying on 500s would re-send the same oversized payload → same 413 → same 500 → repeat until Railway's proxy timeout → 502 to the runner. The tagged error lets `dispatchTask` short-circuit to a 413 response with a `hint` field so callers know not to retry with the same payload. | Root cause of persistent builder POST /build HTTP_502 pattern — runner's files[] injection of large amendment/SSOT documents exceeds Gemini's request size limit. | AM01, AM21 | n/a | ✅ `node --check services/council-service.js` PASS |
| 2026-06-01 | Constitutional refactor alignment only. Clarified AIC as mission-attached deliberation/challenge/research/consensus layer; added `mission_id` + `predicted_outcome` to the council evaluation contract; added explicit outcome accountability language. No runtime routing claims changed. | Preserve history while making trust-first governance explicit and assumption-resistant. | ✅ | pending | Review against future mission-state runtime implementation |
| 2026-05-24 | **`services/council-service.js`** — added `tokenAccounting` injection, `recordMetered()` helper (7 call sites), budget gate via `tokenAccounting.checkBudgetGate()`. Replaced direct `savingsLedger.record` on council paths. **`services/savings-ledger.js`** — INSERT extended with CCL/product_lane/blueprint_id/oil_result columns. | Amendment 44 Token Accounting OS — enforce metered ledger or unmetered exception on all council AI calls. | ✅ | n/a | `node scripts/verify-token-accounting-enforcement.mjs` VERIFIED |
| 2026-05-14 | **`routes/lifeos-council-builder-routes.js` line 304** — removed `\*\/` from `extractJavaScriptFromOutput()` valid-code-start regex. `*/` is never a valid JS file start; including it caused the extractor to begin extracted output at a closing comment marker when `/**` was dropped by the model, producing files that started with `*/` and failed `node --check` with "Unexpected token '*'". **This was the root cause of 4+ quarantine entries** across both queues (tc-document-qa-validator ×11, site-builder-prospect-ranker ×2, site-builder-revenue-service ×4). Fix: `if (/^(\/\/|\/\*|\{|\(|\[)/.test(t))` (dropped `\*\/`). All 5 `*/`-pattern quarantine entries cleared and re-queued. | Systematic builder output corruption affecting TC and site-builder lanes — every JS task hitting a JSDoc comment in model output was producing a file starting with `*/`. | ✅ | n/a | `node --check routes/lifeos-council-builder-routes.js` PASS; 49/49 tests pass |
| 2026-05-14 | **`docs/projects/TC_SERVICE_BUILDER_QUEUE.json`** — `tc-document-qa-validator` max_output_tokens 6000→16000; `tc-agent-portal-polish` max_output_tokens 9000→32000. Quarantine cleared for both (portal: truncated before `<body>` — 9000 tokens insufficient for full HTML regen; validator: `*/` bug, but 6000 also too tight for complex spec). | Token caps were suppressing valid large outputs — HTML truncation and JS truncation share the same root cause: conservative limits set before real output sizes were measured. | ✅ | n/a | Queue JSON valid |
| 2026-05-11 | **New free providers wired end-to-end:** `services/council-service.js` — `github_models` + `fireworks` added to `OPENAI_COMPATIBLE_PROVIDERS` Set, `getApiKeyForProvider()` (GITHUB_TOKEN / FIREWORKS_API_KEY), `getChatCompletionUrl()` (Azure inference + Fireworks endpoints). `config/council-members.js` — `github_llama` (Meta-Llama-3.3-70B-Instruct via GitHub Models) + `fireworks_llama` (Llama 3.1 8B via Fireworks $1 credit). `services/free-tier-governor.js` — `github_models` (4850 req/day) + `fireworks` (97 req/day) in `PROVIDER_LIMITS` + `PROVIDER_PRIORITY`. `services/savings-ledger.js` — both providers in `COST_PER_M` ($0.00) + `FREE_PROVIDERS` set. | Adam: add all available free-tier providers to maximize daily token budget before any paid fallback. DeepSeek was already wired; GitHub Models reuses existing GITHUB_TOKEN; Fireworks uses $1 signup credit. | ✅ | n/a | `node --check` all 4 files |
| 2026-05-11 | **`services/lifeos-gate-change-council-run.js`** — JSDoc **`@ssot`** now **`AMENDMENT_01_AI_COUNCIL.md`** (was incorrectly **21**). | NSSOT audit: **`ssot:validate`** / Compliance Officer require owning amendment in same change set for council core. | ✅ | n/a | `node --check services/lifeos-gate-change-council-run.js` |
| 2026-04-29 | **`routes/lifeos-council-builder-routes.js`** — **`BUILDER_EPISTEMIC_LAWS`** (no ENOENT claims when injected nonempty file bodies exist); **`mirrorCommittedContentToRepoRoot()`** after `/build` + `/execute` succeeds so chained `files[]` reads reflect just-committed content. **`scripts/tsos-doctor.mjs`** — GET `/api/v1/lifeos/builder/gaps` in score + weaknesses. | Prior overnight audit lied about missing briefs; multi-step `/build` needed local FS sync with GitHub. | ✅ | n/a | `node --check` |
| 2026-04-28 | **`services/council-model-availability.js`** — added Railway runtime detection plus explicit Ollama endpoint resolution. For provider `ollama`, Railway now reports unavailable when no explicit endpoint exists, or when the endpoint resolves to `localhost` / `127.0.0.1`. Result: council/builder routing will not treat local-only Ollama as a viable production model on Railway. | Builder failures were still being routed to `ollama_deepseek_v3` in production because the council layer considered Ollama broadly available even when Railway had no reachable local model runtime. | ✅ | n/a | `node --check services/council-model-availability.js` |
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
| 2026-04-19 | **North Star §2.6 ¶8 + Companion §5.5 — Gate-change & efficiency proposals:** New subsection under *Council Evaluation Contract*: any “feels inefficient / could remove X,Y,Z” hypothesis must be **THINK|GUESS**, go through **multi-agent council debate** (steel-man risk, equivalence metrics, rollback), then implement + SSOT receipts — **never** unilateral gate removal. Cross-links `docs/constitution/NORTH_STAR_SSOT.md` ¶8, `docs/SSOT_COMPANION.md` §5.5; `prompts/00` + Amendment 21 one-liner. | Adam: system should be able to **report** inefficiency and suspected optimizations to the **AI Council** for debate and **approved** implementation — the lawful alternative to silent corner-cutting. | ✅ | pending | pending |
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
**Last Updated:** 2026-07-03 — public-origin resolver + `lumin-web` deploy-target cleanup for runtime/audit scripts. Prior: 2026-07-02 — OpenAI-native codegen fix: `max_completion_tokens` + drop `stop` for gpt-5.x (unblocks builder `/build` self-build loop).

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
