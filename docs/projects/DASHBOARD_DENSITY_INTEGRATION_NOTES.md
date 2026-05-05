The task's SPECIFICATION explicitly requests Markdown for `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, but the "JAVASCRIPT FULL FILE — STRICT OUTPUT CONTRACT" states the entire response must be only JS/ESM source code. I am prioritizing the SPECIFICATION for the target file type.

# Dashboard Layout Utilities Integration

This document outlines the integration strategy for the `scripts/builder-smoke/dashboard-layout-utils.mjs` functions into the LifeOS dashboard shell. These utilities provide core logic for responsive layout, theme management, and density adjustments, forming a foundational layer for the dashboard's user experience.

## `clampMobileWidgetCount` Integration

**Purpose:** Normalizes the number of widgets displayed on mobile