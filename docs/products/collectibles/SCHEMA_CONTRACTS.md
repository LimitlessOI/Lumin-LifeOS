<!-- SYNOPSIS: Collectibles schema contracts — entities, fields, enums, indexes -->

# Collectibles — Schema Contracts

**Status:** Binding for manufacturing.  
**Store posture:** Postgres (Neon) primary. Media bytes: Postgres BYTEA acceptable for V1; object storage (R2/S3) preferred when configured — same `MediaEvidence` row either way.  
**IDs:** UUID v4 unless noted.  
**Timestamps:** `timestamptz` UTC.  
**Money:** integer **cents** + ISO-4217 `currency` (default `USD`). Never float money.

Sensitivity: `PUBLIC` · `OWNER` · `PARTY` · `PARTNER_NEED_TO_KNOW` · `SYSTEM` · `FORBIDDEN_PUBLIC`

Retention defaults: active while Twin/account exists; on account delete → soft-delete then hard-delete/anonymize per policy below.

---

## 1. collectible_twins

Canonical key: `id` UUID

| Field | Type | Req | Mutable | Sensitivity | Notes |
|---|---|---|---|---|---|
| id | uuid | Y | N | OWNER | Canonical Twin id |
| owner_user_id | uuid | Y | Y* | OWNER | *via ownership transfer only |
| household_id | uuid | N | Y | OWNER | Optional shared household |
| category_id | text | Y | N* | OWNER | e.g. `mtg`; change only via admin migration |
| adapter_id | text | Y | N | OWNER | e.g. `mtg_v1` |
| representation_level | int | Y | Y | OWNER | 1–4 |
| identity_status | text | Y | Y | OWNER | enum below |
| needs_review | bool | Y | Y | OWNER | Default false |
| needs_review_reasons | jsonb | N | Y | OWNER | Array of reason codes |
| display_name | text | Y | Y | OWNER | Human label |
| canonical_ref | jsonb | N | Y | OWNER | Adapter identity payload (printing ids, etc.) |
| condition_estimate | text | N | Y | OWNER | Adapter enum or null |
| condition_confidence | numeric | N | Y | OWNER | 0–1 |
| defects | jsonb | N | Y | OWNER | Structured defect list |
| sentimental_tags | jsonb | N | Y | OWNER | Non-monetary |
| utility_tags | jsonb | N | Y | OWNER | e.g. play-critical; non-monetary |
| acquisition | jsonb | N | Y | OWNER | source, date, notes, price_paid_cents |
| guest_claim_token_hash | text | N | Y | SYSTEM | For guest scan → claim |
| created_at | timestamptz | Y | N | SYSTEM | |
| updated_at | timestamptz | Y | Y | SYSTEM | |
| deleted_at | timestamptz | N | Y | SYSTEM | Soft delete |

**identity_status enum:** `unregistered` · `owned_unverified` · `owned_canonical` · `owned_physical_scan` · `owned_condition_verified` · `reverification`

**Indexes:** `(owner_user_id, deleted_at)`, `(household_id)`, `(category_id, needs_review)`, `(owner_user_id, identity_status)`, GIN on `canonical_ref` as needed by adapter queries.

**Immutable:** `id`, `created_at`. Category change forbidden without migration receipt.

**Delete:** Soft-delete Twin; cascade media access revoke; anonymize location; retain AuditEvent with twin_id tombstone.

---

## 2. category_adapters (registry config + runtime registration)

Canonical key: `adapter_id` text

| Field | Type | Req | Notes |
|---|---|---|---|
| adapter_id | text | Y | PK |
| category_id | text | Y | |
| version | text | Y | semver |
| capabilities | jsonb | Y | identify, price, condition_schema, fingerprint |
| certification_status | text | Y | `draft` · `certified` · `revoked` (V10) |
| ip_permission_required | bool | Y | For canonical imagery / rules |
| created_at | timestamptz | Y | |

---

## 3. media_evidence

Canonical key: `id` UUID

| Field | Type | Req | Mutable | Sensitivity |
|---|---|---|---|---|
| id | uuid | Y | N | OWNER |
| twin_id | uuid | Y | N | OWNER |
| kind | text | Y | N | OWNER | `source_photo` · `listing_crop` · `front` · `back` · `standardized` · `fingerprint_pack` · `reveal_frame` |
| storage_backend | text | Y | Y | SYSTEM | `postgres_bytea` · `r2` · `s3` |
| storage_key | text | Y | Y | SYSTEM | |
| content_type | text | Y | N | SYSTEM |
| byte_size | int | Y | N | SYSTEM |
| sha256 | text | Y | N | SYSTEM |
| width | int | N | N | SYSTEM |
| height | int | N | N | SYSTEM |
| capture_provenance | jsonb | Y | N | OWNER | device, time, uploader_user_id, batch_id |
| is_hero_candidate | bool | Y | Y | OWNER | Prefer actual photo as hero |
| created_at | timestamptz | Y | N | SYSTEM |
| deleted_at | timestamptz | N | Y | SYSTEM |

**Indexes:** `(twin_id, kind)`, `(sha256)` for forgery/dupe detection.

**Retention:** Deleted with Twin or on user media purge; hash may remain in audit for fraud investigation (SYSTEM).

---

## 4. price_evidence

Canonical key: `id` UUID  
One active row preferred; history retained.

| Field | Type | Req | Sensitivity |
|---|---|---|---|
| id | uuid | Y | SYSTEM |
| twin_id | uuid | Y | OWNER |
| currency | text | Y | OWNER |
| market_min_cents | int | N | OWNER |
| market_max_cents | int | N | OWNER |
| confidence | numeric | Y | OWNER | 0–1 |
| freshness_at | timestamptz | Y | OWNER |
| sources | jsonb | Y | OWNER | [{provider, ref, observed_at, raw}] |
| liquidity_value_cents | int | N | OWNER | Expected liquidatable |
| quick_sale_value_cents | int | N | OWNER | |
| expected_net_cents | int | N | OWNER | Tx-specific; V3+ |
| completeness_effect | jsonb | N | OWNER | V4+ |
| is_active | bool | Y | SYSTEM |
| created_at | timestamptz | Y | SYSTEM |

**Rule:** If confidence below adapter threshold OR printing unresolved → Twin `needs_review=true`; UI shows range or “unknown,” never fake point price.

---

## 5. ownership_records

Canonical key: `id` UUID  
Current owner: latest `ended_at IS NULL`.

| Field | Type | Req | Sensitivity |
|---|---|---|---|
| id | uuid | Y | OWNER |
| twin_id | uuid | Y | OWNER |
| owner_user_id | uuid | Y | OWNER |
| ownership_type | text | Y | OWNER | `sole` · `household` · `shared_fraction` |
| fraction_bps | int | N | OWNER | Basis points if shared |
| started_at | timestamptz | Y | OWNER |
| ended_at | timestamptz | N | OWNER |
| transfer_reason | text | N | OWNER | `purchase` · `gift` · `trade` · `claim` · `admin` |
| evidence_ref | jsonb | N | SYSTEM | |

**Law:** Possession/custody changes do not write ownership_records.

---

## 6. possession_records

| Field | Type | Req | Sensitivity |
|---|---|---|---|
| id | uuid | Y | OWNER / PARTNER_NEED_TO_KNOW |
| twin_id | uuid | Y | |
| possessor_type | text | Y | `user` · `partner` · `carrier` · `unknown` |
| possessor_id | uuid | N | |
| started_at | timestamptz | Y | |
| ended_at | timestamptz | N | |
| note | text | N | OWNER |

---

## 7. custody_records

| Field | Type | Req | Sensitivity |
|---|---|---|---|
| id | uuid | Y | OWNER / PARTNER_NEED_TO_KNOW |
| twin_id | uuid | Y | |
| custodian_partner_id | uuid | N | |
| custody_state | text | Y | See STATE_MACHINES Living Vault |
| contract_ref | text | N | |
| started_at | timestamptz | Y | |
| ended_at | timestamptz | N | |
| verification_evidence | jsonb | N | SYSTEM |

---

## 8. location_records

| Field | Type | Req | Sensitivity |
|---|---|---|---|
| id | uuid | Y | **FORBIDDEN_PUBLIC** |
| twin_id | uuid | Y | FORBIDDEN_PUBLIC |
| location_kind | text | Y | `binder` · `box` · `shelf` · `safe` · `partner_vault` · `in_transit` · `unknown` |
| label | text | Y | Owner-defined (“Binder 3 / page 12”) |
| structured | jsonb | N | Optional aisle/bin for partners |
| geo_precision | text | Y | `none` · `city` · `exact` — default `none` |
| geo | jsonb | N | Only if user opts; never to Reveal HUD |
| started_at | timestamptz | Y | |
| ended_at | timestamptz | N | |

**API law:** Location never included in OfferProjection, RevealHostProjection, public content, or ranking features.

---

## 9. liquidity_preferences

Canonical key: `twin_id` (1:1)

| Field | Type | Req | Sensitivity |
|---|---|---|---|
| twin_id | uuid | Y | OWNER |
| posture | text | Y | enum below |
| private_threshold_cents | int | N | **FORBIDDEN_PUBLIC** — owner only |
| currency | text | Y | |
| allow_invisible_listing | bool | Y | Default true when posture permits |
| updated_at | timestamptz | Y | |

**posture enum:** `never_sell` · `surprise_me` · `open_to_offers` · `private_threshold` · `actively_selling`

**Leak law:** `private_threshold_cents` never sent to buyers, hosts, partners, or ranking that could invert it.

---

## 10. offers

| Field | Type | Req | Sensitivity | Version |
|---|---|---|---|---|
| id | uuid | Y | PARTY | V1 schema / V2 behavior |
| twin_id | uuid | Y | PARTY | |
| buyer_user_id | uuid | Y | PARTY | |
| seller_user_id | uuid | Y | PARTY | |
| amount_cents | int | Y | PARTY | |
| currency | text | Y | PARTY | |
| state | text | Y | PARTY | STATE_MACHINES offer |
| quality_score | numeric | N | PARTY | V2 |
| message | text | N | PARTY | Spam-filtered |
| expires_at | timestamptz | N | PARTY | |
| created_at | timestamptz | Y | SYSTEM | |
| updated_at | timestamptz | Y | SYSTEM | |

**Indexes:** `(seller_user_id, state)`, `(buyer_user_id, state)`, `(twin_id, state)`.

---

## 11. wants

| Field | Type | Req | Version |
|---|---|---|---|
| id | uuid | Y | V2 |
| user_id | uuid | Y | |
| category_id | text | Y | |
| want_type | text | Y | `want` · `watch` · `love` · `need_for_deck` · `need_for_set` |
| target_ref | jsonb | Y | Identity query (name/set/printing/etc.) |
| max_bid_cents | int | N | OWNER secret |
| active | bool | Y | |
| created_at | timestamptz | Y | |

---

## 12. transactions

| Field | Type | Req | Sensitivity | Version |
|---|---|---|---|---|
| id | uuid | Y | PARTY | V3 |
| kind | text | Y | | `buy` · `sell` · `trade` |
| state | text | Y | | STATE_MACHINES transaction |
| buyer_user_id | uuid | N | PARTY | |
| seller_user_id | uuid | N | PARTY | |
| cash_balancing_cents | int | N | PARTY | |
| currency | text | Y | | |
| payment_provider | text | N | SYSTEM | Adapter name |
| payment_provider_ref | text | N | SYSTEM | External id — not domain identity |
| risk_tier | text | N | SYSTEM | |
| created_at / updated_at | timestamptz | Y | SYSTEM | |

### transaction_lines

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| transaction_id | uuid | Y |
| twin_id | uuid | Y |
| direction | text | Y | `to_buyer` · `to_seller` |
| declared_condition | text | N |

### transaction_passports

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| transaction_id | uuid | Y |
| evidence | jsonb | Y | Pre-ship photos, hashes, declarations |
| inspection_deadline_at | timestamptz | N |
| created_at | timestamptz | Y |

---

## 13. trust_capability_scores

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| subject_type | text | Y | `user` · `partner` |
| subject_id | uuid | Y |
| capability | text | Y | e.g. `seller_condition_accuracy`, `buyer_payment_completion`, `shipping_reliability`, `packaging_reliability`, `dispute_rate`, `return_behavior`, `high_value_history`, `self_disclosed_defects`, `partner_custody_accuracy`, `partner_inventory_accuracy`, `scan_accuracy`, `reveal_execution`, `event_execution` |
| score | numeric | Y | Calibrated 0–1 |
| evidence_count | int | Y |
| last_evidence_at | timestamptz | Y |
| updated_at | timestamptz | Y |

**Unique:** `(subject_type, subject_id, capability)`.

No single global five-star primary field.

---

## 14. partners

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| display_name | text | Y |
| legal_name | text | N |
| home_city | text | N |
| status | text | Y | `pending` · `active` · `suspended` · `left` |
| created_at | timestamptz | Y |

### partner_capabilities

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| partner_id | uuid | Y |
| capability | text | Y | `inventory_seller` · `scan_provider` · `reveal_provider` · `custody_provider` · `secure_exchange_point` · `fulfillment_provider` · `event_host` · `tournament_host` · `grading_handoff` · `authentication_provider` · `insurance_partner` · `lending_pawn_partner` |
| jurisdictions | jsonb | Y | Allowed regions |
| revenue_share_bps | int | N | Per capability |
| status | text | Y | `active` · `gated` · `revoked` |

---

## 15. inventory_items (V5)

| Field | Type | Req | Notes |
|---|---|---|---|
| id | uuid | Y | |
| partner_id | uuid | Y | |
| category_id | text | Y | |
| identity_ref | jsonb | Y | |
| quantity | int | Y | |
| condition | text | N | |
| price_cents | int | N | |
| sync_state | text | Y | `fresh` · `stale` · `error` |
| synced_at | timestamptz | Y | |
| origin_attribution | jsonb | N | Partner-origin |

**Failure:** sync error → `stale`/`error`; never invent availability.

---

## 16. events (V5+)

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| partner_id | uuid | N |
| event_type | text | Y | `tournament` · `release` · `trade_night` · `reveal` · `other` |
| title | text | Y |
| starts_at | timestamptz | Y |
| city | text | N |
| payload | jsonb | N |
| status | text | Y |

---

## 17. content_rights (V6+)

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| subject_type | text | Y | `twin` · `event` · `user` · `recording` |
| subject_id | uuid | Y |
| grantor_user_id | uuid | Y |
| scope | text | Y | `private` · `partner` · `network` · `public` |
| state | text | Y | `granted` · `revoked` · `takedown_pending` · `takedown_complete` |
| created_at / updated_at | timestamptz | Y |

---

## 18. play_entitlements

| Field | Type | Req | Version |
|---|---|---|---|
| id | uuid | Y | V1 stub |
| twin_id | uuid | Y | |
| user_id | uuid | Y | |
| eligibility | text | Y | `none` · `owner_eligible` · `borrowed_eligible` · `revoked` |
| physical_possession_required | bool | Y | Default false for vaulted play |
| evidence | jsonb | N | |
| created_at | timestamptz | Y | |

**Does not grant IP permission.**

---

## 19. ip_permission_grants

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| publisher_or_rights_holder | text | Y |
| scope | text | Y | e.g. `arena_adapter:mtg`, `canonical_imagery:mtg` |
| status | text | Y | `none` · `pending` · `granted` · `withdrawn` |
| jurisdictions | jsonb | N | |
| evidence_ref | text | N | |
| updated_at | timestamptz | Y | |

---

## 20. households / household_memberships

### households
| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| name | text | Y |
| created_by | uuid | Y |
| created_at | timestamptz | Y |

### household_memberships
| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| household_id | uuid | Y |
| user_id | uuid | Y |
| role | text | Y | `owner` · `member` · `viewer` |
| status | text | Y | `active` · `invited` · `revoked` |

**Conflict rule:** Ownership disputes escalate to household owner role; transfer requires owner approval. See adversarial sim #19.

---

## 21. audit_events

Append-only.

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| twin_id | uuid | N |
| actor_user_id | uuid | N |
| event_type | text | Y |
| payload | jsonb | Y |
| created_at | timestamptz | Y |

**Retention:** Long-lived; anonymize PII on account delete but keep fraud-relevant hashes/event_types.

---

## 22. notification_preferences

| Field | Type | Req |
|---|---|---|
| user_id | uuid | Y |
| quiet_mode | bool | Y | Default **true** |
| offer_alerts | text | Y | `off` · `digest` · `immediate` |
| marketing | bool | Y | Default false |
| updated_at | timestamptz | Y |

---

## 23. guest_scan_sessions (V1)

| Field | Type | Req |
|---|---|---|
| id | uuid | Y |
| token_hash | text | Y |
| twin_ids | uuid[] | Y |
| expires_at | timestamptz | Y |
| claimed_by_user_id | uuid | N |
| created_at | timestamptz | Y |

---

## Query patterns → indexes (required)

| Pattern | Index |
|---|---|
| Owner Vault browse | twins(owner_user_id) WHERE deleted_at IS NULL |
| Needs Review queue | twins(owner_user_id, needs_review) |
| Era Wall | adapter-specific generated columns or jsonb path + owner |
| Offer inbox | offers(seller_user_id, state, created_at DESC) |
| Want match (V2) | wants(active, category_id) + identity_ref strategy |
| Partner inventory | inventory_items(partner_id, sync_state) |
| Custody active | custody_records(twin_id) WHERE ended_at IS NULL |

---

## MTG adapter payload (`canonical_ref` shape) `[DERIVED]`

```json
{
  "name": "string",
  "set_code": "string|null",
  "set_name": "string|null",
  "collector_number": "string|null",
  "foil": "boolean|null",
  "scryfall_id": "uuid|null",
  "rarity": "string|null",
  "released_at": "date|null",
  "era": "string|null",
  "finish": "string|null",
  "language": "string|null"
}
```

Unresolved set/printing → `needs_review=true`, reason `printing_unresolved`.

---

## Builder manufacturing note

Migrations live under `db/migrations/` with date prefix when V1 ships. Table names above are canonical; Builders may prefix `collectibles_` if collision risk — if prefixed, update SCHEMA_CONTRACTS in same commit. Do not invent alternate entity semantics.
