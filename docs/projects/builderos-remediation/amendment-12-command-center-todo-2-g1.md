# Amendment 12 Command Center: Phase 14 Cert Endpoint (G1)

This memo outlines the next buildable slice for the Phase 14 certification endpoint, focusing on minimal implementation to unblock further development.

## 1. Blocking Ambiguity or Founder Decision List

*   **`findingsJson` Source:** The exact location and mechanism for retrieving `findingsJson` (file path, database query, in-memory object) are undefined.
*   **`phase_ledger` Schema:** The precise JSON schema for `phase_ledger` is not specified. A default or example structure is needed.
*   **"Cert Script" Identification:** The specific file path and function within the existing "cert script" responsible for writing `phase_ledger` need to be identified.
*   **Error Handling:** Expected behavior for the endpoint if `findingsJson` or `phase_ledger` is unavailable or malformed.

## 2. Already-Settled Constraints

*   **Endpoint:** `GET /api/v1/builder/cert/phase14`.
*   **Response Content:** The endpoint must return a JSON object containing a `phase_ledger` field.
*   **Data Origin:** `phase_ledger` data will originate from `findingsJson`.
*   **Scope:** BuilderOS-only, no impact on LifeOS user features or TSOS customer-facing surfaces.
*   **Safety:** The task is marked `[safe]`, indicating low risk and isolated changes.

## 3. The Smallest Buildable Next Slice

This slice focuses on establishing the endpoint and a basic data flow.

1.  **Endpoint Creation:** Implement the `GET /api/v1/builder/cert/phase14` endpoint.
2.  **Mock `findingsJson`:** For initial development, create a mock `findingsJson` file or object containing a placeholder `phase_ledger`.
3.  **Cert Script Update (Placeholder):** Identify the existing cert script and add a minimal function to write/update the mock `phase_ledger` within the mock `findingsJson` structure. This ensures the data source can be manipulated.
4.  **Endpoint Data Retrieval:** The new endpoint will read the `phase_ledger` from the mock `findingsJson` source and return it.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/api/v1/builder/cert/phase14.js` (New file for the endpoint handler)
*   `src/routes/v1/builder.js` (To register the new route)
*   `scripts/cert.js` (Existing cert script, for modification)
*   `src/data/mockFindings.json` (New file for mock `findingsJson` data)
*   `src/utils/findingsData.js` (New utility to abstract reading/writing `findingsJson` for both endpoint and script)

## 5. Required Verifier/Runtime Checks

*   **Endpoint Reachability:** `GET /api/v1/builder/cert/phase14` returns HTTP 200 OK.
*   **Response Structure:** The response body is a JSON object with a top-level key `phase_ledger`.
*   **Data Consistency:** The `phase_ledger` returned by the endpoint matches the data written by the updated cert script.
*   **Cert Script Execution:** The cert script runs without errors and successfully updates the mock `findingsJson` with `phase_ledger` data.
*   **No Regressions:** Existing builder endpoints and cert script functionalities remain unaffected.

## 6. Stop Conditions

*   The `GET /api/v1