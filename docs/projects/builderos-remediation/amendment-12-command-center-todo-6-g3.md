<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Todo 6 G3. -->

### AMENDMENT_12_COMMAND_CENTER - Role-based Access (Todo 6-G3)

This memo enhances the blueprint for implementing role-based access within the Command Center, focusing on a minimal, buildable slice to address the `[high-risk]` designation.

#### 1. Blocking Ambiguity or Founder Decision List

*   **Role Source**: How is the user's role (`admin`, `client`, `agent`) determined? Is it part of the existing authentication token/session payload, or does it require a separate database lookup?
*   **Default Access**: What is the default access level for a user whose role is undefined, unrecognized, or missing? (e.g., deny all, or grant a base "guest" level).
*   **Unauthorized Handling**: How should unauthorized access attempts to protected views/data be handled? (e.g., redirect to login, display a generic error, hide content).

#### 2. Already-Settled Constraints

*   **Existing Auth**: Command Center has an established authentication system. This task extends authorization, not authentication.
*   **Defined Roles**: The target roles are `admin`, `client`, `agent`.
*   **Scope**: This work is internal to the Command Center platform; it must not modify LifeOS user features or TSOS customer-facing surfaces.
*   **Technology**: Node/ES