Amendment 14 White Label Proof: G101-100 - Dynamic Brand Name Display
This document outlines the proof-closing blueprint note for a foundational white-label capability: dynamically displaying a configured brand name. This serves as the initial verifiable slice for Amendment 14.
1. Exact Missing Implementation or Proof Gap
The current platform lacks a mechanism to dynamically retrieve and apply a white-label specific brand name to a designated UI element. This proof gap focuses on establishing the core configuration retrieval and its basic rendering in an isolated component.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
1.  Defining a simple, environment-variable-backed configuration for a `WHITE_LABEL_BRAND_NAME`.
2.  Creating a utility function to safely retrieve this configuration.
3.  Developing a minimal, isolated React/Vue/Svelte (assuming a modern frontend framework) component that consumes this utility to display the brand name.
4.  Adding unit tests for the configuration utility and the display component.
This slice ensures that the fundamental data flow for white-label branding is established and verifiable without impacting existing user features or customer-facing surfaces.
3. Exact Safe-Scope Files to Touch First
-   `src/config/whiteLabelConfig.js`: New file. Defines and exports a function to retrieve `process.env.WHITE_LABEL_BRAND_NAME`.
-   `src/components/WhiteLabelBrandDisplay.js`: New file. A simple functional component that imports `getWhiteLabelBrandName` from `src/config/whiteLabelConfig.js` and renders it.
-   `src/components/WhiteLabelBrandDisplay.test.js`: New file. Unit tests for `WhiteLabelBrandDisplay` component.
-   `src/config/whiteLabelConfig.test.js`: New file. Unit tests for `getWhiteLabelBrandName` utility.
-   `.env.development`: Existing file. Add `WHITE_LABEL_BRAND_NAME="LifeOS"` (or similar default).
-   `package.json`: Existing file. Potentially add a script for isolated component testing if not already present, or ensure existing test scripts cover new files.
4. Verifier/Runtime Checks
-   Unit Tests:
-   `src/config/whiteLabelConfig.test.js`: Verify `getWhiteLabelBrandName()` returns the correct value when `process.env.WHITE_LABEL_BRAND_NAME` is set. Verify it returns a sensible default (e.g., "LifeOS") or `null`/`undefined` when the env var is not set.
-   `src/components/WhiteLabelBrandDisplay.test.js`: Verify the component renders the brand name retrieved from the config utility. Test with different mock brand names.
-   Local Development Environment:
       Integrate `WhiteLabelBrandDisplay` into a developer-only* test page or a Storybook/similar component playground.
-   Change `WHITE_LABEL_BRAND_NAME` in `.env.development` and restart the dev server. Observe that the displayed brand name updates correctly.
-   Remove `WHITE_LABEL_BRAND_NAME` from `.env.development` and verify the component renders the default or an empty state gracefully.
5. Stop Conditions if Runtime Truth Disagrees
-   If `getWhiteLabelBrandName()` does not correctly retrieve the envVar or handle its absence as expected by tests.
-   If `WhiteLabelBrandDisplay` fails to render the brand name, or renders it incorrectly (e.g., displays `[object Object]` or an empty string when a name is expected).
-   If integrating `WhiteLabelBrandDisplay` into a test harness causes unexpected side effects or errors in other parts of the application (indicating scope bleed).
-   If the component's styling or layout unexpectedly breaks existing UI elements in the test environment.