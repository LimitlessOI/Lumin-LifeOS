<!-- SYNOPSIS: Amendment 02: Conversation Memory Migration Runbook -->

# Amendment 02: Conversation Memory Migration Runbook

## Purpose

This amendment documents the migration runbook for `conversation_memory` and confirms the default recency threshold.

## Recency Threshold Confirmation

The default recency threshold for `conversation_memory` migration is **90 days**.

## Verification Result

- **Expected default:** 90 days
- **Current specification:** 90 days
- **Status:** Correct, no discrepancy found

## Notes

If any downstream implementation, configuration, or documentation references a different recency threshold, update it to **90 days** so the migration behavior remains consistent across the system.