Amendment 01 AI Council - TODO 14-G8: Provider Cooldown Persistence Enhancement

This memo outlines the enhancement required to persist AI provider cooldowns, addressing the current limitation where cooldowns are lost on service restart. The goal is to integrate cooldown state with the `*ftu` table.

1. Blocking Ambiguity or Founder Decision List
- Scope of Cooldowns: Are provider cooldowns global (affecting all users for a specific provider) or user-specific (affecting a single user's access to a specific provider)? The `ftu` table (*ftu) strongly implies user-specific data. If global, `ftu` is an inappropriate persistence target.
- `*ftu` Table Schema: What is the exact column name and data type for storing cooldowns? A JSONB column storing an array of `{providerId: string, expiryTimestamp: number}` objects is assumed for flexibility, where `expiryTimestamp` is a Unix timestamp in milliseconds.
- Cooldown Granularity: Assuming cooldowns are per-user-per-provider, aligning with `*ftu` table's user-centric nature.

2. Already-Settled Constraints
- Cooldowns are currently ephemeral (in-memory only).
- Target persistence mechanism: `*ftu` table.
- Objective: Ensure cooldowns survive service restarts.
- Implementation must be minimal and adhere to the blueprint.
- No modifications to LifeOS user features or TSOS customer-facing surfaces.

3. The Smallest Buildable Next Slice
This slice focuses on establishing the core persistence mechanism for user-specific provider cooldowns.
- **Database Schema Amendment**: Add a `provider_cooldowns` JSONB column to the `*ftu` table. This column will store an array of objects, each containing `providerId` (string) and `expiryTimestamp` (Unix timestamp in milliseconds).
- **Data Access Layer (DAL) Enhancement**: Implement or extend functions within the `ftuRepository` (or equivalent) to:
    - `readUserCooldowns(userId: string)`: Retrieve the `provider_cooldowns` JSONB data for a given user.
    - `updateUserCooldowns(userId: string, cooldownsData: Array<{providerId: string, expiryTimestamp: number}>)`: Persist the updated cooldowns data for a user.
- **Service Layer Integration**:
    - On user session initialization or relevant service startup, load `provider_cooldowns` for the user from the `*ftu` table and populate the in-memory cooldown state.
    - When a provider cooldown is applied or expires for a user, update the in-memory state and then call `updateUserCooldowns` to persist the changes to the `*ftu` table.

4. Exact Safe-Scope Files BuilderOS Should Touch First
- `src/db/migrations/YYYYMMDD_add_provider_cooldowns_to_ftu.js` (for the schema change)
- `src/data/ftuRepository.js` (or `src/data/repositories/ftuRepository.js` for DAL functions)
- `src/services/aiProviderService.js` (or `src/services/ai/aiProviderService.js` for service layer integration)
- `src/utils/cooldownManager.js` (if cooldown logic is abstracted into a utility)

5. Required Verifier/Runtime Checks
- **Persistence Verification**: After applying a cooldown and simulating a service restart, verify the cooldown remains active for the affected user.
- **Expiry Logic**: Confirm that persisted cooldowns correctly expire and allow access after their `expiryTimestamp`.
- **Data Integrity**: Directly inspect the `*ftu` table to ensure the `provider_cooldowns` column accurately reflects the in-memory cooldown state.
- **Concurrency Handling**: Verify that concurrent updates to a user's cooldowns are handled without data loss or corruption.
- **Error Resilience**: Test scenarios where database writes fail and ensure appropriate error handling (e.g., logging, retry mechanisms).

6. Stop Conditions
- The `provider_cooldowns` column is successfully added to the `*ftu` table via migration.
- The `aiProviderService` (or equivalent) correctly reads and writes user-specific cooldown states to/from the `*ftu` table.
- All existing unit and integration tests related to AI provider cooldowns pass with the new persistence layer.
- Manual testing confirms cooldowns persist across service restarts and function as expected without regressions.