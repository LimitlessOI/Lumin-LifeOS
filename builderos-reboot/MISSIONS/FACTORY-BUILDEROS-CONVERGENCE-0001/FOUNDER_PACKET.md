<!-- SYNOPSIS: Mission 2 — BuilderOS Convergence founder packet. -->

# Mission 2 — BuilderOS Convergence

## Status

In progress — Phase 0: Stop false completion.

## One-line mission

Use everything learned in Missions 1–1.7 to evolve BuilderOS from an AI-assisted coding workflow into a **self-improving, blueprint-faithful, decision-quality system**.

> BuilderOS is no longer primarily building software.  
> BuilderOS is now building itself.

## Immediate focus: Phase 0 — Stop false completion

Before broader convergence work, BuilderOS must stop certifying false work as complete. The directly evidenced failures are:

1. A generated file can be sealed even when it imports a named export that does not exist.
2. A generated file can be sealed even when it queries a SQL table that does not exist.
3. A proven-wrong seal has no auditable revocation path.
4. Rejected content can return and reseal unchanged.
5. Manual `blocked` steps can auto-revive unless escalation fields are explicitly set.
6. Manually repaired files can be regenerated and overwritten by the same broken content.

Phase 0 is authorized by `builderos-reboot/DECISIONS/DECISION-0001.md`.

## Design principles

1. Every change should increase BuilderOS's ability to improve itself.
2. Every change should reduce founder workload. Never increase founder workload unless unavoidable.
3. Every repetitive manual task should become BuilderOS work. Adam should never again become the communications bus between AI systems.
4. Every implemented capability should create measurable leverage. Not more architecture. More leverage.
5. BuilderOS should optimize for reality. Not reports. Not elegance. Reality. Revenue. Users. Deployments. Successful automation.
6. When forced to choose, prefer simplicity, mechanical enforcement, observability, revenue, and learning over abstraction, documentation, and theoretical completeness.

## Mission 2 Success Test

Mission 2 succeeds only if BuilderOS becomes measurably better at building BuilderOS:

- Fewer founder interventions per mission.
- Fewer manual handoffs between agents.
- Faster verified implementation from intent to deploy.
- Stronger mechanical governance.
- Improved autonomous decision quality.
- Faster path to customer value.
- Shorter path to sustainable revenue.
- **Mission 3 is dramatically easier than Mission 2.**

## Phase order

| Phase | Title | Why it comes here |
|-------|-------|-------------------|
| P0 | Stop false completion | The system is currently sealing factually broken work. All later work depends on stopping this first. |
| P1 | Builder Readiness Audit | Once seals cannot lie, audit the blueprint-manufacturing system for completeness before building more. |
| P2 | Independent reasoning and consensus | Resolve blueprint ambiguities with sealed per-role reasoning and evidence-based convergence. |
| P3 | Minimum blueprint-authority vertical slice | Prove the end-to-end manufacturing chain on one bounded step. |
| P4 | Gate every construction and shipping path | Wire the authority system to Devin, Cursor, agents, commits, PRs, CI, deploy, schedulers. |
| P5 | Sentry conformance and reality testing | Sentry independently verifies both blueprint conformance and real-user outcomes. |
| P6 | Protected SMOS revenue-loop closure | Execute the revenue lane only after the authority spine is proven. |
| P7 | Decision-aware Wisdom, scorecard, runtime convergence, Collaboration Spine, and Mission 3 handoff | Close the learning loop and hand off to Mission 3. |

## Hard laws

1. Do not optimize for passing Mission 2. Optimize for making Mission 3 dramatically easier.
2. Blueprint authority is not optional. If implementation diverges from the approved digital twin, the system must detect, escalate, and require re-approval.
3. Independent reasoning before consensus. No role sees another role's proposed solution before completing its own reasoning.
4. Founder is not the message bus. Every finding, decision, and handoff lives in a durable, verifiable artifact.
5. No theater. No surface may imply completion without proof.
6. Prefer mechanical enforcement. If a principle is important, make it cheaper to follow than to bypass.

## Non-goals

- No real-time AI chat room.
- No second active queue.
- No Chair redesign from scratch; preserve the SO-003 regression test.
- No email-provider migration until a provider is configured and verified.
- No manual patching around BuilderOS.
- No new comprehensive audit beyond the readiness audit; build only what enforces and verifies convergence.
- No broad refactor of unrelated systems.

## Authority and canonical files

- `builderos-reboot/DECISIONS/DECISION-0001.md` — Phase 0 consensus decisions.
- `builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/BLUEPRINT.json` — machine twin.
- `docs/products/PRODUCT_REGISTRY.json` — canonical product homes.
- `builderos-reboot/BP_PRIORITY.json` — active product queue.

## First instruction

Begin with Phase 0 only. Verify every cited baseline fact against current `origin/main`. Record the exact commit SHA. Create the decision record. Then implement WP0.1–WP0.5 with behavioral tests before claiming Phase 0 closed.
