Amendment 19 Project Governance Remediation Proof: G128-100
Blueprint Source: `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`
This document serves as a proof for the initial build slice derived from Amendment 19 Project Governance blueprint, focusing on establishing foundational project metadata alignment. This proof confirms the identification of the next smallest build slice required to progress the remediation.
---
Proof-Closing Blueprint Note
1. Exact Missing Implementation or Proof Gap:
The current project definition schema within BuilderOS lacks explicit fields or validation mechanisms to enforce the `governanceModel` as defined by Amendment 19. Specifically, there is no programmatic way to declare or verify a project's adherence to a specific governance model (e.g., `standard`, `critical`, `experimental`) at the data model level.
2. Smallest Safe Build Slice to Close It:
Introduce a `governanceModel` field into the project configuration schema, allowing projects to declare their intended governance model. This slice focuses solely on schema definition and initial data migration/defaulting, without implementing full enforcement logic or business rules based on the governance model.
3. Exact Safe-Scope Files to Touch First:
-   `src/core/project/project.schema.js` (or equivalent Joi/Yup/Zod schema definition for project entities)
-   `src/core/project/project.model.js` (if a Mongoose/Sequelize/Prisma model needs updating to reflect the new schema field)
-   `src/migrations/2024xxxx_add_governance_model_to_projects.js` (for db schema update and initial data defaulting for existing projects)
4. Verifier/Runtime Checks:
-   Schema Validation: Verify that new project creation or existing project updates fail if `governanceModel` is provided with an invalid enum value (e.g., not `standard`, `critical`, `experimental`).
-   Data Persistence: Confirm that a project created or updated with a valid `governanceModel` value successfully persists this value in the db.
-   API Endpoint Check: If a project API exists, verify that the API allows setting and retrieving the `governanceModel` field, and that it respects the schema validation.
-   Migration Check: After running the migration, verify that existing projects without a `governanceModel` field are correctly defaulted (e.g., to `standard`) in the db.
5. Stop Conditions if Runtime Truth Disagrees:
-   If schema validation allows invalid `governanceModel` values to pass.
-   If `governanceModel` values are not correctly persisted or retrieved from the db.
-   If existing projects without a `governanceModel` field are not correctly defaulted upon migration.
-   If touching the identified files causes unexpected side effects or breaks existing core project functionality (e.g., project creation/update, listing projects).
---
Next Steps (C2 Build Pass)
The next C2 build pass will focus on implementing the schema changes and initial migration as outlined in the blueprint note above, ensuring the foundational data structure is in place