<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G110 100. -->

### Amendment 41: MarketingOS Proof G110-100 Remediation Blueprint

This document serves as the Single Source of Truth (SSOT) foundation for closing the identified proof gap related to Amendment 41 and MarketingOS integration, specifically for proof G110-100.

#### 1. Exact Missing Implementation or Proof Gap

The primary gap identified is the lack of a verifiable, runtime-attested link between the MarketingOS campaign definition (as per Amendment 41) and its corresponding BuilderOS-governed execution loop. Specifically, the system lacks an explicit, auditable mechanism to confirm that a MarketingOS campaign, once approved, correctly initiates and is constrained by a BuilderOS execution loop without manual intervention or external configuration. The current state allows for potential drift between MarketingOS intent and BuilderOS execution parameters.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Introducing a new BuilderOS internal service or extending an existing one to listen for specific MarketingOS campaign approval events.
*   This service will then programmatically create or update a BuilderOS execution loop configuration, ensuring direct mapping of approved MarketingOS parameters (e.g., target audience, budget, duration) to BuilderOS constraints.
*   A new internal data structure or extension to an existing one within BuilderOS to store the immutable link between the MarketingOS campaign ID and the BuilderOS loop ID, along with a hash of the parameters used for loop creation.

#### 3. Exact Safe-Scope Files to Touch First

Given the `BuilderOS-only governed loop execution` and `Do not modify LifeOS user features or TSOS customer-facing surfaces` constraints:

*   `services/builder-os/src/marketingCampaignListener.js`: New internal service to subscribe to MarketingOS events.
*   `services/builder-os/src/loopManager.js`: Extend existing `loopManager` to include a new method `createMarketingLoop(campaignId, parameters)` or `updateMarketingLoop(campaignId, parameters)`.
*   `services/builder-os/src/models/MarketingLoopLink.js`: New internal Mongoose/Sequelize model (or similar ORM) to store the `marketingCampaignId`, `builderLoopId`, and `parameterHash`.
*   `services/builder-os/src/events/marketingEvents.js`: Define internal event structure for MarketingOS campaign approvals (if not already existing).

#### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `marketingCampaignListener.test.js`: Verify the listener correctly processes MarketingOS approval events.
    *   `loopManager.test.js`: Verify `createMarketingLoop` and `updateMarketingLoop` methods correctly configure BuilderOS loops with MarketingOS parameters.
    *   `MarketingLoopLink.test.js`: Verify the data model correctly stores and retrieves the linkage.
*   **Integration Tests:**
    *   Simulate a MarketingOS campaign approval event and verify that a corresponding BuilderOS loop is created/updated with the correct parameters and that the `MarketingLoopLink` record is persisted.
    *   Verify that modifying the MarketingOS campaign (post-approval) triggers an update to the BuilderOS loop, adhering to the `BuilderOS-only governed loop execution` principle.
*   **Runtime Monitoring:**
    *   Dashboard metrics for `marketing_os_campaign_to_builder_os_loop_creation_success_total` and `marketing_os_campaign_to_builder_os_loop_update_success_total`.
    *   Alerts for `marketing_os_campaign_to_builder_os_loop_creation_failure_total` and `marketing_os_campaign_to_builder_os_loop_parameter_mismatch_total`.
    *   Audit logs showing the linkage creation/update events.

#### 5. Stop Conditions if Runtime Truth Disagrees

*   **Parameter Mismatch:** If a BuilderOS loop is created/updated with parameters that do not precisely match the approved MarketingOS campaign parameters (after accounting for BuilderOS-specific transformations), the process must halt, log an error, and alert. This indicates a failure in the mapping logic.
*   **Linkage Failure:** If the `MarketingLoopLink` record fails to persist or cannot be retrieved for a successfully created/updated BuilderOS loop, the process must halt, log an error, and alert. This breaks the SSOT foundation.
*   **Loop Inactivity/Incorrect State:** If a BuilderOS loop linked to an active MarketingOS campaign remains inactive or enters an incorrect state (e.g., paused when it should be running, or running outside its defined budget/duration) without explicit MarketingOS instruction, the system must alert and potentially revert the loop to a safe, inactive state.
*   **Performance Degradation:** If the introduction of the listener or loop management logic causes a measurable degradation in BuilderOS loop creation/update latency or overall system throughput, the change must be rolled back.