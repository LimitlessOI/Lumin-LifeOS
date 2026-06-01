Amendment 01 AI Council Proof: G8-100 - Initial Meeting Scheduling API
This document outlines the initial build slice for integrating AI Council Meeting Management (G8) into LifeOS, specifically focusing on the foundational API for scheduling meetings.
Blueprint Note
1.  Exact Missing Implementation or Proof Gap
    The core gap is the absence of a foundational data model for AI Council meetings. This includes defining the structure for a meeting record, encompassing attributes such as `meetingId`, `title`, `description`, `startTime`, `endTime`, `attendees` (list of user IDs), `status` (e.g., 'scheduled', 'completed', 'cancelled'), and `agendaItems`. Without this model, no scheduling or management API can be effectively built or persisted.
2.  Smallest Safe Build Slice to Close It
    Define the core data schema for `AICouncilMeeting`. This involves creating a new data model file that specifies the fields, types, and basic validations for a meeting entity. This slice focuses solely on the data structure, not on apiEPs or business logic.
3.  Exact Safe-Scope Files to Touch First
-   `src/builder-os/models/AICouncilMeeting.js` (new file, defining schema and model)
-   `src/builder-os/index.js` (to export the new model for BuilderOS internal use, if following existing patterns)
4.  Verifier/Runtime Checks
-   Schema Validation: Instantiate `AICouncilMeeting` with valid and invalid data to confirm schema constraints (required fields, types, date formats) are enforced.
-   Basic Persistence Test: Attempt to save a valid `AICouncilMeeting` instance to the BuilderOS internal db and retrieve it, verifying data integrity.
-   Module Load Test: Ensure `src/builder-os/models/AICouncilMeeting.js` can be imported and initialized without runtime errors within the BuilderOS environment.
5.  Stop Conditions if Runtime Truth Disagrees
-   Schema validation fails for valid input or passes for invalid input.
-   Database persistence or retrieval operations for `AICouncilMeeting` fail or result in data corruption.
-   The new model file causes module resolution errors or conflicts with existing BuilderOS components upon import.
-   Any integration attempt impacts LifeOS user features or TSOS customer-facing surfaces.

---

Next Blueprint Note: G8-101 - API Endpoints for AICouncilMeeting
1.  Exact Missing Implementation or Proof Gap
    The absence of API endpoints for performing CRUD (Create, Retrieve, Update, Delete) operations on `AICouncilMeeting` instances. This prevents external systems or internal BuilderOS components from interacting with the defined data model.
2.  Smallest Safe Build Slice to Close It
    Implement the foundational RESTful API endpoints for `AICouncilMeeting` within the BuilderOS internal API. This slice will include routes for creating (`POST /ai-council-meetings`), retrieving all (`GET /ai-council-meetings`), retrieving by ID (`GET /ai-council-meetings/:id`), updating (`PUT /ai-council-meetings/:id`), and deleting (`DELETE /ai-council-meetings/:id`) meeting records. Handlers will interact directly with the `AICouncilMeeting` model.
3.  Exact Safe-Scope Files to Touch First
    *   `src/builder-os/api/aiCouncilMeetings.js` (new file, defining routes and handlers)
    *   `src/builder-os/api/index.js` (to export and register the new routes)
    *   `src/builder-os/index.js` (to ensure the API router is initialized and mounted)
4.  Verifier/Runtime Checks
    *   **API Reachability**: Use `curl` or a similar tool to confirm `POST /ai-council-meetings` and `GET /ai-council-meetings` endpoints are accessible and return expected HTTP status codes (e.g., 200, 201, 404 for non-existent routes).
    *   **Create Operation**: Successfully `POST` a valid `AICouncilMeeting` payload and verify a 201 status code and the created resource in the response.
    *   **Retrieve Operations**:
        *   `GET /ai-council-meetings` returns a list including the newly created meeting.
        *   `GET /ai-council-meetings/:id` retrieves the specific meeting by its ID.
    *   **Update Operation**: `PUT /ai-council-meetings/:id` with a partial update and verify the changes are reflected upon subsequent retrieval.
    *   **Delete Operation**: `DELETE /ai-council-meetings/:id` and verify a 204 status code, and that the meeting can no longer be retrieved.
    *   **Schema Enforcement**: Attempt to `POST` or `PUT` invalid data (e.g., missing required fields, incorrect types) and verify appropriate validation errors (e.g., 400 Bad Request).
5.  Stop Conditions if Runtime Truth Disagrees
    *   Any API endpoint returns a 5xx server error.
    *   CRUD operations fail to persist, retrieve, update, or delete data correctly.
    *   API responses do not conform to the expected `AICouncilMeeting` schema or return unexpected data.
    *   The new API routes cause conflicts with existing BuilderOS API routes or impact their functionality.
    *   Any API interaction impacts LifeOS user features or TSOS customer-facing surfaces.