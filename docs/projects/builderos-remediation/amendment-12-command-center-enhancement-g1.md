BuilderOS Remediation: Amendment 12 Command Center Enhancement - G1

This memo outlines the next buildable slice for "Stage 2 — runtime mode switching" as per `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`. The goal is to establish the foundational API and data structures for runtime mode changes within BuilderOS.

1.  **Blocking Ambiguity / Founder Decision List:**
    *   **Mode Values:** Define the exhaustive, canonical list of valid `mode` strings (e.g., `DEVELOPMENT`, `STAGING`, `PRODUCTION`, `MAINTENANCE`, `EMERGENCY`, `TESTING`). This list must be centrally managed.
    *   **Authorization Policy:** Specify the precise authorization mechanism for `POST /command-center/mode`. Is it role-based (e.g., `ADMIN`, `OPERATOR`), user-ID based, or a combination? Define fallback behavior for unauthorized attempts.
    *   **`builder_runtime_config` Table Schema:** Finalize the exact column definitions, data types, and constraints for the `builder_runtime_config` table. Clarify the structure and expected content of the `config_payload_json` column.
    *   **`BUILDER_MODE_CHANGE` Receipt Structure:** Detail the required fields for the `BUILDER_MODE_CHANGE` receipt, including `receipt_id`, `timestamp`, `initiator_user_id`, `requested_mode`, `current_system_mode` (at time of request), and `status` (e.g., `REQUESTED`, `APPROVED`, `REJECTED`).

2.  **Already-Settled Constraints:**
    *   BuilderOS-only scope; no impact on LifeOS user features or TSOS customer surfaces.