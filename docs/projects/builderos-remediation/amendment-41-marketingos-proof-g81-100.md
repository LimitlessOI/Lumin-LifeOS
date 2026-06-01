# Amendment 41: MarketingOS Proof G81-100 - SSOT Foundation Blueprint Note

**Signal:** This document — SSOT foundation.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a formally verified, auditable, and real-time data synchronization and consistency proof for critical user attributes (specifically `user.marketingOptInStatus` and `user.segmentTags` relevant to G81-100 segmentation/reporting) from LifeOS (the Single Source of Truth) to MarketingOS. While a basic integration might exist, the "proof" aspect requires a dedicated mechanism to continuously assert and report on data consistency, ensuring MarketingOS accurately reflects LifeOS's state for these attributes.

### 2. Smallest Safe Build Slice to Close It

Implement a new BuilderOS-managed `marketing-sync` service responsible for:
a.  Consuming relevant user attribute changes from LifeOS (e.g., via an existing `UserEventStream` or `UserProfileService` delta endpoint).
b.  Idempotently updating corresponding user profiles in MarketingOS via its API.
c.  Exposing a lightweight internal verification endpoint (`/verify-g81-100`) that, given a `userId`, queries both LifeOS and MarketingOS for the G81-100 relevant attributes and reports on their consistency.
d.  A scheduled BuilderOS job that periodically invokes this verification endpoint for a random sample of users and logs the consistency status.

This slice focuses on establishing the sync mechanism and, critically, the *proof* mechanism without altering existing LifeOS or MarketingOS core functionalities.

### 3. Exact Safe-Scope Files to Touch First

*   `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g81-100.md` (This document)
*   `services/marketing-sync/src/index.js` (New service entry point)
*   `services/marketing-sync/src/marketingos-adapter.js` (New module for MarketingOS API interactions)
*   `services/marketing-sync/src/lifeos-event-consumer.js` (New module for consuming LifeOS events/data)
*   `services/marketing-sync/src/verification-api.js` (New module for the internal verification endpoint)
*   `services/marketing-sync/src/config.js` (New module for service-specific configuration, e.g., MarketingOS API keys, LifeOS endpoint URLs)
*   `config/builder-services.json` (Add new `marketing-sync` service definition)
*   `config/builder-jobs.json` (Add new scheduled job for G81-100 verification)

### 4. Verifier/Runtime Checks

*   **Unit Tests:** Ensure `marketingos-adapter.js` correctly formats requests and handles responses, and `lifeos-event-consumer.js` correctly parses LifeOS events.
*   **Integration Tests:** Simulate LifeOS attribute changes and verify that `marketing-sync` service processes them and attempts to update MarketingOS (using mock MarketingOS API).
*   **Automated Daily Consistency Check:** The scheduled BuilderOS job runs daily, sampling 100-500 active users. For each user, it calls the `marketing-sync`'s `/verify-g81-100` endpoint. The job asserts that >95% of sampled users show consistent data.
*   **Observability:** Monitor `marketing-sync` service logs for processing errors, latency, and throughput. Dashboard metrics for `g81_100_consistency_rate` and `marketingos_api_call_success_rate`.
*   **Manual Spot Check:** Periodically select a few users, verify their `marketingOpt