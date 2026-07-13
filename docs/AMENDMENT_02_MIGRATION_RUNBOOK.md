<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Purpose

This runbook covers the migration of `conversation_memory` and confirms the recency threshold used by default during migration.

## Recency Threshold Confirmation

The default recency threshold for `conversation_memory` migration is **90 days**.

This is the correct default threshold and should be used unless a specific migration override is intentionally configured.

## Validation Checklist

- Confirm the migration logic uses a default threshold of **90 days**
- Confirm there are no conflicting values in documentation, configs, or migration scripts
- Confirm any overrides are explicit and scoped to the relevant migration run

## Notes

If any discrepancy is found in implementation or docs, align it back to the **90-day default** unless a deliberate change has been approved and applied consistently across the codebase.