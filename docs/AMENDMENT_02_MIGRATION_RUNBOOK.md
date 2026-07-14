<!-- SYNOPSIS: Amendment 02: Migration Runbook -->

# Amendment 02: Migration Runbook

## Scope
This amendment covers the `conversation_memory` migration runbook and confirms the recency threshold used during migration.

## Recency Threshold Verification
The default recency threshold for `conversation_memory` migration is **90 days**.

### Confirmation
- **Default threshold:** 90 days
- **Status:** Verified as correct
- **Action required:** None, unless a future migration explicitly overrides this value

## Notes
If any existing documentation, scripts, or config entries state a different default threshold, they should be updated to match **90 days** for consistency.

## Migration Guidance
When migrating conversation memory data:
- Use **90 days** as the default cutoff for recency-based handling
- Preserve more recent conversations according to the migration rules
- Treat this threshold as the canonical default unless a migration-specific override is documented

## Change Log
- Confirmed the default recency threshold for `conversation_memory` migration is **90 days**