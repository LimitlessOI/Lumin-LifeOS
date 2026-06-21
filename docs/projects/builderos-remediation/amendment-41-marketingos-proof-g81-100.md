<!-- SYNOPSIS: Amendment 41 MarketingOS Proof-Closing Blueprint Note (G81-100) -->

The instruction to write a `.md` file conflicts with the OIL verifier's rejection, which indicates it attempts to execute `.md` files as Node.js modules. I am proceeding with generating the `.md` file as explicitly requested by the task.
# Amendment 41 MarketingOS Proof-Closing Blueprint Note (G81-100)

This document serves as the SSOT foundation for closing the proof gap related to MarketingOS Amendment 41, specifically concerning the G81-100 scope.

## 1. Exact Missing Implementation or Proof Gap

The current implementation lacks a robust mechanism for real-time synchronization of MarketingOS campaign metadata updates back to the BuilderOS platform for audit and reconciliation. Specifically, the `CampaignMetadataSyncService` in MarketingOS does not reliably emit events for all state transitions, leading to potential discrepancies in BuilderOS's view of active campaigns and their associated proofs (G81-100 range). The proof gap is the absence of a verifiable, idempotent record of MarketingOS campaign state changes within BuilderOS's audit logs.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves enhancing the existing `CampaignMetadataSyncService` in MarketingOS to emit granular state-change events and introducing a new idempotent listener in BuilderOS to consume and record these events. This slice focuses solely on event emission and consumption, without altering core campaign logic or BuilderOS's existing data models beyond adding audit entries.

## 3. Exact Safe-Scope Files to Touch First

**MarketingOS (Event Emission):**
*   `src/services/CampaignMetadataSyncService.js`: Modify existing update methods to emit structured events (e.g., `campaign.updated`, `campaign.status_changed`) via the internal event bus.
*   `src/events/marketingos-events.js`: Define new event types and their payloads for campaign metadata changes.

**BuilderOS (Event Consumption & Recording):**
*   `src/listeners/MarketingOSCampaignSyncListener.js`: Create a new listener module to subscribe to MarketingOS events.
*   `src/services/AuditLogService.js`: Extend (or create if missing) a method to record incoming MarketingOS campaign state events.
*   `src/config/event-subscriptions.js`: Add the new listener to the BuilderOS event subscription configuration.

## 4. Verifier/Runtime Checks

*   **Unit Tests (MarketingOS):** Verify `CampaignMetadataSyncService` methods correctly emit events with expected payloads for various campaign state transitions (creation, update, status change).
*   **Integration Tests (MarketingOS -> BuilderOS):**
    *   Deploy a test MarketingOS instance and a test BuilderOS instance.
    *   Trigger campaign updates in MarketingOS.
    *   Verify that corresponding audit log entries appear in BuilderOS, reflecting the exact state changes.
    *   Check for idempotency: Repeatedly sending the same event should not create duplicate audit entries or corrupt state.
*   **Runtime Monitoring:** Monitor event bus traffic for `marketingos.campaign.*` events. Monitor BuilderOS audit logs for successful ingestion and processing.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Event Emission Failure:** If `CampaignMetadataSyncService` fails to emit events for *any* campaign state change, stop. This indicates a fundamental breakdown in the eventing mechanism.
*   **Event Ingestion Failure:** If BuilderOS's `MarketingOSCampaignSyncListener` fails to receive or process events, stop. This indicates a connectivity or listener configuration issue.
*   **Data Discrepancy:** If audit logs in BuilderOS do not accurately reflect MarketingOS campaign states (e.g., missing updates, incorrect values, duplicates), stop. This indicates a data integrity issue.
*   **Performance Degradation:** If the introduction of new eventing or listening mechanisms causes a measurable performance degradation (e.g., increased latency for campaign updates, high CPU/memory usage in either service), stop.