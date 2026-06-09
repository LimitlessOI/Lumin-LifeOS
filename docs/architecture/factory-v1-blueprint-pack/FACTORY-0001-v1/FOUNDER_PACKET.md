# Founder Packet

## Mission
Build the minimal Factory v1 execution slice inside the current repo without changing existing product behavior.

## Objective
Prove one end-to-end governed execution path:

Founder Packet
-> BPB handoff pack
-> Builder executes one frozen step
-> SENTRY verifies result
-> Historian records outcome
-> TSOS records metrics

## Required outcome
Create an isolated implementation under `factory-v1/` that exposes one route:

- `POST /api/v1/factory/execute-step`

This route must:
- accept exactly one frozen step object
- execute only the allowed action in that step
- verify the result against blueprint-owned acceptance tests
- record Historian receipt
- record TSOS receipt
- return only `DONE`, `BLOCKED_RETURN_TO_BPB`, or `FAILED_VERIFICATION`

## Hard non-goals
- no autonomous work selection
- no support-task generation
- no fallback generation
- no patch-plan generation
- no self-improvement loop
- no product feature work
- no edits to existing BuilderOS planning logic in this mission

## Constraints
- use ESM
- use ASCII only
- keep new implementation isolated under `factory-v1/`
- all Builder writes must resolve inside `factory-v1/`
- Builder must have zero task discretion
- if spec is insufficient, Builder must return `BLOCKED_RETURN_TO_BPB`
- proof execution acceptance tests must be loaded from a blueprint-owned local registry, not caller input

## Honest proof-slice naming
For this proof mission only:
- Historian capability is limited to receipt recording
- TSOS capability is limited to metrics recording

## Definition of done
Mission is done only when a sample frozen step can pass through the full route and produce:
- Builder result
- SENTRY verification result
- Historian receipt
- TSOS receipt
- exact output file content equal to blueprint-required content
