BuilderOS Remediation: Amendment 12 Command Center - Stage 2 Runtime Mode Switching (G1)

This memo outlines the next buildable slice for implementing runtime mode switching as per `AMENDMENT_12_COMMAND_CENTER.md`, focusing on the `builder_runtime_config` table, `BUILDER_MODE_CHANGE` receipt, and `POST /command-center/mode` endpoint.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Definition of "Modes":** The blueprint implies "runtime mode switching" but does not define the specific modes (e.g., `production`, `staging`, `maintenance`, `debug`) or their intended effects on BuilderOS behavior.
    *   **Decision Required:** Define the initial set of supported modes and their high-level implications for BuilderOS operations.
*   **`builder_runtime_config` Schema Details:** The exact fields required beyond a `mode` identifier are not specified (e.g., `last_updated_by`, `timestamp`, `reason`, `target_entity_id` if mode is entity-specific).
    *   **Decision Required:** Finalize the schema for `builder_runtime_config` table.
*   **`BUILDER_MODE_CHANGE` Receipt Payload:** The specific data to be included in this receipt is not detailed.
    *   **Decision Required:** Define the payload structure for `BUILDER_MODE_CHANGE` receipts.

### 2. Already-Settled Constraints

*   **Scope:** BuilderOS-only governed loop execution. No modification to LifeOS user features or TSOS customer-facing surfaces.
*   **Core Components:** Implementation must involve `builder_runtime_config` table, `BUILDER_MODE_CHANGE` receipt path, and `POST /command-center/mode` endpoint.
*   **Pattern Adherence:** Follow existing Node/ESM patterns for database migrations, API route definitions, and receipt emission.

### 3. Smallest Buildable Next Slice

This slice focuses on establishing the *mechanism* for mode changes and persistence, without implementing the *effects* of those modes.

*   **Database Schema:** Create the `builder_runtime_config` table with a minimal schema (e.g., `id`, `current_mode`, `last_updated_at`, `updated_by_builder_id`).
*   **API Endpoint:** Implement `POST /command-center/mode` to accept a `mode` parameter.
    *   Validate the incoming `mode` against a predefined whitelist (initially, this can be a hardcoded list based on founder decision).
    *   Update the `current_mode` in the `builder_runtime_config` table.
    *   Emit a `BUILDER_MODE_CHANGE` receipt with relevant details (old mode, new mode, timestamp, source).
    *   Return a 202 Accepted response on success.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/builder-os/db/migrations/<timestamp>_create_builder_runtime_config_table.js` (new file)
*   `src/builder-os/api/routes/commandCenterRoutes.js` (extend existing or new if not present)
*   `src/builder-os/api/controllers/commandCenterController.js` (extend existing or new if not present)
*   `src/builder-os/receipts/builderModeChangeReceipt.js` (new file for receipt definition)
*   `src/builder-os/services/builderRuntimeConfigService.js` (new file for DB interactions)

### 5. Required Verifier/Runtime Checks

*   **Verifier Checks:**
    *   Database migration script for `builder_runtime_config` table runs successfully without errors.
    *   `POST /command-center/mode` route is correctly defined and accessible.
    *   Receipt definition for `BUILDER_MODE_CHANGE` is valid.
*   **Runtime Checks:**
    *   `POST /command-center/mode` with a valid mode:
        *   Returns HTTP 202.
        *   Updates `builder_runtime_config.current_mode` in the database.
        *   Emits a `BUILDER_MODE_CHANGE` receipt with correct payload.
    *   `POST /command-center/mode` with an invalid mode:
        *   Returns HTTP 400 Bad Request.
        *   Does not alter the database or emit a receipt.
    *   No regressions on existing BuilderOS functionality.

### 6. Stop Conditions

*   The `builder_runtime_config` table is deployed and accessible.
*   The `POST /command-center/mode` endpoint is live, accepts valid mode changes, persists them to the database, and emits `BUILDER_MODE_CHANGE` receipts.
*   All verifier and runtime checks pass.
*   The system remains stable with no unintended side effects on LifeOS or TSOS.