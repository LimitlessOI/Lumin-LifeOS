<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Purpose
This runbook covers the `conversation_memory` migration and the recency threshold used during the migration process.

## Recency Threshold
The default recency threshold for `conversation_memory` migration is **90 days**.

## Verification
- Confirm that any migration logic, documentation, or configuration referencing the recency threshold uses **90 days** as the default.
- If any discrepancy is found, update the relevant source to match this default.

## Notes
- This threshold is intended to govern how recent conversation records must be in order to be included in the migration scope.
- Any environment-specific override, if supported elsewhere in the system, should be documented separately.