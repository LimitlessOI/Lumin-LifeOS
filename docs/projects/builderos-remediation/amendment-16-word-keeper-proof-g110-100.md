# Amendment 16 Word Keeper Proof - G110-100

This document serves as a proof-closing blueprint note for the G110-100 build slice of Amendment 16: Word Keeper.

## 1. Exact Missing Implementation or Proof Gap

The current state lacks a defined and persisted data model for the core `Word` entity. Specifically, there is no database schema or ORM entity definition for storing individual words and their associated metadata (e.g., `text`, `language`, `frequency`, `last_accessed_at`). Without this foundational persistence layer, subsequent service and API development for Word Keeper cannot proceed effectively or reliably.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice is the implementation of the `Word` entity's data model and its initial persistence layer. This includes:
-   Defining the `Word` entity structure with appropriate fields and types.
-   Creating a database migration to establish the `words` table in the primary LifeOS database.
-   Implementing a basic repository interface for `Word` entities, supporting fundamental operations like `save` and `findById`.

This slice focuses solely on establishing the data persistence foundation, avoiding any business logic, API exposure, or complex query patterns at this stage.

## 3. Exact Safe-Scope Files to Touch First

Based on existing LifeOS patterns for data persistence within the `src/data` layer:

-   `src/data/entities/Word.entity.ts`: Define the `Word` ORM entity class, including column definitions and relationships (if any, though none expected for this initial slice).
-   `src/data/migrations/170