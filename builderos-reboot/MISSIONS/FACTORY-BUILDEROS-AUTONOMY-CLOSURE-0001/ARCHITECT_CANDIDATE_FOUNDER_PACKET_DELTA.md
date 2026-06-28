<!-- SYNOPSIS: Architect candidate founder packet completeness delta -->

# Architect Candidate Founder Packet Delta

Status: ARCHITECT_CANDIDATE_ONLY  
Mission: FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001

The Founder Packet is directionally strong and should not be replaced. The additions below make it more mechanically executable and harder to misread.

## Additions Required

1. Define the completion vocabulary as separate states: TECHNICAL_PASS, FOUNDER_USABILITY_PASS, POINT_B_COMPLETE, RELEASE_PASS, and FULLY_MACHINE_READY. The packet says Point B beats technical pass, but the blueprint should require one shared helper that all runners and readiness surfaces import.

2. Define transport proof as a required receipt object. Minimum fields: commit_sha, origin_main_sha, origin_contains_commit, deploy_required, deploy_sha, deploy_matches_origin_main, runtime_probe_url, runtime_probe_ok, runtime_behavior_verified, and transport_status.

3. Define a reality sync set per change type. Technical acceptance, founder usability confirmation, and live deploy changes each need explicit artifact lists that must update in the same governed action.

4. Add a founder-surface regression corpus. Any exact founder prompt or UI flow that fails must become a durable test case. Generic API or Playwright green cannot overrule a founder-specific red.

5. Require receipt freshness to bind to source hashes and deploy SHA, not only timestamp or mtime. UI_ALPHA_GATE currently can reuse fresh receipts without proving they represent the current live deploy and current regression corpus.

6. Add a single blocked-return schema for CDR/Builder. If Builder would need to decide product, UX, scope, priority, acceptance, release, or founder-success semantics, it must return a structured blocker, not improvise.

7. Require improvement proposals to become BP deltas, acceptance deltas, or parked-with-owner records. The improvement loop must not become a second queue and must not remain advisory for P0 false-green findings.

8. Add a certification lock clause. FULLY_MACHINE_READY cannot flip true until same-tier determinism, closure acceptance, live deploy/runtime truth, and founder UI proof all pass.

9. Add a dead-script check. Active proof npm scripts must point at existing files. During inspection, `builderos:alpha:confirm` referenced `scripts/run-alpha-confirm.mjs`, which was absent.

## Clarifications

- CLEARED_FOR_FOUNDER_ALPHA means the machine believes Adam can test. It is not Point B complete.
- COMMIT_ONLY_NOT_LIVE is a useful state, but it is not PASS when live runtime proof is required.
- Already-present build outcomes should be SKIPPED_ALREADY_VALID with evidence, not a code-changing PASS.
- Product readiness reports are generated evidence, not primary authority. If registry/BP/Point B hashes differ, the report is stale.

## Founder Return Boundary Delta

Adam should only return for true intent ambiguity, Article III veto, or final founder usability confirmation. Missing commit SHA, stale deploy, failed founder prompt, weak repair loop, and stale readiness reports are mechanical system problems and must not be laundered into Adam questions.
