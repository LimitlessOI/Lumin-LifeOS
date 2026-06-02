Amendment 46 BuilderOS Control Plane Proof - G746-100

Proof-Closing Blueprint Note

This note addresses the implementation gap identified in Amendment 46 regarding the BuilderOS control plane, specifically the wiring of build start and complete signals within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the absence of dedicated API endpoints (apiEPs) and their corresponding controller/service logic within the BuilderOS control plane to:
    a.  Record the initiation of a build process (`recordBuildStart`) via a `POST /build/start` endpoint, accepting `{ task_id, blueprint_id, model_used }`.
    b.  Record the successful or failed completion of a build process (`recordBuildComplete`) via a `POST /build/complete` endpoint, accepting `{ token, oil_receipt_ids }`.
    c.  Enforce a health check (`canMarkBuildDone`) before allowing a build to be marked complete, returning a `409 Conflict` if the health is RED.

2.  **Smallest Safe Build Slice to Close It**
    The minimal changes required involve:
    a.  **Route Definition:** Adding