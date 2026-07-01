<!-- SYNOPSIS: BuilderOS OpenAI execution ladder -->

# BuilderOS OpenAI execution ladder

**Read after:** `00-LIFEOS-AGENT-CONTRACT.md`, `00-SYSTEM-AUTHORITY-LAYERS.md`, `00-MODEL-ESCALATION-GATE.md`  
**Canonical doc:** `docs/products/builderos/OB_EXECUTION_LADDER.md`  
**Machine contract:** `builderos-reboot/governance/OB_EXECUTION_LADDER.json`

## Lock

For BuilderOS execution, the canonical OpenAI ladder is:

- `OB1` = `gpt-5.4-mini`
- `OB2` = `gpt-5.4`
- `OB3` = `gpt-5.5`

Do not invent alternate names or substitute providers during the canonical BuilderOS build path unless an authority file explicitly changes this.

## Role split

- `OB1` does the normal coding from frozen specs.
- `OB2` repairs exact blockers OB1 could not clear.
- `OB3` handles repeated failure, blueprint weakness, and unblock decisions.

## Founder boundary

The founder is for:

- product development
- founder packet
- blueprint freeze
- alpha use

The founder is not for:

- ordinary coding choices
- bounded repair attempts
- routine execution monitoring

## Continuity

The default is continue-running.

Do not stop the overall build because one task failed.

Stop the overall run only for:

- approved spend cap reached
- explicit founder stop
- alpha-ready waiting for founder
- no ready work remains after queue scan

## Law

If a lower lane needs to guess, the upstream artifact failed.

- if `OB1` must guess implementation authority, the blueprint failed
- if `OB2` must guess product intent, the blueprint failed
- if `OB3` finds strategic ambiguity, product development failed upstream

Execution begins from the blueprint, not from the latest chat message.
