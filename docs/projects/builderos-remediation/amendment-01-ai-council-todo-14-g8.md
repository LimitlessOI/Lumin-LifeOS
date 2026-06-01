Amendment 01 AI Council - TODO 14-G8: Provider Cooldown Persistence

This memo outlines the enhancement required to persist AI provider cooldowns, addressing the current limitation where cooldowns are lost on service restart. The goal is to integrate cooldown state with the `free_tier_usage` table.

1.  **Blocking Ambiguity or Founder Decision List**
    *   **FTU Table Schema:** Confirm exact column name and type for cooldown persistence. Suggest `provider_cooldowns_jsonb JSONB` to store `{ providerId: { expiresAt: timestamp } }` or similar structure.
    *   **Cooldown Granularity:** Confirm if cooldowns are per-user, per-provider, or global. Assuming per-user, per-provider.
    *   **Existing Cooldown Logic:** Identify precise module/function responsible for current in-memory cooldown management.
    *   **Concurrency Strategy:** Define how concurrent updates to `provider_cooldowns_jsonb` will be handled (e.g., optimistic locking, last-write-wins, specific merge logic).

2.  **Already-Settled Constraints**
    *   Cooldowns must persist across service restarts.
    *   Cooldown state must be stored in the `free_tier_usage` table.
    *   No modification to LifeOS user features or TSOS customer-facing surfaces.
    *   BuilderOS-only governed loop execution.
    *   Extend existing patterns; do not rebuild core components.

3.  **Smallest Buildable Next Slice**
    *   **Database Migration:** Add `provider_cooldowns_jsonb JSONB DEFAULT '{}'` column to the `free_tier_usage` table.
    *   **Read Logic:** Implement a function to load `provider_cooldowns_jsonb` from `free_tier_usage` for a given user upon initialization or first access, populating the in-memory cooldown manager.
    *   **Write Logic:** Modify the existing cooldown application/expiration logic to update the `provider_cooldowns_jsonb` column in `free_tier_usage` whenever a cooldown state changes. This should be an atomic update.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `src/db/migrations/YYYYMMDDHHMMSS_add_provider_cooldowns_to_ftu.js` (new file)
    *   `src/data/freeTierUsageRepository.js` (or equivalent ORM/DB access layer for `free_tier_usage` table)
    *   `src/services/aiProviderService.js` (or equivalent module managing AI provider interactions and cooldowns)
    *   `src/utils/cooldownManager.js` (if a dedicated utility exists for in-memory cooldowns)

5.  **Required Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   Verify `free_tier_usage` table schema includes `provider_cooldowns_jsonb`.
        *   Test `freeTierUsageRepository` functions for reading/writing `provider_cooldowns_jsonb`.
        *   Simulate cooldown application, then service restart, verify cooldown state is restored correctly.
        *   Simulate cooldown expiration, then service restart, verify state is correctly cleared.
    *   **Integration Tests:**
        *   End-to-end flow: apply cooldown via API, restart service, attempt usage, verify cooldown enforcement.
        *   Verify no regressions in existing `free_tier_usage` operations.
    *   **Performance:** Monitor database query times for cooldown persistence operations.

6.  **Stop Conditions**
    *   All in-memory AI provider cooldowns are successfully persisted to and retrieved from the `free_tier_usage` table.