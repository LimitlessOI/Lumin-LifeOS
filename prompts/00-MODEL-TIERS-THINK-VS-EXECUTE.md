# Model tiers — think vs execute

**Read after:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)  
**Config:** `config/task-model-routing.js` → `getModelForTask()`  
**SSOT:** `docs/projects/AMENDMENT_01_AI_COUNCIL.md`

---

## Principle (Adam’s policy)

| Phase | Goal | Tier | Typical member (free tier) |
|-------|------|------|----------------------------|
| **Think** | Architecture, tradeoffs, plans, gate-change rubrics, ambiguous specs, **review** | **Higher reasoning** | `gemini_flash` (default for builder plan/review/code when scope is open) |
| **Execute** | Emit code **from a fixed spec** + injected files; minimal redesign | **Fast / cheaper** | `groq_llama` when `execution_only: true` on builder `mode: code` |

**Rule:** Don’t use the execute tier if the spec is incomplete — you’ll get fast wrong code.

---

## How routes map (today)

| Task type key | Model | When |
|---------------|-------|------|
| `council.builder.plan` | `gemini_flash` | Step-by-step plan, no code. |
| `council.builder.review` | `gemini_flash` | Judgment, drift, bugs. |
| `council.builder.code` | `gemini_flash` | Default codegen (reasoning + large output budget). |
| `council.builder.code_execute` | `groq_llama` | **Only** with builder body **`execution_only: true`** + `mode: code` — literal implementation of supplied spec/files. |
| `council.gate_change.debate` | `gemini_flash` | Load-bearing decisions. |
| Classification / short JSON extract | `groq_llama` | Structured, low ambiguity. |

Override anytime with body **`model`**:`"<council_member_key>"` (Conductor choice).

---

## Operational pattern (two-call)

1. **`POST .../task`** with `mode: plan` (and `domain` + amendment excerpt in `spec`) → **think** tier produces steps + file touch list.
2. Conductor tightens spec; then **`POST .../task`** or **`/build`** with `mode: code`, **`execution_only: true`**, **`files[]`** + full `spec` → **execute** tier emits code.

For **large / fragile** files (e.g. full HTML overlays), stay on **`council.builder.code`** (Gemini) until you’ve proven Groq output passes validators.

---

## Laws

- **§2.12** forks stay on **think** tier + real council / gate-change — never “cheap model decides architecture.”
- **§2.6** — if the execute model skips constraints, **do not commit**; fix spec or switch back to think tier.

---

## SSOT

- `prompts/lifeos-council-builder.md` — API details.
- `config/council-members.js` — member keys and providers.
