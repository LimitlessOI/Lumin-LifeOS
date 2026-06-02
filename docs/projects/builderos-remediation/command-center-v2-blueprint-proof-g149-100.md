# Command Center V2 Blueprint Proof: G149-100 Follow-Through

**Blueprint Note: User Resource Listing (Read-Only)**

This note closes the proof for the initial implementation of a read-only user resource listing, derived as the next smallest build slice following the foundational "Basic Dashboard UI" (assumed to be covered by G149-100).

---

**1. Exact Missing Implementation or Proof Gap:**
The current Command Center V2 lacks the capability to display a list of existing users from the LifeOS database. This gap encompasses both the backend API endpoint to retrieve user data and the frontend UI component to fetch, display, and paginate this data.

**2. Smallest Safe Build Slice to Close It:**
Implement a read-only user listing feature. This slice focuses on establishing the data flow from the PostgreSQL database to the Command Center V2 frontend for user entities.

*   **Backend (API):** Create a new API endpoint `/api/v2/users` that queries the LifeOS PostgreSQL database for user records. This endpoint will support basic pagination (e.g., `page`, `limit`) and return a JSON array of user objects (e.g., `id`, `username`, `email`, `role`, `createdAt`).
*   **Frontend (UI):** Develop a dedicated React component (`UserList`) and page (`UsersPage`) within the Command Center V2 application. This component will make an API call to `/api/v2/users`, display the fetched user data in a tabular format, and integrate basic pagination controls.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/server/routes/v2/users.js` (New): Defines the API route for `/api/v2/users`.
*   `src/server/controllers/v2/userController.js` (New): Contains the logic for fetching user data from the database.
*   `src/server/models/User.js` (New/Modify): Defines the ORM model for the `users` table, if not already present.
*   `src/server/app.js` or `src/server/index.js` (Modify): Registers the new `/api/v2/users` route.
*   `src/client/components/v2/UserList.jsx` (New): React component to render the user table.
*   `src/client/pages/v2/UsersPage.jsx` (New): React page component to host `UserList` and handle data fetching.
*   `src/client/App.jsx` or `src/client/routes.js` (Modify): Adds a new client-side route for `/v2/users` to the Command Center V2 navigation.
*   `src/client/api/v2/userApi.js` (New): Utility for making API calls to `/api/v2/users`.

**4. Verifier/Runtime Checks:**

*   **Backend:**
    *   Access `/api/v2/users` directly via a tool like `curl` or Postman. Verify a `200 OK` status and a