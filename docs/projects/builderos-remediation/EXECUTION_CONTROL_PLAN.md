<!-- SYNOPSIS: BuilderOS Execution Control Plan -->

# BuilderOS Execution Control Plan

## Purpose
Stabilize BuilderOS execution quality before adding premium models.

This plan does not expand autonomy. It tightens:
- useful-work enforcement
- routing policy
- failure-family detection
- escalation policy
- cost telemetry
- anti-complexity governance

## Current Findings
- BuilderOS governance is stronger than BuilderOS execution quality.
- `groq_llama` is still causing repeated Builder failure patterns:
  - `IMPORT_MERGE_BUG`
  - `MARKDOWN_FENCE_CORRUPTION`
  - `COMMONJS_BLEED`
  - `STUB_OUTPUT`
- Current useful-work audit is too broad for BuilderOS. It mixes product-interactive AI calls with true autonomous execution paths.
- BuilderOS autonomous execution currently has no `HIGH_RISK_SCHEDULED` unguarded loops, but several paths need sharper proof and classification.

## Useful-Work Guard Findings
BuilderOS-only autonomous paths should be audited separately from product routes.

Guarded or bounded today:
- `startup/boot-domains.js` lane intel
- `startup/boot-domains.js` twin auto-ingest
- `startup/boot-domains.js` OIL daily summary
- self-repair executor PF chain
- governed overnight autonomy

Needs ongoing review:
- `scripts/lifeos-builder-continuous-queue.mjs`
  - governed, but useful-work proof is queue/log based rather than `createUsefulWorkGuard()`
- legacy autonomy surfaces
  - `services/autonomy-orchestrator.js`
  - `services/autonomy-scheduler.js`
  - keep treated as legacy/env-gated, not evidence of BuilderOS maturity

## Routing Policy
Task classes:
- `cheap_summary`
- `extraction`
- `classification`
- `scan`
- `bounded_patching`
- `architecture_planning`
- `governance_review`
- `verifier_conflict_resolution`
- `autonomous_retry`
- `high_risk_repo_edit`

Current runtime-safe policy:
- `groq_llama` allowed:
  - cheap summaries
  - extraction
  - classification
  - scans
- `groq_llama` blocked:
  - bounded patching
  - architecture planning
  - governance review
  - verifier conflict resolution
  - autonomous retry
  - high-risk repo edits
- `gemini_flash` allowed for all BuilderOS risky code tasks until stronger models are intentionally added

## Failure Families
Known families:
- `IMPORT_MERGE_BUG`
- `MARKDOWN_FENCE_CORRUPTION`
- `COMMONJS_BLEED`
- `STUB_OUTPUT`
- `PARTIAL_EDIT_CORRUPTION`
- `REPO_SCOPE_DRIFT`

Response rules:
- first verifier/scanner failure:
  - one retry only
- repeated same-family failure:
  - block same model for that task class
- `groq_llama` specific:
  - do not retry on risky BuilderOS code tasks after `IMPORT_MERGE_BUG`, `COMMONJS_BLEED`, or `STUB_OUTPUT`

## Cost Telemetry Plan
Track and expose:
- cost per successful repair
- cost per failed repair
- retry burn
- verifier-fail burn
- hallucination burn
- useful-output ratio
- cost by task class
- cost by model family
- token burn per autonomous path

Use existing telemetry as the base:
- `GET /api/v1/lifeos/autonomous-telemetry/efficiency`
- `GET /api/v1/lifeos/autonomous-telemetry/events`

Missing metrics to add later:
- per-task-class routing receipt counters
- verifier-fail token burn by model family
- failure-family recurrence rate

## Escalation Policy
- cheap-first only where safe
- one retry ceiling
- verifier-triggered escalation only
- no premium-model spam
- no infinite retries
- no model thrashing

Escalate when:
- verifier fails
- scanner catches high-risk family
- task class is `high_risk_repo_edit`
- task crosses governance/runtime/auth/migration boundaries

## Anti-Complexity Findings
Current complexity risks:
- broad useful-work audit overstates risk by mixing product-interactive and BuilderOS-autonomous paths
- legacy autonomy surfaces remain visible in the repo and can be mistaken for active BuilderOS control paths
- multiple telemetry/proof surfaces still require careful interpretation

Keep:
- one canonical routing policy
- one canonical failure-family detector
- one BuilderOS-only autonomy guard audit

Avoid:
- adding extra orchestration layers before routing and guard rules are stable
- counting legacy/env-gated systems as live autonomy

## Next Phase
Immediate:
- run BuilderOS-only useful-work guard audit
- keep `groq_llama` off risky BuilderOS code work
- add routing receipts and task-class telemetry

After that:
- useful-work-guard coverage audit across all autonomous AI paths
- cost telemetry expansion
- only then prepare premium-model integration
