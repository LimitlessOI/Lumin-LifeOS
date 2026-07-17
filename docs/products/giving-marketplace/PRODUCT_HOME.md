<!-- SYNOPSIS: Canonical product home — Giving Marketplace -->

# Giving Marketplace Product Home

**Captured:** 2026-07-16 from founder direction: a market where people donate things of value they do not want to sell, and give them to people in need.

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `giving-marketplace` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/giving-marketplace/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-17 — SSOT co-commit for services/giving-marketplace-service.js via BuilderOS gitCliCommit.|

---
**Status:** Idea → Foundation Build
**Priority:** New
**Category:** Community / Marketplace

---

## Vision

A lightweight, trust-first marketplace for donating usable items of value to people who need them. No payments, no auctions, no friction — just post what you have, claim what you need, and coordinate handoff.

---

## Core Problem

- People have valuable items they no longer need but do not want to deal with selling.
- People in need lack an easy, dignified way to find and claim those items.
- Existing platforms are either commerce-first (sell/buy), over-engineered, or trust-fragile.

---

## V1 Scope

**In scope for the first slice:**
- Donors can post an item: title, description, condition, category, location, images (optional), donor contact.
- Recipients can browse and search available items by category and location.
- Recipients can claim an item; the item is marked `claimed` and claimer contact is recorded.
- Donor can mark an item as `handed_off` once exchanged.
- Simple status model: `available`, `claimed`, `handed_off`.

**Out of scope for V1 (known gaps):**
- Verification of recipient need or donor item condition.
- Shipping / logistics coordination beyond contact exchange.
- Trust/reputation scoring, moderation, dispute resolution.
- Monetary donations, tipping, or tax receipts.
- Real-time messaging between donor and recipient.
- Mobile app or native notifications.

---

## Open Decisions

1. Identity model: anonymous handles vs. verified user accounts?
2. Geographic granularity: free-text location, ZIP, or map radius?
3. Claim fairness: first-come-first-served vs. needs-based queue?
4. Item moderation: pre-approve listings, post-moderation, or community flagging?
5. Handoff proof: photo confirmation, donor release, or honor system?

---

## Ownership

| File | Role |
|---|---|
| `services/giving-marketplace-service.js` | Core service: create, list, search, claim, mark handed-off. |
| `routes/giving-marketplace-routes.js` | Express routes under `/api/v1/giving-marketplace`. |
| `db/migrations/20260717_create_giving_donations.sql` | `giving_donations` table. |
| `docs/products/giving-marketplace/BUILD_QUEUE.json` | Build plan. |
| `docs/products/giving-marketplace/FILE_MANIFEST.json` | Owned-files map. |
| `docs/products/giving-marketplace/PRODUCT_HOME.md` | This SSOT. |

---

## Change Receipts

| Date | Change | Status |
|---|---|---|
| 2026-07-16 | Product stub created and `giving-marketplace-01` migration, `giving-marketplace-02` service, `giving-marketplace-03` route queued. | pending |

---

## Agent Handoff Notes

- This product is intentionally minimal. The next agent should let the governed factory ship V1 and then run SENTRY Layer A + B before any founder-facing UI is promised.
- Known gaps are listed above; do not hide them or mark them `done` until Adam confirms the decision.
