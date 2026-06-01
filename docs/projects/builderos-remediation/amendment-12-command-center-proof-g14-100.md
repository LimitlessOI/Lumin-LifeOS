# Amendment 12 Command Center Proof - G14-100

This document outlines the next smallest blueprint-backed build slice for the BuilderOS Command Center, focusing on the initial read-only dashboard as per the phased rollout plan in `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`.

---

## Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The core gap is the absence of a foundational read-only dashboard within the Command Center frontend, coupled with the necessary backend GraphQL endpoint to serve basic system status information. This initial slice proves the end-to-end connectivity and basic rendering capability.

**2. Smallest safe build slice to close it:**
Implement a minimal read-only dashboard page in the Command Center frontend that fetches and displays a hardcoded/mocked "System Status" and "Last Update" timestamp from a new, simple GraphQL query on the backend. This establishes the full stack plumbing without requiring complex data integration.

**3. Exact safe-scope files to touch first:**
-   `apps/command-center-frontend/src/pages/dashboard.tsx` (New file: React page component for the dashboard view)
-   `apps/command-center-frontend/src/components/DashboardStatusCard.tsx` (New file: React component to display status)
-   `apps/command-center-backend/src/graphql/schema.ts` (Amendment: Add `type Query { status: SystemStatus! }` and `type SystemStatus { message: String!, timestamp: String! }`)
-   `apps/command-center-backend/src/graphql/resolvers/status.ts` (New file: Resolver for the `status` query, returning mock data)

**4. Verifier/runtime checks:**
-   **Frontend Check:** Navigate a web browser to the Command Center frontend URL (e.g., `http://localhost:3000/dashboard`). Verify that a page loads and displays "System Status: Operational" and a "Last Update: [current timestamp]" (or similar mock data).
-   **Backend Check:** Using a GraphQL client (e.g., cURL, Postman, Apollo Studio), execute the query `query { status { message timestamp } }` against the Command Center backend GraphQL endpoint (e.g., `http://localhost:4000/graphql`). Verify that the response is `{"data":{"status":{"message":"Operational","timestamp":"<ISO_TIMESTAMP>"}}}`.

**5. Stop conditions if runtime truth disagrees:**
-   If the frontend `dashboard.tsx` page fails to load or renders with client-side errors (e.g., React component errors, network errors fetching GraphQL data), stop and debug frontend routing, component logic, or data fetching.
-   If the backend GraphQL query for `status` returns an error, a malformed response, or `null` for `status`, stop and debug the `schema.ts` definition or the `status.ts` resolver implementation.
-   If the frontend loads but displays stale, incorrect, or no data from the backend (e.g., "Loading..." indefinitely, or hardcoded fallback data when it should be dynamic), stop and debug the frontend's GraphQL client setup and data binding.