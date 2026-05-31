Amendment 44: Token Accounting OS Enhancement - G1 Remediation Memo

This memo outlines the first buildable slice for the Token Accounting OS enhancement, addressing the lack of directly buildable tasks in the initial blueprint. The focus is on establishing core transaction recording capabilities without modifying user-facing features.

1. Blocking Ambiguity / Founder Decision List
-   Persistence Layer: The specific database technology (e.g., PostgreSQL, MongoDB) and ORM/ODM choice for token transaction storage needs explicit founder decision. The current blueprint is silent on this.
-   Transaction Metadata: What minimum set of metadata fields (e.g., `sourceServiceId`, `correlationId`, `tokenType`, `amount`, `timestamp`, `entityId` for the token's subject) is required for *every* recorded transaction?
-   Error Handling Strategy: How should failures in token transaction recording be handled (e.g., retry mechanisms, dead-letter queues, immediate rollback, alerting)?

2. Already-Settled Constraints
-   No modification to LifeOS user features or TSOS customer-facing surfaces.
-   Implementation must be strictly within BuilderOS internal scope.
-   Must adhere to existing Node/ESM patterns and coding standards.
-   Focus on foundational token transaction recording; complex accounting logic (e.g., balances, aggregations, reporting) is out of scope for this slice.

3. Smallest Buildable Next Slice
-   Define a `TokenTransaction` interface or schema representing a single token event.
-   Implement a `TokenTransactionService` with a single public method: `recordTransaction(transaction: TokenTransaction)`.
-   Establish a basic persistence mechanism (e.g., a new database table or collection) for `TokenTransaction` records.

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/builder-os/token-accounting/interfaces/token-transaction.interface.ts` (new file)
-   `src/builder-os/token-accounting/services/token-transaction.service.ts` (new file)
-   `src/builder-os/token-accounting/data/token-transaction.repository.ts` (new file, or integrate with existing data layer)
-   `src/builder-os/token-accounting/data/migrations/001-create-token-transactions-table.ts` (new file, if relational DB)
-   `src/builder-os/token-accounting/index.ts` (new file, for module export)
-   `package.json` (add new dependencies if persistence layer requires them, e.g., `pg`, `mongoose`)

5. Required Verifier/Runtime Checks
-   Unit tests for `TokenTransactionService.recordTransaction` ensuring correct data transformation and calls to the repository.
-   Integration tests verifying a `TokenTransaction` can be successfully persisted and retrieved from the chosen data store.
-   Schema validation on `TokenTransaction` input to `recordTransaction` to ensure data integrity.

6. Stop Conditions
-   A `TokenTransactionService` is deployed and capable of successfully recording a `TokenTransaction` to the persistence layer.
-   The recorded transaction can be retrieved and its integrity verified.
-   No user-facing changes or unintended side effects are introduced.