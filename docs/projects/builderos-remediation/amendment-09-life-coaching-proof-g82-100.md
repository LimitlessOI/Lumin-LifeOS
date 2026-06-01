Amendment 09: Life Coaching Integration - Proof G82-100
Blueprint Note: Next Smallest Build Slice

This note outlines the next smallest, blueprint-backed build slice for Amendment 09, focusing on user-facing presentation of Life Coaches.

1. Exact Missing Implementation or Proof Gap
The core data model and apiEPs for `LifeCoach` entities are assumed to be in place (as per Phase 1 of the blueprint). The current gap is the absence of a user-facing interface to display these available coaches. Users cannot currently browse or view coach profiles within LifeOS.

2. Smallest Safe Build Slice to Close It
Implement a read-only user interface component (a new page or section) that fetches and displays a list of available `LifeCoach` profiles. This slice focuses solely on data retrieval and presentation, without any user interaction for booking or filtering. It will consume an existing API endpoint for `GET /api/v1/life-coaches`.

3. Exact Safe-Scope Files to Touch First
- `src/ui/pages/LifeCoachesPage.jsx`: New page component to host the list.
- `src/ui/components/LifeCoachList.jsx`: New component to render the list of coaches.
- `src/api/lifeCoaches.js`: New or extended API client module for fetching coach data.
- `src/ui/routes.js`: Update to add the new `/life-coaches` route.
- `src/ui/pages/__tests__/LifeCoachesPage.test.jsx`: New test file for the page.
- `src/ui/components/__tests__/LifeCoachList.test.jsx`: New test file for the component.

4. Verifier/Runtime Checks
- **UI Render Check:** Navigate to `/life-coaches`. The page should render without errors.
- **Data Fetch Check:** Open browser developer tools. Verify a successful `GET /api/v1/life-coaches` request is made.
- **Data Display Check:** Verify that the fetched coach data (e.g., name, specialty) is correctly displayed on the page.
- **Console Check:** No console errors or warnings related to the new components or API calls.
- **Accessibility Check:** Basic accessibility scan passes for the new page.

5. Stop Conditions if Runtime Truth Disagrees
- **API Endpoint Missing/Error:** If `GET /api/v1/life-coaches` returns a 404, 500, or any unexpected error, stop. This indicates the backend API is not ready or misconfigured.
- **Data Schema Mismatch:** If the data returned by the API does not conform to the expected `LifeCoach` schema (e.g., missing `id`, `name`, `specialty` fields), stop. This would break the UI component.
- **UI Rendering Failure:** If the `LifeCoachesPage` or `LifeCoachList` components fail to render or throw JavaScript errors in the browser, stop. This indicates a fundamental UI implementation issue.
- **Performance Degradation:** If the page load or data display significantly impacts perceived performance (e.g., >2s load time on typical network), stop.