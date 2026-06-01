The instruction to "Generate the complete implementation code" contradicts the task to "Write docs/projects/builderos-remediation/amendment-12-command-center-todo-6-g2.md" and the verifier's expectation of executable code for a `.md` file. I am proceeding by providing the markdown content as the "implementation" of the `.md` file.
BuilderOS Remediation: Amendment 12 Command Center - Role-Based Access (G2)
This memo addresses the high-risk task: "Role-based access (admin vs client vs agent views)". The blueprint is not directly buildable due to ambiguity regarding the scope and implementation details of these roles.
1. Blocking Ambiguity or Founder Decision List
-   Role Granularity & Scope: What specific features, data, or UI elements are restricted per role (admin, client, agent)? Is this purely UI-driven, API-driven, or both?
-   Default Role Assignment: How are users initially assigned a role? Is there a default, or is it explicitly set during creation/onboarding?
-   Role Management: Who can assign/change roles? Is there an admin interface for this, or is it programmatic?
   Authentication vs. Authorization: Is this task solely focused on authz (what a user can do* once authenticated) or does it involve auth flows as well? Assume authz for now.
2. Already-Settled Constraints
-   Required Roles: The system must support at least three distinct roles: `admin`, `client`, `agent`.
-   Existence of Task: Role-based access control is a confirmed requirement for the Command Center.
-   No LifeOS User Feature Modification: Changes must not impact existing LifeOS user features or TSOS customer-facing surfaces.
3. Smallest Buildable Next Slice
The most fundamental next slice is to establish the data model foundation for roles. This involves:
1.  Defining the set of valid roles as an enumerable constant.
2.  Adding a `role` field to the existing `User` model (or equivalent user entity).
3.  Ensuring basic validation for the `role` field to only accept predefined values.
This slice focuses purely on data persistence and validation, deferring UI and API enforcement.
4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/config/roles.js`: Define `ROLES = ['admin', 'client', 'agent']` (or similar enum).
-   `src/models/user.js`: Add `role: { type: String, enum: ROLES, default: 'client', required: true }` to the user schema/model definition.
-   `src/db/migrations/add_user_role_field.js`: Create a migration script to add the `role` column to the `users` table with a default value (e.g., 'client') and appropriate constraints.
-   `src/types/user.d.ts`: Update TS definition for `User` to include the `role` property.
5. Required Verifier/Runtime Checks
-   Database Schema Check: Verify that the `users` table now contains a `role` column of type `VARCHAR` (or equivalent) with a `*nn` constraint and a default value.
-   Model Validation Test: Attempt to create/update a user with an invalid `role` value; ensure it fails with a validation error.
-   Model Persistence Test: Create a user with each valid role (`admin`, `client`, `agent`); verify the role is correctly stored and retrieved.
-   Default Role Test: Create a user without specifying a role; verify the default role (e.g., 'client') is assigned.
6. Stop Conditions
This slice is complete when:
-   The `ROLES` constant is defined and accessible.
-   The `User` model schema includes a `role` field with enum validation against `ROLES`.
-   A db migration has been successfully applied, adding the `role` column to the `users` table.
-   All verifier/runtime checks listed above pass successfully.
-   The system can successfully store and retrieve users with valid roles.