<!-- SYNOPSIS: AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G10-100 User Profile Synchronization -->

# AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G10-100 User Profile Synchronization

This document addresses a critical proof gap identified in the `AMENDMENT_41_MARKETINGOS.md` blueprint, specifically concerning the foundational data synchronization required for MarketingOS to leverage LifeOS user profiles as the Single Source of Truth (SSOT).

---

### 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_41_MARKETINGOS.md` blueprint defines new user segmentation and targeting capabilities within MarketingOS, which inherently rely on up-to-date and accurate user profile attributes. The exact proof gap is the *absence of a defined and implemented secure, efficient, and scalable mechanism for MarketingOS to ingest and synchronize user profile attribute changes from the LifeOS User Service (the SSOT for user profiles) into its own operational data store.* This gap prevents MarketingOS from reliably executing segmentation rules based on the most current user data.

### 2. Smallest Safe Build Slice to Close It

Implement a unidirectional, event-driven data synchronization pipeline for core user profile attributes from the LifeOS User Service to a dedicated MarketingOS user profile data store. This slice focuses on:
*   LifeOS User Service publishing user profile update events.
*   A new MarketingOS service consuming these events.
*   MarketingOS persisting these updates into a purpose-built, denormalized user profile cache/store optimized for segmentation queries.
This slice explicitly avoids modifying existing LifeOS user management APIs or MarketingOS segmentation logic, instead focusing on the data input layer.

### 3. Exact Safe-Scope Files to Touch First

*   `services/user/src/events/UserUpdatedEvent.js`: (Existing or new) Ensure this event is emitted by the LifeOS User Service whenever a user profile attribute relevant to MarketingOS changes. Define the payload structure to include `userId` and relevant attributes (e.g., `email`, `firstName`, `lastName`, `registrationDate`, `segmentTags`).
*   `services/user/src/subscribers/MarketingOSProfileSyncPublisher.js`: (New file) A new subscriber/publisher component within the LifeOS User Service responsible for listening to `UserUpdatedEvent` and publishing a sanitized, MarketingOS-specific payload to a dedicated message queue/topic (e.g., `marketingos.user.profile.updates`).
*   `services/marketing/src/consumers/UserProfileSyncConsumer.js`: (New file) A new consumer service within MarketingOS responsible for subscribing to the `marketingos.user.profile.updates` topic, processing incoming messages, and upserting the data into the `MarketingUserProfile` store.
*   `services/marketing/src/models/MarketingUserProfile.js`: (New file) Define the schema and ORM/ODM model for the MarketingOS-specific user profile data store (e.g., a NoSQL document store or a relational table optimized for read performance).
*   `docs/architecture/data-flows/marketingos-user-profile-sync.md`: (New file) Document the new data flow, including event schemas, message queue details, and data transformation logic.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `UserUpdatedEvent` is emitted with correct payload on LifeOS user profile modifications