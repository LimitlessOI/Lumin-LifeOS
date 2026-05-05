Contradiction: The task's SPECIFICATION requests Markdown + JSON, but a general "JAVASCRIPT FULL FILE — STRICT OUTPUT CONTRACT" instruction block is also present, which would imply JS output. I am prioritizing the task-specific SPECIFICATION for Markdown + JSON.

### Query Parameters Specification

This document specifies the canonical names, behavior, and considerations for the `layout`, `page`, and `theme` query parameters. These parameters are designed to enable shareable URLs and influence both client-side rendering (CSR) and server-side rendering (SSR) of the LifeOS Dashboard.

#### `layout`
- **Canonical Name:** `layout`
- **Purpose:** Controls the overall structural arrangement of the dashboard.
- **Expected Values:** String identifiers corresponding to predefined layout templates (e.g., `default`, `compact`, `full-width`).
- **SSR Impact:** Directly influences which base HTML template or structural components are rendered on the server. Invalid or unrecognized values should fall back to a default layout.
- **Bookmarks/Shareable URLs:** URLs containing `?layout=<value>` should load the dashboard with the specified layout.
- **Limits:**
    - Values must be alphanumeric, lowercase, and hyphen-separated.
    - Max length: 32 characters.
    - Must correspond to an existing, registered layout configuration.

#### `page`
- **Canonical Name:** `page`
- **Purpose:** Specifies the primary content view or sub-section to display within the chosen layout.
- **Expected Values:** String identifiers corresponding to predefined dashboard pages or modules (e.g., `overview`, `tasks`, `settings`).
- **SSR Impact:** Determines which primary content component is fetched and rendered server-side. Invalid or unrecognized values should fall back to a default page (e.g., `overview`).
- **Bookmarks/Shareable URLs:** URLs containing `?page=<value>` should navigate directly to the specified page within the dashboard.
- **Limits:**
    - Values must be alphanumeric, lowercase, and hyphen-separated.
    - Max length: 64 characters.
    - Must correspond to an existing, registered page component or route.

#### `theme`
- **Canonical Name:** `theme`
- **Purpose:** Applies a visual styling theme to the dashboard.
- **Expected Values:** String identifiers corresponding to predefined visual themes (e.g., `light`, `dark`, `high-contrast`).
- **SSR Impact:** Influences the initial CSS classes or inline styles applied to the `<body>` or root element during server rendering to prevent FOUC (Flash of Unstyled Content). Invalid or unrecognized values should fall back to a default theme (e.g., `light`).
- **Bookmarks/Shareable URLs:** URLs containing `?theme=<value>` should load the dashboard with the specified visual theme.
- **Limits:**
    - Values must be alphanumeric, lowercase, and hyphen-separated.
    - Max length: 16 characters.
    - Must correspond to an existing, registered theme definition.

#### General Considerations for SSR and Shareable URLs
- **Prioritization:** Query parameters should take precedence over user preferences stored in local storage or cookies for initial page load, ensuring shareability.
- **Validation:** Server-side validation of parameter values is crucial to prevent unexpected behavior or security vulnerabilities. Unrecognized values should be ignored or default to a safe fallback.
- **Encoding:** All parameter values should be URL-encoded.
- **Order:** The order of query parameters should not affect the outcome.
- **Client-side Persistence:** Once loaded, the client-side application may persist these settings (e.g., in local storage) for subsequent visits, but the URL parameters should always override for the initial load.