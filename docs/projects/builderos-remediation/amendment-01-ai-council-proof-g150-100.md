Amendment 01 AI Council: Proof-Closing Blueprint Note (G150-100)
Blueprint Source: `docs/projects/AMENDMENT_01_AI_COUNCIL.md`

This note addresses a foundational build slice for the AI Council initiative, specifically focusing on establishing the core data persistence mechanism for AI Council recommendations. This is a critical prerequisite for subsequent features requiring recommendation storage and retrieval.

### 1. Exact Missing Implementation or Proof Gap

The current gap is the absence of a defined data model and persistence layer for `AiCouncilRecommendation` entities. This includes:
*   Database schema definition for `ai_council_recommendations` table.
*   ORM/data access layer for basic CRUD operations (create, read by ID).
*   Initial database migration script.

### 2. Smallest Safe Build Slice to Close It

This slice focuses on establishing the core persistence:
*   Define `AiCouncilRecommendation` data model (e.g., `id`, `recommendationText`, `status`, `createdAt`, `updatedAt`).
*   Create database migration to add `ai_council_recommendations` table.
*   Implement `AiCouncilRecommendationRepository` with `create` and `findById` methods.
*   No external API exposure or UI integration.

### 3. Exact Safe-Scope Files to Touch First

*   `src/data/models/AiCouncilRecommendation.js`: Defines the data model structure.
*   `src/data/migrations/YYYYMMDDHHMMSS_create_ai_council_recommendations.js`: Database migration script.
*   `src/data/repositories/AiCouncilRecommendationRepository.js`: Implements data access logic.
*   `src/data/index.js`: Exports the new repository for internal BuilderOS use.

### 4. Verifier/Runtime Checks

*   **Schema Existence**: Verify `ai_council_recommendations` table exists in the development database post-migration.
    *   `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_council_recommendations');`
*   **Basic Persistence Test**: Unit/integration test:
    *   Create a new `AiCouncilRecommendation`.
    *   Retrieve it by ID.
    *   Assert retrieved data matches created data.
*   **Scope Adherence**: Confirm no modifications to LifeOS user features or TSOS customer-facing surfaces.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Migration Failure**: Database migration fails or table is not created.
*   **Persistence Test Failure**: `create` or `findById` operations fail or return incorrect data.
*   **Schema Mismatch**: Actual database schema for `ai_council_recommendations` deviates from the defined model.
*   **Unintended Side Effects**: Any observed impact on existing BuilderOS functionality or external systems.

This build slice is strictly confined to establishing internal data persistence for AI Council recommendations within BuilderOS.