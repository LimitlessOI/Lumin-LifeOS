# Amendment 14 White Label: Partner Billing Remediation (TODO-5-G10)

## 1. Blocking Ambiguity / Founder Decision List

The core ambiguity revolves around the financial relationship between LifeOS, White Label Partners, and their end-clients.

*   **Billing Model:**
    *   Option A: LifeOS bills partners directly based on partner usage/subscriptions, and partners bill their end-clients independently (potentially using their own Stripe accounts).
    *   Option B: LifeOS acts as a platform, facilitating partners to bill their end-clients directly through a connected Stripe account (Stripe Connect). LifeOS takes a platform fee.
    *   Option C: LifeOS bills end-clients directly on behalf of the partner, and remits funds to the partner (less fees).
*   **Stripe Account Management:**
    *   If partners bill directly (Option A or B), how are their Stripe accounts linked/managed within LifeOS? Do we use Stripe Connect Custom, Express, or Standard accounts?
    *   What are the KYC/onboarding requirements for partners if they are processing payments through LifeOS's platform or connecting their own accounts?
*   **Pricing & Revenue Share:**
    *   If LifeOS bills partners (Option A), what is the pricing structure for partners?
    *   If LifeOS facilitates partner billing (Option B), what is the revenue share model for LifeOS?
*   **Invoicing & Reporting:**
    *   What reporting capabilities are required for partners regarding their client billing and revenue?

## 2. Already-Settled Constraints

*   The current system lacks a separate billing flow for partners; all billing is direct from LifeOS to clients.
*   The goal is to enable white-label partners to manage their client relationships, which implies a need for flexible billing arrangements.
*   BuilderOS-only governed loop execution. No modification to LifeOS user features or TSOS customer-facing surfaces.
*   The solution must be minimal and align with the `AMENDMENT_14_WHITE_LABEL.md` blueprint's intent for partner autonomy.

## 3. Smallest Buildable Next Slice

The immediate next slice focuses on establishing the data model to support different partner billing models, without implementing the full billing logic. This addresses the "Stripe billing for partners not designed" gap by defining *how* it *could* be designed.

**Objective:** Introduce a `partnerBillingModel` field to the `Partner` entity and conditionally store a `stripeAccountId` if the model involves partner-direct Stripe integration.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/models/Partner.ts`: Add `partnerBillingModel: 'LIFEOS_DIRECT' | 'PARTNER_DIRECT_STRIPE_CONNECT' | 'PARTNER_MANAGED_EXTERNAL';` and `stripeAccountId?: string;` fields.
*   `src/types/Partner.ts`: Update `Partner` interface/type definition to include the new fields.
*   `src/services/partnerService.ts`: If there are existing methods for creating/updating partners, ensure they can handle the new fields (e.g., allow `partnerBillingModel` to be set, validate `stripeAccountId` presence if `PARTNER_DIRECT_STRIPE_CONNECT`).
*   `src/api/admin/partners.ts`: If an internal admin API exists for managing partner details, update relevant DTOs and handlers to expose/manage these new fields.

## 5. Required Verifier / Runtime Checks

*   **Schema Validation:**
    *   Ensure `partnerBillingModel` accepts only defined enum values.
    *   If `partnerBillingModel` is `PARTNER_DIRECT_STRIPE_CONNECT`, `stripeAccountId` must be a non-empty string.
    *   If `partnerBillingModel` is not `PARTNER_DIRECT_STRIPE_CONNECT`, `stripeAccountId` must be null or undefined.
*   **Data Persistence:**
    *   Verify that new `Partner` records can be created with these fields.
    *   Verify existing `Partner` records can be updated with these fields.
    *   Verify that these fields are correctly retrieved from the database.
*   **API Endpoint Checks (if applicable):**
    *   Test admin API endpoints for creating/updating partners to ensure they correctly accept and persist the new billing model and Stripe account ID.

## 6. Stop Conditions

*   The `Partner` entity schema (database and application-level) is updated to include `partnerBillingModel` and `stripeAccountId`.
*   Corresponding TypeScript type definitions are updated.
*   Basic CRUD operations (create, read, update) for `Partner` entities correctly handle the new fields, ensuring data integrity based on the `partnerBillingModel`.
*   No actual Stripe integration or billing logic is implemented in this slice.
*   The system can store the *intent* of how a partner will be billed, laying the groundwork for future billing feature development.
---METAD---
{"target_file": "docs/projects/builderos-remediation/amendment-14-white-label-todo-5-g10.md", "insert_after_line": null, "confidence": 1}