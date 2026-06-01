# Amendment 12 Command Center: Site Builder UI Remediation (TODO-18-G6)

This memo outlines a builder-ready enhancement for the Site Builder UI, addressing the current blocking dependency on Command & Control (C&C) stability. The goal is to define a smallest buildable slice that allows UI development to proceed without violating the core blueprint.

## 1. Blocking Ambiguity / Founder Decision List

*   **C&C Stability Definition:** The primary blocker is "waiting on C&C stability." This term is ambiguous.
    *   **Decision Required:** Define specific, measurable criteria for C&C stability relevant to the Site Builder UI. What specific C&C APIs, data structures, or services must be available and reliable for the UI to function?
    *   **Decision Required:** Authorize the development of a minimal, contract-driven C&C mock service to unblock UI development, even if full C&C stability is pending. This mock should adhere to the defined API contract.

## 2. Already-Settled Constraints

*   **Scope:** BuilderOS-only governed loop execution. No modification to LifeOS user features or TSOS customer-facing surfaces.
*   **Blueprint:** Adherence to `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` principles.
*   **Current State:** Site Builder UI is not built; its development is blocked by C&C stability.
*   **Goal:** Enable parallel UI development by decoupling from live C&C dependencies initially.

## 3. Smallest Buildable Next Slice

The next slice focuses on establishing the UI's core data model and rendering static/mocked components.

*   **Define Core Data Models:** Establish the TypeScript/JavaScript data structures for site configuration (e.g., pages, sections, components, content blocks) that the Site Builder UI will manage. These models will represent the UI's understanding of a site, independent of C&C's persistence layer initially.
*   **Develop Placeholder UI Components:** Create the foundational React components for the Site Builder UI (e.g., `SiteEditor`, `PageList`, `ComponentPalette`) that consume these defined data models using local, mock data. Focus on layout, interaction patterns, and state management within the UI, without live API calls.
*   **Mock C&C Interface:** Implement a basic mock C&C service that provides static data conforming to the defined API contract, allowing UI components to simulate data fetching and updates.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/builder-ui/models/siteConfig.js` (or `.ts`): Defines the core data structures for a site.
*   `src/builder-ui/components/SiteEditor.jsx` (or `.tsx`): Top-level UI component for site editing.
*   `src/builder-ui/components/PageList.jsx` (or `.tsx`): Component to list and manage pages.
*   `src/builder-ui/api/mockCncService.js` (or `.ts`): Mock implementation of C&C API.
*   `src/builder-ui/tests/` (new directory): Unit and integration tests for the above.
*   `docs/projects/builderos-remediation/amendment-12-command-center-todo-18-g6.md`: This document.

## 5. Required Verifier / Runtime Checks

*   **Linting & Formatting:** ESLint and Prettier checks on all new `.js`/`.jsx`/`.ts`/`.tsx` files.
*   **Unit Tests:** Comprehensive unit tests for `siteConfig` models and individual UI components (e.g., `SiteEditor`, `PageList`) using Jest/React Testing Library.
*   **Schema Validation:** Runtime validation of `siteConfig` data structures against defined schemas.
*   **Mock Integration Tests:** Tests ensuring UI components correctly interact with `mockCncService` and render expected states based on mock data.
*   **Scope Adherence:** Automated checks to ensure no modifications outside `src/builder-ui/` and `docs/projects/builderos-remediation/` directories, and no changes to LifeOS/TSOS surfaces.

## 6. Stop Conditions

*   The core Site Builder UI components (`SiteEditor`, `PageList`, `ComponentPalette` placeholders) can render and interact correctly using mock data.
*   The `siteConfig` data models are finalized and validated.
*   A clear, documented API contract for the Site Builder UI's interaction with C&C is established, based on the defined data models.
*   The founder decision regarding "C&C stability definition" is made, providing concrete criteria for future live integration.
*   All new code passes linting, formatting, and unit/integration tests.