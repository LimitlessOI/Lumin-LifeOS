<!-- SYNOPSIS: Devin execution host handoff for BuilderOS -->

# Devin Handoff

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Purpose** | External execution-host handoff for BuilderOS |
| **Machine packet** | `builderos-reboot/governance/DEVIN_EXECUTION_PACKET.json` |
| **Primary authority** | `docs/products/builderos/OB_EXECUTION_LADDER.md` |
| **Last Updated** | 2026-07-18 — added branch-reachability preflight requirement (`scripts/verify-branch-pushed.mjs`) and made the queue's blueprint-only-sequencing rule explicit, both founder-ratified after a live handoff gap on this exact branch. |

## What this is

This file exists so Devin can be used as an execution host without rebuilding the operating context from chat.

Devin is not the source of truth.

The repo remains the source of truth.

## Manual boundary

These are the only things that still require founder action outside the repo:

1. sign in to Devin
2. connect the GitHub account / org
3. grant repo access
4. enter secrets into Devin
5. start the first session

Everything else in this handoff is prepared repo-side.

## Required secrets

Minimum secrets for the current BuilderOS recovery path:

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `DATABASE_URL`
- `COMMAND_CENTER_KEY`

Add more only if the exact mission proves it needs them.

## Authority order

Devin must read in this order:

1. `docs/products/builderos/PRODUCT_HOME.md`
2. `docs/products/builderos/OB_EXECUTION_LADDER.md`
3. `builderos-reboot/governance/OB_EXECUTION_LADDER.json`
4. `builderos-reboot/AGENTS.md`
5. `builderos-reboot/BP_PRIORITY.json`
6. `builderos-reboot/HANDOFF.md`
7. `builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/FOUNDER_PACKET.md`
8. `builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/BLUEPRINT.json`
9. `builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/OBJECTIVE_VERDICT.json`

## Current real blockers

These are not guesses. These are the known blockers from the failed local run:

- local `.env.builderos` is empty
- local OpenAI lane is not operational
- `GITHUB_TOKEN` missing in the execution environment
- `GITHUB_REPO` missing in the execution environment
- canonical runner repeated `FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001` without progress
- repair persistence was skipped because GitHub credentials were missing

## Environment setup prompt

Paste this as the first Devin setup task:

```text
Set up the execution environment for this repo.

Repo: Lumin-LifeOS

Goal:
- make the canonical BuilderOS execution lane operational

Authority order:
1. docs/products/builderos/PRODUCT_HOME.md
2. docs/products/builderos/OB_EXECUTION_LADDER.md
3. builderos-reboot/governance/OB_EXECUTION_LADDER.json
4. builderos-reboot/AGENTS.md
5. builderos-reboot/BP_PRIORITY.json

Required proof commands:
- npm run builderos:openai:smoke
- npm run builder:preflight:fast
- npm run builderos:bp-priority:once

Rules:
- do not explore broadly
- do not write architecture docs first
- do not call the system operational unless the smoke command passes
- report exact blockers if env setup fails
```

## Execution prompt

Once the environment is green, paste this as the first real execution task:

```text
You are execution, not strategy.

Authority order:
1. docs/products/builderos/PRODUCT_HOME.md
2. docs/products/builderos/OB_EXECUTION_LADDER.md
3. builderos-reboot/governance/OB_EXECUTION_LADDER.json
4. builderos-reboot/AGENTS.md
5. builderos-reboot/BP_PRIORITY.json
6. builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/

Current real blockers:
- local OpenAI lane was not operational
- repair persistence failed because GITHUB_TOKEN and GITHUB_REPO were missing
- canonical runner was stuck repeating FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001

Do this in order:
1. prove builderos:openai:smoke
2. prove repair persistence works
3. clear the repeat-fail loop on FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001
4. resume canonical BP execution
5. write truthful receipts only

Required output:
- exact blocker found
- exact fix applied
- exact proof command run
- receipt path updated
- next queue state
```

## Two-hour kill test

If you want to decide quickly whether Devin is worth keeping on this repo, use this:

### PASS if at least 3 are true within 2 hours

- `builderos:openai:smoke` passes
- repair persistence is restored
- the repeat-fail loop is broken
- a new truthful receipt is written
- `BP_PRIORITY` advances or the active blocker count materially drops

### FAIL if after 2 hours it is still

- looping the same mission
- skipping repair commits
- missing execution env
- writing no new truthful receipt
- leaving queue state unchanged

## Non-negotiables

- Blueprint authority outranks chat.
- **The queue takes ONLY from the blueprint. It makes zero product/scope decisions — its only judgment call is sequencing (where in the blueprint we are, continue from there).** A founder request ("I want X done, change this and this") does not enter a queue directly: it goes through Chair → Architect review → gets added to the BP, and only then — unless the founder says otherwise — goes to the top of the queue as the next thing worked on. **If a queue step is ever ambiguous enough to require a judgment call, that is not the queue's decision to make — it is proof the blueprint under-specified the step. Escalate to Architect and fix the BP; never let the queue/planner improvise a decision to fill the gap.** (Founder-ratified 2026-07-18.) Full doctrine: `FACTORY_REBUILD_MANIFEST_V1.md` §16 (D6).
- Builder must not make strategic decisions.
- **Before writing "already done, just verify" (or any claim that work exists on a branch/commit another session must reach), run `node scripts/verify-branch-pushed.mjs --branch <name>` and paste its exact output.** Observed live 2026-07-18: a handoff claimed a branch "already exists and has uncommitted work" — true on the authoring session's own disk, but never pushed to origin, so the receiving agent (different machine) couldn't reach it and spent multiple rounds discovering that before the branch was actually pushed. Prose claims about what's "already done" are not verifiable across sessions; a pasted commit SHA is.
- No false green.
- No soft “working on it” if the queue is still stuck.
- If a blocker is infrastructure, say infrastructure.
- If a blocker is blueprint weakness, say blueprint weakness.
- If no progress occurred, say no progress occurred.

## Recommendation

Use Devin as an execution host.

Do not let Devin redefine the repo’s authority stack.
