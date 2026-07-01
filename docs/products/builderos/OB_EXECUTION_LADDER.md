<!-- SYNOPSIS: Canonical OpenAI Builder execution ladder -->

# BuilderOS OpenAI Execution Ladder

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Scope** | BuilderOS execution after blueprint freeze |
| **Machine contract** | `builderos-reboot/governance/OB_EXECUTION_LADDER.json` |
| **Product home** | [`PRODUCT_HOME.md`](PRODUCT_HOME.md) |
| **Last Updated** | 2026-07-01 |

## Purpose

This is the canonical execution ladder for the low-cost OpenAI Builder path.

It exists to answer one question without drift:

**Who does what after the blueprint is frozen, and when does the next model take over?**

The ladder is:

- `OB1` = `gpt-5.4-mini`
- `OB2` = `gpt-5.4`
- `OB3` = `gpt-5.5`

If any other document disagrees, this file wins for BuilderOS execution.

## Activation truth

The ladder is not active just because this file exists.

It is active only when:

1. `.env.builderos` is present and non-empty, or equivalent runtime secrets are loaded
2. `builderos:openai:smoke` passes
3. the builder runtime can write receipts on the canonical path

If those are not true, the system must say the ladder is defined but not yet operational.

## Founder intent lock

- Founder participates in product development, founder packet, and blueprint freeze.
- Founder should not be dragged back into normal coding execution.
- Founder returns only for:
  - alpha use / usability judgment
  - true missing authority
  - true missing product intent
  - true external blocker the system cannot clear

If Builder asks the founder to decide a coding, repair, or bounded implementation issue, the system failed.

## Continuity law

The default mode is: **continue**.

The system is not allowed to stop just because one attempt failed, one model failed, or one slice is blocked.

The system keeps going until one of these is true:

1. the approved spend cap is reached
2. the founder explicitly stops the run
3. the system is alpha-ready and waiting for founder use
4. the queue has been scanned and no ready work remains

The system must not globally stop because of:

- a single model failure
- a single blocked slice
- ordinary runtime confusion
- soft ambiguity that has not yet gone through `OB3`

If the current slice is isolated-blocked and other queue work is ready, the system moves to the next ready slice and records the blocker for return later.

## Ladder roles

### OB1 — primary executor

- Model: `gpt-5.4-mini`
- Job: execute frozen, bounded, literal work
- Default owner of coding
- Must not make strategic, architectural, or product decisions
- Must not widen scope
- Must not change blueprint authority
- Must emit receipts, run declared checks, and return exact blockers

OB1 is the default builder.

### OB2 — repair and bounded reasoning

- Model: `gpt-5.4`
- Job: repair failures OB1 could not clear
- Invoked when OB1 has exhausted its allowed attempts on the same bounded task
- May tighten implementation approach, but may not rewrite product intent
- Must return control to OB1 after the blocker is cleared

OB2 is not the default builder. OB2 is the repair specialist.

### OB3 — supervisor, architect, unblocker

- Model: `gpt-5.5`
- Job: resolve ambiguity, repair the blueprint, settle repeated blockers, and decide whether execution can continue
- Reviews accumulated failure evidence from OB1 and OB2
- Tightens the blueprint when the blueprint is the problem
- May repair the execution contract and reopen the blueprint when ambiguity is proven
- Does not become the main coder unless explicitly required for a narrow emergency repair

OB3 replaces interactive founder babysitting during execution.

## Escalation law

For one bounded task:

1. `OB1` attempts the task.
2. If it fails, `OB1` retries once using all prior evidence and receipts.
3. If still blocked, escalate to `OB2`.
4. `OB2` attempts to clear the blocker.
5. If it fails, `OB2` retries once using all prior evidence and receipts.
6. If still blocked, escalate to `OB3`.
7. `OB3` must classify the blocker:
   - blueprint ambiguity
   - infrastructure / env / deployment issue
   - missing tool or missing route
   - acceptance-contract weakness
   - real coding difficulty
8. `OB3` either:
   - repairs the execution contract and returns control to `OB1`
   - repairs the blueprint and returns control to `OB1`
   - emits a true hard blocker for founder attention

No level is allowed to ignore prior failures, prior receipts, or prior research.

## Blueprint law

- If `OB1` can interpret the blueprint in more than one material way, the blueprint failed.
- If `OB2` must guess product intent, the blueprint failed.
- If `OB3` discovers missing strategic decisions, product development failed upstream and the packet must be repaired.

The coder is not allowed to compensate for blueprint weakness with improvisation.

## Cost law

- Use the cheapest capable lane first.
- Do not escalate because of impatience.
- Do escalate immediately when the cheaper lane has proven it cannot continue safely.
- Infrastructure failures do not justify model escalation by themselves.
- Stale deploys, missing env, auth failures, missing migrations, and route-mount failures are platform blockers first.
- The global run continues until the approved spend cap is actually reached, not until the first inconvenience appears.

## Completion law

BuilderOS is not done with a slice when code exists.

A slice is complete only when:

1. the bounded work is implemented
2. declared checks pass
3. receipts are written
4. runtime truth matches the receipt
5. the founder-facing UI path has been exercised when the slice touches founder surfaces

## Required handoff stack

Before any OB execution starts, the system must have:

1. product-development output
2. founder packet
3. blueprint
4. acceptance contract
5. authority contract
6. queue position

Execution starts from the blueprint, not from chat.

## What each level must receive

### OB1 receives

- exact task
- exact allowed files
- exact acceptance checks
- exact receipts to write
- exact blockers-return schema
- prior receipts for the same task

### OB2 receives

- everything OB1 received
- all OB1 attempts
- full failure evidence
- exact blocker to clear

### OB3 receives

- everything OB2 received
- full failure chain
- blueprint section under dispute
- acceptance contract under dispute
- current runtime and deploy evidence

## Hard forbiddens

- No founder chat transcript is allowed to outrank the frozen blueprint during execution.
- No model is allowed to silently switch products, rewrite scope, or invent work.
- No model is allowed to certify success from static code inspection alone.
- No model is allowed to call a runtime green when the founder path is still broken.

## Operational target

The intended steady state is:

- founder works with the highest reasoning lane only during product development and blueprint freeze
- `OB1` does most coding
- `OB2` clears bounded failures
- `OB3` handles true unblock work
- founder returns at alpha

That is the anti-babysitting path.
