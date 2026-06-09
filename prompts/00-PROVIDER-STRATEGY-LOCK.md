# Provider Strategy Lock (Decision A)

**Status:** LOCKED — 2026-05-24  
**Purpose:** Stop re-debating provider strategy every month.  
**Scope:** Which providers Lumin supports and which **department role** each serves.  
**Not in scope:** Integration tasks, API keys, or model SKU selection (Decision B).

**Supersedes:** Ad-hoc provider debates in threads.  
**Does not supersede:** `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md` (today's runtime truth).

---

## Rule

- **Decision A (this file)** = long-term strategy — locked until founder + AI Council gate-change.
- **Decision B** = what we wire this week — must cite this file; no new tiers without amendment here.

**Docs alone earn zero runtime maturity.** Wiring requires `FACTORY-REBOOT-0031` receipts.

---

## Supported providers

| Tier | Provider | Production-approved | Role |
|------|----------|---------------------|------|
| **1** | OpenAI | Yes | High-stakes reasoning, verification, governance debate (paid when income-linked) |
| **1** | Anthropic | Yes | High-stakes reasoning, blueprint-quality review, complex codegen (paid when income-linked) |
| **2** | Gemini | Yes | Structured planning, high-volume BPB output, Flash-class extraction |
| **3** | DeepSeek | Yes (Coder lane) | Frozen-step literal execution — **Coder department only** by default |
| **Experimental** | Qwen | No | Salvage/local/experiment until role assignment |
| **Experimental** | Grok | No | Adversarial/reality-check experiments only |
| **Experimental** | Local (Ollama) | Dev only | Never canonical proof on Railway |
| **Experimental** | Groq, Cerebras, OpenRouter free, Mistral, Together | Fallback only | Cost-shutdown / availability — not department primary |

---

## Department → provider ownership (target)

Departments **own routing intent**. Providers are replaceable under the role.

| Department | Primary providers | Secondary | Never primary |
|------------|-------------------|-----------|---------------|
| **AIC** (AI Council) | OpenAI, Anthropic | Gemini (cheap seat in debate) | DeepSeek, Groq |
| **BPB** (Blueprinting) | Gemini, Anthropic | OpenAI | DeepSeek, Groq |
| **Coder** | DeepSeek | Gemini Flash (bounded patch fallback) | Groq for repo edits |
| **SENTRY** | OpenAI, Anthropic | Gemini (mechanical-adjacent review) | Unreviewed free-tier alone |

**Coder role lock:** Coder = lowest-cost **literal** executor on **frozen** steps (Zero-Decision spec). Exact model ID may change; **role does not**.

---

## Routing question shift (target architecture)

```text
Today (production spine):  task_type → TASK_MODEL_MAP → cheap default
Target (post-0031):        department → DEPARTMENT_ROUTING → provider pool → model
```

Factory `factory-staging/` council remains **quarantined** until explicit cutover. Production spine implements department routing first.

---

## Income-linked spend (North Star)

- Productive AI spend toward **revenue and founder-value missions** is allowed — not blind caps.
- Tier 1 calls require **useful-work guard** or **direct user action**.
- Free-tier collapse (everything → Gemini Flash) is a **routing bug**, not a strategy.

---

## Change control

| Change type | Path |
|-------------|------|
| New production tier | Gate-change + update this file |
| Department ownership change | Gate-change + update this file + `DEPARTMENT_PROVIDER_TARGETS.json` (mission 0031) |
| New experimental provider | Add to Experimental table only |
| Wire provider to runtime | `FACTORY-REBOOT-0031` or successor mission + audit receipt |

---

## Related

- `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md` — what happens today
- `builderos-reboot/MISSIONS/FACTORY-REBOOT-0031/` — implementation mission
- `docs/architecture/factory-v1-blueprint-pack/CODER_ZERO_DECISION_BUILD_SPEC_V1.md` — Coder laws
- `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` — think vs execute within a department
