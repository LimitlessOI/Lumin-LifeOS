# Amendment 12 Command Center: Phase 14 Cert Endpoint & Script Update (G1)

This memo outlines the next buildable slice for implementing the Phase 14 certification endpoint and updating the associated cert script, as per the `AMENDMENT_12_COMMAND_CENTER.md` blueprint.

## 1. Blocking Ambiguity or Founder Decision List

*   **`findingsJson` Source:** The exact file path or data source for `findingsJson` is not specified.
    *   **Decision Required:** Confirm the canonical path for `findingsJson`. (Assumption: `data/findings.json`)
*   **Cert Script Identity:** The specific "cert script" to be updated is not named.
    *   **Decision Required:** Identify the target script. (Assumption: `scripts/builder/generate-cert-data.js`)
*   **`phase_ledger` Write Target:** The output location/format for the `phase_ledger` written by the cert script is not defined.
    *   **Decision Required:** Specify the output path and format. (Assumption: `data/phase_ledger.json`)

## 2. Already-Settled Constraints

*   **Endpoint Path:** `GET /api/v1/builder/cert/phase14`.
*   **Endpoint Return:** `phase_ledger` extracted from `findingsJson`.
*   **Scope:** BuilderOS-only; no impact on LifeOS user features or TSOS customer-facing surfaces.
*   **Implementation:** Node/ESM, extend existing patterns, do not rebuild.
*   **Estimated Effort:** 2 hours (from blueprint).

## 3. Smallest Buildable Next Slice

This slice focuses on creating the API endpoint and a minimal update to the assumed cert script.

1.  **API Endpoint Creation:**
    *   Implement a new `GET` route handler at `/api/v1/builder/cert/phase14`.
    *   This handler will read the `findingsJson` (from the assumed path).
    *   It will extract the `phase_ledger` property from the parsed JSON.
    *   The extracted `phase_ledger` will be returned as the response body with a 200 OK status.
    *   Include basic error handling for file not found or malformed JSON.

2.  **Cert Script Update (Minimal):**
    *   Modify the assumed `scripts/builder/generate-cert-data.js` script.
    *   Add logic to read `findingsJson` (from the assumed path).
    *   Extract the `phase_ledger` property.
    *   Write the `phase_ledger` to the assumed output path (`data/phase_ledger.json`).

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/api/v1/builder/cert/phase14.js` (New file for the route handler)
*   `src/api/v1/builder/index.js` (To register the new `phase14` route)
*   `scripts/builder/generate-cert-data.js` (Existing script to be modified)
*   `data/findings.json` (Read-only access for both API and script)
*   `data/phase_ledger.json` (New file to be written by the script)

## 5. Required Verifier/Runtime Checks

*   **API Endpoint:**
    *   `GET /api/v1/builder/cert/phase14` returns HTTP 200.
    *   Response body is a JSON object containing the `phase_ledger` data.
    *   The returned `phase_ledger` matches the content from `data/findings.json`.
    *   Endpoint returns HTTP 404/500 if `data/findings.json`