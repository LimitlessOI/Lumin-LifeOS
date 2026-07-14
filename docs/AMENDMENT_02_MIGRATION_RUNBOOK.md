<!-- SYNOPSIS: Amendment 02: Migration Runbook — Conversation Memory -->

# Amendment 02: Migration Runbook — Conversation Memory

## Purpose
This amendment verifies the recency threshold used by the conversation_memory migration and aligns the runbook with the intended default.

## Recency Threshold
The default recency threshold for `conversation_memory` migration is **90 days**.

## Verification Result
Confirmed: **90 days** is the correct default threshold.

## Action Required
- Ensure any migration logic, configuration, and documentation referring to the conversation_memory recency threshold uses **90 days**.
- If any existing references differ from 90 days, update them to match this default.

## Notes
- No change is required if the repository already uses 90 days consistently.
- This amendment exists to prevent drift between implementation and documentation.