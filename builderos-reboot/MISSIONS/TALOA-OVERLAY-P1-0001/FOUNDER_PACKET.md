<!-- SYNOPSIS: Founder Packet — Taloa Overlay Phase 1 foundation layer: seven store bindings and eight services from the sealed blueprint. -->

# Founder Packet — Taloa Overlay Phase 1 Foundation

**Mission ID:** `TALOA-OVERLAY-P1-0001`
**Locked:** 2026-08-12 (Adam: "get this fucking thing done, you oversee it. Make sure the system's building... That thing should never, ever stop building what I fucking asked it to build. And if it does, you tell me.")

## Priority

Rank 30 — the single named top priority. The Taloa Overlay blueprint reached
`MANUFACTURING_AUTHORIZED` and then sat for two days with nothing built. The
authorization was real; the executable mission pack behind it never existed,
so the factory had nothing to run. This mission is that missing artifact.

## Problem

Taloa today is three unconnected bodies with no shared foundation: a native
macOS app that can see and click, a browser extension, and an Android driver,
with no common store layer, no shared perception fusion, and no receipt spine
underneath them. Every later phase of the Overlay — capability registry,
semantic perception, template replay, delegated authority — assumes a Phase 1
foundation that does not exist as code. Planning cannot proceed past a layer
that is still a document.

## Desired Outcome

Phase 1 exists as real code: seven store bindings and eight services under
`services/taloa/`, each matching the frozen `factory_signature` sealed in
`products/artifacts/OVERLAY_AMENDED_BLUEPRINT.json`.

Five of the seven store steps bind to existing canonical tables
(`lifeos_tasks`, `agent_task_authority`, `security_receipt_spine`,
`memory_capsules`, `user_preferences`) and create nothing new — the
Architect's reuse-first resolution. Only two tables are net-new:
`overlay_view_templates` and the DeviceRegistry table.

This is a foundation lap. It is deliberately **not** wired to any route and
grants no Body any new capability, because blueprint §45a Gate 0 is still
open. Construction with an open gate is safe only because nothing here
becomes reachable.

## FOUNDER SUCCESS TEST

`node scripts/verify-universaloverlay.mjs` passes: all 15 target files exist,
each service exports the exact factory named in its sealed contract, and each
contract's `test_assertions` resolve to real callable methods rather than
stubs that throw.

## Out of scope

- No route mounting, no `server.js` change, no capability grant
- No change to the native app under `native/macos-overlay/`
- No table beyond the two named above
- No modification of any existing service, route, or migration
- No new npm dependency

## Unacceptable result

A layer reported as built while a Body's capability silently widened, or an
acceptance script that passes by checking files that already existed.

## Acceptance command

```bash
node scripts/verify-universaloverlay.mjs
```
