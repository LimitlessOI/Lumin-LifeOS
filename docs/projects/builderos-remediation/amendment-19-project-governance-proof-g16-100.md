# Amendment 19 Project Governance Proof: G16-100 - Initial Status Assignment

This document serves as a proof-closing blueprint note for the BuilderOS remediation effort related to Amendment 19 Project Governance, specifically addressing governance requirement G16-100.

---

### Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The current BuilderOS project amendment tracking system lacks a formal, auditable mechanism to set the initial status of a newly proposed project amendment (e.g., Amendment 19) to "Under Review" upon its creation or submission. Proof `g16-100` requires demonstrating this initial status assignment as the foundational step for subsequent governance workflows.

**2. Smallest safe build slice to close it:**
Implement or update the core service responsible for creating new project amendment records within BuilderOS to explicitly set the `status` field to `Under Review` as part of the initial record persistence. This slice focuses solely on the default initial status assignment, ensuring compliance with the first stage of Amendment 19's governance requirements for new amendments.

**3. Exact safe-scope files to touch first:**
*   `src/services/projectAmendmentService.js`: Introduce or modify the `createAmendment` function to include `status: 'Under Review'` in the initial data payload before saving.
*   `src/models/projectAmendment.js`: Verify or add a `status` field definition, ensuring it supports the `Under Review` string or enum value.
*   `src/routes/api/v1/amendments.js`: If an API endpoint directly triggers amendment creation, ensure it correctly calls the updated `projectAmendmentService.js` function.
*   `src/tests/unit/projectAmendmentService.test.js`: Add a new unit test case to assert the `status` field is `Under Review` for newly created amendments.

**4. Verifier/runtime checks:**
*   **Unit Test:** A new unit test in `src/tests/unit/projectAmendmentService.test.js` must successfully create a mock amendment and assert that its `status` property is `Under Review`.
*   **Integration Test (Automated/Manual):**
    1.  Utilize the BuilderOS internal API (e.g., `/api/v1/amendments`) to create a new dummy project amendment.
    2.  Immediately query the BuilderOS project database or API to retrieve the newly created amendment record.
    3.  Verify that the `status` field of the retrieved amendment record is precisely `Under Review`.

**5. Stop conditions if runtime truth disagrees:**
*   If unit tests for `projectAmendmentService.js` fail to assert `status: 'Under Review'` upon amendment creation.
*   If integration tests or manual verification show any status other than `Under Review` for a newly created amendment record.
*   If the `projectAmendment` model does not correctly define or accept `Under Review` as a valid value for its `status` field.
*   If the change introduces regressions, causing existing project creation or update flows (for non-amendment project types) to incorrectly default to `Under Review` status.