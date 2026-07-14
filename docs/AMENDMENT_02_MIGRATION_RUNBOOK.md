<!-- SYNOPSIS: Amendment 02 Migration Runbook -->

# Amendment 02 Migration Runbook

## Purpose

This runbook describes how to validate and execute the `conversation_memory` migration and confirms the default recency threshold used by the migration logic.

## Recency threshold confirmation

The default recency threshold for `conversation_memory` migration is **90 days**.

If you are reviewing implementation or configuration that references a different default, update it to match the migration standard:

- **Default threshold:** `90 days`
- **Interpretation:** records older than 90 days are considered outside the recency window unless explicitly overridden
- **Expected behavior:** migration and related validation steps should use 90 days as the baseline recency cutoff

## Migration validation checklist

1. Confirm the migration code uses a default recency threshold of `90 days`.
2. Confirm any documentation, config samples, or test fixtures referencing the threshold are aligned to `90 days`.
3. If a different value is found, update the source of truth to `90 days` and propagate the change to all dependent references.
4. Re-run any migration verification tests after updating discrepancies.

## Notes

- Keep the threshold consistent across code, docs, and operational runbooks.
- If an environment-specific override exists, it should be explicit and documented, but the default remains `90 days`.