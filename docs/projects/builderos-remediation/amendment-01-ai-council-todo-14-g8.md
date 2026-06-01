Amendment 01 AI Council - TODO 14-G8: Provider Cooldown Persistence Enhancement

This memo outlines the enhancement required to persist AI provider cooldowns, addressing the current limitation where cooldowns are lost on service restart. The goal is to integrate cooldown state with the `*ftu` table.

1. Blocking Ambiguity or Founder Decision List
- **Scope of Cooldowns:** Are provider cooldowns global (affecting all users for a specific provider) or user-specific (affecting a single user's access to a specific provider)? The `*ftu` table (free_tier_usage) strongly implies user-specific data. If global, `*ftu` is an inappropriate persistence target.
- **`*ftu` Table Schema:** What is the exact column name and data