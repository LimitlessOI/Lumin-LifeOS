BuilderOS Remediation: Amendment 12 Command Center - Phase 14 Cert Endpoint

This memo outlines the next buildable slice for implementing the Phase 14 certification endpoint and related script updates, as per `AMENDMENT_12_COMMAND_CENTER.md`.

1. Blocking Ambiguity or Founder Decision List
-   **`findingsJson` Path and Structure**: The exact file path and expected JSON schema for `findingsJson` are undefined. This is critical for extracting `phase_ledger`.
-   **`phase_ledger` Schema**: The expected structure and content of `phase_ledger` itself are not specified. How should it be derived from `findingsJson`?
-   **"Cert Script" Identification and Location**: The specific script to be updated is not identified. Its current functionality and how `phase_ledger` should be integrated into its output are unknown.
-   **`phase_ledger` Storage/Output by Script**: Where and how should the "cert script" write `phase_ledger`? (e.g., to a file, DB, stdout).

2. Already-Settled Constraints
-   **Endpoint**: `GET /api/v1/builder/cert/phase14`.
-   **Data Source**: `phase_ledger` derived from `findingsJson`.
-   **Script Update**: An existing "cert script" must be updated to write `phase_ledger`.
-   **Scope**: BuilderOS-only; no impact on LifeOS user features or TSOS customer-facing surfaces.
-   **Safety**: `[safe]` operation.
-   **Estimated Effort**: 2 hours.

3. Smallest Buildable Next Slice
This slice establishes the endpoint and a basic integration point for `phase_ledger` extraction, deferring complex `findingsJson` parsing until its structure is defined.
-   **API Endpoint Definition**: Create the `GET /api/v1/builder/cert/phase14` route.
-   **Controller Logic**: Implement a basic controller that returns a placeholder `phase_ledger` (e.g., `{}` or `{ "status": "pending_findings_json_spec" }`), indicating readiness for `findingsJson` integration.
-   **Cert Script Stub**: Identify the "cert script" (e.g., `scripts/generateCert.js`) and add a function/section that, when called, would "write" a placeholder `phase_ledger` to a specified location (e.g., console log, temporary file).

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/routes/builder/certRoutes.js`: Define the new `GET` route.
-   `src/controllers/builderCertController.js`: Implement the handler for `GET /api/v1/builder/cert/phase14`.
-   `src/services/builderCertService.js`: (New file, if not existing) Encapsulate `phase_ledger` logic.
-   `scripts/generateCert.js`: The identified "cert script" to be modified.
-   `src/utils/builder/findingsParser.js`: (New file) Placeholder for `findingsJson` parsing logic.

5. Required Verifier/Runtime Checks
-   **API Endpoint Reachability**: `curl -X GET http://localhost:<PORT>/api/v1/builder/cert/phase14` returns HTTP 200.
-   **API Response Structure**: The response body contains a `phase_ledger` field.
-   **Cert Script Execution**: Running the updated `scripts/generateCert.js` completes without errors and produces an output (e.g., console log, temporary file) indicating `phase_ledger` was "written."
-   **No Side Effects**: Verify no unintended changes to LifeOS user features or TSOS surfaces.

6. Stop Conditions
-   The `GET /api/v1/builder/cert/phase14` endpoint is deployed and returns a valid (even if placeholder) `phase_ledger` structure.
-   The identified "cert script" has been updated to include the mechanism for writing `phase_ledger` (even if it's writing a placeholder).
-   All blocking ambiguities from section 1 are documented and awaiting founder decisions or further specification.