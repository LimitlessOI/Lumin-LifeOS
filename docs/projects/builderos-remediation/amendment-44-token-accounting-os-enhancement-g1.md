<!-- SYNOPSIS: Documentation — Amendment 44 Token Accounting Os Enhancement G1. -->

Amendment 44: Token Accounting OS Enhancement - G1

This memo outlines the first buildable slice for the Token Accounting OS enhancement, addressing the lack of a directly buildable safe-scope task in the initial blueprint. The focus is on establishing core token balance management primitives.

1. Blocking Ambiguity or Founder Decision List
    - Token Definition & Scope: What constitutes a "token"? Is it a single fungible unit, or can different token types exist? (Founder Decision Required)
    - Initial Token Supply: How are tokens initially created or provisioned into the system? (Founder Decision Required)
    - Balance Precision: What is the required decimal precision for token amounts? (Founder Decision Required)
    - Negative Balances: Is it permissible for a user's token balance to go negative under any circumstances? (Founder Decision Required)

2. Already-Settled Constraints
    - BuilderOS-only governed loop execution.
    - No modification of LifeOS user features or TSOS customer-facing surfaces.
    - Implementation strictly within approved builder safe scope.
    - Focus on establishing core token balance management primitives.
    - This slice is the first buildable step, addressing the initial blueprint's lack of atomic tasks.

3. The Smallest Buildable Next Slice
    - **Objective:** Implement foundational data storage and atomic balance update functions for a single, default token type.
    - **Components:**
        - Database schema for `token_balances` table: `id`, `userId`, `balance`, `updatedAt`.
        - Data Access Layer (DAL) functions: `getTokenBalance(userId)`, `updateTokenBalance(userId, amountChange)`.
        - Core Service Layer: `TokenAccountingService.getAccountBalance(userId)`, `TokenAccountingService.adjustAccountBalance(userId, amountChange)`.
    - **Behavior:**
        - `adjustAccountBalance` must be atomic, ensuring concurrent updates are handled correctly (e.g., using database transactions or optimistic locking).
        - Initial balance for a new user defaults to zero.

4. Exact Safe-Scope Files BuilderOS Should Touch First
    - `src/data/tokenBalancesRepository.js`: New file for database interactions (e.g., `get`, `update`).
    - `src/services/tokenAccountingService.js`: New file for core business logic (e.g., `getAccountBalance`, `adjustAccountBalance`).
    - `src/db/migrations/YYYYMMDDHHMMSS_create_token_balances_table.js`: New database migration file to create the `token_balances` table.
    - `src/types/tokenAccounting.d.ts`: New file for TypeScript type definitions (if applicable, assuming TS is used).

5. Required Verifier/Runtime Checks
    - **Unit Tests:**
        - `tokenBalancesRepository.js`: Verify `getTokenBalance` returns correct values, `updateTokenBalance` correctly modifies balances.
        - `tokenAccountingService.js`: Verify `getAccountBalance` and `adjustAccountBalance` integrate correctly with the repository.
    - **Integration Tests:**
        - Ensure `adjustAccountBalance` handles concurrent calls without data loss or incorrect final balances.
        - Verify initial balance for new users is zero.
        - Verify database schema is correctly applied by migration.
    - **Schema Validation:** Ensure `token_balances` table adheres to the defined schema.
    - **Negative Balance Check:** If Founder Decision dictates no negative balances, a runtime check must prevent `adjustAccountBalance` from resulting in a negative balance.

6. Stop Conditions
    - The `token_balances` table is successfully deployed and accessible.
    - `tokenBalancesRepository.js` provides robust, tested data access for balances.
    - `tokenAccountingService.js` exposes atomic `getAccountBalance` and `adjustAccountBalance` functions.
    - All unit and integration tests for this slice pass consistently.
    - No external-facing APIs or UI components have been modified or introduced.
    - All blocking ambiguities listed in Section 1 are explicitly addressed or deferred by founder decision.