<!-- SYNOPSIS: Legacy production spine (services) -->

# Legacy production spine (services)

You are in **`services/`** — the **legacy production spine** for live LifeOS on Railway.

## What this layer is

- Business logic, council routing, deployment, memory, CRM, autonomy, self-repair, etc.
- Consumed by `routes/` and booted from `startup/boot-domains.js`

## Authority

- **Live product logic** — changes can affect Railway runtime immediately after deploy.
- **Not canonical factory runtime** — new factory gates, execute-step behavior, and mission tooling belong in `factory-staging/`.

## Before extending here

1. Read `prompts/00-SYSTEM-AUTHORITY-LAYERS.md`
2. Read the owning `@ssot` amendment for the file you touch
3. Prefer builder `/build` for amendment deliverables per `CLAUDE.md` §2.11

## Salvage / ADAPT

See `docs/architecture/factory-v1-blueprint-pack/GOLDMINE_PASS_V2.md` for KEEP / ADAPT / REJECT guidance when porting into the factory.

## Do not

- Count product features here toward factory `BOOTSTRAP_AND_STAGING_READY` without explicit proof wiring
- Treat `data/*.jsonl` logs as canonical truth — they are evidence/history
