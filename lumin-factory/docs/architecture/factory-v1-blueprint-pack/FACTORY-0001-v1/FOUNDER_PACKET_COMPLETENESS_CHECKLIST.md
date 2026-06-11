# Founder Packet Completeness Checklist

## Purpose

This checklist exists to prevent strategic ambiguity from being pushed downward into BPB or Builder.

Rule:
- if Founder Packet ambiguity is strategic, BPB must not guess
- BPB must never receive unresolved strategic ambiguity
- if BPB encounters unresolved strategic ambiguity, the upstream gate already failed
- if Builder encounters ambiguity, return to BPB

Strategic ambiguity may never be pushed into execution.

## Law

Founder Packet Completeness Law:

The Founder Packet must resolve all foreseeable strategic, priority, scope, tradeoff, success, and mission-boundary questions before BPB begins blueprinting.

BPB must never be used as the place where unresolved strategy gets noticed and sent back as part of the ordinary loop.

If BPB encounters unresolved strategic ambiguity:
- classify as `AIC_GATE_FAILURE`
- classify as `PRODUCT_DEVELOPMENT_FAILURE`
- stop blueprinting
- record the failure

If Builder encounters ambiguity:
- `RETURN_TO_BPB`

## Required gates before BPB begins

### 1. Mission Clarity
- What mission is being pursued?
- What problem is being solved?
- Why does this mission exist now?
- What outcome is required?

### 2. Priority Clarity
- Why this mission instead of other candidate missions?
- What higher-priority work is intentionally deferred?
- What opportunity cost is being accepted?

### 3. Scope Clarity
- What is in scope?
- What is explicitly out of scope?
- What is deferred to later phases?

### 4. Success Criteria
- What counts as success?
- What counts as failure?
- How will alpha be judged?
- Who judges alpha success?

### 5. Tradeoff Boundaries
- What sacrifices are acceptable?
- What may be optimized for speed?
- What may not be traded away?
- What must be preserved even if slower or more expensive?

### 6. Authority Boundaries
- What may BPB decide without founder escalation?
- What may AIC decide without founder escalation?
- What requires founder decision?
- What requires Sherry review?

### 7. Multiple-Valid-Path Rule
- If more than one valid path exists, what decision rule should BPB use?
- Is reuse preferred over rewrite?
- Is lower risk preferred over higher speed?
- Is determinism at the intended Builder model tier preferred over short-term convenience?

### 8. Escalation Boundaries
- What types of issues may return to founder?
- What types must remain inside AIC/BPB?
- What type of outage triggers C2 critical escalation?

### 9. Resource Constraints
- Time limit
- Budget limit
- token sensitivity
- founder attention sensitivity
- deployment/platform constraints

### 10. Existing Asset Review
- What already exists that should be considered?
- What proven system parts should be reused?
- What old parts are forbidden because they caused drift?

## BPB start condition

BPB may begin only when all sections above are answered well enough that:
- BPB does not need to invent strategy
- BPB does not need to invent priorities
- BPB does not need to invent tradeoffs
- BPB does not need to reopen solved founder decisions
- Builder will not receive strategic ambiguity

## Determinism test

Before freeze, the BP should be tested by multiple agents from the same model tier intended for Builder execution.

Question:
- "What exactly gets built?"

If answers differ materially:
- BP failed
- not Builder

## Honest note for FACTORY-0001

FACTORY-0001 proves the minimal governed execution path.

It does not yet prove the full:
- Founder
- Product Development
- AIC
- BPB
- Freeze

pipeline for large product missions.

That is the next layer this checklist is meant to support, specifically to prevent founder re-touch caused by unresolved upstream ambiguity.
