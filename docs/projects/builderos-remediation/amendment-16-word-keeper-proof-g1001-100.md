Amendment 16 Word Keeper Proof: G1001-100 - Initial Word Entity and Persistence

This proof-closing blueprint note addresses the foundational data model and initial persistence mechanism for the Word Keeper system, as outlined in `docs/projects/AMENDMENT_16_WORD_KEEPER.md`. This is the smallest safe build slice to establish the core data layer.

### 1. Exact Missing Implementation or Proof Gap

The current gap is the absence of a defined data model for a 'Word' entity and the corresponding persistence layer to store and retrieve these entities within the BuilderOS context. This includes:
- Definition of the `Word` entity structure (e.g., `id`, `value`).
- Mechanism for persisting `Word` entities to the database.
- Basic repository/service methods for `create` and `findById` for `Word` entities.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
- Creating a `Word` model definition.
- Implementing a `WordRepository` with `create` and `findById` methods.
- Ensuring these components are isolated within BuilderOS scope and do not impact LifeOS or TSOS.

### 3. Exact Safe-Scope Files to Touch First

To implement this slice, the following new files are proposed within the BuilderOS domain:
- `builder-os/src/models/Word.js`: Defines the `Word` entity schema.
- `builder-os/src/repositories/WordRepository.js`: Provides persistence methods for `Word` entities.
- `builder-os/src/database/migrations/YYYYMMDDHHMMSS_create_word_table.js`: Database migration to create the `words` table.

### 4. Verifier/Runtime Checks

- **Database Schema Check**: Verify that the `words` table is successfully created in the BuilderOS database schema with `id` (primary key) and `value` (string, unique) columns.
- **Entity Creation Test**: Attempt to create a new `Word` entity via `WordRepository.create()`. Verify that the returned entity has an `id` and the correct `value`.
- **Entity Retrieval Test**: Retrieve the created `Word` entity by its `id` using `WordRepository.findById()`. Verify that the retrieved entity matches the created one.
- **Isolation Check**: Confirm that no database tables, models, or services outside the `builder-os` scope are modified or accessed by these new components.

### 5. Stop Conditions if Runtime Truth Disagrees

- **Migration Failure**: If the database migration to create the `words` table fails, stop immediately.
- **Persistence Failure**: If `WordRepository.create()` or `WordRepository.findById()` operations fail or return incorrect data, stop immediately.
- **Scope Violation**: If any runtime check indicates interaction with or modification of LifeOS user features or TSOS customer-facing surfaces, stop immediately.
- **Syntax/Runtime Errors**: Any unhandled exceptions or syntax errors during the execution of the new components.

This note is ready for the next C2 build pass.