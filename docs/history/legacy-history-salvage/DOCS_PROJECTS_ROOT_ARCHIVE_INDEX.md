<!-- SYNOPSIS: Inventory of archived docs/projects root files -->

# docs/projects Root Archive Index

Archive location:

- `docs/history/legacy-history-salvage/docs-projects-root/`

## Why this exists

The old `docs/projects/` root was leaking stale product, dashboard, and amendment-era specs into cold-agent context. These files were removed from the active root surface so runtime and builder paths stop treating them as live authority.

## What stayed active

The only root files left in `docs/projects/` are machine-fed shims still referenced by live queue or verification scripts.

## What moved

### Product-era legacy specs

- `AMENDMENT_READINESS_CHECKLIST.md`
- `AMENDMENT_TEMPLATE.md`
- `BPB-0001-MISSION-RUNTIME-V1.md`
- `BUILDEROS_ALPHA_BLUEPRINT.md`
- `BUILDEROS_BP_V1.md`
- `PRIME_TIME_AUTONOMOUS_BUILDER_ROADMAP_v3_SSOT_CANDIDATE.md`

### Dashboard spec sprawl

- `DASHBOARD_A11Y_SPEC.md`
- `DASHBOARD_AI_RAIL_CONTRACT.md`
- `DASHBOARD_AI_RAIL_QA_CHECKLIST.md`
- `DASHBOARD_CALENDAR_ASSUMPTIONS_SPEC.md`
- `DASHBOARD_CATEGORY_STUBS_SPEC.md`
- `DASHBOARD_CUSTOMIZATION_STATE.md`
- `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`
- `DASHBOARD_HOUSEHOLD_CONTEXT_SPEC.md`
- `DASHBOARD_KEYBOARD_SHORTCUTS_SPEC.md`
- `DASHBOARD_LOADING_EMPTY_SPEC.md`
- `DASHBOARD_MIT_WIDGET_CONTRACT_SPEC.md`
- `DASHBOARD_NOTIFICATIONS_SHELL_SPEC.md`
- `DASHBOARD_OFFLINE_QUEUE_SPEC.md`
- `DASHBOARD_PERFORMANCE_BUDGET_NOTES.md`
- `DASHBOARD_SEARCH_DISCOVERY_SPEC.md`
- `DASHBOARD_SHELL_GAP_AUDIT.md`
- `DASHBOARD_TELEMETRY_ERRORS_SPEC.md`
- `DASHBOARD_TODAY_CATEGORY_SPEC.md`
- `DASHBOARD_WIDGET_DENSITY_SPEC.md`

### Command-center and builder salvage

- `BUILDER_AUTONOMY_BRAINSTORM_VAULT.md`
- `BUILDER_DASHBOARD_SMOKE_RECEIPT.md`
- `BUILDER_QUEUE_SLICE_POLICY.md`
- `BUILDER_TAILWIND_EXIT_SPIKE.md`
- `COMMAND_CENTER_LEGACY_AUDIT.md`
- `COMMAND_CENTER_V2_BLUEPRINT.md`

### LifeOS / Site Builder / TC planning extras

- `LIFEOS_ALPHA_CONSENSUS_PACK.md`
- `LIFEOS_ALPHA_NEEDS_AND_QUEUE.md`
- `LIFEOS_ALPHA_OPERATOR_ONE_PAGER.md`
- `LIFEOS_BROWSER_AND_PLATFORM_GRADE_2026-05-08.md`
- `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`
- `LIFEOS_SHELL_URL_PARAMETERS_SPEC.md`
- `LIFEOS_SYSTEM_MAP_AND_BUILD_ORDER.md`
- `SITE_BUILDER_COMMAND_CENTER_AUDIT.md`
- `SITE_BUILDER_LIVE_OPS_RUNBOOK.md`
- `SITE_BUILDER_PREVIEW_QUALITY_PLAYBOOK.md`
- `TC_INTAKE_WORKSPACE_AUDIT.md`
- `TC_MOBILE_APPROVAL_FLOW_SPEC.md`
- `TC_PORTAL_MAP_SPEC.md`

### Misc history / study artifacts

- `INDEX.md`
- `README.md`
- `MEMORY_SYSTEM_CLEANUP_BP.md`
- `OPERATOR_BRAINSTORM_SESSION_ENTRY.md`
- `TCO_TSOS_75_PERCENT_SAVINGS_BRAINSTORM.md`
- `TSOS_PROVEN_ADVANCEMENT_PLAN.md`
- `VICTORY_VAULT_DASHBOARD_PLACEMENT_SPEC.md`
- `manifest.schema.json`

## Promotion rule

Nothing in this archive is live authority. If a file still contains valuable doctrine or mechanics, promote the useful parts into:

- a canonical product home
- a live runtime receipt
- a machine-enforced builder artifact

Do not restore archive files to active authority just because they are detailed.
