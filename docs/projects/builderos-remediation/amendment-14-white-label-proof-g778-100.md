# Amendment 14 White-Label Proof: G778-100 - Initial Brand Override Verification

This document outlines the next smallest build slice to prove the foundational white-labeling capability introduced by Amendment 14. The focus is on verifying the ability to override a core branding element via configuration, without impacting LifeOS user features or TSOS customer-facing surfaces.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a demonstrable, configurable override for a core BuilderOS branding element. Specifically, we need to prove that an environment-driven configuration can alter a visible string within the BuilderOS interface, confirming the white-label mechanism's basic functionality.

## 2. Smallest Safe Build Slice to Close It

Introduce a new environment variable, `BUILDEROS_BRAND_OVERRIDE_NAME`, and integrate it into a non-critical, internal BuilderOS UI component (e.g., the BuilderOS dashboard header or footer) to display its value. This slice focuses solely on reading and rendering the override, not on complex theming or asset management.

## 3. Exact Safe-Scope Files to Touch First

*   `apps/builderos/src/config/env.js`: Add `BUILDEROS_BRAND_OVERRIDE_NAME` to the environment variable schema and default loading.
*   `apps/builderos/src