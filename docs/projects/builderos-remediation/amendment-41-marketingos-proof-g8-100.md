# Proof-Closing Blueprint Note: MarketingOS SSOT Foundation (G8-100)

This document addresses a critical proof gap in establishing MarketingOS as the Single Source of Truth (SSOT) for `MarketingSegment` data, as outlined in `AMENDMENT_41_MARKETINGOS.md`.

## 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_41_MARKETINGOS.md` blueprint establishes the *intent* for MarketingOS to be the SSOT for `MarketingSegment` data. The missing implementation and proof gap is the concrete, verifiable mechanism for ensuring that `MarketingSegment` updates originating in MarketingOS are consistently and reliably propagated to all designated downstream systems, thereby proving its SSOT status in practice. Specifically, the absence of an event-driven propagation and verification loop for `MarketingSegment` changes.

## 2. Smallest Safe Build Slice to Close It

Implement a foundational event-driven propagation mechanism for `MarketingSegment` updates. This slice will focus on:
a.  Emitting a `MarketingSegmentUpdatedEvent` from MarketingOS whenever a `MarketingSegment` is created, updated, or deleted.
b.  Establishing a minimal, observable listener in a representative downstream system (e.g., a simulated `DownstreamCRMService`) that consumes this event and logs the received data, demonstrating successful propagation.
This slice prioritizes proving the *propagation channel* and *data consistency* for a single, critical entity.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/segment/segment.service.ts`: Modify `create`, `update`, and `delete` methods to emit `MarketingSegmentUpdatedEvent` after successful database operations.
*   `services/marketingos/src/segment/segment.events.ts`: Define the `MarketingSegmentUpdatedEvent` interface, including `segmentId`, `payload` (full segment data), and `eventType` (e.g., 'created', 'updated', 'deleted').
*   `services/marketingos/src/segment/segment.module.ts`: Ensure event emitter/broker is configured and available to the service.
*   `services/downstream-crm/src/segment-sync/segment-sync.service.ts` (new file): Implement an event listener for `MarketingSegmentUpdatedEvent` that logs the received segment data and updates an internal cache/state.
*   `services/downstream-crm/src/segment-sync/segment-sync.controller.ts` (new file): Expose a simple `/status` endpoint to report the timestamp of the last received `MarketingSegment` update and its ID.
*   `services/downstream-crm/src/app.module.ts`: Register the `SegmentSyncService` and its event listener.

## 4. Verifier/Runtime Checks

*   **Unit Test (`segment.service.ts`):** Verify that `MarketingSegmentUpdatedEvent` is emitted with correct data and event type upon `create`, `update`, and `delete` operations.
*   **Integration Test (E2E):**
    1.  Create a new `MarketingSegment` via MarketingOS API.
    2.  Verify `DownstreamCRMService` logs the `MarketingSegmentCreatedEvent` within 5 seconds.
    3.  Verify `DownstreamCRMService` `/status` endpoint reflects the new segment's ID and a recent timestamp.
    4.  Update the created `MarketingSegment` via MarketingOS API.
    5.  Verify `DownstreamCRMService` logs the `MarketingSegmentUpdatedEvent` with the updated data within 5 seconds.
    6.  Verify `DownstreamCRMService` `/status` endpoint reflects the updated segment's ID and a recent timestamp.
*   **Observability:** Monitor event broker queues for `MarketingSegmentUpdatedEvent` volume and latency.

## 5. Stop Conditions if Runtime Truth Disagrees

*   `MarketingSegmentUpdatedEvent` is not emitted by MarketingOS on any `MarketingSegment` modification.
*   `DownstreamCRMService` does not receive the event within 5 seconds of emission.
*   The data received by `DownstreamCRMService` for a `MarketingSegment` update does not precisely match the data committed in MarketingOS.
*   `DownstreamCRMService` `/status` endpoint