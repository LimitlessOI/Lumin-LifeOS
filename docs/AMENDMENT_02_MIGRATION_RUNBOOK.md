<!-- SYNOPSIS: Amendment 02: Conversation Memory Migration Runbook -->

# Amendment 02: Conversation Memory Migration Runbook

## Purpose

This runbook covers the migration of `conversation_memory` and confirms the default recency threshold used by the migration logic.

## Recency Threshold Confirmation

The default recency threshold for `conversation_memory` migration is **90 days**.

If the implementation, configuration, or documentation states a different default, update it to **90 days** so all references are aligned.

## Migration Checklist

1. Review the current migration implementation for `conversation_memory`.
2. Confirm the recency filter uses a **90-day** cutoff by default.
3. Update any mismatched constants, config defaults, or docs.
4. Run the migration against a representative dataset.
5. Verify migrated records match the expected recency window.
6. Record the validation result in the release notes or migration log.

## Validation Criteria

- Default threshold: **90 days**
- Older-than-90-day records are excluded by default
- Any non-default threshold is explicitly configured and documented

## Notes

If future requirements change the migration window, update this runbook and the related code together to avoid drift.