# AMENDMENT 41: MarketingOS Proof-Closing Blueprint Note (G10-100)

**Source Blueprint**: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal**: This document — SSOT foundation.

This note addresses a critical proof gap related to the SSOT foundation for customer profile synchronization, as outlined in AMENDMENT 41.

---

### 1. Exact Missing Implementation or Proof Gap

The blueprint specifies the design for LifeOS to publish customer profile updates to a Kafka topic (`customer-profile-updates`) to establish a Single Source of Truth (SSOT) for customer data. The current gap is the *concrete implementation and verified operation* of the LifeOS Kafka producer for these updates, ensuring that `CustomerProfileService` correctly triggers these publications and that messages are reliably delivered to the designated Kafka topic.

### 2. Smallest Safe Build Slice to Close It

Implement the Kafka producer functionality within LifeOS specifically for `customer-profile-updates`. This slice includes:
*   Creating a dedicated Kafka producer instance configured for the `customer-profile-updates` topic.
*   Modifying the `CustomerProfileService` to invoke this producer whenever a customer profile is created, updated, or deleted.
*   Ensuring the published message payload adheres to the expected schema for customer profile updates.

This slice *does not* include the MarketingOS consumer, any other Kafka topics, or the LifeOS action API.

### 3. Exact Safe-Scope Files to Touch First

*   `src/config/kafka.js`: Add configuration for the `customer-profile-updates` topic and producer.
*   `src/services/kafkaProducerService.js`: Implement or extend a Kafka producer utility to handle `customer-profile-updates`.
*   `src/services/customerProfileService.js`: Integrate calls to `kafkaProducerService.publishCustomerProfileUpdate(profileData)` within its `create`, `update`, and `delete` methods.
*   `src/tests/unit/customerProfileService.test.js`: Add unit tests to mock Kafka producer and verify calls.
*   `src/tests/integration/kafkaCustomerProfile.test.js`: Add integration tests to verify actual message production to Kafka.

### 4. Verifier/Runtime Checks

*   **Unit Tests**: Verify that `CustomerProfileService` methods (create, update, delete) correctly invoke the `kafkaProducerService` with the appropriate customer profile data.
*   **Integration Tests**:
    *   Execute a LifeOS API call to create or update a customer profile.
    *   Use a Kafka consumer utility (e.g., `kafkacat -b <broker> -t customer-profile-updates -o beginning -e`) or a dedicated test consumer to confirm that a message appears on the `customer-profile-updates` topic.
    *   Validate the structure and content of the consumed message against the expected customer profile