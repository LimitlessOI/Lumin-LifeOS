<!-- SYNOPSIS: Markdown doc — AMENDMENT 02 MIGRATION RUNBOOK. -->

It seems you need to ensure that the recency threshold for the conversation_memory migration is set to 90 days by default. Here's a concise plan to confirm this:

1. **Access Configuration**: Open the migration configuration file where the recency threshold is defined.
   
2. **Locate Parameter**: Search for the parameter related to the recency threshold, likely named something similar to `recency_threshold`.

3. **Verify Value**: Check if the current value is set to 90 days.

4. **Update if Necessary**: If it is not set to 90 days, modify it to reflect this default value.

5. **Apply Changes**: Save the configuration file and restart the migration process so that the changes take effect.

6. **Document Changes**: Record any modifications made for future reference and auditing purposes.

This ensures that the migration process aligns with the policy requirements, maintaining consistency and expected behavior.