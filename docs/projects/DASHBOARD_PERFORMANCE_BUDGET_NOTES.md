### Performance Budget Notes for LIFEOS Dashboard Builder

**Intent:** Establish clear performance targets and identify key optimization areas to ensure a responsive and efficient user experience for the Builder dashboard. Focus on perceived performance and critical rendering path.

**Load Targets:**
*   **First Contentful Paint (FCP):** < 1.5 seconds
*   **Largest Contentful Paint (LCP):** < 2.5 seconds
*   **Total Blocking Time (TBT):** < 200 ms
*   **Interaction to Next Paint (INP):** < 200 ms
*   **Cumulative Layout Shift (CLS):** < 0.1

**Waterfall Risks:**
*   **Large JavaScript Bundles:** Over-reliance on client-side rendering for initial load.
*   **Unoptimized Image Assets:** High-resolution images not properly compressed or lazy-loaded.
*   **Excessive API Calls on Initial Load:** Multiple blocking network requests for core data.
*   **Render-Blocking Resources:** Synchronous CSS/JS in the `<head>`.
*   **Third-Party Scripts:** Analytics or monitoring tools impacting critical path.

**Defer Non-Critical Widgets:**
*   **Audit Trail History:** Load history data asynchronously after initial dashboard render.
*   **Complex Configuration Panels:** Lazy-load advanced builder settings or less frequently used configuration options.
*   **Non-essential UI Animations:** Defer or remove animations that are not critical for user feedback.
*   **Help/Tutorial Overlays:** Load on user interaction, not on initial page load.

**Largest Contentful Paint (LCP) Hints:**
*   **Prioritize Hero Elements:** Ensure the largest visible element (e.g., main builder canvas, primary status display) is loaded and rendered quickly.
*   **Optimize Image Loading:** Use `srcset`, `sizes`, `webp` format, and `loading="lazy"` for images below the fold. Preload critical images.
*   **Minimize Render-Blocking CSS/JS:** Inline critical CSS, defer non-critical CSS, and use `async`/`defer` for JavaScript.
*   **Server-Side Rendering (SSR) or Static Site Generation (SSG):** Consider for initial page load to deliver pre-rendered HTML.
*   **Reduce Server Response Time:** Optimize backend API performance for critical data.