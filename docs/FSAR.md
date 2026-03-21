# Future-State Adversarial Retrospection (FSAR) — System Spec

FSAR is a mandatory, recurring, future-hindsight adversarial review.
It assumes we are 2 years in the future, the system worked, and we still identify what quietly failed.

**System law:** "No decision is complete until future-us has tried to destroy it."  
FSAR runs are required before major execution and on a schedule.

## Purpose
- Identify blind spots that are invisible in the present.
- Surface unintended consequences of success.
- Block execution when high-likelihood + high-damage risks are found.

## Temporal Adversary Role (Permanent)
The Temporal Adversary is a dedicated council role.
- Always reasons from future hindsight.
- Never optimizes for morale.
- Never defends existing architecture.
- Focuses on silent failure modes and second-order effects.

## When FSAR Runs (Non-Optional)
- Before any major decision or irreversible change.
- Monthly on core architecture.
- After key thresholds (user count, revenue, major feature launch).

## Output Rules (Strict)
- No praise or reassurance language.
- Must include: blind spots, unintended consequences, severity ranking,
  early warning signals, and "what we wish we fixed earlier."
- Must be produced in both JSON and Markdown.

## Severity Scoring
Severity = likelihood(1-5) * damage(1-5) * reversibility_factor(1-3)

Thresholds:
- >= 45: hard block + human review required
- 25–44: block unless mitigation plan exists
- < 25: warn + log

## Required Sections (Each Run)
1) Blind spots (ranked)
2) Unintended consequences
3) Early warning signals
4) What future-us wishes we fixed earlier
5) Mitigations and reversibility options

## Truth Object (Decision-Level)
For each FSAR proposal, create a Truth Object:
- assumptions
- unknowns
- falsifiable claims
- confidence + decay rule

If a claim is disproven, mark invalid and trigger re-evaluation downstream.

## Files
- `audit/fsar/fsar_runner.js` — core runner; JSON + MD artifacts under `audit/reports/`.
- `audit/fsar/fsar_schema.json` — JSON schema for FSAR reports.
- `audit/fsar/prompts/fsar_proposal.md` — Temporal Adversary prompt.
- `audit/fsar/prompts/fsar_systemwide.md` — systemwide prompt.
- `scripts/run_fsr_proposal.js` — CLI entry to run FSAR for a proposal.
- `scripts/run_fsr_systemwide.js` — CLI entry for systemwide FSAR.

## Scheduling
FSAR must be scheduled and automatic. Example cadence:
- monthly systemwide run
- per major proposal gate

## Notes
- Local-first; paid models are advisory-only if allowed by policy.
- FSAR can block execution if thresholds are exceeded.
