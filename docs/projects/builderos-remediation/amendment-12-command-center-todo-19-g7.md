# Amendment 12 Command Center: Role-Based Access Remediation (TODO-19-G7)

This memo addresses the `[high-risk]` ambiguity regarding role-based access (admin vs client vs agent) for the Command Center blueprint. It outlines a builder-ready enhancement to define the foundational structure for roles without implementing full permission enforcement.

## 1. Blocking Ambiguity or Founder Decision List

*   **Permission Mapping**: What specific Command Center features/data are accessible to `admin`, `client`, and `agent` roles? (e.g., "Admin can view all client data, clients can only view their own, agents can view assigned client data").
*   **Role Assignment Mechanism**: How are users assigned roles? Is it manual, via an existing user management system, or derived from other user attributes?
*   **Default Role**: What is the default role for a user accessing the Command Center if no explicit role is assigned?
*   **Role Hierarchy/Orthogonality**: Are roles strictly orthogonal, or does `admin` implicitly inherit `client` or `agent` permissions?
*   **Enforcement Strategy**: What is the preferred technical mechanism for role enforcement (e.g., API gateway, route middleware, service-level checks, GraphQL directives)?

## 2. Already-Settled Constraints

*   Three primary roles are identified: `admin`, `client`, `agent`.
*   The scope of these roles is limited to the Command Center platform.
*   Existing LifeOS authentication mechanisms (e.g., JWT, session management) will be leveraged for user identification.
*   The solution must be extensible to accommodate future roles or more granular permissions.
*   No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted.

## 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on defining the role enumeration and a basic mechanism to identify a user's role, along with a placeholder for access control. This allows for subsequent development of permission logic once decisions are made.

1.  **Define Role Constants**: Create an enumeration or set of constants for `ADMIN`, `CLIENT`, `AGENT` roles.
2.  **User Role Retrieval Interface**: Implement a stub `getUserRole(userId)` function within an existing or new `auth` utility/service that, for this slice, can return a hardcoded or mocked role based on `userId` for testing purposes.
3.  **Generic Role Authorization Middleware/Utility**: Scaffold a generic `authorizeRole(requiredRoles)` function/middleware that checks if a user's retrieved role is among the `requiredRoles`. This function will initially only perform a basic comparison.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/common/constants/roles.js` (new file): Defines `export const ROLES = { ADMIN: 'admin', CLIENT: 'client', AGENT: 'agent' };`
*   `src/services/auth/auth.service.js` (extend existing): Add `getUserRole(userId)` stub.
*   `src/middleware/authz.middleware.js` (new file or extend existing): Add `authorizeRole(requiredRoles)` stub.

## 5. Required Verifier/Runtime Checks

*   **Unit Test**: `roles.js` exports `ROLES` object with expected keys and string values.
*   **Unit Test**: `auth.service.js::getUserRole(userId)` returns a valid `ROLES` value (e.g., `ROLES.ADMIN` for `userId: 'test-admin-id'`).
*   **Unit Test**: `authz.middleware.js::authorizeRole` correctly identifies if a user's role is included in `requiredRoles` array.
*   **Integration Test (Manual)**: Verify that a simple route protected by `authorizeRole([ROLES.ADMIN])` can be accessed by a user with `ROLES.ADMIN` and blocked for others (using mocked `getUserRole`).

## 6. Stop Conditions

*   `src/common/constants/roles.js` is created and defines the three core roles.
*   `src/services/