@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
# Amendment 46 BuilderOS Control Plane: Patch Plan for routes/lifeos-council-builder-routes.js (G1)

This document outlines a blueprint-first patch plan to address the `ZONE3_PATCH_REQUIRED` rejection for integrating BuilderOS control plane routes.

## 1. Goal in plain English

The goal is to safely integrate BuilderOS control plane routes into the existing `routes/lifeos-council-builder-routes.js` file. This integration must be minimal, adhere strictly to BuilderOS-only governance, and avoid any impact on LifeOS user features or TSOS customer-facing surfaces. The primary objective is to enable BuilderOS to manage its own loop execution through dedicated, isolated endpoints.

## 2. Why the original target is blocked or high-risk

The original target, `routes/lifeos-council-builder-routes.js`, is blocked due to a `ZONE3_PATCH_REQUIRED` flag. This indicates that direct modification of this file without a carefully planned, blueprint-first approach carries high risk. `ZONE3` typically implies a critical system component where changes could have broad, unintended consequences on core LifeOS functionality or security. The previous verifier rejection (syntax error on `.md` file) was an environmental issue, but the underlying `ZONE3` block remains. A surgical, well-defined patch plan is essential to mitigate risks associated with modifying a sensitive routing file.

## 3. Exact controlling blueprint excerpt summary

The controlling blueprint is `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically the "First Exact Coding Task" section. This section mandates the creation of BuilderOS-specific control plane routes within `routes/lifeos-council-builder-routes.js`. It emphasizes that these routes are exclusively for BuilderOS-governed loop execution and must not interfere with or expose LifeOS user features. The blueprint implicitly requires a strategy that ensures strict isolation and minimal invasiveness, aligning with the `ZONE3` designation.

## 4. Smallest safe helper-extraction or surgical patch strategy

The strategy is a surgical patch to `routes/lifeos-council-builder-routes.js`. Instead of modifying existing route definitions, we will append a new, clearly demarcated section for BuilderOS-specific routes. This section will import a new, dedicated BuilderOS router module (e.g., `builderos-control-router.js`) and mount it under a distinct, BuilderOS-only base path (e.g., `/builderos/control`). This approach minimizes changes to the existing file, encapsulates BuilderOS logic, and provides a clear separation of concerns. The `builderos-control-router.js` will contain all BuilderOS-specific route definitions, ensuring no BuilderOS logic pollutes the `lifeos-council-builder-routes.js` directly.

## 5. Required verifier checks

The following verifier checks are required:
*   **Syntax Check:** Ensure `routes/lifeos-council-builder-routes.js` remains syntactically valid after the patch.
*   **Route Isolation Check:** Verify that no new BuilderOS routes overlap with or modify existing LifeOS routes.
*   **Access Control Check:** Confirm that BuilderOS routes are only accessible via BuilderOS authentication mechanisms and are not exposed to standard LifeOS user roles.
*   **Feature Impact Check:** Automated tests must confirm zero regression or modification to existing LifeOS user features or TSOS customer-facing surfaces.
*   **Blueprint Adherence Check:** Verify that the implemented routes strictly align with the requirements outlined in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`.
*   **Dependency Check:** Ensure `builderos-control-router.js` is correctly imported and mounted without introducing new external dependencies not approved by the blueprint.

## 6. What BuilderOS should attempt next through C2

BuilderOS should proceed with creating the `builderos-control-router.js` module, defining the specific BuilderOS control plane endpoints within it. Concurrently, it should prepare the minimal patch to `routes/lifeos-council-builder-routes.js` to import and mount this new router under the designated `/builderos/control` path. This C2 attempt will focus on the actual code implementation based on this G1 plan.

## 7. What must not be changed

*   **Existing LifeOS User Features:** No modifications to any existing LifeOS user-facing functionality.
*   **TSOS Customer-Facing Surfaces:** No changes to any surfaces exposed to TSOS customers.
*   **Core LifeOS Routing Logic:** The fundamental structure or behavior of `routes/lifeos-council-builder-routes.js` outside of the new BuilderOS-specific mount point.
*   **Security Policies:** No relaxation or alteration of existing security policies or access controls for LifeOS routes.
*   **Database Schemas:** No changes to existing database schemas.
*   **Environment Variables:** No introduction of new environment variables without explicit blueprint approval.