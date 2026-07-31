<!-- SYNOPSIS: 10/10 definition for BuilderOS + LifeOS Cognitive Spine, benchmarked against every comparable autonomous system. -->

# 10/10 Definition — BuilderOS + LifeOS Cognitive Spine

**Version:** 2026-08-01-0001  
**Scope:** The whole system, not any single product.  
**Benchmark date:** 2026-08-01  
**Research sources:** SWE-bench Verified leaderboards, Cognition Devin 2025 performance review, AIDev real-world PR dataset, vendor benchmark disclosures, independent agent-framework comparisons.

## What "10 out of 10" means

A 10/10 BuilderOS / LifeOS is the best autonomous, constitutionally-governed cognitive operating system for building real products that exists in practice — not in a pitch deck. It must be better than every comparable system on every dimension that matters for a founder who wants to go from intent to deployed, revenue-ready product without becoming the communication bus.

10/10 does **not** mean the system is perfect. It means no other system in the market today can honestly claim the same combination of:

1. Constitutional governance with fail-closed enforcement.
2. Separation of Mission, Responsibility, Lens/Cognitive Asset, Model, and Execution.
3. Receipt-first truth: every DONE/PASS claim is backed by a reproducible artifact.
4. Independent verification (SENTRY) with Layer A structural + Layer B real-browser walkthrough.
5. Continuous learning from reality (Wisdom) that updates model trust, lens trust, and founder intent predictions.
6. End-to-end autonomous build: intent → reasoning plan → blueprint → deployed code → verified behavior.
7. Founder-bus elimination: the founder talks to the Chair; the system talks to itself.

## Comparable systems benchmark

| System / Framework | Primary claim | Best public benchmark | What it proves | Why it is not 10/10 for us |
|---|---|---|---|---|
| **Claude Code (Claude Opus 4.5)** | Local-first autonomous coding agent | 80.9% SWE-bench Verified (CodeSOTA, 2026-03) | Strong real-world bug-fix and codebase reasoning | No constitutional governance, no product-level blueprint authority, no SENET/Receipt truth, no founder-intent capture, no revenue loop. It is an IDE tool, not an operating system. |
| **OpenAI Codex (codex-1)** | Cloud-isolated autonomous coding agent | 72.1% SWE-bench Verified pass@1; 83.8% pass@8 (OpenAI, 2025-05) | End-to-end issue resolution in sandboxed containers | No public governance model, no multi-agent responsibility separation, no deployed product proof, no continuous learning from real founder outcomes. |
| **GitHub Copilot Workspace** | GitHub-native issue-to-PR agent | 74.9% SWE-bench Verified (reported) | Tight GitHub integration | Same gaps: no Chair/Lens/Model separation, no constitution, no SENTRY Layer B, no revenue reality, no self-improvement loop. |
| **Cognition Devin** | Autonomous software engineer | 13.86% SWE-bench (2024); 67% PR merge rate (2025 annual review); 4x faster problem solving | Real-world PRs at scale, infinite parallelism | No public constitutional enforcement, no receipt/SENET truth layer, PRs still require human review/merge, no product-building governance, no cognitive-asset marketplace. |
| **SWE-Agent / OpenHands** | Open-source agent frameworks | ~70% SWE-bench Verified with Claude Opus 4 (vexp, 2025) | Strong scaffold for coding benchmarks | Framework, not product; no governance, no reasoning-plan/lens separation, no real-world product revenue. |
| **Lovable / Emergent / v0** | Vibe-coding app builders | $100M ARR (Emergent, Sacra 2026); 50M projects (Lovable) | Generate and deploy full-stack apps from chat | No evidence of constitutional role separation, no proof-of-execution receipts, no SENTRY verification, no continuous learning from outcomes, no model/lens trust ledger. |
| **AgentMesh / AgentOrchestra / AutoGen / CrewAI / LangGraph / OpenAI Swarm** | Multi-agent orchestration | Case-study / framework-level only | Planner/Coder/Debugger/Reviewer separation; graph/crew orchestration | No governance constitution, no receipt truth, no deployed-product proof, no founder-intent model, no revenue reality, no SENET Layer B. |
| **aegntic/cognitive-os** | Cognitive OS specification | 4 GitHub stars, 106 tests passing, 9 open issues (2026-06) | Similar *specification* of cognitive layers and verification chain | Not deployed; no real product, no real founder, no real receipts, no SENET, no revenue. A spec is not a running system. |

## Key benchmark conclusions

- **SWE-bench Verified is saturated at ~80%** for the strongest single-agent coding agents. That is a necessary but not sufficient condition for our 10/10.
- **No existing system publishes a constitutional governance layer** that is fail-closed in code.
- **No existing system separates reasoning into Mission → Responsibility → Lens → Model → Execution** while keeping them independently verifiable.
- **No existing system proves every DONE claim with a receipt** that can be independently replayed.
- **No existing system closes the loop from real product outcomes** (revenue, user behavior, deploy health) back into model/lens/founder-philosophy trust.

Therefore, 10/10 for BuilderOS / LifeOS is not "score higher on SWE-bench." It is **build the first system that combines SWE-bench-class autonomous coding with constitutional governance, receipt truth, independent verification, and continuous reality-based learning** — and prove it with deployed, measurable outcomes.

## 10/10 scoring rubric

| Dimension | Weight | 10/10 means | Current honest estimate | How we measure it |
|---|---|---|---|---|
| **Governance intent** | 15% | The Constitution is mechanically enforced; no claim passes without proof; no self-certification. | 9/10 (strong docs, some wiring gaps) | `lifeos:bp-priority:verify`, `audit-false-done-steps.mjs --ci`, receipt-truth audit |
| **Mechanical enforcement** | 15% | File-placement gates, step-status gates, never-stop loop, SENTRY all run on every path. | 8/10 (gated commit paths exist; some components unwired) | `builder:preflight`, `verify-never-stop-gate.mjs`, SENTRY smoke |
| **Receipt truth** | 15% | Every DONE/PASS has a replayable receipt; FAILs auto-reopen steps; no `verify_command` theater. | 8/10 (Receipt Auditor exists, auto-reopen not wired) | `receipt-auditor.test.js`, `replay-receipt.mjs --sample` |
| **Cognitive architecture** | 20% | Chair/Lens/Model/Execution separation is the live path for every mission; lenses are measurable cognitive assets. | 6/10 (modules exist, not wired into `runChairNativeTurn`) | `cognitive-chair.test.mjs`, real `founder_decision_log` + `model_capability_ledger` rows |
| **Self-learning** | 15% | Wisdom updates lens trust, model trust, and founder-intent predictions from real outcomes. | 6/10 (loop exists, starved for live data) | `wisdom-update-lens-trust.mjs --dry-run`, `model-roi-report.mjs` |
| **Autonomous completion** | 15% | Idea → founder packet → blueprint → deployed code → SENTRY PASS with no human design decisions. | 8/10 (FACTORY-DEMO-SAMPLE-0001 proved it) | `run-factory-demo-sample.mjs`, deploy SHA parity, SENTRY PASS receipt |
| **Revenue reality** | 5% | Real product money moves through the system and is verified by SENTRY. | 2/10 (blocked on Stripe/email credentials) | `verify-smos-live-charge.mjs` READY, first $49 transaction receipt |

**Target composite:** 10/10 when the weighted score is ≥ 9.5 and **no dimension is below 7/10**.

## What blocks 10/10 today

1. **Cognitive spine is not wired into the live conversation.** `services/cognitive-chair.mjs` and `cognitive-step-runner.mjs` are real, tested, and disconnected from `services/chair-lumin-unified.js#runChairNativeTurn`.
2. **Founder decisions are not captured live.** `services/founder-intent-model.js#recordFounderDecision` is only reachable by manual backfill.
3. **Model calls are not scored.** `services/model-capability-ledger.js` has 7 of 9 roles unwired.
4. **SENTRY and Receipt Auditor auto-reopen are not in the dispatch path.** They exist as standalone tools.
5. **SMOS revenue loop awaits external credentials.** This is correctly scoped as a product-stage blocker, not a builder-stage failure.

## 10/10 ratification gate

The system is 10/10 when all of the following are true and independently replayable:

- `npm run builder:preflight` passes.
- `npm run lifeos:bp-priority:verify` passes.
- A real LifeOS conversation turn triggers `composeReasoning()`, produces a Reasoning Plan, and writes rows to `founder_decision_log` and `model_capability_ledger`.
- A real product mission goes from founder intent → blueprint → `run-factory-demo-sample.mjs`-style deploy → SENTRY PASS → Wisdom update without the founder relaying messages.
- `OBJECTIVE_VERDICT.json` for this mission reports `rating_current: 10` and `verdict: TECHNICAL_PASS` with a real receipt path.
- The founder confirms (one button or one word) that he did not have to act as the communication bus for that mission.

## Sources

- SWE-bench Verified leaderboards: https://www.swebench.com/verified, https://leaderboard.steel.dev/, https://hal.cs.princeton.edu/swebench_verified_mini
- Devin SWE-bench technical report: https://cognition.ai/blog/swe-bench-technical-report
- Devin 2025 performance review: https://cognition.ai/blog/devin-annual-performance-review-2025
- AIDev dataset / "Rise of AI Teammates in SE 3.0": https://arxiv.org/html/2507.15003
- OpenAI Codex benchmark coverage (Neura Market / Sean Kim blog)
- Multi-agent framework comparisons: AgentMesh, AgentOrchestra, CrewAI, LangGraph, OpenAI Swarm, AutoGen academic and blog sources
- Product-builder ARR claims: Sacra (Emergent), AIBase / Kaowpodz (Lovable)
- Comparable cognitive-OS spec: https://github.com/aegntic/cognitive-os
