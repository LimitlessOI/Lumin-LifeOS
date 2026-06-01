# BuilderOS Remediation: Amendment 01 AI Council - Persist Provider Cooldowns

This memo outlines the next buildable slice for persisting provider cooldowns to the database, ensuring they survive application restarts.

## 1. Blocking Ambiguity or Founder Decision List

*   **Provider Identifier:** Confirm the exact type and source of `providerId`. Is it a string, an enum, or