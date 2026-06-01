# Amendment 12 Command Center: Site Builder UI Remediation Memo (TODO-18-G6)

This memo outlines a builder-ready enhancement slice for the Site Builder UI, addressing the current blocking condition of "C&C stability." The goal is to enable progress on the UI infrastructure and components using mock data, without violating the core blueprint.

## 1. Blocking Ambiguity / Founder Decision List

*   **Definition of "C&C Stability":** What specific API endpoints, data schemas, or service health indicators define "C&C stability" for the Site Builder UI? Is a partial stability acceptable for certain UI features?
*   **Mock Data Fidelity:** What is the required fidelity of the mock C&C data? Should it cover all expected C&C API responses, or a minimal set for initial UI rendering?
*   **Integration Strategy:** Once C&C is stable, what is the preferred strategy for swapping mock data with live C&C API calls? (e.g., feature flag, environment variable, dedicated service layer).

## 2. Already-Settled Constraints

*   BuilderOS-only governed loop execution.
*   No modification to LifeOS user features or TSOS customer-facing surfaces.
*   Implementation strictly within approved builder safe scope.
*   The Site Builder UI is a core component of Amendment 12.
*   Current UI development is blocked by the lack of C&C stability.

## 3. Smallest Buildable Next Slice

This slice focuses on scaffolding the Site Builder UI and integrating a mock C&C data service to unblock UI development.

*   **UI Application Scaffolding:** Initialize a new React application for the Site Builder UI.
*   **Core Layout & Routing:** Implement basic application layout (e.g., header, sidebar, main content area) and client-side routing placeholders.
*   **Mock C&C Service:** Create a local JavaScript module that simulates the expected C&C API responses, providing static or randomized data.
*   **Placeholder Components:** Develop initial, data-agnostic UI components (e.g., `SiteHeader`, `PageEditor`, `ComponentPalette`) that consume data from the mock service.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `apps/builder-os/site-builder-ui/package.json` (dependencies: react, react-dom, react-router-dom, etc.)
*   `apps/builder-os/site-builder-ui/src/index.js` (React app entry point)
*   `apps/builder-os/site-builder-ui/src/App.js` (Main application component, routing setup)
*   `apps/builder-os/site-builder-ui/src/components/SiteHeader.js` (Example placeholder component)
*   `apps/builder-os/site-builder-ui/src/components/PageEditor.js` (Example placeholder component)
*   `apps/builder-os/site-builder-ui/src/api/mock-cc-service.js` (Mock C&C data provider)
*   `apps/builder-os/site-builder-ui/README.md` (Initial project documentation)
*   `apps/builder-os/site-builder-ui/.env.development` (for mock service configuration)

## 5. Required Verifier / Runtime Checks

*   **Build Success:** `npm run build` within `apps/builder-os/site-builder-ui` completes without errors.
*   **Linting Compliance:** `npm run lint` passes all checks.
*   **Unit Test Coverage:** Basic component rendering tests (e.g., `SiteHeader` renders) pass.
*   **Mock Data Consumption:** Verify that UI components successfully retrieve and display data from `mock-cc-service.js`.
*   **No Live C&C Calls:** Runtime check (e.g., network request interception) confirms no actual external C&C API calls are made.

## 6. Stop Conditions

*   The Site Builder UI application successfully initializes and renders a basic layout.
*   Placeholder UI components are defined and render correctly using data provided by `mock-cc-service.js`.
*   The `mock-cc-service.js` is functional and provides a representative subset of expected C&C data.
*   All verifier/runtime checks specified in section 5 pass.
*   The UI is prepared for integration with the live C&C service once its stability is confirmed.