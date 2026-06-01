BuilderOS Remediation: Amendment 41 MarketingOS - ToDo 1 (G5)

This memo addresses the current unbuildable state of `docs/projects/AMENDMENT_41_MARKETINGOS.md` due to outstanding founder decisions, specifically focusing on the "Phase 0 intake form" as the most immediate, foundational element for initial progress.

### 1. Blocking Ambiguity / Founder Decision List

The following founder decisions from §12 OPEN of `AMENDMENT_41_MARKETINGOS.md` remain open and block full implementation:
-   **Pricing Lead Definition:** Specific criteria and data points for identifying a "pricing lead."
-   **First Vertical Selection:** Identification of the initial market vertical for MarketingOS rollout.
-   **Amendment 23 Relationship:** Clarification on how MarketingOS integrates with or supersedes aspects of Amendment 23.
-   **Phase 5 Publisher Strategy:** Details regarding the implementation and scope of Phase 5 publisher features.
-   **Phase 0 Intake Form Requirements:** Specific fields, validation rules, and initial storage mechanism for the intake form. This memo focuses on defining a buildable slice for this item.

### 2. Already-Settled Constraints

-   **Execution Environment:** BuilderOS-only governed loop execution.
-   **Scope Exclusion:** No modifications to LifeOS user features or TSOS customer-facing surfaces.
-   **Implementation Fidelity:** Implement exactly what is instructed within approved builder safe scope.
-   **Blueprint Context:** All work must align with the overarching goals and structure of `AMENDMENT_41_MARKETINGOS.md`.

### 3. Smallest Buildable Next Slice

The smallest buildable next slice focuses on establishing the foundational data model and a basic API endpoint for the "Phase 0 intake form" without requiring immediate founder decisions on full marketing funnel integration or UI design. This slice will define the core data structure for an intake lead and provide a mechanism to receive this data.

**Slice Goal:** Define a basic `IntakeLead` data model and a corresponding API endpoint for its submission.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

To implement the smallest slice, BuilderOS should create the following new files within a dedicated `src/marketingos` directory, ensuring no existing LifeOS/TSOS files are modified:

-   `src/marketingos/models/IntakeLead.js`: Defines the schema/data model for an intake lead (e.g., `email`, `name`, `source`).
-   `src/marketingos/routes/intakeForm.js`: Implements a POST API endpoint (`/api/marketingos/intake`) to receive and validate `IntakeLead` data.
-   `src/marketingos/services/intakeService.js`: Contains logic for processing and storing intake lead data (e.g., saving to a temporary data store or logging).
-   `docs/marketingos/api/intakeForm.md`: Basic API documentation for the new endpoint.

### 5. Required Verifier/Runtime Checks

-   **Data Model Validation:** Ensure `IntakeLead.js` schema correctly validates incoming data (e.g., `email` is a valid email format, required fields are present).
-   **API Endpoint Functionality:** Verify the `/api/marketingos/intake` endpoint:
    -   Accepts POST requests with valid `IntakeLead` data, returning a 200 OK.
    -   Rejects POST requests with invalid data, returning a 400 Bad Request with appropriate error messages.
    -   Does not impact any existing LifeOS or TSOS API routes or services.
-   **Code Style & Patterns:** Adherence to existing Node/ESM patterns and clean code standards.

### 6. Stop Conditions

This buildable slice is complete when:
-   The `IntakeLead` data model is defined and validated.
-   The `/api/marketingos/intake` endpoint is functional, accepting and validating submissions.
-   The submitted data is successfully processed (e.g., logged or stored in a temporary, isolated data store).
-   No further founder decisions are required for the *definition and basic submission* of the Phase 0 intake form data.
-   The implementation adheres to all specified constraints and safe-scope rules.