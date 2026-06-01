# Amendment 19 Project Governance Proof - G79-100

This document serves as a proof-closing blueprint note for the BuilderOS remediation effort related to Amendment 19 Project Governance. It identifies the next smallest build slice required to advance the implementation and verification of the amendment.

---

**Blueprint Note: Next Smallest Build Slice for Amendment 19 Compliance**

**1. Exact missing implementation or proof gap:**
The current `Project` data model and associated API endpoints lack explicit fields to track `governanceApprovalStatus` and a reference to a `governanceReviewRecordId`, as mandated by Amendment 19 for comprehensive project governance. This gap prevents the system from recording and querying the governance state of projects.

**2. Smallest safe build slice to close it:**
Introduce the `governanceApprovalStatus` field (e.g., enum: `PENDING`, `APPROVED`, `REJECTED`, `EXEMPT`) and an optional `governanceReviewRecordId` (string/ObjectId) to the `Project` entity schema and its corresponding API representations. This slice focuses solely on data model and API surface exposure, without implementing full business logic for status transitions or review record creation.

**3. Exact safe-scope files to touch first:**
*   `src/data/models/Project.js` (or `Project.ts`): Add `governanceApprovalStatus` and `governanceReviewRecordId` fields to the Project schema definition.
*   `src/api/schemas/projectSchema.js` (or `projectSchema.ts`): Update Joi/Yup/Zod schema for project creation and update to include validation for `governanceApprovalStatus` and `governanceReviewRecordId`.
*   `src/api/routes/projects.js` (or `projects.ts`): Ensure the project creation and update handlers can accept and persist these new fields, and that GET requests for projects return them.
*   `src/data/migrations/YYYYMMDD_add_governance_fields_to_project.js` (or `.ts`): Create a new database migration script to add these fields to the `projects` collection/table.

**4. Verifier/runtime checks:**
*   **API Check:** Perform a `GET /api/projects/{projectId}` request for an existing project. Verify that the response JSON includes `governanceApprovalStatus` (defaulting to `PENDING` or `null`) and `governanceReviewRecordId` (defaulting to `null`).
*   **API Check:** Perform a `POST /api/projects` request with `governanceApprovalStatus: 'PENDING'` and `governanceReviewRecordId: 'some-uuid-or-id'`. Verify the project is created successfully and a subsequent `GET` request returns these values.
*   **API Check:** Perform a `PUT /api/projects/{projectId}` request to update an existing project's `governanceApprovalStatus` to `APPROVED`. Verify the update is successful and reflected in subsequent `GET` requests.
*   **Database Check:** Directly query the `projects` collection/table in the database. Confirm the presence of `governanceApprovalStatus` and `governanceReviewRecordId` columns/fields and their correct data types.
*   **Unit/Integration Tests:** Existing unit tests for `Project` model/schema and integration tests for project API endpoints should pass without regressions. New tests should be added to specifically cover the presence and basic functionality of the new governance fields.

**5. Stop conditions if runtime truth disagrees:**
*   If the API endpoints (`GET`, `POST`, `PUT` for `/api/projects`) do not correctly accept, store, or return the `governanceApprovalStatus` or `governanceReviewRecordId` fields.
*   If the database migration fails or the new fields are not successfully added to the `projects` collection/table.
*   If existing project creation, retrieval, or update operations exhibit regressions or unexpected behavior after the schema changes.
*   If validation rules for the new fields are not correctly applied (e.g., accepting invalid enum values for `governanceApprovalStatus`).