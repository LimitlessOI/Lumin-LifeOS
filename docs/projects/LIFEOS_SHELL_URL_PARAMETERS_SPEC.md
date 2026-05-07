The task specification for output format (Markdown + JSON) contradicts the general "JAVASCRIPT FULL FILE — STRICT OUTPUT CONTRACT". I am proceeding with the explicit Markdown + JSON format for this task.

# LifeOS Dashboard Query Parameters Specification

This document specifies the canonical names, behavior, and characteristics of query parameters used for controlling the LifeOS Dashboard's presentation and navigation. These parameters are designed to support Server-Side Rendering (SSR), bookmarking, and shareable URLs.

## Query Parameters

### `layout`

*   **Purpose**: Defines the overall structural arrangement or template of the dashboard interface. This parameter influences the primary container, navigation placement, and general page composition.
*   **Canonical Name**: `layout`
*   **Type**: String
*   **Example Values**:
    *   `default`: The standard, pre-configured layout.
    *   `compact`: A more condensed layout, potentially reducing whitespace or element sizes.
    *   `full-width`: A layout that utilizes the full available horizontal space, often without sidebars.
    *   `sidebar-left`: A layout with a primary content area and a navigation/utility sidebar on the left.
    *   `sidebar-right`: A layout with a primary content area and a navigation/utility sidebar on the right.
    *   *(Note: Actual supported values are defined by the application's layout system.)*
*   **SSR Impact**: The server renders the initial HTML structure using the specified layout template, ensuring the correct visual framework is delivered on first load.
*   **Bookmarks/Shareable URLs**: Fully supported. URLs containing `?layout=compact` (e.g.) will load the dashboard with the specified layout.

### `page`

*   **Purpose**: Identifies the specific content view or functional area to be displayed within the dashboard. This parameter dictates which primary component or data set is loaded into the main content area.
*   **Canonical Name**: `page`
*   **Type**: String
*   **Example Values**:
    *   `overview`: Displays a high-level summary or dashboard.
    *   `metrics`: Shows detailed performance metrics and charts.
    *   `settings`: Accesses user or system configuration options.
    *   `reports`: Presents generated reports or data exports.
    *   `builder`: Navigates to the agent builder interface.
    *   *(Note: Actual supported values are defined by the application's routing and page registry.)*
*   **SSR Impact**: The server renders the content corresponding to the specified page, populating the main content area with the relevant data and components.
*   **Bookmarks/Shareable URLs**: Fully supported. URLs containing `?page=metrics` (e.g.) will load the dashboard directly to the metrics view.

### `theme`

*   **Purpose**: Controls the visual styling, color scheme, and aesthetic theme applied to the dashboard. This parameter allows users to switch between different visual presentations.
*   **Canonical Name**: `theme`
*   **Type**: String
*   **Example Values**:
    *   `light`: A theme with a light background and dark text.
    *   `dark`: A theme with a dark background and light text.
    *   `blue-steel`: A specific branded or custom theme.
    *   `high-contrast`: A theme optimized for accessibility.
    *   *(Note: Actual supported values are defined by the application's theme management system.)*
*   **SSR Impact**: The server can embed theme-specific CSS classes, link to theme-specific stylesheets, or inject theme variables into the initial HTML, ensuring the correct theme is applied immediately.
*   **Bookmarks/Shareable URLs**: Fully supported. URLs containing `?theme=dark` (e.g.) will load the dashboard with the specified visual theme.

## Alignment with PROGRAM_MAP_SSOT URLs

Due to the absence of `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `public/shared/lifeos-bootstrap.js` from the repository, specific alignment with `PROGRAM_MAP_SSOT URLs` cannot be performed at this time. The parameters are defined generically, assuming standard web application query parameter conventions.