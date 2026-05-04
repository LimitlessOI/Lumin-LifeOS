# LifeOS Dashboard Category Stubs: Health, Family, Purpose

## Overview
This document specifies the placeholder layout, navigation hooks, and ownership boundaries for the Health, Family, and Purpose categories within the LifeOS Dashboard. The goal is to establish a foundational structure that allows future domain-specific implementations to integrate seamlessly without requiring changes to the core dashboard shell.

## 1. Placeholder Layout

### 1.1 Dashboard Home View (`/dashboard`)
*   **Structure**: The main dashboard view will feature distinct, visually separated sections or "cards" for each core category: Health, Family, and Purpose.
*   **Card Content (Placeholder)**:
    *   Each card will display a prominent title (e.g., "Health", "Family", "Purpose").
    *   A brief, generic placeholder message indicating the category's purpose and that domain-specific content will appear here upon activation (e.g., "Track your well-being and progress. Domain content coming soon.").
    *   A primary call-to-action button/link: "Go to [Category] Dashboard".
*   **Example Card Structure (Conceptual HTML/JSX):**
    ```html
    <div class="dashboard-card" id="card-health">
        <h3>Health</h3>
        <p>Track your well-being and progress. Domain content coming soon.</p>
        <a href="/dashboard/health" class="btn btn-primary">Go to Health Dashboard</a>
    </div>
    ```

### 1.2 Category-Specific Dashboard View (`/dashboard/[category]`)
*   **Structure**: Upon navigating to a category-specific URL (e.g., `/dashboard/health`), a dedicated view will be presented.
*   **Content (Placeholder)**:
    *   A prominent header displaying the category name.
    *   A large placeholder area (e.g., a `div` with a specific ID) where the respective domain's UI components will be injected.
    *   A default message if no domain-specific content is yet registered or active (e.g., "The [Category] domain is active, but no specific content has been deployed yet. Check back soon!").
*   **Example Page Structure (Conceptual HTML/JSX):**
    ```html
    <div class="category-dashboard-page" id="page-health">
        <h1>Health Dashboard</h1>
        <div id="health-domain-content-area">
            <!-- Health domain's React/Vue app or server-rendered content will mount here -->
            <p>The Health domain is active, but no specific content has been deployed yet. Check back soon!</p>
        </div>
    </div>
    ```

## 2. Navigation Hooks

### 2.1 Primary Navigation (Shell-Owned)
*   **Location**: The main application navigation (e.g., sidebar or top navigation bar) will include dedicated links for "Health", "Family", and "Purpose".
*   **Routing**:
    *   Clicking these links will navigate to the respective category-specific dashboard views:
        *   `/dashboard/health`
        *   `/dashboard/family`
        *   `/dashboard/purpose`
*   **Implementation**: These navigation links and their associated routes will be managed by the Platform Core.

### 2.2 In-Category Navigation (Domain-Owned)
*   **Responsibility**: Once a user is on a category-specific dashboard page (e.g., `/dashboard/health`), any further navigation *within that category* (e.g., to `/dashboard/health/metrics`, `/dashboard/health/goals`) becomes the responsibility of the respective domain.
*   **Integration**: The Platform Core will provide a designated area (as described in 1.2) for the domain to render its own navigation and content.

## 3. Ownership Boundaries: Shell vs. Domain-Owned

### 3.1 Platform Core (Shell) Responsibilities
*   **Global Layout**: Header, footer, main application navigation.
*   **Top-Level Routing**: Registration and handling of `/dashboard`, `/dashboard/health`, `/dashboard/family`, `/dashboard/purpose`.
*   **Placeholder UI**: Rendering the initial dashboard cards and the default category-specific pages when no domain content is active.
*   **Domain Content Injection Points**: Providing clearly defined HTML elements (e.g., `div` with specific IDs) where domain-specific applications or components can mount.
*   **Route Registration**: `startup/register-runtime-routes.js` will include entries for these top-level dashboard and category routes, pointing to generic handlers that render the shell and provide the injection points.

### 3.2 Domain (e.g., Health Domain) Responsibilities
*   **Feature-Specific UI/UX**: All components, views, and interactions *within* its designated content area (e.g., `div#health-domain-content-area`).
*   **Sub-Routing**: Any routes nested under its top-level path (e.g., `/dashboard/health/metrics`, `/dashboard/health/goals`). These routes will be registered by the domain itself, typically within its own `routes/<domain>-routes.js` file, and mounted by `startup/register-runtime-routes.js` under the appropriate base path.
*   **Data Management**: All data fetching, storage, and business logic related to the domain.
*   **API Endpoints**: All API endpoints (e.g., `/api/v1/health/...`) will be owned and implemented by the respective domain.

## 4. Implementation Notes
*   The Platform Core will provide a generic Express route handler for `/dashboard/[category]` that renders a base HTML template. This template will include the necessary `div` elements for domain content injection.
*   Domain-specific front-end applications (e.g., React apps) will be responsible for mounting themselves into these designated `div`s based on the current URL.
*   The `startup/register-runtime-routes.js` file will be updated to include the new top-level dashboard routes.