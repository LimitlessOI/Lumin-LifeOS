<!-- SYNOPSIS: Founder packet for BuilderOS autonomy closure -->

# Founder Packet

## Mission

Close the gap between the BuilderOS architecture we decided on and the system that actually exists in this repo today.

Do not add new departments.
Do not add new theater.
Do not add a second queue.
Do not build new product features as a substitute for fixing the build machine.

The mission is to make BuilderOS itself able to:

1. take product intent from the canonical product home and blueprint queue,
2. build from blueprint authority instead of improvisation,
3. detect its own misses,
4. repair or escalate without silently stopping,
5. keep receipts and twins synchronized with reality,
6. prove itself through the same founder UI Adam uses,
7. and continue until Point B is actually reached or founder stop is invoked.

## Current Point B

Current Point B remains the canonical lock in `builderos-reboot/POINT_B_TARGET.json`:

- Point B mission: `PRODUCT-LIFERE-OS-V1-0001`
- Point B label: `LifeRE Alpha`
- Point B is not complete while `founder_usability_pass` remains `false`

## Problem Statement

BuilderOS currently has real useful pieces, but it still lies to itself in a few load-bearing ways:

- the scheduler can say `healthy idle` / `no_work` while Point B is not founder-complete,
- `TECHNICAL_PASS` is being treated as more complete than it is,
- self-repair law is weaker than the founder doctrine,
- some receipts lag behind live truth,
- improvement logic is advisory where it should be enforceable,
- UI proof and runtime proof are not yet the same thing as machine-ready proof.
- Builder can report a repair/build `PASS` without proving commit transport.
- GitHub truth and Railway runtime truth can drift while the system still sounds green.
- API-level and scripted UI probes can pass while the exact founder flow still fails.

## Required Outcome

Produce and later execute a closure blueprint that makes all of the following mechanically true:

1. Queue truth
   Point B cannot be declared complete from `TECHNICAL_PASS` alone.
2. Builder truth
   Coder makes no strategic, product, UX, scope, or acceptance decisions.
3. Self-repair truth
   Every attempt reviews prior lessons.
   Every attempt records what it tried and why.
   After repeated failure the system escalates with added context, research, and consensus.
4. Receipt truth
   Reality changes must update the relevant receipts, queue state, and twin/state artifacts.
5. UI truth
   Alpha proof must be exercised through the real founder UI path, not only backend routes.
6. Authority truth
   Active runtime authority stays on the product-home / queue / point-B chain.
   History stays history.
7. Certification truth
   `FULLY_MACHINE_READY` stays false until same-tier determinism, founder-UI proof, and closure acceptance all pass.
8. Build transport truth
   No build/repair may claim `PASS` unless it proves:
   - the exact commit SHA,
   - the commit reached `origin/main`,
   - and the required deploy/runtime follow-through state is explicit.
9. Deploy truth
   Runtime proof beats claimed commit proof.
   If Railway still serves an older deploy SHA, the system must say the fix is not live.
10. Architect truth
   Future ARC handoffs must produce both architecture judgment and machine-execution output.
11. SNT truth
   SNT must explicitly attack founder-surface deception, transport truth, stale authority, and soft acceptance wording every time.
12. Studio truth
   Studio must own enforceable founder-usability and interaction-quality artifacts.
13. Promotion truth
   Better answers found by ARC or SNT must be promoted into canonical authority or explicitly rejected with reason.

## Hard Laws For This Mission

### 1. No Theater

No document, route, UI message, receipt, or status surface may imply completion if proof has not happened.

### 2. Partial Truth Is Not Truth

A statement is not true because most of it is true.
If the omitted or false part changes meaning, confidence, authority, or action, the statement is deceptive.

### 3. Builder Makes No Unauthorized Decisions

Builder / Coder executes frozen blueprint authority only.
If a step would force product, architecture, UX, scope, acceptance, or priority judgment, Builder must return blocked.

### 4. Point B Beats Technical Pass

Point B completion is defined by the founder success test, not by code existing, tests passing, or a technical receipt alone.

### 5. The Blueprint Is The Queue

`builderos-reboot/BP_PRIORITY.json` remains the only active product queue.
No secondary orchestration queue may be introduced.

### 6. Self-Repair Must Escalate Honestly

Every attempt must:

- review prior attempt lessons,
- review relevant receipts,
- review relevant local code truth,
- and record what changed from the prior attempt.

Escalation law for repairable failures:

1. Attempt 1: same-tier repair
2. Attempt 2: same-tier repair with explicit lessons carry-forward
3. Attempt 3: expanded repair with research + consensus context
4. If still blocked: add another model/authority tier and repeat the same three-attempt pattern

The system may not silently stop on repairable failures.

### 7. Research Is A Tool, Not An Excuse

When attempts keep failing, the system must search for real solutions, compare them against our doctrine, and only adopt outside patterns if they are better than what we already have.

### 8. Same-Tier Determinism

Determinism must be tested with the same model tier intended to do the coding, not a stronger tier.

### 9. Reality Updates The Twin

If code, behavior, or runtime truth changes, the twin / blueprint-state artifacts and receipts must update in the same governed action.

### 10. Pass Requires Transport Proof

`PASS` is illegal for a build/repair step unless the receipt proves the action crossed all required boundaries for that step.

For code-changing founder/build actions this means, at minimum:

- exact commit SHA exists,
- remote branch movement is proven when remote transport is required,
- and deploy state is stated honestly when live runtime proof is required.

### 11. Founder-Surface Proof Beats Proxy Proof

API proof and scripted browser proof are useful, but they are not identical to the exact founder usage path.

When a failure is discovered through the founder surface:

- the blueprint must capture that exact prompt/flow,
- the acceptance harness must add it,
- and existing broader-green probes do not overrule the founder failure.

### 12. Architect Comparison Hold

This pack is complete only as architect input and canonical reference.
It is not yet approved for execution.

### 13. Architect Must Output Buildable Pack

ARC output is incomplete unless it includes both:

- architectural reasoning
- machine-execution artifacts with exact files, tests, receipts, and blocked-return rules

### 14. SNT Attack Categories Are Mandatory

Every SNT pass on a blueprint must explicitly attack:

- founder-surface deception
- commit / origin / deploy transport truth
- stale authority and history leakage
- soft or semantic acceptance language
- lower-tier coder interpretation gaps

### 15. Studio Owns Founder Usability Contracts

Studio is not advisory-only.
For founder-facing paths, Studio must freeze pass/fail artifacts for:

- founder response quality
- conversation flow expectations
- founder-surface layout clarity
- interaction responsiveness expectations
- voice / mic / playback interaction behavior where applicable
- adaptive UI rules for founder-visible surfaces

### 16. Every Step Needs A Coder Boundary

Every blueprint step must declare what Builder / Coder may not decide.
Silence is not permission.

### 17. Better Answers Must Be Promoted

If ARC or SNT discovers a materially better answer than the current canonical pack:

- promote it into canonical authority,
- receipt the promotion,
- and update future handoff packets so the system learns.

No lesson may remain only in chat or side notes.

## Non-Goals

- No new product lane expansion
- No new department creation
- No replacement of the product-home authority model
- No migration back to amendment-first runtime authority
- No claim that BuilderOS is already a 10/10
- No certification upgrade before proof

## Reuse / Parts-Car Rule

This mission must preserve working value from the existing system:

- product-home registry / manifest structure,
- BP priority + Point B lock,
- useful-work guard,
- founder build / quorum repair lane,
- alpha UI / founder chat probes,
- deliberation governance assets that still serve the new architecture,
- receipts, lessons, and salvageable runtime code.

Bad parts must be archived, not allowed to drift active authority.

## Founder Return Boundary

Founder interruption is rare.
For this mission, Adam should only be brought back in for:

- true unresolved intent ambiguity,
- Article III constitutional veto conditions,
- or final founder alpha / usability confirmation.

Mechanical disagreements and repair path disagreements do not return to Adam.
Manual coder patching is not the success path for this mission.
The system itself must become the hands.
