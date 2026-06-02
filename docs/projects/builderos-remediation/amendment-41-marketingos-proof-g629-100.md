# Proof-Closing Blueprint Note: MarketingOS Data Ingestion Audit Trail (G629-100)

This document serves as the SSOT foundation for closing the proof gap related to verifiable data ingestion within MarketingOS, specifically for campaign performance metrics from external sources.

## 1. Exact Missing Implementation or Proof Gap

The current MarketingOS data ingestion pipeline for external campaign performance metrics (e.g., impressions, clicks, conversions from `ExternalAdPlatformX`) lacks a granular, immutable audit trail at the point of ingestion. While data is processed, there is no direct, cryptographically verifiable record of the *exact* raw payload received from `ExternalAdPlatformX` and its immediate timestamped processing status before transformation or storage. This gap prevents definitive proof of origin and integrity for individual data points if discrepancies arise later in the pipeline or reporting.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated, lightweight ingestion audit service (`IngestionAuditService`) that intercepts raw payloads from `ExternalAdPlatformX`'s webhook or API endpoint *before* any primary MarketingOS processing. This service will:
1.  Receive the raw JSON payload.
2.  Generate a SHA256 hash of the raw payload.
3.  Record the payload hash, ingestion timestamp, source identifier (`ExternalAdPlatformX`), and a minimal metadata (e.g., `campaignId` if immediately extractable) into a new, append-only audit log table (`marketing_ingestion_audit`).
4.  Forward the raw payload to the existing MarketingOS processing queue/service.
This slice focuses solely on the audit trail creation, not on modifying existing processing logic.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/IngestionAuditService.js`: New service to handle audit logging.
*   `src/controllers/marketing/ExternalAdPlatformXWebhookController.js`: Modify existing or create new controller to route `ExternalAdPlatformX` webhooks through `IngestionAuditService`.
*   `src/routes/marketing/externalAdPlatformX.js`: Add/modify route to point to the new/modified controller.
*   `src/database/migrations/YYYYMMDDHHMMSS_create_marketing_ingestion_audit_table.js`: New migration file for the `marketing_ingestion_audit` table.
*   `src/models/MarketingIngestionAudit.js`: New Sequelize/ORM model for the audit table.

## 4. Verifier/Runtime Checks

1.  **API/Webhook Test:** Send a known `ExternalAdPlatformX` payload to the designated webhook endpoint.
    *   Expected: HTTP 200 OK response.
    *   Expected: Verify a new entry in `marketing_ingestion_audit` table containing the correct `sourceIdentifier`, `ingestionTimestamp`, and a `payloadHash` matching the SHA256 hash of the sent payload.
    *   Expected: Verify the payload is correctly forwarded to the existing MarketingOS processing queue/service (e.g., by checking existing MarketingOS logs or processed data).
2.  **Data Integrity Check:** Send multiple varied payloads, including edge cases (e.g., missing optional fields).
    *   Expected: All payloads generate unique, correct hashes and are logged.
3.  **Performance Check:** Monitor latency of the webhook endpoint under load.
    *   Expected: Minimal impact on overall response time (e.g., < 50ms overhead per request).
4.  **Audit Log Query:** Execute direct database queries against `marketing_ingestion_audit` to confirm data structure, indexing, and query performance.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Hash Mismatch:** If the `payloadHash` stored in `marketing_ingestion_audit` does not exactly match the SHA256 hash of the raw payload received by the service. This indicates a critical data integrity failure at the ingestion point.
*   **Ingestion Failure:** If the `IngestionAuditService` fails to log an audit entry for a successfully received payload, or if it fails to forward the payload to the downstream MarketingOS processing.
*   **Performance Degradation:** If the audit logging process introduces significant latency (>100ms average overhead) that impacts the `ExternalAdPlatformX` webhook response time, potentially causing retries or data loss from the source.
*   **Schema Violation:** If the `marketing_ingestion_audit` table schema cannot accommodate valid payloads or if data types are incorrect, leading to storage errors.
*   **Security Vulnerability:** Any identified vulnerability (e.g., SQL injection, data exposure) in the new audit service or database interactions.