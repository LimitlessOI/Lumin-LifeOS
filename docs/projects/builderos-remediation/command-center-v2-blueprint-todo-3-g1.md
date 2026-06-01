BuilderOS Remediation: Command Center V2 Blueprint - Update cert script to write phase_ledger to findingsJson

This memo outlines a builder-ready enhancement for integrating `phase_ledger` data into the `findingsJson` output of the certification script, as specified by the Command Center V2 Blueprint.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **`phase_ledger` Data Structure and Source:**
    *   Clarify the exact data structure of `phase_ledger` (e.g., `Array<Object>`, `Object<string, any>`).
    *   Identify the precise origin or computation point of `phase_ledger` within the certification script's execution flow. Is it a direct output of a specific function, or does it need aggregation?
*   **`findingsJson` Integration Path:**
    *   Specify the exact key path within `findingsJson` where `phase_ledger` should be nested (e.g., `findingsJson.certification.phaseLedger`, `findingsJson.phaseLedger`, `findingsJson.metadata.phaseLedger`).
*   **Error Handling for Missing Data:**
    *   Define the expected behavior if `phase_ledger` is undefined, null, or empty during script execution. Should it be omitted, an empty array/object, or trigger an error?

### 2. Already-Settled Constraints

*   **Scope:** BuilderOS-only governed loop execution. No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **Implementation:** Extend existing certification script functionality; do not rebuild.
*   **Blueprint Adherence:** Implement exactly what the instruction asks for within approved builder safe scope, adhering to `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`.
*   **Goal:** Integrate `phase_ledger` into `findingsJson`.

### 3. Smallest Buildable Next Slice

1.  **Identify Certification Script:** Locate the primary certification script responsible for generating `findingsJson` (e.g., `src/certification/certScript.js`).
2.  **Locate `findingsJson` Finalization:** Pinpoint the section where the `findingsJson` object is constructed or finalized before serialization.
3.  **Temporary `phase_ledger` Stub:** For initial development, introduce a temporary, hardcoded `phase_ledger` stub (e.g., `const phaseLedger = [{ phase: 'init', status: 'completed' }];`) to facilitate integration without immediate dependency on the actual data source.
4.  **Integrate Data:** Add a new property to the `findingsJson` object, assigning the `phase_ledger` stub to the agreed-upon path (e.g., `findingsJson.phaseLedger = phaseLedger;`).
5.  **Verify Output:** Ensure the updated `findingsJson` is correctly serialized and written to its target location.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/certification/certScript.js` (or equivalent main certification script file).
*   `tests/unit/certification/certScript.test.js` (for new unit tests covering `phase_ledger` integration).
*   Potentially `types/certification.d.ts` or `schemas/findings.json` if schema definition updates are required based on founder decisions.

### 5. Required Verifier/Runtime Checks

*   **Unit Test:** Add a unit test to `certScript.test.js` that mocks the `phase_ledger` source and asserts that the `findingsJson` object returned by the script's relevant function contains the `phase_ledger` key with the expected data.
*   **Integration Test:** Execute the full certification process in a controlled test environment. Verify the generated `findings.json` file contains the `phase_ledger` data at the