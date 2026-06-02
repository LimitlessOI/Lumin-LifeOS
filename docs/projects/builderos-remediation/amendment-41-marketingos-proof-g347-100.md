# Proof-Closing Blueprint Note: MarketingOS Proof-G347-100 - Initial Client Integration

This document serves as the SSOT foundation for the next C2 build pass, focusing on closing the initial proof gap for MarketingOS Proof-G347-100 integration.

## 1. Exact Missing Implementation or Proof Gap

The core missing implementation is the foundational `MarketingOSClient` and its ability to perform a basic, consent-aware data synchronization attempt. The proof gap is demonstrating that the `MarketingOSClient` can be instantiated, configured, and invoked by `UserService` to initiate a data sync, respecting a minimal consent check, without impacting existing LifeOS functionality.

## 2. Smallest Safe Build Slice to Close It

This build slice focuses on establishing the `MarketingOSClient` and its initial integration point.
1.  **Create `src/clients/MarketingOSClient.js`**: Implement a basic client class with a `syncUserData(userId, data)` method. This method will initially log the attempt and simulate an API call.
2.  **Extend `src/services/UserService.js`**: Introduce an import for `MarketingOSClient`. Add a new, private helper method (e.g., `_triggerMarketingOSSync`) that instantiates the client and calls `syncUserData`. This call will be guarded by a placeholder consent check (e.g., a simple boolean or a mock `ConsentService` call) to simulate consent awareness. This method will not be exposed externally yet.
3.  **Minimal Consent Simulation**: For this proof, the consent check within `UserService` will be a simple boolean flag or a direct mock of `ConsentService.hasConsentFor('marketingos-g347')` returning `true` to allow the sync attempt to proceed. Full `ConsentService` extension is deferred.

## 3. Exact Safe-Scope Files to Touch First

-   `src/clients/MarketingOSClient.js` (new file)
-   `src/services/UserService.js` (amendment: import `MarketingOSClient`, add `_triggerMarketingOSSync` helper, add a placeholder call to this helper in a non-critical path, e.g.,