Amendment 19 Project Governance Proof: G77 - Initial Metadata Structure (100)
Blueprint Reference: `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`
Proof ID: `g77-100`
Date: 2024-07-30
Status: Confirmed
Objective
This proof document confirms the initial definition and establishment of the required project metadata structure for projects under the 'G77' organizational group, in alignment with the directives outlined in Amendment 19 Project Governance. This step focuses on the schema definition and initial data model integration, not yet on enforcement or UI/API integration.
Scope
-   Definition of core project metadata fields as per Amendment 19.
-   Identification of existing data stores for potential integration.
-   Proposal for a canonical metadata schema.
Details
Amendment 19 mandates enhanced project governance, specifically requiring standardized metadata for all projects to facilitate improved auditing, resource allocation, and compliance checks. For the 'G77' group, the initial focus is on defining the foundational metadata fields.
The following fields have been identified and proposed for the initial metadata structure:
-   `projectId`: Unique identifier (existing, immutable)
-   `projectName`: Human-readable project name (existing)
-   `projectOwnerId`: Identifier of the primary owner (new, required)
-   `projectStatus`: Current lifecycle status (e.g., `active`, `on-hold`, `archived`) (new, required)
-   `startDate`: Project initiation date (new, optional)
-   `endDate`: Expected or actual project completion date (new, optional)
-   `budgetCode`: Internal financial tracking code (new, optional)
-   `complianceTags`: Array of relevant compliance frameworks (e.g., `GDPR`, `SOC2`, `HIPAA`) (new, optional)
-   `description`: A brief narrative summary of the project (new, optional)

This initial metadata structure provides the necessary foundation for G77 projects to comply with Amendment 19's governance requirements. The next steps will involve implementing this schema within BuilderOS's internal data systems.

---
Blueprint Note for Proof `g77-100`
---

**1. Exact Missing Implementation or Proof Gap:**
The current proof `g77-100` confirms the *definition* of the Amendment 19 project metadata structure for the 'G77' group. The immediate gap is the concrete *implementation* of this defined schema within the BuilderOS internal data persistence layer, making it available for subsequent governance and operational processes. This includes establishing the database schema and a foundational data access layer.

**2. Smallest Safe Build Slice to Close It:**
Implement the defined project metadata schema in the BuilderOS internal database and establish a basic internal data access layer (repository/service) for CRUD operations on this metadata. This slice focuses solely on the persistence and internal data management, avoiding any external API or UI modifications.

**3. Exact Safe-Scope Files to Touch First:**
-   `src/builder-os/db/migrations/20240731_add_g77_project_metadata_table.js` (or `.sql` depending on existing patterns)
-   `src/builder-os/data/repositories/g77ProjectMetadataRepository.js`
-   `src/builder-os/services/g77ProjectMetadataService.js`
-   `src/builder-os/data/models/g77ProjectMetadata.js` (if an ORM/model layer is used)

**4. Verifier/Runtime Checks:**
-   **Database Schema Validation:**
    -   Run database migrations and verify the `g77_project_metadata` table (or similar) exists with all specified columns (`projectId`, `projectName`, `projectOwnerId`, `projectStatus`, `startDate`, `endDate`, `budgetCode`, `complianceTags`, `description`).
    -   Confirm primary key constraints on `projectId` and appropriate data types.
-   **Unit/Integration Tests for Data Layer:**
    -   Execute unit tests for `g77ProjectMetadataRepository.js