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

- run OIL audit automatically
- generate a PBB plan automatically
- dispatch Builder automatically
- run retry or proof verification automatically
- transition jobs beyond stored state without an executor phase

## Statuses

- `queued`
- `running`
- `verifier_failed`
- `retrying`
- `blocked`
- `committed`
- `deployed`
- `proof_current`
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

## Next Phase

The next phase is a governed executor bridge:

1. take a queued command
2. run OIL/PB validation
3. dispatch Builder
4. run repair-loop verification
5. update job status with receipts
