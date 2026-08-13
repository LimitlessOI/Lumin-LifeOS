<!-- SYNOPSIS: Collectibles state machines — vault, offers, transactions, content -->

# Collectibles — State Machines

**Law:** Possession/custody transitions never imply ownership change. Ownership changes only via explicit ownership_records writes (claim, purchase settlement, gift, trade completion, admin).

---

## 1. Living Vault / object lifecycle

Applies primarily to `custody_records.custody_state` combined with Twin `identity_status` and possession. Builders must not collapse into one enum that mixes ownership with location.

### 1.1 Twin identity_status

```
UNREGISTERED
  → OWNED_UNVERIFIED          (capture created Twin; ID weak/failed)
  → OWNED_CANONICAL           (identity resolved; may still lack owner photos)
  → OWNED_PHYSICAL_SCAN       (level ≥2 media attached)
  → OWNED_CONDITION_VERIFIED  (level ≥3 with acceptable confidence)
  → REVERIFICATION            (from any owned_* when evidence disputed/stale)
  → OWNED_*                   (after successful reverification)
```

Terminal soft: `deleted` via `deleted_at` (not an identity_status).

### 1.2 Custody / possession operational states

Canonical `custody_state` values (and related operational flags):

| State | Meaning | Ownership impact |
|---|---|---|
| UNREGISTERED | No Twin yet | n/a |
| OWNED_UNVERIFIED | Twin exists; ID weak | Owner set |
| OWNED_CANONICAL | Identity OK | none |
| OWNED_PHYSICAL_SCAN | Photos of copy | none |
| OWNED_CONDITION_VERIFIED | Condition evidence OK | none |
| CUSTODY_INBOUND | Heading to partner custody | none |
| VAULTED | Under partner custody safeguarding | none |
| RESERVED_FOR_OWNER | Held for owner visit/pickup | none |
| CHECKED_OUT | Temporarily out (owner or event) | none |
| EVENT_USE | Checked out for tournament/event | none |
| RETURN_PENDING | Return in progress | none |
| REVERIFICATION | Custody/identity re-check | none |
| TRANSFER_PENDING | Ownership transfer in progress | pending only |
| SOLD_NEW_OWNER | Settlement complete; ownership written | **ownership changes here** |
| SHIPMENT_OUTBOUND | Carrier has possession | none |
| OWNER_POSSESSION | Owner physically holds | none |
| LOST | Reported lost | none (claim process separate) |
| DAMAGED | Reported damaged | none |
| DISPUTED | Contested evidence/ownership/condition | freeze transfers |

**Note:** `VAULTED` may appear after check-in and again after return; same state name, new custody_record interval (`ended_at` closed on prior).

### 1.3 Allowed transitions (custody_state) `[DERIVED]`

```
OWNER_POSSESSION → CUSTODY_INBOUND → VAULTED
VAULTED → RESERVED_FOR_OWNER → CHECKED_OUT → OWNER_POSSESSION
VAULTED → CHECKED_OUT → EVENT_USE → RETURN_PENDING → REVERIFICATION → VAULTED
VAULTED|OWNER_POSSESSION → SHIPMENT_OUTBOUND → (buyer) OWNER_POSSESSION | RETURN_PENDING
* → LOST | DAMAGED | DISPUTED
DISPUTED → REVERIFICATION → prior healthy state | LOST | DAMAGED
TRANSFER_PENDING → SOLD_NEW_OWNER (ownership_records write) | OWNER_POSSESSION (abort)
```

Illegal: `CHECKED_OUT → SOLD_NEW_OWNER` without TRANSFER_PENDING + payment settlement.  
Illegal: treating EVENT_USE as ownership transfer.

### 1.4 Freeze rules

While `DISPUTED` or `TRANSFER_PENDING`: block Invisible Listing match acceptance, new offers accept, and custody checkout except evidence capture.

---

## 2. Offer / liquidity state

### 2.1 Liquidity posture (preference; not offer state)

`never_sell` · `surprise_me` · `open_to_offers` · `private_threshold` · `actively_selling`

### 2.2 Offer.state

```
(not an offer) NOT_AVAILABLE     — posture never_sell or twin deleted
               SURPRISE_ME       — eligible for inbound surprise offers
               OPEN_TO_OFFERS
               PRIVATE_THRESHOLD — server matches without leaking threshold
               ACTIVE_SALE       — owner actively seeking sale

OFFER_RECEIVED → COUNTERED → OFFER_RECEIVED (loop)
OFFER_RECEIVED|COUNTERED → ACCEPTED → SETTLEMENT_PENDING → COMPLETED
OFFER_RECEIVED|COUNTERED → DECLINED | EXPIRED | WITHDRAWN
ACCEPTED → WITHDRAWN only if both parties + policy allow pre-payment cancel → else SETTLEMENT_PENDING
```

**Storage:** Persist offer `state` on `offers.state`. Posture remains on `liquidity_preferences`. UI may show posture badges quietly; never “SELL” spam on Vault home for surprise_me.

**Private threshold:** Evaluation is server-side boolean `offer_cents >= threshold`. Responses to buyer: `rejected_policy` without threshold value; ranking features must not sort by proximity to threshold.

---

## 3. Transaction state (V3+)

Domain machine **separate** from payment provider machine.

```
DRAFT
  → FUNDS_HOLD_PENDING      (adapter start)
  → FUNDS_HELD              (adapter confirm)
  → PASSPORT_REQUIRED
  → READY_TO_SHIP
  → SHIPPED
  → DELIVERED
  → INSPECTION_WINDOW
  → COMPLETED               (inspect accept or window elapsed without dispute)
  → DISPUTE_OPEN
  → RETURN_REQUIRED
  → RETURN_SHIPPED
  → RETURN_RECEIVED
  → RETURN_VERIFIED         (fingerprint/consistency where supported)
  → REFUNDED | PARTIAL_REFUND | COMPLETED_AFTER_DISPUTE
  → CANCELLED               (pre-funds or mutual)
  → PROVIDER_OUTAGE_BLOCKED (non-terminal; no settlement claim)
```

**Rules:**
- No `COMPLETED` without FUNDS_HELD (for cash deals) or dual acknowledgement (trade-only with zero cash) plus passport rules for risk_tier.
- Provider outage → `PROVIDER_OUTAGE_BLOCKED` or remain in prior state; UI tells truth.
- Multi-object: one Transaction, many lines; all lines share settlement outcome unless partial protocol explicitly entered (V3 supports all-or-nothing first; partial is V4+).

---

## 4. Content rights state (V6+)

```
granted → revoked → takedown_pending → takedown_complete
granted → takedown_pending (platform/legal) → takedown_complete
```

Revoke does not erase private owner copy; stops partner/network/public distribution and queues takedown of derivatives where contracts allow.

---

## 5. Partner capability status

`pending → active → gated → revoked`  
`active → left` (partner leaves network): inventory marked stale; open custody → RETURN_PENDING protocol.

---

## 6. Play entitlement vs IP permission

Independent machines:

**PlayEntitlement.eligibility:** `none → owner_eligible → revoked` (and `borrowed_eligible` when policy allows)

**IpPermissionGrant.status:** `none → pending → granted → withdrawn`

Arena session requires **both** where adapter declares `ip_permission_required=true`. Withdrawal of IP grant disables adapter sessions without deleting Twins or play_entitlement history.

---

## 7. Observability hooks

Emit state transition AuditEvents: `{from, to, actor, reason, twin_id?, transaction_id?, offer_id?}`.

Reality tests must assert illegal transitions are rejected with stable error codes.
