### AMENDMENT 46: BuilderOS Control Plane Enhancement (G2)

This memo outlines the next buildable slice for Amendment 46, focusing on the `/build` endpoint within `routes/lifeos-council-builder-routes.js`. The current blueprint lacks a directly buildable safe-scope task, necessitating this enhancement memo to define a clear, actionable path.

---

1.  **Blocking Ambiguity or Founder Decision List:**
    *   **A1: Request Body Schema for `/build`:** The blueprint implies a single `/build` endpoint handling both "start" and "complete" actions. A decision is needed on the exact