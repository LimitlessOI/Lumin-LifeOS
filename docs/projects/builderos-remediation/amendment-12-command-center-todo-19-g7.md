Blueprint Enhancement Memo: AMENDMENT_12_COMMAND_CENTER - Role-Based Access Remediation (TODO-19-G7)

This memo addresses the high-risk ambiguity regarding role-based access (admin vs client vs agent) within the Command Center blueprint. The goal is to define a minimal, buildable slice to establish foundational access control without violating the existing blueprint.

### 1. Blocking Ambiguity / Founder Decision List

The core ambiguity lies in the specific implementation details of role-based access control (RBAC) for the Command Center. Founder decisions are required on:

*   **Role Definition & Assignment:**
    *   How are user roles (`admin`, `client`, `agent`) stored and retrieved? (e.g., `user.role` field in existing user object, external IdP claim).
    *   What is the authoritative source for role data?
*   **Granularity of Permissions:**
    *   What specific actions/routes are permitted for each role? (e.g., `admin` can do X, `client` can do Y, `agent` can do Z).
    *   Is there a hierarchy or inheritance among roles?
*   **Default Access:**
    *   What is the default access level for unauthenticated or undefined roles?

### 2. Already-Settled Constraints

*   The Command Center requires distinct roles: `admin`, `client`, `agent`.
*   Implementation must be `BuilderOS-only` and not modify `LifeOS` user features or `TSOS` customer-facing surfaces.
*   The solution must be minimal, extending existing patterns without rebuilding.
*   The blueprint `AMENDMENT_12_COMMAND_CENTER.md` is the source of truth.

### 3. Smallest Buildable Next Slice

Implement foundational RBAC by:
1.  Defining role constants.
2.  Creating a generic `authorize` middleware.
3.  Applying this middleware to a single, new, `admin`-only Command Center endpoint.

This slice establishes the pattern for role definition and enforcement without specifying all permissions for all roles, which is a blocking ambiguity.

**Example Slice:**
*   Define `ROLES = { ADMIN: 'admin', CLIENT: 'client', AGENT: 'agent' }`.
*   Create `authMiddleware(requiredRoles)` that checks `req.user.role` against `requiredRoles`.
*   Add a new `GET /command-center/admin/status` route, protected by `authMiddleware([ROLES.ADMIN])`.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/command-center/constants/roles.js`: Define `ROLES` enum.
*   `src/command-center/middleware/authorize.js`: Implement `authorize` middleware.
*   `src/command-center/routes/admin-status.js`: Define the new `GET /command-center/admin/status` route.
*   `src/command-center/index.js` (or equivalent router entry point): Integrate the new route and middleware.

### 5. Required Verifier/Runtime Checks

*   **Unit Tests (`src/command-center/middleware/authorize.test.js`):**
    *   `authorize` middleware grants access for correct role.
    *   `authorize` middleware denies access (403) for incorrect role.
    *   `authorize` middleware denies access (401) for unauthenticated users (missing `req.user`).
*   **Integration Test:**
    *   `GET /command-center/admin/status` returns 200 for `admin` user.
    *   `GET /command-center/admin/status` returns 403 for `client` or `agent` user.
    *   `GET /command-center/admin/status` returns 401 for unauthenticated user.

### 6. Stop Conditions

*   `ROLES` enum is defined and accessible.
*   `authorize` middleware is implemented and unit-tested.
*   A single `admin`-only Command Center route (`/command-center/admin/status`) is implemented, protected by `authorize` middleware, and integration-tested.
*   No new ambiguities are introduced.
*   Further role-specific permissions for `client` and `agent` are explicitly deferred to subsequent amendments.