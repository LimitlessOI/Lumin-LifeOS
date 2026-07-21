<!-- SYNOPSIS: The minimum contract + frozen consensus to ship the first Digital-Twin-driven LifeOS vertical slice. Architect-office deliverable. -->

# First Slice Contract — the go-artifact (not another architecture round)

**Status:** Planning Sufficiency Gate **PASSED** (2026-07-20). This document is the *minimum* needed to start; it deliberately does **not** specify the eventual full system. Remaining full-system disagreements are not blockers to this slice.

**Authority:** pre-Article-VII. This freezes a working consensus and a bounded first build; formal ratification and factory execution are the next actors' steps. **No code has been hand-built** for this (SO-001) — load-bearing builds route through the governed factory.

---

## Minimum Operating Consensus (frozen)

```text
Digital Twin        = canonical state (facts AND hypotheses; never silently converted)
Context Views       = governed active projections of the Twin ("hats"; formal name for what we colloquially call capsules)
GRAIL               = transition + behavior enforcement (8-field rule contract; "enforced" is a receipt)
Simulator           = informed future choices (alternative futures, not just one goal's cost)
Voluntary Progress  = Be–Do–Have + next willing step
Experiment Ledger   = hypothesis → prediction → action → outcome → learning → Twin proposal
Oracle              = calibration against reality
Independent offices = design (Architect) / build (Conductor) / verify (black-box) / govern (Chair) separately
```

---

## The selected first slice

**Trigger:** a LifeOS user says *"I want to start a business that earns $10,000 per month."*

**Target behavior (13 steps):**
1. Record the goal as **user-stated** (not system-inferred).
2. Load relevant Twin state via Context Views.
3. **Mark unknowns as unknown** — never invent personal facts.
4. Generate several plausible paths.
5. Simulate likely time / money / effort / emotional cost / risk / opportunity cost per path.
6. Explain uncertainty honestly (ranges, not false precision).
7. Ask whether the user still wants the goal or a modified goal.
8. Apply Be–Do–Have to the chosen path.
9. Create **one reversible** first experiment.
10. Record a prediction.
11. Honor rejection / opt-out (no reformulated pursuit of a declined goal).
12. Later compare outcome vs. prediction.
13. **Propose — not silently apply —** Twin updates.

This exercises nearly every major idea without completing the platform.

---

## The minimum contract (six pieces only)

### 1. Twin state item format
```text
value · truth_grade{fact|hypothesis} · confidence · source · observed_at · valid_until · supersedes · consent_scope
```
Rule: hypotheses are never silently promoted to facts — promotion is an explicit receipted transition (mirrors `memory-capsule.js` PROPOSED→CANONICAL).

### 2. Context View read permissions
Each active view declares: `readable_fields · writable_fields · propose_only_fields · forbidden_sensitive_fields · expiry · activation_reason`. Multi-wear allowed (already live in `cognitive-core-perspective.js`).

### 3. Goal proposal format
```text
goal_text · origin{user_stated|system_proposed} · status{proposed|accepted|modified|declined} · declared_at
```
`system_proposed` goals require explicit user acceptance before pursuit; `declined` goals are honor-the-no (Law 4).

### 4. Alternative-futures format
```text
path_label · required_identity · probable_actions · time_range · costs{money,effort,emotional,relationship,opportunity} · risks · assumptions · probability_range · reversible_first_experiment · stopping_conditions
```
"Which future matches your **values**" (read from Twin) — not "which makes the most money."

### 5. Experiment / outcome format
```text
hypothesis · prediction · action · outcome · comparison · learning · twin_update{proposed}
```

### 6. Opt-out behavior
A declined goal or recommendation ends pursuit; no re-formulated version of the same objective is re-proposed within the session without new user initiation.

**Architect adversarial check on these six:** each preserves (a) truth classification (fact≠hypothesis) and (b) user autonomy (honor-the-no, propose-not-apply). If any renderer or engine can bypass (a) or (b), the contract has failed.

---

## First factory missions (for the Implementation Conductor — routed through the factory, not hand-authored)

| # | Mission | Why first | Enforcement status target |
|---|---|---|---|
| 1 | **Close the SO-003 short-circuit** in `services/chair-lumin-unified.js` (51–59): counsel/load-bearing turns must reach the strong-model path, not `formatDirectProgramAnswer`/`formatDirectFactualAnswer`. | already specified + immediately testable; it's a `known-violation` today | `known-violation` → `proven-live` |
| 2 | Minimum **Twin adapter** exposing the six-piece contract over existing stores (adapter, not rip-and-replace). | unblocks the slice without a migration | `specified` → `built-unwired` |
| 3 | The **goal → simulate → choose → experiment → propose-update** flow in LifeOS through the factory. | the vertical slice itself | `specified` → `partially-enforced` |

**Slice fires-on-breakage tests:** (a) a declined goal that gets re-pursued → FAIL; (b) a hypothesis rendered as a fact → FAIL; (c) a counsel turn served a canned template → FAIL; (d) a simulation stated as certainty → FAIL.
**Slice passes-on-success test:** the full 13-step flow completes, unknowns stay unknown, opt-out is honored, and the Twin update is *proposed* and awaits confirmation.
**Exit receipt required:** commit · wiring point · fires results · passes results · independent observer (Chair/SENTRY black-box) · timestamp. Until then the slice is `partially-enforced`, never `proven-live`.

---

## Honest open items (not blockers)
- **Devin availability: DON'T KNOW** — fail-closed. Until confirmed operational, Chair black-box + SENTRY carry the acceptance-tester role. Do not assume a third operator is running.
- How much of the eventual contract system to write later, how permanent each occupant is, how broad the Twin becomes, when graph/Oracle activate — **learned through implementation**, per the Planning Sufficiency Gate.
