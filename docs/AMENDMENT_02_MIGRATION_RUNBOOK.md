<!-- SYNOPSIS: Amendment 02 — Migration Runbook -->

# Amendment 02 — Migration Runbook

## Purpose

This runbook covers the conversation_memory migration and the recency threshold used during backfill and verification.

## Recency Threshold

The default recency threshold is **90 days**.

This means:

- Only conversation_memory records within the last 90 days are considered recent by default.
- Records older than 90 days are treated as non-recent unless a migration job or override explicitly specifies otherwise.
- Any code, configuration, documentation, or operational notes that reference a different default must be updated to **90 days**.

## Validation

To confirm the threshold is correct:

1. Check the migration job configuration for the conversation_memory pipeline.
2. Check any derived filters or query predicates that define "recent" records.
3. Ensure the documented default matches the runtime default.
4. Verify test fixtures and examples use 90 days where a default recency window is expected.

## Discrepancy Handling

If a discrepancy is found:

- Update the source of truth first, then the documentation.
- Re-run any migration validation that depends on recency filtering.
- Confirm no downstream reports, alerts, or rollback steps assume a different threshold.

## Operational Notes

- The 90-day threshold should be treated as the baseline unless a specific migration step overrides it.
- Overrides should be explicit and documented alongside the migration command or job definition.

## Change Log

- Amendment 02: Confirmed default recency threshold for conversation_memory migration is 90 days.