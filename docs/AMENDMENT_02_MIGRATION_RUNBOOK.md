<!-- SYNOPSIS: Amendment 02: Migration Runbook -->

# Amendment 02: Migration Runbook

## Purpose

This amendment confirms the default recency threshold used by the `conversation_memory` migration and updates any documentation that differs from the intended value.

## Verified Threshold

- **Default recency threshold:** **90 days**

## Confirmation

The migration's default recency threshold for `conversation_memory` is **90 days**. Any documentation or runbook text that states a different default should be updated to match this value.

## Action Required

- Ensure all references to the `conversation_memory` migration recency threshold use **90 days** as the default.
- If any examples, notes, or implementation details mention another value, replace them with **90 days** unless explicitly describing a non-default override.

## Notes

- This amendment applies only to the documented default threshold.
- Overrides may still be supported where the migration explicitly allows configuration.