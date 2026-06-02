Amendment 41 MarketingOS Proof: G111-100 - Customer Segmentation Tag Propagation
This document serves as a proof-closing blueprint note for gap G111-100, ensuring the correct propagation of `customer_segmentation_tags` from MarketingOS (as the SSOT) to the LifeOS Customer Profile Service, as defined by `docs/projects/AMENDMENT_41_MARKETINGOS.md`.

1. Exact Missing Implementation or Proof Gap
The current gap is the absence of a dedicated data synchronization mechanism or apiEP integration that reliably pushes `customer_segmentation_tags` from MarketingOS to the LifeOS Customer Profile Service. Specifically, the proof requires demonstrating that any change to a `customer_segmentation_tag` in MarketingOS for a given `customer_id` is reflected accurately and within acceptable latency in the LifeOS Customer Profile Service's `customer_segmentation_tags` field. The gap is the implementation of this synchronization and the proof of its correctness.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
    a.  Developing a new BuilderOS internal service, `marketing-tag-sync-agent`, responsible for consuming `customer_segmentation_tag` change events from MarketingOS.
    b.  Implementing a client within `marketing-tag-sync-agent` to interact with the MarketingOS event stream or API for tag changes.
    c.  Implementing a client within `marketing-tag-sync-agent` to call a new or existing LifeOS Customer Profile Service API endpoint to update `customer_segmentation_tags` for a specific `customer_id`.
    d.  Ensuring the LifeOS Customer Profile Service API endpoint correctly persists the updated tags to its data store.
    e.  Focusing the initial proof on a single `customer_id` and a single `customer_segmentation_tag` addition, modification, and removal.

3. Exact Safe-Scope Files to Touch First
    a.  `services/marketing-tag-sync-agent/src/index.js` (New service entry point)
    b.  `services/marketing-tag-sync-agent/src/clients/marketingOsEventClient.js` (New client for MarketingOS event consumption)
    c.  `services/marketing-tag-sync-agent/src/clients/lifeOsCustomerProfileApiClient.js` (New client for LifeOS Customer Profile API)
    d.  `services/marketing-tag-sync-agent/package.json` (New service dependencies)
    e.  `services/lifeos-customer-profile/src/api/customerProfileRoutes.js` (Extend/modify to include a dedicated endpoint for `customer_segmentation_tags` updates, e.g., `PUT /customers/:id/segmentation-tags`)
    f.  `services/lifeos-customer-profile/src/data/customerProfileRepository.js` (Extend/modify repository logic to handle `customer_segmentation_tags` persistence)
    g.  `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g111-100.md` (This document, for completion and future reference)

4. Verifier/Runtime Checks
    a.  **Unit Tests:** Comprehensive unit tests for `marketing-tag-sync-agent` components (event consumption, API calls) and LifeOS Customer Profile Service tag update logic.
    b.  **Integration Tests (BuilderOS Loop):**
        *   Deploy `marketing-tag-sync-agent` and updated `lifeos-customer-profile` service.
        *   Trigger a `customer_segmentation_tag` change in a controlled MarketingOS test environment for a specific `customer_id`.
        *   Query the LifeOS Customer Profile Service for that `customer_id` via its public API.
        *   Assert that the `customer_segmentation_tags` field in LifeOS matches the MarketingOS SSOT within a defined latency (e.g., < 5 seconds).
        *   Repeat for tag addition, modification, and removal scenarios.
    c.  **Observability:** Monitor `marketing-tag-sync-agent` logs for processing errors, latency, and successful synchronization events. Monitor LifeOS Customer Profile Service for increased error rates or performance degradation on the tag update endpoint.

5. Stop Conditions if Runtime Truth Disagrees
    a.  If `customer_segmentation_tags` in LifeOS Customer Profile Service consistently diverge from MarketingOS SSOT for test `customer_id`s after the defined latency period.
    b.  If `marketing-tag-sync-agent` fails to process events or consistently reports unrecoverable errors.
    c.  If the LifeOS Customer Profile Service experiences increased error rates (>0.1%) or latency (>100ms P99) on the `customer_segmentation_tags` update endpoint.
    d.  If the synchronization process introduces unintended data corruption or side effects on other customer profile fields.
    e.  If the proposed solution requires modifications to LifeOS user-facing features or TSOS customer-facing surfaces, violating the BuilderOS-only scope.