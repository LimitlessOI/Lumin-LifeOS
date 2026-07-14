<!-- SYNOPSIS: Amendment 02: Conversation Memory Migration Runbook -->

# Amendment 02: Conversation Memory Migration Runbook

## Purpose

This runbook describes the migration of conversation memory data and the operational checks required to confirm the migration is safe, current, and complete.

## Recency Threshold

The default recency threshold for `conversation_memory` migration is **90 days**.

This means records older than 90 days are treated as out of the active recency window unless a different threshold is explicitly configured for a specific migration job or environment.

## Verification

Before running the migration, confirm:

1. The configured threshold is set to `90 days`.
2. Any downstream filtering, archival, or cleanup logic matches that threshold.
3. No environment-specific override changes the threshold unintentionally.

## Migration Checklist

- Confirm source and target schemas are compatible.
- Confirm the migration job is using the expected recency window.
- Validate sample records from both inside and outside the 90-day threshold.
- Run the migration in a staging or dry-run mode if available.
- Review logs for skipped, migrated, or archived conversation memory entries.
- Verify counts after migration match expectations.

## Operational Notes

- If a different threshold is required for a specific deployment, document it alongside the deployment configuration.
- Keep the threshold value consistent across migration scripts, scheduled jobs, and validation checks.
- If the migration previously used a different default, update all references to reflect the 90-day standard.

## Post-Migration Validation

After migration:

- Confirm recent conversation memory entries remain accessible.
- Confirm entries outside the 90-day threshold are handled according to policy.
- Check for any unexpected gaps in migrated data.
- Record the migration timestamp, threshold used, and validation results.

## Status

The documented default recency threshold is **90 days** and should be treated as the authoritative value unless explicitly overridden by a controlled migration configuration.