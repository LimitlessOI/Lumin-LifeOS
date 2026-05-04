### Performance Budget Notes for LIFEOS Dashboard Builder

This section outlines key performance targets and considerations for the LIFEOS Dashboard Builder to ensure a responsive and efficient user experience.

*   **Overlay Load Targets:** Interactive overlays (e.g., modals, dropdowns, tooltips) should achieve full interactivity within **100ms** of user action. This minimizes perceived latency for common UI interactions.
*   **Waterfall Risks:** Proactively identify and mitigate critical rendering path bottlenecks. Prioritize essential CSS and JavaScript for initial render, and analyze network waterfalls to uncover and optimize serial resource dependencies.
*   **Defer Non-Critical Widgets:** Implement lazy loading or deferred execution for any dashboard widgets or components that are not immediately visible or critical for the initial user interaction. This includes analytics scripts, less frequently accessed features, and off-screen elements.
*   **Largest Contentful Paint (LCP) Hints:** Optimize for an LCP target of **under 2.5 seconds**. Focus on efficient image delivery (size, format, CDN), server response time for primary content, and ensuring above-the-fold content is rendered as quickly as possible.