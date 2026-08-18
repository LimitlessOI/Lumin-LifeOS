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

---

## Founder Directive — 2026-08-17 — Single Overlay Blueprint + Build Now

This directive governs the next Overlay architecture/build cycle and is part of the existing mission authority. It does **not** create a second queue.

1. **Uniqueness audit first.** Architect must inventory every artifact that claims current blueprint authority for Taloa / Universal Overlay, including this mission blueprint and any sealed/amended predecessor artifacts. There must be exactly **one current canonical Overlay blueprint** after the review. Historical, superseded, partial, and planning artifacts may remain only if explicitly marked non-authoritative/history.

2. **Reality test the current blueprint.** Compare the current blueprint against the founder's present Point B: Taloa Overlay must become a practical universal interaction layer, beginning with the ability to observe and operate a real browser/ChatGPT session, carry on a bounded conversation with the Chief Architect/Conductor, use multiple control trees/fallbacks, verify results, update context/history, and continue without requiring the founder to click every ordinary control.

3. **If the current blueprint is materially stale, incomplete, contradictory, or optimized for an obsolete Point B, do not let factories patch around it.** Return it to Architecture. Preserve it in history with a clear `SUPERSEDED` / `ARCHIVED` disposition and provenance. Architecture must author the replacement decision tree and acceptance criteria before manufacturing resumes.

4. **If the current blueprint is still sufficient, keep it as the single authority and continue from its next lawful unfinished slice.** Do not create a parallel Overlay blueprint merely to rename or restate the same work.

5. **Factories build; factories do not redesign.** Costello may consume up to three independent pre-authored Overlay slices concurrently (`COSTELLO-C1/C2/C3`) only when the canonical blueprint exposes those independent slices. Factories must never invent work to fill lanes.

6. **Build priority after architecture disposition:** finish the live control loop:
   `browser/Chrome session -> Taloa observation -> identify current actionable control -> bounded action -> verify result -> update context/history -> continue`.
   Required interaction trees/fallbacks: DOM/accessibility, browser/Chrome automation controls, visual/coordinate fallback, keyboard fallback, plus app-specific hooks where appropriate.

7. **Acceptance must prove real behavior, not file presence.** A technical file/syntax pass is insufficient for the current Point B. The canonical acceptance must include a real authenticated-session proof that Taloa can perform a bounded conversational loop with ChatGPT/Chief Architect or else emit a concrete typed blocker explaining exactly why not.

8. **No deception.** Until the real-session acceptance passes, status must remain partial/not-proven. Architecture, factories, receipts, and supervisors may not label the Overlay autonomous, complete, deployed, or working end-to-end without direct evidence.

9. **Single scheduler authority remains `builderos-reboot/BP_PRIORITY.json`.** This directive changes architecture/build disposition for Overlay; it does not authorize a second mission queue.

10. **Outcome required:** Architect records one of exactly two dispositions before the next manufacturing cycle:
    - `KEEP_CANONICAL_AND_BUILD` — identify the one canonical blueprint and the next lawful Overlay slices; or
    - `SUPERSEDE_AND_REBLUEPRINT` — archive/supersede the inadequate authority artifact(s), author one replacement canonical blueprint, then release its pre-authored slices to Costello.

The founder's current priority is execution: resolve blueprint authority quickly, then keep Costello building Overlay toward the live interaction Point B.