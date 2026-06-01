# BuilderOS Remediation: Amendment 16 Word Keeper - Google Calendar Integration (TODO-1-G10)

This memo outlines the next buildable slice for the Amendment 16 Word Keeper blueprint, specifically addressing the Google Calendar integration, which is currently blocked by an unspecified OAuth flow.

## 1. Blocking Ambiguity / Founder Decision List

*   **Google Calendar Authentication Strategy:** The blueprint states Google Calendar integration is "default" but lacks an OAuth flow specification.
    *   **Decision Required:** For this initial BuilderOS slice, should we implement a full user-facing OAuth 2.0 flow, or can we proceed with a simpler, pre-authorized service account / API key approach for internal integration and testing?
    *   **Decision Required:** If OAuth 2.0, what are the precise Google Calendar API scopes required (e.g., `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.readonly`)?
    *   **Decision Required:** How will Google API credentials (e.g., `client_id`, `client_secret`, `api_key`, `service_account_key_path`) be securely managed and injected into the BuilderOS environment? (e.g., environment variables, KMS, dedicated secrets manager).

## 2. Already-Settled Constraints

*   Google Calendar integration is a mandatory component for Word Keeper.
*   The integration is designated as "default," implying it should be active upon implementation.
*   No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted.
*   Execution is strictly governed by the BuilderOS loop.
*   Existing patterns for Node/ESM code must be followed.

## 3. Smallest Buildable Next Slice

The immediate next slice focuses on establishing the foundational structure for Google Calendar interaction, deferring full OAuth implementation until the authentication strategy is clarified.

**Objective:** Create a robust, extendable module for Google Calendar API interaction, ready to accept credentials and implement core event management functions.

**Key Activities:**
1.  **Google API Client Initialization:** Develop a module responsible for initializing the Google Calendar API client, designed to accept authentication credentials (e.g., API key, service account, or OAuth tokens) via configuration.
2.  **Placeholder Event Functions:** Implement basic, unauthenticated (or mock-data returning) placeholder functions for common calendar operations (e.g., `getEvents`, `createEvent`, `updateEvent`, `deleteEvent`). These functions will initially log warnings about missing authentication or return empty/mock data, providing a clear interface for future development.
3.  **Credential Configuration Definition:** Define the expected environment variables or configuration parameters for Google API credentials, ensuring the system is prepared for secure credential injection.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `package.json`: Add `googleapis` dependency.
*   `src/integrations/googleCalendar/index.js`: New file. Contains Google Calendar API client setup and core interaction functions.
*   `src/integrations/googleCalendar/types.js`: New file (optional, if complex types are needed immediately). Defines data structures for calendar events.
*   `src/config/env.js`: Add placeholder entries for `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_API_KEY`, or `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY`. (Adjust based on founder decision).

## 5. Required Verifier / Runtime Checks

*   **Dependency Installation:** Verify `googleapis` is correctly listed in `package.json` and installed.
*   **Environment Variable Presence:** Check for the presence of defined Google Calendar credential environment variables (e.g., `process.env.GOOGLE_CALENDAR_API_KEY`), even if their values are initially empty or placeholder.
*   **API Client Initialization:** Confirm that the `googleCalendar/index.js` module can be imported and its client initialization function can be called without throwing unhandled exceptions.
*   **Placeholder Function Invocation:** Verify that placeholder functions (e.g., `getEvents()`) can be invoked and return their expected initial state (e.g., empty array, specific error object, or mock data).

## 6. Stop Conditions

*   A new `src/integrations/googleCalendar/index.js` module exists, exporting functions for Google Calendar API client initialization and placeholder event operations.
*   `googleapis` is added as a dependency in `package.json`.
*   Configuration placeholders for Google Calendar credentials are defined in `