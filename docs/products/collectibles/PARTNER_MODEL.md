<!-- SYNOPSIS: Collectibles partner capability model -->

# Collectibles — Partner Model

## 1. Law `[FOUNDER]`

Do **not** hard-code “card store.” Partners declare capabilities individually. Every capability may be jurisdiction-limited. Partner-originated economics must be attributable. Revenue splits are **per service**, not one global split.

## 2. Partner entity

See SCHEMA `partners` + `partner_capabilities`.

### Capability catalog (authoritative)

| Capability | Version first material | Notes |
|---|---|---|
| inventory_seller | V5 | New/sealed + singles sync |
| scan_provider | V6 | Scan My Collection / Open & Scan |
| reveal_provider | V6 | Reveal Studio host |
| custody_provider | V6 | Living Vault custody — legal-gated marketing |
| secure_exchange_point | V3/V5 | Local handoff |
| fulfillment_provider | V3/V5 | Ship on behalf |
| event_host | V5 | Trade nights, releases |
| tournament_host | V8 | Competition |
| grading_handoff | V9 | Route to graders |
| authentication_provider | V9 | Auth services |
| insurance_partner | V9 | Insurance data packages |
| lending_pawn_partner | V9 | Licensed only; jurisdiction-aware |

## 3. Home Store `[FOUNDER]`

User may designate a Home Store partner (V5+). Effects: local-first recommendations, event defaults, optional deck prep (V8), custody preference (V6) — never silent data sharing beyond declared capabilities and user consent.

## 4. Revenue attribution `[DERIVED]`

Ledger events (logical):

| Event | Fields |
|---|---|
| `partner_origin_sale` | partner_id, capability, transaction_id, gross_cents, share_bps, net_share_cents |
| `reveal_host_fee` | partner_id, session_id, amount_cents |
| `scan_service_fee` | partner_id, twin_ids, amount_cents |
| `custody_fee` | partner_id, period, amount_cents |
| `sponsored_placement` | partner_id, campaign_id, amount_cents — **never** mixed into “best” rank |

## 5. Inventory sync

- Partner pushes or Teloa pulls via adapter.
- `sync_state`: fresh | stale | error.
- On failure: show stale warning; do not sell phantom stock.
- When partner leaves: capability revoked; open custody → RETURN_PENDING; inventory hidden.

## 6. Sponsored vs best `[FOUNDER]`

Paid placement is a separate channel. API and UI must label `placement_type=sponsored` vs `placement_type=best`. Ranking code paths must not merge scores.

## 7. Staff privacy

Partner staff accounts receive CustodyPartnerProjection only. No owner home address, no unrelated collection browse, no private thresholds.
