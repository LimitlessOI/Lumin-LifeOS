<!-- SYNOPSIS: Amendment 02: Migration Runbook -->

# Amendment 02: Migration Runbook

## Purpose

This runbook covers the migration of `conversation_memory` data and validates the operational assumptions used during the migration.

## Recency Threshold Confirmation

The default recency threshold for `conversation_memory` migration is **90 days**.

This threshold is the correct default unless an environment-specific override has been intentionally configured. If any other value appears in migration notes, scripts, or documentation, update it to match the canonical default of **90 days**.

## Migration Checkpoint

Before running the migration:

- Confirm the source data range
- Confirm the migration job is using the 90-day recency cutoff
- Verify no stale configuration is overriding the default threshold

## Validation

After migration:

- Confirm records newer than 90 days were included as expected
- Confirm records older than 90 days were excluded unless explicitly exempted
- Compare migrated counts against the expected 90-day window

## Discrepancy Handling

If a discrepancy is found:

1. Identify the file, job, or config that defines the threshold
2. Update the threshold to `90 days`
3. Re-run validation for the affected migration path
4. Record the correction in the migration audit trail

## Notes

- The default threshold documented here is the canonical reference for `conversation_memory` migration behavior.
- Any future change to this threshold should be reflected across all related migration docs and scripts.