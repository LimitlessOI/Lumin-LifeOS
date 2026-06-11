# SNT Loop Escalation Doctrine — BuilderOS Alpha

**Signed by:** SNT + Conductor consensus  
**Status:** Locked  
**Companion:** `LOOP_ESCALATION_CONTRACT.json`, `SNT_CAPSULE_HAT_DOCTRINE.md`

---

## Principle

The system must not burn attempts indefinitely because tokens are cheap or free. **Free-tier routing is first priority for appropriate tasks** — but time, attention, and drift still cost.

Count **failure signatures and failure class**, not raw attempt numbers alone.

---

## Failure classes

| Class | Description | Escalate speed |
|-------|-------------|----------------|
| `fake_green_attempt` | Prose PASS, truncated commit, unsupported completion | **Fastest** |
| `same_signature_repeat` | Same root error 2–3× (import path, probe ID, async syntax) | **Fast** |
| `governance_block` | Pre-commit / safe-scope blocked bad output — system protected itself | **Slower** (lower weight) |
| `evidence_gap` | Tier 1 or SENTRY mechanical receipt missing — loop allowed with strategy change | **Medium** |
| `authority_violation` | Wrong sandbox, wrong mission root, hallucinated IDs | **Fast** |

---

## Thresholds (by class)

Default ladder when **same signature** repeats:

| Stage | Action |
|-------|--------|
| **Notice (3)** | `pattern_failure_detected` — log + OBSERVATION_LOG event |
| **Escalate (5)** | Stop same-agent/same-strategy loop; emit **Failure Pattern Packet**; invoke multi-hat Council (see Capsule-Hat Doctrine) |
| **Hard stop (8)** | **Strategy forbidden** → start **recovery protocol** (NOT terminal halt). See `AUTONOMOUS-RECOVERY-0001`. |

**Class overrides:**

| Class | Notice | Escalate | Hard stop |
|-------|--------|----------|-----------|
| `fake_green_attempt` | 1 | 2 | 3 |
| `same_signature_repeat` | 2 | 3 | 5 |
| `governance_block` | 3 | 5 | 8 |
| `evidence_gap` | 3 | 5 | 8 |

---

## Failure Pattern Packet (required at escalate)

Must gather before Council call:

1. What it tried (attempt log + commit SHAs if any)
2. What failed (error class + signature hash)
3. Repeated error pattern
4. Files touched
5. Tests failing / missing
6. Missing evidence (Tier 1 gaps, SENTRY receipt)
7. Suspected root cause (THINK — labeled)
8. Decision it cannot make alone (BPB spec? model tier? mechanical template?)
9. **Required strategy change** — not “try again”

Escalation must change strategy: BPB return, mechanical template (e.g. v27 runner), model tier upgrade with budget flag, or named founder fork.

**Mechanical path:** `POST /api/v1/lifeos/gate-change/run-preset` or `.../proposals/:id/run-council` — not IDE solo review.

---

## Weighting governance blocks

Governance blocks **still count** toward loop awareness but at **lower weight** than fake-green or same-signature repeats. A block is progress (fail-closed worked); repeating the same block 5× means escalation anyway because **strategy is not changing**.

---

## Current mission note

`FACTORY-DELIBERATION-SENTRY-REGRESSION-0001`: attempts 4–5 were governance wins; escalation should force **mechanical template path**, not another identical `/build` spec.

---

## Enforcement (target)

- `LOOP_ESCALATION_STATE.json` per mission (attempt log + signatures)
- Observe script reads state; at escalate → write packet + queue Council
- Tier 1 receipt includes `loop_escalation_tier` in Q8 unknowns until wired

**Script:** `builderos-reboot/scripts/loop-escalation-lib.mjs` — wired to observe (`LOOP_ESCALATION_RESULT.json`, `FAILURE_PATTERN_PACKET.json`, `FOUNDER_ALERT.json`)

---

## Critical correction (founder / SNT 2026-06-11)

**Hard stop is NOT the end state.** Terminal silent stop without BP completion attempt is **P0 catastrophic**.

Hard stop means: **forbid current strategy → begin recovery protocol:**

```
Council → BPB repair → alternative strategy → Builder retry → SENTRY verify → Deliver
```

Or: all strategies exhausted → **UNSOLVED receipt** + **FOUNDER_ALERT.json**.

Mission scoreboard and governance scoreboard are **separate**. Mission FAIL stands even when governance PASS.
