<!-- SYNOPSIS: BUILDEROS COMMAND CONTROL PROTOCOL -->

# BUILDEROS COMMAND CONTROL PROTOCOL

## Purpose

BuilderOS Command & Control gives Adam a remote, authenticated way to:

- submit a governed BuilderOS instruction
- inspect the stored job
- cancel queued or running work
- set or clear a global halt flag

This phase is intentionally minimal.

It does not add an autonomous runner.
It does not add UI.
It does not bypass PB or useful-work guard expectations.

## Canonical Endpoints

- `POST /api/v1/lifeos/builderos/command-control/jobs`
- `GET /api/v1/lifeos/builderos/command-control/jobs/:id`
- `POST /api/v1/lifeos/builderos/command-control/jobs/:id/cancel`
- `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute`
- `POST /api/v1/lifeos/builderos/command-control/halt`
- `GET /api/v1/lifeos/builderos/command-control/halt`

All routes require `x-command-key`.

## Current Phase Behavior

Job submission stores an internal BuilderOS job record only.

The minimum safe version:

- validates the instruction
- blocks clearly insufficient instructions
- blocks obvious outside-PB boundary instructions
- respects a global halt state
- stores queued work for later governed execution

It does not yet:

- run OIL audit automatically on submit
- generate a PBB plan automatically on submit
- dispatch Builder automatically on submit
- run retry or proof verification automatically on submit

## Phase 3 — Governed Loop Execute (explicit trigger)

`POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute`

Single-job executor bridge only. No background daemon.

Flow for one `queued` job:

1. OIL deterministic boundary audit
2. BP/PBB plan generation
3. Builder dispatch via `POST /api/v1/lifeos/builder/build`
4. OIL verifier (4-gate builder output verifier)
5. One repair retry if verifier fails (replan → builder → verifier)
6. Honest status update: `committed`, `failed`, `verifier_failed`, or `blocked`

C2 remains intake/control. This endpoint is explicit runtime glue, not an autonomous brain.

## Statuses

- `queued`
- `running`
- `verifier_failed`
- `retrying`
- `blocked`
- `committed`
- `deployed` (reserved — not set by Phase 3 bridge)
- `proof_current` (reserved — not set by Phase 3 bridge)
- `cancelled`
- `halted`
- `failed`

## Safety Rules

- BuilderOS-internal only
- no AI calls on submit
- no unbounded scheduler
- no hidden automation loop
- no fake success states
- halt flag must stop new queued work from being accepted as runnable

## Future Phase

Multi-job scheduling, deploy/proof transitions, and council-based OIL critique — not Phase 3.
