# BuilderOS Remediation: Amendment 12 Command Center - Todo 1 (G1)

## Blueprint Enhancement Memo: Stage 2 — Runtime Mode Switching

This memo outlines the next buildable slice for implementing runtime mode switching as per `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`, focusing on the `builder_runtime_config` table, `BUILDER_MODE_CHANGE` receipt path, and `POST /command-center/mode` endpoint.

### 1. Blocking Ambiguity or Founder Decision List

The following points require clarification or founder decisions before full implementation:

*   **`builder_runtime_config` table schema:**
    *   Is this a new table, or an extension of an existing one?
    *   If new, what is the full schema beyond `current_mode`? (e.g., `id`, `mode_name`, `description`, `is_active`, `created_at`, `updated_at`, `updated_by_user_id`?)
    *   What are the allowed values for `current_mode`? (e.g., `LIVE`, `MAINTENANCE`, `DEVELOPMENT`, `PAUSED`?) Define an authoritative enum.
*   **`BUILDER_MODE_CHANGE` receipt path:**
    *   What is the exact mechanism for this "receipt path"? Is it a dedicated database table (`builder_events` or `builder_audit_log`), a structured log entry, or an event bus message?
    *   What data should the receipt contain? (e.g., `timestamp`, `old_mode`, `new_mode`, `actor_id`, `reason`, `success_status`?)
*   **`POST /command-center/mode` endpoint:**
    *   What authentication/authorization mechanism is required for this endpoint? (e.g., internal API key, specific user role, session token?)
    *   What is the expected response body format for success and failure? (e.g., `{ status: 'success', newMode: 'MAINTENANCE' }` or `{ error: 'Invalid mode', code: 'ERR_INVALID_MODE' }`?)
    *   Are there any specific idempotency requirements for mode changes?

### 2. Already-Settled Constraints

*   The objective is to enable runtime switching of BuilderOS operational modes.
*   The solution must interact with a `builder_runtime_config` data store.
*   A `BUILDER_MODE_CHANGE` receipt must be generated upon successful mode alteration.
*   A `POST /command-center/mode` API endpoint will be exposed for triggering mode changes.
*   Implementation must be confined to BuilderOS internal logic; no impact on LifeOS user features or TSOS customer-facing surfaces.
*   Adherence to existing Node/ESM patterns and avoidance of rebuilding existing functionality.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on establishing the core data model and a functional, albeit basic, API endpoint for mode changes.

1.  **Database Schema Definition:** Create or extend the `builder_runtime_config` table with at least `id` (PK), `current_mode` (TEXT/VARCHAR), `last_updated_at` (TIMESTAMP), and `updated_by` (TEXT/VARCHAR). Initialize `current_mode` to a default (e.g., `LIVE`).
2.  **Mode Definition:** Define an internal enum or constant for allowed `BUILDER_MODES` (e.g., `LIVE`, `MAINTENANCE`).
3.  **API Endpoint Skeleton:** Implement `POST /command-center/mode` that:
    *   Accepts a JSON body with a `mode` field.
    *   Validates the incoming `mode` against the defined `BUILDER_MODES`.
    *   If valid, updates the `current_mode` in `builder_runtime_config` and records `last_updated_at` and `updated_by`.
    *   Generates a basic `BUILDER_MODE_CHANGE` receipt (e.g., a log entry or a simple DB insert into a `builder_audit_log` table with `timestamp`, `new_mode`, `actor`).
    *   Returns a 200 OK with the new mode on success, or a 400/403/500 on failure with an appropriate error message.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/db/migrations/YYYYMMDDHHMMSS_create_builder_runtime_config.js` (New migration for table creation/alteration)
*   `src/db/models/BuilderRuntimeConfig.js` (New ORM model, if applicable)
*   `src/lib/builder/configService.js` (New service