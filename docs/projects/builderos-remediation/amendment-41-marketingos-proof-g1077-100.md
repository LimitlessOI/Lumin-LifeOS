<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G1077 100. -->

AMENDMENT 41 MARKETINGOS: Proof-Closing Blueprint Note (G1077-100)
This document serves as the SSOT foundation for closing the identified proof gap related to Amendment 41 MarketingOS. It outlines the specific gap, the minimal build slice, affected files, verification steps, and stop conditions for the next C2 build pass.
1. Exact Missing Implementation or Proof Gap
The current system lacks an automated, auditable feedback loop to verify that `User.marketingConsent.email_promotions` updates in LifeOS are reliably propagated to and correctly applied by MarketingOS via the existing `MarketingOS.syncUserPreferences` apiEP. While the push mechanism exists, there is no independent, periodic verification that MarketingOS has successfully received and processed these updates, leading to a potential compliance and data integrity risk.
2. Smallest Safe Build Slice to Close It
Implement a new `MarketingConsentAuditor` service. This service will operate as a scheduled background task within the BuilderOS ecosystem. Its responsibilities include:
1.  Periodic Query: Query LifeOS for `User` records where `marketingConsent.email_promotions.updatedAt` is newer than the last successful audit timestamp.
2.  MarketingOS Query: For these identified users, query MarketingOS (via a new internal read-only endpoint or an existing one if suitable) to retrieve their current `email_promotions` consent status as recorded in MarketingOS.
3.  Comparison & Logging: Compare the LifeOS and MarketingOS consent states for `email_promotions`. Log any discrepancies in a dedicated `MarketingConsentAuditLog` model, including user ID, LifeOS state, MarketingOS state, and timestamp.
4.  Alerting: Trigger alerts for critical discrepancies (e.g., opt-out in LifeOS but opt-in in MarketingOS).
5.  State Management: Persist the timestamp of the last successful audit run to ensure incremental processing.
This slice focuses solely on verification and reporting, not on re-syncing, thus maintaining a safe, read-only scope initially.
3. Exact Safe-Scope Files to Touch First
-   `services/marketing-consent-auditor/index.js` (New service logic for the auditor)
-   `services/marketing-consent-auditor/config.js` (Configuration for audit frequency, thresholds, MarketingOS apiEP)
-   `models/MarketingConsentAuditLog.js` (New Mongoose/Sequelize model for storing audit results and discrepancies)
-   `routes/internal/marketing-consent-audit.js` (New internal apiEP for