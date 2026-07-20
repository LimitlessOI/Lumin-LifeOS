<!-- SYNOPSIS: Self-Repair Doctrine — gate charter, friction-tiered build order, Tier-0 data-capture spec. -->

# Self-Repair Doctrine

**Status:** Consensus reached 2026-07-20 (Adam + Cursor/Opus + Claude Code peer-review). Operational doctrine, not constitutional law. Subordinate to `docs/constitution/NORTH_STAR_SSOT.md` and the ratified standing orders SO-001/002/003.

## Origin (why this exists)

Grounded in the 2026-07-20 self-repair brainstorm. The load-bearing finding: **the expensive bugs were the factory lying to itself and the spec being wrong — not the code.** The frontier isn't "better patches"; it's making **truth, time, contracts, and money** first-class inputs to repair.

Cross-checked against the 2026 industry (VibeRepair = spec-repair, FailureMem = negative-knowledge, DebugHarness = runtime interrogation, Devin = "come back with proof"). Two cited "proofs" (a "verification-first Kode", a "ReasonCritic-7B") failed independent verification and were dropped — **and that catch, performed by an independent AI reviewer on our own reasoning, is this doctrine's first proof point.** It is why verify-the-factory is idea #1.

## Part 1 — The Gate Charter (the balance)

> **A mechanism may BLOCK an action only if the action is irreversible or high-blast-radius (shared contracts, money paths, secrets, production deploy). Everything else DETECTS and ROUTES.**

1. **Detect-and-route by default.** Prefer a detector that informs routing over a blocker that halts.
2. **Blockers are falsifiable.** Every hard gate ships with a test proving it *fires on real breakage* AND *passes on real success*. No unpassable checks (that failure mode already burned us — correct work blocked by a gate no code could satisfy).
3. **Every blocker has a bounded, logged override.** A human or a trust-scored path can pass it; the override is recorded, never silent.
4. **Gates earn their keep per-target.** Calibrated to where damage actually occurs, not applied universally.
5. **Governance conservation law.** A new hard gate must retire or subsume an old one. No unbounded accretion of checks.
6. **Friction cost is assigned by tier** (Part 2). Data capture is *never* a gate and is always allowed.

Anchors: SO-003 (never idle on tokens — process must not starve throughput), the standing anti-STOP-START order, and SO-001/002 (governed factory + SENTRY prove, they don't block correct work).

## Part 2 — Build order (friction-tiered)

- **Tier 0 — Seed the clock (build now; only truly unrecoverable-if-skipped).** Append-only capture. **Gates nothing.** You cannot backfill a time-series, and capture is nearly free — so every day not capturing is data future-us can never recover.
- **Tier 1 — Machine-only actions on that data (pull as data accrues).** Self-quarantine, failure-signature router, pattern propagation. No human, no throughput cost.
- **Tier 2 — Narrow hard gates (only the irreversible/high-blast-radius set).** Contract co-sign + versioning on *shared* contracts and money paths; secret/deploy gates. Each obeys Part 1.
- **Tier 3 — Human, sampling-only (deliberately rare).** Trust dashboard as *pull* view; calibration sampling. **Never approval-based.**

**Counter-warning (equal weight):** do not over-build the repair system. Only Tier 0 is unambiguously worth doing now. Tiers 1–3 are **pulled by real pain and accumulating data**, never pushed speculatively — pushing them is itself an SO-003 violation (process over throughput).

## Part 3 — Tier-0 data-capture spec (the seeds)

Six append-only stores. Each row epistemically stamped (KNOW/THINK/GUESS + confidence). Built through the governed factory (SO-001); SENTRY proves each logger writes real rows on a real event.

| Store | Purpose | Core fields |
|---|---|---|
| **Provenance ledger** | Verify every "done"/commit claim | `claim`, `commit_sha`, `is_ancestor_of_tip` (git merge-base --is-ancestor), `verified_at`, `result` |
| **Root-cause chains** | Queryable "have we seen this shape?" | `symptom`, `investigation[]`, `cause`, `fix`, `verification`, `bug_shape_signature` |
| **Fix-durability clock** | Detect illusory fixes | `fix_id`, `target`, `shipped_at`, `rebroke_at?`, `rebreak_count`, computed `half_life` |
| **Per-target reputation** | Flaky-codegen tracking | `target_path`, `attempts`, `failures`, `models_tried[]`, `hardness_score` |
| **Negative knowledge base** | Never re-try a dead approach | `target`, `approach_signature`, `failed_because`, `first_seen`, `times_seen` |
| **Factory decision log** | Verify escalation/claim honesty | `decision`, `escalation_claim`, `tier_actually_run`, `cost_tokens`, `cost_ms` |

Plus one Tier-0/1 **deterministic pre-disk resolution gate** (non-LLM, cheap): import/dependency/**founder-lane mount** resolution checked before a change is trusted — catches exactly the 2026-07-20 bug class (LifeRE sales-coach 404, phantom deps) with no model call. Detector-first; blocks only on the irreversible set per Part 1.

## Part 4 — What is genuinely ours vs. the industry

Industry (2026) verifies the **product** well (Devin proof-artifacts, spec-repair, negative-memory, adversarial verifiers). Still absent everywhere and native to our architecture:

- **Verify-the-factory** — a standing polygraph on the repair system's own self-reports (provenance ledger above). *Most novel, most justified by 2026-07-20.*
- **Cross-product immunity via a shared cognitive substrate** — one fix immunizes every product; competitors are single-repo.
- **Cognitive-Core self-model of the factory** — model the factory's own recurring blind spots (expensive; pull by evidence).
- **Revenue-weighted repair triage** — dollars-at-risk ranks the queue.
