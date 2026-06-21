<!-- SYNOPSIS: Council Routing Audit v1 -->

# Council Routing Audit v1

**Purpose:** Describe **what is actually happening today** — not the target architecture.  
**Audit date:** 2026-05-24  
**Evidence:** Repo read of production spine (`config/`, `services/council-service.js`, `routes/lifeos-council-builder-routes.js`, `factory-staging/factory-core/canon/services/council-adapter.js`)

**Strategy lock (target):** `prompts/00-PROVIDER-STRATEGY-LOCK.md`  
**Implementation mission:** `builderos-reboot/MISSIONS/FACTORY-REBOOT-0031/`

---

## Executive finding

**We do not have a provider problem. We have a routing problem.**

Department names (AIC, BPB, Coder, SENTRY) exist in factory doctrine and mission blueprints. **Production LLM routing does not use departments.** It uses **task-type strings** that currently collapse to **Gemini Flash** and other free-tier models.

Adding API keys before mission 0031 would change **availability**, not **intent**.

---

## Two runtimes

| Runtime | Council behavior |
|---------|------------------|
| **`factory-staging/`** | `QUARANTINE_READ_ONLY` — no live `callCouncilMember`. Coder = mechanical `write-file-exact`. SENTRY = mechanical verifiers. |
| **Production spine** (Railway) | All LLM routing via `council-service.js` + builder routes. |

This audit covers **production spine** unless noted.

---

## Current routing behavior

### Step 1 — Task type string

`config/task-model-routing.js` maps dotted keys, e.g.:

| Task key | Mapped member (today) |
|----------|----------------------|
| `council.builder.task` | `gemini_flash` |
| `council.builder.code` | `gemini_flash` |
| `council.builder.code_execute` | `groq_llama` |
| `council.builder.review` | `gemini_flash` |
| `council.gate_change.debate` | `gemini_flash` |
| `lifeos.lumin.chat` | `gemini_flash` |
| Unknown task | `DEFAULT_MODEL` → `gemini_flash` |

**Note:** Builder code paths were **temporarily** moved from `claude_via_openrouter` to `gemini_flash` (OpenRouter 402 comment in file). Tier-1 paths exist but are not default.

### Step 2 — Builder dispatch

`routes/lifeos-council-builder-routes.js`:

1. Builds `routingKey` = `council.builder.${mode}` or `council.builder.code_execute`
2. `getModelForTask(routingKey)` → preferred member
3. `getCandidateModelsForTask` → `[mapped, gemini_flash, groq, deepseek, ollama…]`
4. `applyBuilderRoutingPolicy` → **task class** (not department): `architecture_planning`, `governance_review`, `high_risk_repo_edit`, etc.
5. `filterAvailableCouncilMembers` → drop models without env keys
6. First available candidate wins (unless operator passes explicit `model`)

### Step 3 — Runtime overrides inside `callCouncilMember`

- **`selectOptimalModel`** — may downgrade to tier0 based on prompt length / complexity
- **Cost shutdown** — paid models → free-tier cascade (Groq → Gemini → Cerebras → …)
- **Alias map** — `openai` → `groq_llama`; `anthropic` → `claude_via_openrouter` (no dedicated OpenAI tier-1 member in `council-members.js`)

### What is NOT happening

- No `council.aic.*`, `council.bpb.*`, `council.sentry.*`, `council.coder.*` keys
- No department field on builder dispatch body
- No multi-model AIC seat assignment per provider
- Factory departments do not drive production model choice

---

## Current provider availability (logic)

`services/council-model-availability.js` checks env per provider:

| Provider | Env keys checked |
|----------|------------------|
| Anthropic | `LIFEOS_ANTHROPIC_KEY`, `ANTHROPIC_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Gemini | `LIFEOS_GEMINI_KEY`, `GEMINI_API_KEY` |
| Groq | `GROQ_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| OpenAI | `OPENAI_API_KEY` (direct handler exists; no tier-1 member key) |

**THINK:** Railway vault may have keys not visible in local shell — verify via `GET /api/v1/lifeos/builder/ready` and `GET .../model-map`, not Cursor `process.env`.

---

## Fallback chains

### Builder candidates (`getCandidateModelsForTask`)

```text
mapped_model → gemini_flash → TRUSTED_FALLBACK_MODELS
  [gemini_flash, groq_llama, deepseek, ollama_deepseek_v3]
```

### Cost shutdown (inside `callCouncilMember`)

Paid request when spend disabled or over threshold → `freeTierGovernor.getNextAvailable()` → provider-specific member list (Groq, Gemini, etc.)

### Failover entry (`callCouncilWithFailover`)

Default preferred `cerebras_llama`; production skips local Ollama OSC.

---

## Cost-control logic

| Mechanism | Location | Effect |
|-----------|----------|--------|
| `MAX_DAILY_SPEND` / `COST_SHUTDOWN_THRESHOLD` | env + `council-service.js` | Blocks paid; cascades to free |
| `freeTierGovernor` | council-service | Provider rate limits / rotation |
| `tokenAccounting.checkBudgetGate` | council-service | Hard/warn limits when strict |
| `builderos-routing-policy.js` | builder dispatch | Restricts allowed models per **task class** — but cheap models dominate allowed lists |
| Model escalation gate | builder routes + `00-MODEL-ESCALATION-GATE.md` | Blocks tier-up without receipt |

---

## Council gaps (honest)

| Gap | Severity |
|-----|----------|
| Department ≠ routing key | **P0** — core finding |
| Everything collapses to Gemini Flash for builder | **P0** — accidental default |
| No OpenAI tier-1 council member | **P1** — strategy lock assumes Tier 1 |
| AIC debate not multi-provider by seat | **P1** |
| Coder (LLM) not bound to DeepSeek | **P1** — factory Coder is non-LLM |
| `selectOptimalModel` can override intentional choice | **P2** |
| Alias map conflates OpenAI with Groq | **P2** |

---

## Target future routing (post-0031)

```text
Request → resolve department (AIC | BPB | Coder | SENTRY)
       → DEPARTMENT_PROVIDER_TARGETS (canon JSON)
       → department policy (allowed / blocked / escalation)
       → filterAvailableCouncilMembers
       → callCouncilMember (no silent downgrade unless policy allows)
```

Example intent (not wired):

| Department | Primary pool | Use case |
|------------|--------------|----------|
| AIC | OpenAI + Anthropic (+ optional Gemini seat) | Gate-change, load-bearing debate |
| BPB | Gemini + Anthropic | Blueprint steps, structured JSON |
| Coder | DeepSeek | `code_execute`, frozen literals |
| SENTRY | OpenAI + Anthropic | Review, verifier conflict resolution |

---

## Migration plan

| Phase | Deliverable | Owner |
|-------|-------------|-------|
| **0** | This audit + Provider Strategy Lock | Done (docs) |
| **1** | `config/department-provider-targets.js` + `DEPARTMENT_ROUTING.md` | Mission 0031 |
| **2** | Extend `TASK_MODEL_MAP` → department-aware keys; builder passes `department` | Mission 0031 |
| **3** | Restore tier-1 defaults when income-linked + keys present | Mission 0031 + ops |
| **4** | AIC multi-seat debate router | Follow-on mission |
| **5** | Factory council quarantine lift (optional cutover) | Separate cutover receipt |

**Do not wire new providers until phase 2 is receipted.**

---

## Known risks

| Risk | Mitigation |
|------|------------|
| Fixing map only → still accidental if `selectOptimalModel` overrides | Department policy flag `allowModelDowngrade: false` for SENTRY/AIC |
| OpenRouter bridge masks missing Anthropic direct | Track `ANTHROPIC_API_KEY` explicitly in readiness |
| Free-tier quality on codegen | Coder lane + escalation gate + verifier required |
| Two builders confusion | `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` — production vs factory |

---

## Verification commands

```bash
# Local / operator shell with PUBLIC_BASE_URL + COMMAND_CENTER_KEY
curl -s -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/builder/model-map" | jq .

curl -s -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/builder/ready" | jq .
```

Compare output to this audit; refresh audit row when routing mission lands.

---

## Change log

| Date | Change |
|------|--------|
| 2026-05-24 | v1 initial audit — routing problem identified; department routing not wired |
