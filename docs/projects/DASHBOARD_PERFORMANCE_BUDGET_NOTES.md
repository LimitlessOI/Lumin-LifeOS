## Performance Budget Notes for LifeOS Dashboard Overlay

### Overlay Load Targets

The primary goal for the LifeOS Dashboard overlay is to provide a near-instantaneous and highly responsive user experience. Key performance targets include:

*   **Largest Contentful Paint (LCP):** Target < 2.5 seconds. The main greeting, MITs, and Calendar cards should be visible and styled quickly.
*   **First Input Delay (FID) / Interaction to Next Paint (INP):** Target < 100ms / < 200ms. User interactions like adding an MIT, toggling theme, or typing in chat should feel immediate.
*   **Cumulative Layout Shift (CLS):** Target < 0.1. Avoid unexpected layout shifts during loading, especially for the main content areas.
*   **Total Blocking Time (TBT):** Target < 200ms. Minimize long-running JavaScript tasks that block the main thread.

### Waterfall Risks

Several elements in the current `lifeos-dashboard.html` present significant waterfall risks:

1.  **Duplicate Script Imports:** The widget scripts (`lifeos-widget-mit.js`, `lifeos-widget-score.js`, `lifeos-widget-lumin-quick.js`, `lifeos-widget-category-stubs.js`) are imported multiple times in the `<head>`. This leads to redundant network requests, parsing, and execution, directly increasing page load time and blocking subsequent resource fetching.
2.  **Remote Tailwind CSS:** Loading `https://cdn.tailwindcss.com` is a render-blocking external resource. While convenient, it adds a network round trip and potential latency from the CDN.
3.  **Blocking Scripts in Head:** `lifeos-bootstrap.js` is loaded synchronously in the `<head>`. If its functionality is not critical for the initial render, it should be deferred (`defer` attribute) to avoid blocking HTML parsing.
4.  **Multiple Widget Mounting Attempts:** The inline `<script>` blocks at the end of the `<body>` also attempt to mount the same widgets multiple times, targeting non-unique DOM IDs. This creates redundant DOM operations and potential JavaScript errors, impacting TBT and INP.
5.  **Large HTML Document Size:** The repeated script tags and widget container `div`s contribute to a larger initial HTML payload, increasing download time.
6.  **Synchronous API Calls on Load:** The `Promise.all` for `loadMITs()`, `loadCal()`, `loadGoals()`, `loadScores()`, and `initChat()` initiates multiple API calls concurrently. While efficient, the cumulative time for these data fetches can delay the full content display, even with skeleton loaders.

### Defer Non-Critical Widgets

To improve initial load performance, consider deferring the loading and mounting of widgets that are not immediately visible or essential for the primary user experience:

*   **Lazy Load Scripts:** Instead of loading all widget scripts in the `<head>`, load only critical ones. For less critical widgets (e.g., "Goals", "Life Scores" if they appear lower on the page), load their scripts dynamically when their container enters the viewport using an `IntersectionObserver`.
*   **Dynamic Mounting:** Similarly, mount the widget components only when their corresponding scripts have loaded and their container is visible.
*   **Consolidate Widget Logic:** If possible, combine common widget mounting logic to reduce script overhead and avoid redundant checks.

### Largest Contentful Paint (LCP) Hints

The LCP element is likely the "Good morning" greeting or the initial "Today's MITs" and "Today's Schedule" cards. Optimizations should focus on these:

*   **Critical CSS Inlining:** Identify the CSS rules essential for rendering the LCP elements and consider inlining them directly into the `<head>` to eliminate a render-blocking network request.
*   **Reduce Render-Blocking Resources:** Prioritize addressing the duplicate script imports and consider self-hosting or critically inlining necessary Tailwind CSS if the CDN latency is a significant factor for LCP.
*   **Fast API Responses:** Ensure the API endpoints for MITs and Calendar events respond as quickly as possible, as the data for these elements directly impacts when the LCP content becomes meaningful.
*   **Preload Key Resources:** If any specific fonts or background images were used for LCP elements (none are currently apparent), `rel="preload"` could be used.
*   **Server-Side Rendering (SSR) / Pre-rendering:** For a dashboard, pre-rendering the initial HTML shell with the greeting and skeleton loaders could provide a faster LCP by delivering fully formed content on the first byte.