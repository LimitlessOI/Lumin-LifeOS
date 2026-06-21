<!-- SYNOPSIS: Product Development Gate -->

# Product Development Gate

## Purpose

This gate exists to ensure BPB never receives unresolved strategic ambiguity.

If a mission reaches BPB with missing strategy, missing priorities, unresolved tradeoffs, or unclear success rules, the failure already happened before blueprinting.

That is:
- a founder packet failure
- an AIC/product-development failure
- a system memory/governance failure

It must not become a BPB problem.
It must not become a Builder problem.

## Governing rule

All foreseeable strategic bottlenecks must be solved in Product Development once and only once before BPB begins.

Strategic ambiguity may not pass the Product Development gate.

BPB is not a strategic cleanup stage.

If strategic ambiguity is discovered at BPB time:
- classify as `AIC_GATE_FAILURE`
- classify as `PRODUCT_DEVELOPMENT_FAILURE`
- stop blueprinting
- record the failure
- do not treat this as a normal operating loop

If ambiguity reaches Builder:
- classify as `BPB_FAILURE`
- classify as upstream gate failure
- stop execution
- record the failure

## Required answered questions before BPB starts

### Mission
- What exactly are we building?
- Why does it matter now?
- What founder value is expected?

### Priority
- Why this instead of the next best mission?
- What is intentionally not being done?

### Scope
- What is in scope?
- What is out of scope?
- What is deferred?

### Tradeoffs
- What is preferred if multiple valid paths exist?
- Speed vs certainty?
- Reuse vs rewrite?
- Simplicity vs flexibility?

### Success
- What counts as success?
- What counts as failure?
- Who judges alpha?
- What are the minimum pass conditions?

### Escalation boundaries
- What may AIC decide?
- What may BPB decide?
- What may not be decided without founder input?

### Resource boundaries
- Time limit
- Cost/token sensitivity
- Founder attention sensitivity
- Platform constraints

### Existing-system review
- What proven parts already exist?
- What old-system parts are forbidden because they caused drift?
- What lessons from prior failures apply here?

## Gate result states

Allowed gate outputs before BPB starts:
- `PASS`
- `FOUNDER_DECISION_REQUIRED`

BPB may only begin on `PASS`.

There is no valid BPB-time strategic return path in the normal loop.
If BPB discovers unresolved strategy, the gate failed and the system must record that as an upstream failure.

## Memory rule

The system must preserve solved strategic answers so they do not need to be repeatedly rediscovered.

If the same strategic question returns later without an external change:
- record as memory failure
- record as governance failure
- record as AIC gate failure if it reached BPB

## Honest note

Perfect memory is required from the system because the founder cannot reasonably be expected to hold the entire evolving factory state in working memory.

The founder should not have to touch the same strategic bottleneck twice because the system forgot or failed to lock it.
