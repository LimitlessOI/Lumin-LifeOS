Blueprint Enhancement Memo: AMENDMENT_12_COMMAND_CENTER - Role-based Access (G2)
This memo addresses the "Role-based access (admin vs client vs agent views)" task, providing a builder-ready slice for initial implementation.
1. Blocking Ambiguity or Founder Decision List
-   Role-to-Route Mapping: Precise definition of which routes/apiEPs require specific roles (admin, client, agent) for access. The blueprint only lists roles, not their specific access rights.
-   Unauthorized Access Handling: Desired behavior when a user attempts to access a restricted resource without the required role (e.g., HTTP 403 Forbidden, redirect to login, specific error message).
-   Role Source of Truth: Confirmation of where the user's role information is reliably stored and accessed (e.g., `req.user.role` after auth, db lookup).
2. Already-Settled Constraints
-   The system must support distinct roles: `admin`, `client`, and `agent`.
-   Access control must differentiate views/endpoints based on these roles.
-   Implementation must extend existing auth patterns, not rebuild them.
-   The solution should be reusable across multiple routes.
3. The Smallest Buildable Next Slice
Implement a generic `authorizeRoles` mw that accepts an array of allowed roles. This mw will check the authenticated user's role (assumed to be available at `req.user.role`) against the allowed roles. If the user's role is not in the allowed list, access will be denied. This mw will then be applied to one existing, non-critical apiEP to demonstrate its functionality.
4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/mw/authorizeRoles.js` (New file for the role-based access control mw)
-   `src/routes/api/v1/status.js` (Modify an existing, non-critical API route to apply the new mw)
5. Required Verifier/Runtime Checks
-   Admin Access: Verify that a user with `role: 'admin'` can successfully access the `/api/v1/status` endpoint after the mw is applied.
-   Client/Agent Denial: Verify that users with `role: 'client'` or `role: 'agent'` are denied access to `/api/v1/status` and receive an appropriate HTTP 403 Forbidden response.
-   Unauthenticated Denial: Verify that unauthenticated users are denied access (this should be handled by existing auth mw, but confirm it's not bypassed).
-   Error Handling: Confirm that the system logs unauthorized access attempts appropriately.
6. Stop Conditions
-   The `src/mw/authorizeRoles.js` file is created and contains a functional mw.
-   The `authorizeRoles` mw is successfully integrated into `src/routes/api/v1/status.js`.