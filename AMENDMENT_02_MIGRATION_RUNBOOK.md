<!-- SYNOPSIS: Markdown doc — AMENDMENT 02 MIGRATION RUNBOOK. -->

AMENDMENT_02_MIGRATION_RUNBOOK.md
Confirming Recency Threshold for Migration

As part of the conversation_memory migration, ensure that the recency threshold is set to 90 days by default. This threshold determines which conversations are eligible for migration based on their last interaction date. Follow these steps to confirm and adjust if necessary:

1. Access the migration configuration file.
2. Locate the parameter defining the recency threshold (e.g., `recency_threshold`).
3. Verify that the parameter is set to 90 days.
4. If the threshold is not set to 90 days, update the configuration to reflect the default value.
5. Save the changes and restart the migration process to apply the updated threshold.
6. Document any changes made to the configuration for auditing and future reference.

By maintaining the default 90-day threshold, you ensure consistency and alignment with the migration policy requirements.