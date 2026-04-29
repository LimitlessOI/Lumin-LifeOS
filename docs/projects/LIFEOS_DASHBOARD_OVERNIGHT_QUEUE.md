# LifeOS Dashboard Overnight Queue

Updated: 2026-04-28

This queue is for supervised overnight builder runs. Each task must reference `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and must preserve existing shell behavior unless the task explicitly says otherwise.

## Execution order

1. `dashboard-shell-audit`
   Goal: audit current `lifeos-dashboard.html` and `lifeos-app.html` against the builder brief, report exact gaps, no rewrite.

2. `dashboard-theme-foundation`
   Goal: normalize light/dark theme tokens and shared dashboard card variables so both modes are intentional and consistent.

3. `dashboard-mobile-shell`
   Goal: build mobile-first category shell with bottom tabs preserved, vertical scroll per category, and swipe-ready category container.

4. `dashboard-desktop-shell`
   Goal: preserve left sidebar and implement cleaner desktop workspace grid that maps to the mobile category model.

5. `dashboard-ai-rail`
   Goal: add persistent dockable AI rail contract to the dashboard shell without breaking existing chat entry points.

6. `dashboard-customization-state`
   Goal: add local/state contract for widget visibility, order, density, and pinned widgets.

7. `dashboard-widget-density`
   Goal: support compact, balanced, and expanded card density without overwhelming mobile.

8. `dashboard-today-category`
   Goal: refine Today dashboard around MITs, schedule, alerts, quick add, and Lumin prompt.

9. `dashboard-health-family-purpose-stubs`
   Goal: add category stubs and real layout placeholders so future domains plug in cleanly.

10. `dashboard-polish-pass`
   Goal: motion, spacing, accessibility, loading states, empty states, and theme parity.

## Stop conditions

Stop and report instead of guessing if:

- required APIs do not exist
- file ownership is unclear
- a task would replace working shell architecture without explicit approval
- the result cannot satisfy both light and dark mode

