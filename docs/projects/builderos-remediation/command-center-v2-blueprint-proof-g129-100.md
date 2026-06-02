# Blueprint Proof: Command Center V2 - G129-100 - Observability Foundation (1.1 Metrics Ingestion & Display)

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, specifically addressing the "Observability Foundation" phase, focusing on "1.1 Metrics Ingestion & Display".

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The `COMMAND_CENTER_V2_BLUEPRINT.md` specifies "Integrate existing metrics sources and display them on a basic dashboard" (Phase 1.1). The immediate gap is the concrete implementation path for ingesting a *single, existing* system health metric from a core LifeOS service and rendering it on a new, minimal Command Center dashboard UI. This involves establishing the end-to-end data flow from an existing metric source through a new Command Center backend API to a new frontend component.

**2. Smallest Safe Build Slice to Close It:**
Implement a read-only API endpoint within the Command Center backend to fetch the health status of a designated `lifeos-core-service` (e.g., by proxying its existing `/health` endpoint). Concurrently, create a new, minimal Command Center dashboard page in the frontend that consumes this API endpoint and displays the `lifeos-core-service` health status using a dedicated UI component. This slice establishes the foundational data flow and UI structure for metrics display.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/command-center/metrics/metrics.routes.js`: Define a new GET route `/api/v2/command-center/metrics/lifeos-core-health`.
*   `src/api/command-center/metrics/metrics.controller.js`: Implement the handler for the new route, responsible for making an internal HTTP request to the `lifeos-core-service`'s health