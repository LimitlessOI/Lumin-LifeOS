<!-- SYNOPSIS: Model tiers — think vs execute -->

# Model tiers — think vs execute

**Read after:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)  
**Config:** `config/task-model-routing.js` → `getModelForTask()`  
**SSOT:** `docs/products/ai-council/PRODUCT_HOME.md`

---

## Principle (BuilderOS lock)

| Phase | Goal | Tier | Typical member (free tier) |
|-------|------|------|----------------------------|
| **Think** | Architecture, tradeoffs, blueprint hardening, blocker classification, **review** | **Higher reasoning** | `OB3` = `gpt-5.5` |
| **Repair** | Clear bounded implementation blockers without changing product intent | **Mid reasoning** | `OB2` = `gpt-5.4` |
| **Execute** | Emit code **from a fixed spec** + injected files; minimal redesign | **Fast / cheaper** | `OB1` = `gpt-5.4-mini` |

**Rule:** Don’t use the execute tier if the spec is incomplete. If `OB1` must guess, the blueprint failed.

---

## BuilderOS route lock (current canonical path)

| Task type key | Model | When |
|---------------|-------|------|
| `council.builder.code_execute` | `openai_builder_mini` | Default BuilderOS bounded execution from frozen spec. |
| `council.builder.review` | `openai_builder_standard` | Bounded repair, code review, verifier-followup. |
| `council.builder.plan` | `openai_builder_escalation` | Blueprint hardening, blocker classification, execution redesign. |
| `council.gate_change.debate` | `openai_builder_escalation` | Load-bearing decisions. |
| Classification / short JSON extract | `openai_builder_mini` | Structured, low ambiguity. |

Override only when an authority file explicitly allows it. BuilderOS should not free-form hop providers during the canonical OpenAI ladder path.

---

## Operational pattern (two-call)

1. Freeze the blueprint with no strategic ambiguity.
2. Dispatch bounded work to `OB1`.
3. If `OB1` fails twice on the same bounded task, dispatch the blocker to `OB2`.
4. If `OB2` fails twice, dispatch the full failure chain to `OB3`.
5. `OB3` repairs the execution contract or emits a true hard blocker.

For fragile files, keep the same ladder. Do not substitute a different provider just because the file is large; classify the blocker and escalate inside the ladder.

---

## Laws

- **§2.12** — cheap execution never decides architecture.
- **§2.6** — if the execute model skips constraints, do not commit; repair the contract or escalate.
- BuilderOS execution starts from the blueprint, not from founder chat.

---

## SSOT

- `prompts/lifeos-council-builder.md` — API details.
- `config/council-members.js` — member keys and providers.
- `docs/products/builderos/OB_EXECUTION_LADDER.md` — canonical OB1/OB2/OB3 execution law.
