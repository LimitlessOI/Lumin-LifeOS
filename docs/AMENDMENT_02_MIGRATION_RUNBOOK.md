<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Objective

This runbook covers the migration of `conversation_memory` data into the updated schema and verifies the default recency threshold used during migration.

## Recency Threshold Verification

The default recency threshold for `conversation_memory` migration is **90 days**.

This means:

- Records older than 90 days are excluded from the default migration scope.
- Records within the last 90 days are included by default unless a different threshold is explicitly configured.

## Required Check

Confirm that all migration logic, configuration, and documentation consistently use:

- `90 days` as the default recency threshold

If any discrepancy is found, update the source of truth to match this value.

## Migration Notes

- Preserve existing data handling behavior unless the recency threshold is intentionally changed.
- Ensure any environment variable, constant, or parameter related to recency filtering reflects the default of `90 days`.
- Update related references in runbooks, comments, and operational docs where needed.

## Verification Summary

- Default threshold: **90 days**
- Status: **confirmed**