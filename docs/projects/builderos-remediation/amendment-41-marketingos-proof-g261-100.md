<!-- SYNOPSIS: Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G261-100 -->

# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G261-100

This document addresses the proof gap `G261-100` related to `AMENDMENT_41_MARKETINGOS`.

## 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_41_MARKETINGOS` blueprint specifies the requirement for a `campaignStatusUpdate` webhook endpoint within the `marketingos-webhook-receiver` service. The current gap `G261-100` is the **missing implementation and proof of robust payload parsing and schema validation** for incoming `campaignStatusUpdate` events. This includes ensuring data integrity, type correctness, and presence of all required fields before further processing.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated payload validation middleware or function within the `marketingos-webhook-receiver` service. This slice will:
*   Define a precise Joi/Zod schema for the `campaignStatusUpdate` payload.
*   Apply this schema to incoming requests at the earliest possible point in the webhook handler.
*   Return a standardized `400 Bad Request` response for any payload failing validation, including specific error details.
*   Log validation failures for observability without exposing sensitive data.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-webhook-receiver/src/schemas/campaignStatusUpdateSchema.js`: New file to define the Joi/Zod schema.
*   `services/marketingos-webhook-receiver/src/handlers/campaignStatusUpdateHandler.js`: Modify existing or create new handler to integrate the validation.
*   `services/marketingos-webhook-receiver/src/index.js`: Update main entry point or router to apply the validation middleware/handler.
*   `services/marketingos-webhook-receiver/tests/unit/schemas/campaignStatusUpdateSchema.test.js`: New file for unit tests of the schema.
*   `services/marketingos-webhook-receiver/tests/unit/handlers/campaignStatusUpdateHandler.test.js`: Update or create new unit tests for the handler, specifically covering validation paths.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `campaignStatusUpdateSchema.js` correctly validates a wide range of valid payloads (all required fields, correct types).
    *   Verify `campaignStatusUpdateSchema.js` correctly rejects invalid payloads (missing required fields, incorrect types, unexpected fields).
    *   Verify `campaignStatusUpdateHandler.js` returns `400` for invalid payloads and `200` (or appropriate success code) for valid ones.
    *   Ensure 100% test coverage for the new schema and validation logic.
*   **Integration Tests (Local Dev):**
    *   Send mock valid `campaignStatusUpdate` payloads to the local webhook endpoint; verify successful processing logs.
    *   Send mock invalid `campaignStatusUpdate` payloads (e.g., missing `campaignId`, wrong `status` type); verify