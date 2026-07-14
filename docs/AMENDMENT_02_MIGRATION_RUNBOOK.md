<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Purpose

This runbook documents the migration verification for `conversation_memory` and confirms the default recency threshold used during migration.

## Verification Summary

The default recency threshold for `conversation_memory` migration is **90 days**.

This threshold is correct and should remain the standard default unless a later amendment explicitly changes it.

## Checks Performed

- Reviewed the migration expectation for `conversation_memory`
- Confirmed the default recency cutoff is set to **90 days**
- Checked for discrepancies between implementation intent and documented threshold

## Result

- **Status:** Verified
- **Default recency threshold:** 90 days
- **Discrepancies found:** None

## Notes

If future migration behavior changes, update this runbook and any related migration configuration to keep the documented threshold aligned with implementation.