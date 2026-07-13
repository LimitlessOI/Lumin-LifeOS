<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Purpose
This runbook documents the migration behavior for the conversation_memory amendment and the expected recency threshold used during migration.

## Recency Threshold
The default recency threshold for `conversation_memory` migration is **90 days**.

## Verification
- Confirmed the migration logic uses a default threshold of 90 days for recency filtering.
- Any documentation or configuration references that differ from 90 days should be updated to match this default.

## Notes
- If a different threshold is required for a specific deployment, it should be treated as an explicit override rather than the default behavior.
- Keep this runbook aligned with the active migration configuration and implementation.