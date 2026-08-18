<!-- SYNOPSIS: Founder Packet — Taloa Overlay Phase 1 foundation layer plus founder-directed A-to-Z completion authority. -->

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

---

# Founder Directive — 2026-08-17 — FINISH OVERLAY A TO Z

The mission is no longer satisfied by a Phase-1 technical pass. The founder directs Architecture and Costello to finish Taloa Overlay from current reality all the way to a working, real-session, end-to-end Point B. This section defines the A-to-Z completion path that Architecture must encode into the **one canonical Overlay blueprint**. Factories may only execute slices once Architecture has pre-authored them.

## A — Authority and Blueprint Uniqueness
- Inventory every current/superseded Overlay blueprint-like artifact.
- Select exactly one current canonical blueprint path.
- Mark every competing predecessor `SUPERSEDED`, `ARCHIVED`, or historical-only with provenance.
- Keep `builderos-reboot/BP_PRIORITY.json` as the sole scheduler queue.

## B — Baseline Reality
- Record what actually exists today: native macOS body, browser extension/body, Android body, overlay host, watch supervisor, click engine, services, stores, receipts, routes, deployment state.
- Classify each claim FACT / INFERENCE / HYPOTHESIS / UNKNOWN.
- Do not treat previous technical PASS receipts as end-to-end proof.

## C — Core Shared Services
- Finish the shared store/service foundation already begun in Phase 1.
- Reuse canonical stores where available; create only architect-authorized net-new structures.
- Make every service callable, tested, and receipt-producing.

## D — Device / Body Registry
- Every controllable body/browser/device must register identity, capabilities, availability, and health.
- Taloa must know which body can perform which action.

## E — Environment Observation
- Observe the active UI/session and build a structured scene/state representation.
- Detect current page/app, visible controls, active composer/input, dialogs, permission prompts, current execution frontier, and latest result state.

## F — Fallback Interaction Trees
Implement and verify multiple independent control paths, in this order unless the environment requires otherwise:
1. DOM / accessibility semantics.
2. Browser / Chrome automation controls.
3. App-specific hooks.
4. Visual / coordinate targeting.
5. Keyboard navigation / shortcuts.
Failure of one tree must permit bounded fallback to the next rather than silent abandonment.

## G — Grounded Target Selection
- Choose the current actionable control from observed evidence.
- Prefer the bottom-most/current execution frontier for ChatGPT approval flows.
- Reject stale/historical approval cards and stale action targets.
- Never click indiscriminately.

## H — Human Authority and Safety
- Respect explicit founder-only decisions, credential boundaries, irreversible actions, financial commitments, destructive actions, and external communications requiring human authority.
- Ordinary bounded UI interaction should not require founder clicking when already authorized.

## I — Intent Interpreter
- Convert founder/conductor natural-language intent into bounded executable actions.
- Preserve task context, constraints, success condition, and prohibited actions.

## J — Job / Task State Machine
Each action loop must have explicit states such as:
`OBSERVE -> SELECT -> ACT -> VERIFY -> UPDATE_CONTEXT -> CONTINUE`
with typed exits:
`POINT_B_REACHED`, `FOUNDER_DECISION_REQUIRED`, `HARD_CAPABILITY_BLOCKER`, `BLUEPRINT_EXHAUSTED`.

## K — Keyboard Control
- Provide reliable keyboard fallback for navigation, focus, typing, submission, escape/cancel, and app shortcuts.
- Verify focus before sending keystrokes.

## L — Live ChatGPT Conversation Loop
Prove Taloa can operate a real authenticated ChatGPT browser session:
- locate the correct conversation,
- read latest visible state sufficiently to decide whether action is needed,
- type a bounded continuation/instruction into the composer,
- submit it,
- wait while ChatGPT is working,
- detect completion or permission frontier,
- approve only the current lawful approval when authorized,
- observe the resulting reply,
- continue the conversation without founder clicking every ordinary control.
This is the first mandatory real-session Point-B proof.

## M — Memory / Context Update
- After material state change, update compact operating context and durable history/provenance.
- Do not repeatedly inject stale context.
- Preserve the founder's actual decisions and the system's evidence-based state.

## N — Navigation Across Apps / Sites
- Generalize from ChatGPT to multiple browser tabs/sites/apps.
- Resolve target app/site/window before acting.
- Support bounded switching, opening, navigation, and return-to-origin.

## O — Observability / Runtime Truth
- Expose live status for Overlay runtime and active bodies: heartbeat, current commit/build, current task/slice, last action, last verified result, blockers, receipts.
- Abbott/observability work may support this, but Overlay itself must emit the necessary truth events.

## P — Permission and Prompt Handling
- Detect permission prompts and confirmation dialogs.
- Distinguish current frontier from historical prompts.
- Apply explicit policy for auto-approve vs founder-required decision.
- Receipt every approval/denial.

## Q — Quality / Confidence
- Every target-selection/action decision must carry confidence/evidence.
- Low confidence routes to fallback observation or typed blocker, not random action.

## R — Result Verification
- Never treat a click/type/send as success by itself.
- Verify resulting UI/state change and compare against the action's acceptance condition.
- If verification fails, retry only within bounded policy, then escalate/fallback.

## S — Supervisor
- Finish Watch Supervisor as an event-driven supervisor, not timer spam.
- If ChatGPT is working: wait.
- If current authorized approval frontier exists: act once and verify.
- If turn is complete and Point B is not reached: send bounded continuation.
- If founder attention is required: surface it clearly; read-aloud may be used where available and proven.

## T — Task Receipts
- Emit structured receipts for observation, selected action, target evidence, action execution, verification, fallback path, blocker, and terminal state.
- Receipts must support reconstruction of what happened without trusting prose summaries.

## U — Universal Action Vocabulary
- Support a bounded universal vocabulary: click/tap/press, type, focus, select, scroll, navigate, open/close, submit, copy/paste, inspect/read, wait, switch target, back/forward, refresh, and app-specific bounded actions.
- Extend only through Architecture-approved capability definitions.

## V — Visual Control
- Provide visual/coordinate fallback for cases where semantic controls are unavailable.
- Couple visual targets to screenshots/scene evidence and post-action verification.
- Avoid blind coordinate replay when layout has materially changed.

## W — Workflows Beyond ChatGPT
After ChatGPT loop proof, validate at least representative multi-step workflows such as:
- developer/programming workflow,
- research/data-entry workflow,
- e-commerce/admin workflow,
- sales/CRM workflow,
without claiming general universality until each capability class is evidenced.

## X — Cross-Environment Resilience
- Recover from stale DOM nodes, navigation, tab changes, reloads, login/session expiry, overlays/modals, focus loss, and intermittent control-path failure.
- Resume from observed state rather than blindly replaying previous actions.

## Y — Yield / Revenue Readiness
- Once the live control loop is proven, package the first revenue-use workflow under founder direction.
- Do not let revenue workflow design block the core A-to-Z interaction proof, but ensure the completed Overlay can be used for real paid work under founder authority.

## Z — Zero-Deception End-to-End Acceptance
Overlay is not COMPLETE until a real authenticated end-to-end test proves:
1. Taloa attaches to the real target session/body.
2. Taloa observes current state.
3. Taloa selects the correct current control.
4. Taloa acts through at least the primary interaction tree and demonstrates fallback capability where testable.
5. Taloa verifies the result.
6. Taloa updates context/receipt history.
7. Taloa continues the ChatGPT conversation autonomously through multiple turns or reaches a typed terminal state.
8. Founder does not have to perform ordinary authorized clicks/typing during the proof.
9. Runtime observability shows what it is doing in near real time.
10. The acceptance receipt identifies exact environment, commit, session proof, actions, verifications, failures/fallbacks, and final verdict.

## Manufacturing order and lane use
Architecture must convert the A-to-Z path above into pre-authored executable slices in the single canonical Overlay blueprint. Costello uses `COSTELLO-C1/C2/C3` concurrently only for slices whose dependencies make them genuinely independent. Suggested independent early workstreams, subject to Architecture's dependency graph, are:
- C1: observation + target selection + verification core,
- C2: browser/Chrome + DOM/accessibility + keyboard interaction trees,
- C3: Watch Supervisor + ChatGPT conversation adapter + receipt/observability integration.
These are not separate queues and are not authorization for factories to invent missing slices.

## Completion rule
Do not stop because the old Phase-1 verification command passes. Do not stop because all currently listed slices are consumed if Point B still fails. If the canonical blueprint exhausts before Z passes, factories fail closed with `BLUEPRINT_EXHAUSTED` and Architecture immediately authors the missing lawful continuation. The mission ends only when Z is directly proven or a genuine founder decision/hard capability blocker is surfaced.

The founder's instruction is: **finish the Overlay from A to Z. Keep Costello building it. Architecture owns the whole decision tree; Costello executes it.**