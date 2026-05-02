# TCO + TSOS — brainstorm toward ≥75% average token savings

**Purpose:** Operator bar — **no less than ~75% measured average token savings** on the paths that feed **`npm run tsos:tokens`** / **`GET /api/v1/tsos/...`** telemetry — without lying on the ledger. This file is meant to be **handed to other AIs** for critique, ranking, and refinement.

**Last updated:** 2026-04-30 — **Priority ranks**, **brief explanations**, and **Moves up if** for all **50** ideas.

---

## How to read this doc

- **Idea #** — stable id (**1–50**). Batch 1 = **1–25**, Batch 2 = **26–50**.
- **Priority rank (1–50)** — **1 = ship first** among everything here (judgment: ROI for LifeOS/TSOS, dependency order, risk). Subjective; re-rank as receipts prove otherwise.
- **Brief** — what it is in plain language.
- **Moves up if** — what would justify bumping this idea higher in the queue.

---

## Master list — ideas by priority (1 = do first)

| Pri | Idea # | Title (short) |
|-----|--------|----------------|
| 1 | 11 | Per-route savings attribution |
| 2 | 27 | Measure provider cached-input tokens |
| 3 | 26 | Static-prefix prompt layout |
| 4 | 34 | Output-token budgets as contracts |
| 5 | 3 | Cheap-then-escalate builder codegen |
| 6 | 1 | Ship TCO-A04 delta context |
| 7 | 6 | Exact-key cache for `/build` |
| 8 | 24 | Formal baseline definition |
| 9 | 10 | Conductor cold-start compact-rules session |
| 10 | 30 | FrugalGPT-style learned cascade |
| 11 | 5 | Semantic cache TTL tiers |
| 12 | 32 | Semantic cache @ similarity ≥ 0.93 |
| 13 | 23 | Embed retrieval before council |
| 14 | 40 | Agent reflection budget = 1 |
| 15 | 18 | Streaming partial acceptance / early stop |
| 16 | 17 | Aggressive `files[]` compaction |
| 17 | 35 | Stop sequences & early termination |
| 18 | 36 | Two-pass extract → write |
| 19 | 31 | Fit per-task confidence thresholds τ |
| 20 | 13 | Quality gate as throttle |
| 21 | 15 | Response skeleton + expand |
| 22 | 37 | Distilled routing classifier |
| 23 | 38 | Embedding dedup layer |
| 24 | 28 | Anthropic `cache_control` breakpoints |
| 25 | 39 | Tool-schema diet |
| 26 | 20 | Savings SLA dashboard + alert |
| 27 | 25 | Chaos + regression suite for savings |
| 28 | 43 | Synthetic savings canaries |
| 29 | 50 | Third-party gateway normalization |
| 30 | 4 | Hard cap expensive models / hour |
| 31 | 49 | Escrow budget for premium models |
| 32 | 22 | User-facing economy mode |
| 33 | 16 | B2B proxy as savings amplifier |
| 34 | 19 | Monthly vendor pricing audit |
| 35 | 2 | Ship TCO-D04 TOON / adaptive compression |
| 36 | 7 | Distill system prompt shells |
| 37 | 8 | Chunk-and-merge huge specs |
| 38 | 33 | Batch / async discount lanes |
| 39 | 14 | Ollama-first for dev/staging |
| 40 | 42 | Regional stickiness |
| 41 | 41 | Voice / multimodal cheap front door |
| 42 | 44 | Cross-tenant non-PII fingerprint sharing |
| 43 | 21 | Parallel speculative routing |
| 44 | 12 | Night-queue heavy codegen |
| 45 | 9 | Phrase table / workspace learning |
| 46 | 29 | Gemini context-cache sessions |
| 47 | 45 | Quantization-aware routing |
| 48 | 47 | KV / prefix reuse batching |
| 49 | 48 | Carbon / spot scheduling |
| 50 | 46 | Prioritize output compression (terse formats) |

---

## Grounding (what “TCO” and “TSOS” mean here)

| Name | What it is | Primary SSOT / code |
|------|------------|---------------------|
| **TCO / TokenSaverOS (product)** | Five-layer stack: prompt IR → **`token-optimizer`** → delta context → **free-tier cascade** → **savings ledger**; B2B proxy + dashboard. | `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md`, `docs/TCO_ANNEX.md`, `services/token-optimizer.js`, `services/free-tier-governor.js`, `services/council-service.js`, `services/savings-ledger.js` |
| **TSOS (supervision)** | Machine scorecard: **`npm run tsos:builder`** runs preflight, probe, doctor, **`tsos-token-efficiency.mjs`**, daemon leg, operational grade. Token leg grades **today’s avg savings %**, free-tier headroom, DoD trend, 7d stability bonus. | `scripts/tsos-token-efficiency.mjs` (**`@ssot`** `AMENDMENT_21`), `scripts/tsos-suite-self-grade.mjs`, `docs/TSOS_TEN_UPLIFT_IDEAS.md` |

**Honest constraint:** **75%** is an aggressive target vs typical blended council traffic; hitting it requires **routing + compression + cache + delta context** working together, not one knob. The TSOS scorecard’s savings component is **`min(60, (todayAvg/30)*60)`** — so **≥30% today** already maxes that slice; **75%** means **baseline-vs-actual** is dominated by **free/cheap routing + compression**, with quality gates still passing (**`tokenos-quality-check.js`**).

---

## Batch 1 — ideas 1–25 (detail)

### 1. Ship `TCO-A04` delta context for real
- **Priority rank:** **6 / 50**
- **Brief:** Finish `services/delta-context.js` so conversations send **deltas + anchors** instead of full chat history every turn — the largest honest cut to **input** tokens on long threads.
- **Moves up if:** You prove **>30%** of council tokens are repeat history on hot routes, or P95 thread length crosses a threshold you define in **`token_usage_log`**.

### 2. Ship `TCO-D04` TOON / adaptive compression
- **Priority rank:** **35 / 50**
- **Brief:** Turn `services/toon-formatter.js` from stub into a **gated** compression path behind **`runQualityGate()`** so tokens drop without silent meaning drift.
- **Moves up if:** A/B shows **≥10%** token reduction with **no** quality regression on fixture suite, or delta-context is live and you need **second-layer** squeeze.

### 3. Default builder codegen to cheapest tier that passes syntax
- **Priority rank:** **5 / 50**
- **Brief:** Route **`council.builder.*`** to **`groq_llama`** first when the task is narrow codegen; **`node --check`** (or verifier) escalates to **`gemini_flash`** only on failure — “cheap-then-escalate.”
- **Moves up if:** Builder/council volume dominates spend, or **`/build`** failures are mostly **syntax** (cheap model can iterate).

### 4. Hard cap expensive models per hour
- **Priority rank:** **30 / 50**
- **Brief:** Per-tenant (or global) budget for **`claude_*` / `gpt_*`** calls per window; overflow routes to Flash/Groq with explicit **`token_usage_log`** receipt.
- **Moves up if:** Runaway premium usage appears in attribution (#11), or a deploy/regression suddenly spikes Sonnet spend.

### 5. Semantic cache TTL tiers
- **Priority rank:** **11 / 50**
- **Brief:** Different TTLs on **`ai_response_cache`** by task class — long for idempotent narratives, short for personalized chat — so hit rate rises without stale answers.
- **Moves up if:** Cache hit rate is low but repeat-intent traffic is high (metrics from #11).

### 6. Exact-key cache for builder
- **Priority rank:** **7 / 50**
- **Brief:** Hash `(policy_revision, domain, specFingerprint, target_file)` and skip duplicate **`POST /build`** council work when inputs are identical — classic idempotent retry savings.
- **Moves up if:** Daemon/queue retries the same task often, or CI re-runs same **`/build`** payload.

### 7. Distill “system prompt shells”
- **Priority rank:** **36 / 50**
- **Brief:** One-time (or periodic) shrink of **`prompts/lifeos-*.md`** boilerplate into minimal IR + codebook refs, versioned with **`BUILDER_CODEGEN_POLICY_REVISION`**.
- **Moves up if:** Prompt tokens dominate builder calls and audits show large static prefixes.

### 8. Chunk-and-merge for huge specs
- **Priority rank:** **37 / 50**
- **Brief:** Split giant **`spec`** with Groq classification chunks; one Flash merge only if merge gate fails — avoids single megaphone call per edit.
- **Moves up if:** **`spec`** byte length or token estimates exceed a budget threshold regularly.

### 9. Raise phrase table coverage (workspace learning)
- **Priority rank:** **45 / 50**
- **Brief:** Extend **`TCO-A02`** with industry packs + tenant dictionaries from frequent n-grams; reversible + versioned.
- **Moves up if:** Logs show repetitive long phrases in **same** tenant vertical (real estate, health, etc.).

### 10. Instrument conductor cold-start compact rules
- **Priority rank:** **9 / 50**
- **Brief:** Call **`POST /api/v1/tsos/savings/session`** when agents cold-start so **`saved_by_compact_rules_usd`** reflects real IDE/session compression (Amendment 10 handoff gap).
- **Moves up if:** Reporting shows **`compact_rules`** savings stuck at zero while sessions are heavy — fixes **truth** of the ledger fast.

### 11. Per-route savings attribution
- **Priority rank:** **1 / 50**
- **Brief:** Tag **`token_usage_log`** / audits with **`routing_key`** + **`task_type`**; weekly top-spenders report → downgrade **`TASK_MODEL_MAP`** where quality holds.
- **Moves up if:** Always — without this, everything else is guessing. **Foundation for honest 75%.**

### 12. Night-queue heavy codegen
- **Priority rank:** **44 / 50**
- **Brief:** Large HTML/overlay regen in off-peak windows + **`BUILDER_DAEMON_SUPERVISE_MODE`** — fewer collisions with interactive premium usage.
- **Moves up if:** Interactive latency or quota contention correlates with daemon bulk runs.

### 13. Quality gate as throttle, not panic
- **Priority rank:** **20 / 50**
- **Brief:** Tune **`QUALITY_THRESHOLD`** from **`quality_score`** distribution — tighter where cheap paths rarely fail, looser where Flash truncates (**TCO-C02**).
- **Moves up if:** You see **many** unnecessary escalations to expensive models, or **many** silent quality failures.

### 14. Ollama-first for dev/staging
- **Priority rank:** **39 / 50**
- **Brief:** **`LIFEOS_ROUTING_LOCAL_FIRST`** sends non-prod traffic to **`ollama_*`** before cloud keys — preserves free tiers for prod.
- **Moves up if:** Dev burn is significant vs prod, or keys are shared and staging steals quota.

### 15. Response skeleton + expand
- **Priority rank:** **21 / 50**
- **Brief:** Groq emits JSON skeleton; Flash expands prose **only** if **`meaningCoverage`** fails — avoids paying large models for hidden chain-of-thought.
- **Moves up if:** Structured outputs are a large share of routes and Flash verbosity is expensive.

### 16. B2B proxy as savings amplifier
- **Priority rank:** **33 / 50**
- **Brief:** Route customer traffic through **`tokenos`** proxy so **`tco_requests`** proves high savings on **external** workloads — internal blended metrics stop diluting the story.
- **Moves up if:** GTM priority on TokenOS revenue or you need **clean** ≥75% proof on proxy-shaped traffic.

### 17. Aggressive `files[]` compaction for `/build`
- **Priority rank:** **16 / 50**
- **Brief:** Optional **`BUILDER_INJECT_COMPACT=1`** strips comments/redundant SSOT from injected **`files[]`**; log bytes saved.
- **Moves up if:** Builder **`files[]`** token estimate dominates **`/build`** cost.

### 18. Streaming partial acceptance
- **Priority rank:** **15 / 50**
- **Brief:** Stop generation once **`tokenos-quality-check`** markers are satisfied — pay fewer **output** tokens.
- **Moves up if:** Output tokens dominate on routes where answers are short but models ramble.

### 19. Monthly vendor pricing audit
- **Priority rank:** **34 / 50**
- **Brief:** Compare OpenRouter/Gemini/Groq list prices vs **`task-model-routing.js`**; optional automated PR when drift exceeds X%.
- **Moves up if:** Vendors change tiers often or you add many providers.

### 20. Savings SLA dashboard + alert
- **Priority rank:** **26 / 50**
- **Brief:** Alert when rolling **7d** avg savings &lt; **75%** with breakdown (routing vs compression vs cache).
- **Moves up if:** Ops wants **early warning** before TSOS grade collapses; pairs with #26–27 telemetry.

### 21. Parallel speculative routing
- **Priority rank:** **43 / 50**
- **Brief:** Rarely run two cheap models on disjoint slices when stakes are high; default stays sequential to avoid **2×** burn.
- **Moves up if:** You have proven **abort/stop** logic and stakes-based routing — risky default.

### 22. User-facing “economy mode”
- **Priority rank:** **32 / 50**
- **Brief:** Overlay toggle: **`groq_llama`** + stricter cache + shorter answers — consent-first savings.
- **Moves up if:** Users ask for cost control or mobile/low-bandwidth mode matters.

### 23. Embed retrieval before council
- **Priority rank:** **13 / 50**
- **Brief:** Local top-k retrieval first; council sees **query + chunks**, not whole corpus — cuts input tokens (memory intel synergy).
- **Moves up if:** RAG paths are hot and prompts currently paste huge context.

### 24. Formal baseline definition
- **Priority rank:** **8 / 50**
- **Brief:** Per **`task_type`**, define **baseline_cost_usd** (e.g. 1% shadow on premium model) so **`savings_pct`** is not circular.
- **Moves up if:** Anyone doubts reported savings; required for **credible** TSOS and B2B invoices.

### 25. Chaos + regression suite for savings
- **Priority rank:** **27 / 50**
- **Brief:** Fixture prompts with frozen markers; fail CI if savings on fixtures &lt; **75%** or gate fails.
- **Moves up if:** Router/config churn causes regressions — lock the gains.

---

## Batch 2 — ideas 26–50 (detail)

*Industry patterns: prompt caching, semantic routing, batching, output discipline, cascades — always pair with **`runQualityGate()`**.*

### 26. Static-prefix prompt layout
- **Priority rank:** **3 / 50**
- **Brief:** Immutable blocks first (system, tools, exemplars), volatile tail last — maximizes **automatic** provider prompt-cache hits and avoids cache-busting shuffle.
- **Moves up if:** You adopt OpenAI/Anthropic routes with long shared prefixes, or #27 shows low **cached_tokens**.

### 27. Measure provider “cached input” tokens
- **Priority rank:** **2 / 50**
- **Brief:** Parse **`cached_tokens`** (and equivalents) from API **`usage`** into **`token_usage_log`** — TSOS grades **real** provider discounts, not only internal tricks.
- **Moves up if:** Right after #11 — proves external savings line on the receipt.

### 28. Anthropic explicit cache breakpoints
- **Priority rank:** **24 / 50**
- **Brief:** **`cache_control`** on reusable spans for Claude — **read** pricing on hits ([Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)).
- **Moves up if:** Claude share of spend is material; pairs with #26.

### 29. Gemini / Google context-cache sessions
- **Priority rank:** **46 / 50**
- **Brief:** Explicit long-session context caches where API bills cached context cheaper than fresh — compare to Flash free tier economics.
- **Moves up if:** Long multimodal or long builder sessions on Google stack dominate.

### 30. FrugalGPT-style learned cascade
- **Priority rank:** **10 / 50**
- **Brief:** Cheap model answers first; escalate only on abstention / low confidence / verifier fail ([FrugalGPT](https://arxiv.org/abs/2305.05176)).
- **Moves up if:** You have reliable confidence scores from #31 or verifier hooks.

### 31. Fit per-task confidence thresholds τ
- **Priority rank:** **19 / 50**
- **Brief:** Learn escalation cutoffs from **`quality_score`** vs **`actual_cost_usd`** per **`task_type`**.
- **Moves up if:** #30 is live and you have enough logged decisions to fit τ without overfitting.

### 32. Semantic cache @ embedding similarity ≥ 0.93
- **Priority rank:** **12 / 50**
- **Brief:** Near-duplicate queries hit **`ai_response_cache`** via embeddings + tenant namespaces — industry pattern for repeat intent.
- **Moves up if:** Similar questions recur but exact text differs.

### 33. Batch / async discount lanes
- **Priority rank:** **38 / 50**
- **Brief:** Non-urgent jobs use provider batch/async APIs when discount × latency tradeoff works.
- **Moves up if:** Queue depth grows and SLA allows minutes-hours latency.

### 34. Output-token budgets as contracts
- **Priority rank:** **4 / 50**
- **Brief:** Tight default **`maxOutputTokens`** per task; raise **only** after verifier failure — output often dominates agent bills.
- **Moves up if:** Logs show huge completions on tasks that need short answers.

### 35. Stop sequences & early termination
- **Priority rank:** **17 / 50**
- **Brief:** **`stop`** tokens / JSON mode so models halt at closing delimiter — trims rambling tails.
- **Moves up if:** Completions routinely exceed needed length on structured routes.

### 36. Two-pass extract → write
- **Priority rank:** **18 / 50**
- **Brief:** Groq extracts facts → Flash formats once — avoids one giant Flash call hiding reasoning.
- **Moves up if:** Narrative + extraction are currently one expensive call.

### 37. Distilled routing classifier
- **Priority rank:** **22 / 50**
- **Brief:** Tiny classifier on embeddings predicts **`TASK_MODEL_MAP`** route; weekly drift checks.
- **Moves up if:** Manual **`TASK_MODEL_MAP`** tuning can’t keep up with traffic mix.

### 38. Embedding dedup layer
- **Priority rank:** **23 / 50**
- **Brief:** If query embedding ≈ prior within ε, return cache or skip RAG retrieval — pay for completion only when needed.
- **Moves up if:** Duplicate queries spike (support bots, repeated builder specs).

### 39. Tool-schema diet
- **Priority rank:** **25 / 50**
- **Brief:** Minimal tool JSON per route — mega-schemas repeat every agent turn.
- **Moves up if:** Agent/tool-calling volume is high and schemas are huge.

### 40. Agent reflection budget = 1
- **Priority rank:** **14 / 50**
- **Brief:** One self-critique round max unless **`runQualityGate`** fails — **§2.10 Zero Waste** alignment.
- **Moves up if:** Logs show multi-round reflection loops burning tokens without quality gain.

### 41. Voice / multimodal cheap front door
- **Priority rank:** **41 / 50**
- **Brief:** Small STT + Groq intent before large vision/audio models.
- **Moves up if:** Multimodal traffic grows or premium vision calls spike.

### 42. Regional stickiness
- **Priority rank:** **40 / 50**
- **Brief:** Stick to healthy region to reduce timeout → retry **double-spend**.
- **Moves up if:** Logs show retry storms or flaky regions on Railway/provider edges.

### 43. Synthetic savings canaries
- **Priority rank:** **28 / 50**
- **Brief:** Hourly fixed prompts on cheapest acceptable path — alert if gates force premium fallback.
- **Moves up if:** Production variance is hard to debug; pairs with #25.

### 44. Cross-tenant prompt fingerprint sharing
- **Priority rank:** **42 / 50**
- **Brief:** Share normalized **non-PII** system hashes across tenants to lift semantic cache hits.
- **Moves up if:** Multi-tenant TokenOS scale and privacy review allows shared builder-domain prompts only.

### 45. Quantization-aware routing
- **Priority rank:** **47 / 50**
- **Brief:** Prefer quantized/fast tiers when **`meaningCoverage`** holds on samples.
- **Moves up if:** Provider exposes clear quantized endpoints and eval passes.

### 46. Prioritize output compression (terse formats)
- **Priority rank:** **50 / 50**
- **Brief:** Enforce bullets/tables/short answers by task — overlaps **#34** but policy/UX-heavy.
- **Moves up if:** Product accepts terse UX and users opt in.

### 47. KV / prefix reuse batching (provider-dependent)
- **Priority rank:** **48 / 50**
- **Brief:** Batch sequential related calls to reuse prefix/KV state where API supports it — pairs with #26.
- **Moves up if:** Provider documents session reuse and you have sequential pipelines.

### 48. Carbon / spot scheduling
- **Priority rank:** **49 / 50**
- **Brief:** Discretionary jobs to low-grid-intensity windows — enterprise narrative + pairs **#12**.
- **Moves up if:** Enterprise buyers ask for sustainability metrics.

### 49. Escrow budget for premium models
- **Priority rank:** **31 / 50**
- **Brief:** Reserve N premium calls/day for **verifier failure** only; routine traffic can’t drain escrow.
- **Moves up if:** Premium usage is emotional/default rather than evidence-based.

### 50. Third-party gateway normalization
- **Priority rank:** **29 / 50**
- **Brief:** Unified metadata: **`cost_usd`**, fallbacks, per-key caps — comparable rows in **`tsos_savings_report`** ([routing surveys](https://www.maviklabs.com/blog/llm-cost-optimization-2026)).
- **Moves up if:** Provider count &gt; 3 or spend attribution is inconsistent across adapters.

---

### External patterns consulted (batch 2)

- Prompt caching layout + discounts — OpenAI / Anthropic / DigitalOcean guides (2025–2026).
- Semantic caching + routing — industry surveys (Mavik Labs, AI Workflow Lab, similar).
- Cascade / approximation — FrugalGPT (Chen et al., arXiv:2305.05176).

---

## Cross-links

- **`docs/TSOS_TEN_UPLIFT_IDEAS.md`** — TSOS runner + platform ideas (overlap intentional).
- **`docs/projects/AMENDMENT_10_API_COST_SAVINGS.md`** — component IDs (TCO-Axx, TCO-Bxx, …).
- **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`** — evaluate → fix → improve after each slice.

---

## For other AIs

Please return: (a) **re-rank** the master table if you disagree (give evidence), (b) conflicts with **`runQualityGate()`** or **§2.10**, (c) missing **metrics** for **75%** proof, (d) whether **#27** should precede **#26** for your provider mix.
