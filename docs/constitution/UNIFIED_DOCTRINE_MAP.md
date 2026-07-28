<!-- SYNOPSIS: Unified Doctrine Map — traces every operating doctrine back to North Star §2.0 and to its enforcement mechanism. Subordinate index, NOT a new authority. -->

# Unified Doctrine Map

**Status:** Subordinate index / derivation map. **This is NOT a new constitution and creates NO new authority** (that would violate North Star §2.0F "do not create competing authority vocabularies" and Article VII).
**Classification (§2.0A):** operating-law index + implementation documentation. It changes no law.
**Authority:** Wholly subordinate to `docs/constitution/NORTH_STAR_SSOT.md` (supreme). Where any row here and North Star disagree, **North Star wins**.
**Last Updated:** 2026-07-20

---

## The single root law (it already exists)

Every doctrine in this system is one expression of **North Star §2.0 — Foundational Authority Principle**:

> "Nothing earns authority through opinion. Authority is earned through evidence, outcomes, calibration, and repeated successful challenge."

There is no need for a new "unifying constitution." The unification is §2.0. What this map adds is **traceability** (each doctrine → its North Star root) and **enforcement honesty** (each doctrine → its mechanism, or the named gap where none exists yet). Per §2.18.5, *paper law without the gate that makes it real is incomplete law* — so the gaps below are first-class, not footnotes.

## The derived doctrines are one law wearing different clothes

- **Cognitive Core Laws** (`docs/constitution/COGNITIVE_CORE_LAWS.md`) — §2.0 applied to *modeling the person*.
- **Self-Repair Doctrine** (`docs/SELF_REPAIR_DOCTRINE.md`) — §2.0 applied to *the factory verifying itself*.
- **SENTRY pre-alpha doctrine** (SO-002) — §2.0 applied to *proving a feature as a real client*.
- **Observer Principle** (`docs/SELF_REPAIR_DOCTRINE.md` Part 0) — §2.0's "repeated successful challenge" made constant: **"done" = "survived independent falsification."**
- **Standing orders** SO-001/002/003 — §2.0 applied to *who builds, who proves, and never idling*.

All of them say the same thing: **earn trust through survived falsification; compound judgment and negative-knowledge on a shared substrate; govern with checks-and-balances that prune themselves.**

## Derivation + enforcement table

| Doctrine / principle | North Star root | Enforcement mechanism (real) | Status |
|---|---|---|---|
| CC Law 1 — models are hypotheses | §2.0B Truth Ladder · §2.2 honesty labels | Memory epistemic gate (KNOW/THINK/GUESS stamp) | **partial** |
| CC Law 2 — trust earned empirically | §2.0 · §1.0 justified trust · §2.0H Founder Intent Model | `services/cognitive-core-trust.js`; delegation tiers; scoreboard | **partial** |
| CC Law 5 — every miss improves the engine | §2.0I Historian (predict→outcome→lesson) | Outcome Oracle + prediction auto-capture; Brier/e-value scoreboard | **partial** |
| Self-Repair: verify-the-factory | §2.6 (must not lie *to itself*) · §2.0 | Provenance ledger (Tier-0) | **GAP — not built** |
| Self-Repair: gate charter (block only irreversible; detect-and-route) | §2.0F Governance Routing · §2.5 fail-closed | Zone system; `/api/v1/lifeos/gate-change` | **partial** |
| Self-Repair: governance conservation / self-pruning | §2.0G Governance Evolution Law (already law) | Cadence review; gate-change | **GAP — retirement not automated** |
| Observer Principle ("done" = survived falsification) | §2.0 "repeated successful challenge" · §2.6 · §2.10 | SENTRY (builder ≠ verifier); "no self-certify"; machine-ship honesty gate | **partial** |
| Checks & balances — observe the verifier | §2.0 · §2.10 | chaos-canary / verify-the-verifier | **GAP — not built** |
| SENTRY pre-alpha (SO-002) | §2.10 observe-grade-fix · §2.6 | Layer A structural + Layer B human-sim; solution-mandatory findings | **live (per product)** |
| SO-001 — system builds product code | §2.11 licensed external code | commit-msg hook hard-block on `[system-build]` | **live** |
| SO-003 — never idle / no cheap AI on load-bearing | §2.0J Model Benchmarking | `defaultPlannerCallModel` failover cascade | **partial** |
| Compound drift — zero angular error | §2.18 (already Foundational Law) | BP-sync verifiers, deploy parity, pre-commit | **partial** |

## Enforcement gaps (paper law today — §2.18.5 says these are *incomplete law*)

Honest list of principles that currently lack a mechanical gate:
1. **Provenance ledger** (verify-the-factory) — the polygraph on the system's own "done"/commit claims. Self-Repair Tier-0. *Not built.*
2. **Verify-the-verifier** — nothing audits SENTRY; a silently-degraded verifier is undetected. *Not built.*
3. **Self-pruning governance** — §2.0G mandates retiring laws that stop earning their keep, but retirement is manual. *Not automated.*
4. **Claim-provenance beyond commits** — reasoning/citation claims (not just diffs) have no standing falsifier; caught 2026-07-20 only because a peer checked. *Not built.*
5. **Independence guarantee** — "independent" verification may share a model family (correlated blind spots). No enforced cross-model/deterministic requirement. *Not enforced.*

These gaps are the real build backlog for "constitution enforced in DNA." Closing them = Self-Repair Tier-0 (SO-001: through the governed factory).

## How this becomes law (the honest path)

This map is **documentation**, not an amendment. To promote any derived doctrine (or the Observer Principle) to **constitutional law**, or to change North Star, requires the ratification path North Star defines for itself:

- **§2.12** — load-bearing/constitutional decisions go through **AI Council** debate (not a single session).
- **Article VII** — **unanimous AI Council vote + Human Guardian (Adam) written approval + 7-day review**.

Until then, these remain **operating doctrines subordinate to North Star**, enforced to the degree the mechanisms above are actually built — and honest about where they are not.
