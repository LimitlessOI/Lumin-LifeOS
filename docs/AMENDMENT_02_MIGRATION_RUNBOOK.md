<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Purpose

This runbook covers the `conversation_memory` migration path and confirms the default recency threshold used during migration.

## Recency Threshold Confirmation

The default recency threshold for `conversation_memory` migration is **90 days**.

This threshold is the intended default unless a newer, explicitly configured value is provided by the migration or calling workflow. If any related documentation, implementation notes, or runbook references differ from **90 days**, update them to match this default.

## Migration Notes

- Use the 90-day recency threshold when selecting conversation records for migration.
- Preserve the configured threshold if the migration is invoked with an explicit override.
- Treat the 90-day value as the baseline default for backfill and cleanup workflows tied to `conversation_memory`.

## Validation

Before running the migration, confirm:

1. The migration code path uses `90 days` as the default threshold.
2. Any documentation references match the same default.
3. Overrides are intentional and documented where used.

## Outcome

The `conversation_memory` migration recency threshold is confirmed as **90 days**, and any discrepancies should be corrected to preserve consistency across implementation and documentation.