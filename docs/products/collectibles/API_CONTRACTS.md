<!-- SYNOPSIS: Collectibles domain API contracts -->

# Collectibles — API Contracts

**Base path (canonical):** `/api/v1/collectibles`  
**Auth:** LifeOS authenticated session / Bearer / command-key patterns already used by LifeOS — reuse; do not invent parallel auth.  
**Ids:** Domain UUIDs only. Provider refs appear only inside adapter envelopes.  
**Errors:** `{ "ok": false, "error_code": "...", "message": "..." }` fail-closed.  
**Version:** `collectibles.v1` — additive fields preferred.

Projections must enforce privacy from TRUST_PRIVACY_MODEL. Location and private thresholds never appear on buyer/public/host endpoints.

---

## 1. Twin lifecycle

### POST `/twins/capture`
Multipart photo batch or JSON import.

**Input:** files[] and/or `import_rows[]`; optional `household_id`, `acquisition`, `guest_session_id`.

**Behavior:**
1. Persist MediaEvidence.
2. Call CategoryAdapter.identify.
3. Create CollectibleTwin per physical object face/row.
4. Attach PriceEvidence when possible.
5. Set `needs_review` when confidence low or printing unresolved.
6. Default liquidity posture: `surprise_me` (Quiet Mode); never auto-list.

**Output:** `{ batch_id, twins: [...], needs_review_count }`

**Fallback:** Identify fail → Twin with `identity_status=owned_unverified`, `needs_review=true`.

### GET `/twins`
Owner Vault list. Query: `q`, `needs_review`, `category_id`, `era`, cursor pagination.

**Output:** Image-led cards: hero media url, display_name, price range summary, needs_review flag. No spreadsheet-only default.

### GET `/twins/:id`
Twin Dossier (owner projection): identity, media, condition, price evidence, location abstract (owner only), liquidity preference (owner), possession/custody summary, play_entitlement stub.

### PATCH `/twins/:id`
Corrections: identity fields (via adapter validate), condition, defects, sentimental/utility tags, acquisition, display_name.

**Behavior:** Write AuditEvent; may clear/set needs_review; may refresh PriceEvidence.

### POST `/twins/:id/reprice`
Refresh PriceEvidence without re-identify (adapter price lookup).

### DELETE `/twins/:id`
Soft-delete; revoke media URLs; audit.

---

## 2. Media

### GET `/media/:id`
Authz: owner, or party to active transaction, or partner need-to-know with custody. Not public by default.

### POST `/twins/:id/media`
Add photos (front/back/standardized). May upgrade `representation_level`.

---

## 3. Needs Review

### GET `/review-queue`
Owner’s Twins where `needs_review=true`, sorted by created_at.

### POST `/twins/:id/review/resolve`
Body: correction payload or `confirm_as_is`.

---

## 4. Location (Binder GPS)

### PUT `/twins/:id/location`
Body: `location_kind`, `label`, optional structured. `geo` only if explicit opt-in.

**Forbidden:** Including location in any offer/public/reveal response.

---

## 5. Liquidity

### PUT `/twins/:id/liquidity`
Body: posture + optional `private_threshold_cents`.

**Validation:** `private_threshold` posture requires threshold > 0. Threshold never echoed to non-owner.

### GET `/twins/:id/liquidity`
Owner only (full). Buyer-facing endpoints return only posture class without threshold (e.g. `open_to_offers`).

---

## 6. Household / guest claim

### POST `/households`
### POST `/households/:id/members`
### POST `/guest-sessions` → returns claim token (once)
### POST `/guest-sessions/:token/claim` (auth required) → attaches twins to user

---

## 7. Export / privacy / delete

### GET `/export`
Machine-readable export of owner Twins + media refs + corrections + liquidity (including thresholds for owner).

### GET `/privacy`
### PUT `/privacy` — quiet_mode, offer_alerts, marketing

### POST `/account/delete-collectibles`
Deletes/anonymizes Collectibles data per SCHEMA retention; blocks if active V3+ transactions in non-terminal state (must complete/cancel first).

---

## 8. Offers (V2 behavior; V1 schema may exist)

### POST `/offers`
Buyer creates offer against twin visible via Invisible Listing rules.

**Authz:** Twin posture must allow offers; never_sell rejects.

**Privacy:** Server evaluates private_threshold without revealing it. Response to buyer: accepted into inbox / below-threshold soft reject without numeric threshold.

### GET `/offers/inbox` — seller
### POST `/offers/:id/counter|accept|decline|withdraw`
### GET `/offers/:id` — party only

Offer quality score computed server-side; if scorer down → chronological inbox.

---

## 9. Wants (V2)

### POST `/wants`
### GET `/wants`
### DELETE `/wants/:id`
### POST `/broker/search` — internal abstraction; external adapters optional; on external fail return internal-only.

---

## 10. Transactions (V3)

### POST `/transactions`
Creates Transaction + lines; does not move funds until payment adapter confirms hold.

### POST `/transactions/:id/payment/start` → adapter session
### POST `/transactions/:id/ship` — tracking via carrier adapter
### POST `/transactions/:id/inspect/accept|dispute`
### POST `/transactions/:id/passport` — evidence upload

**Settlement law:** Domain state transitions only after adapter webhooks/verification. Payment outage → leave state non-settled; never pretend.

---

## 11. Partners / inventory / events (V5+)

### POST `/partners` (admin/onboarding)
### PUT `/partners/:id/capabilities`
### POST `/partners/:id/inventory/sync`
### GET `/discover/local` — city inventory + events; sponsored clearly labeled `placement_type=sponsored` vs `placement_type=best`

**Hard rule:** Sponsored results cannot be labeled or sorted as best recommendation without distinct UI channel.

---

## 12. Custody / Living Vault (V6)

### POST `/custody/check-in|check-out|visit|ship-to-owner`
State machine enforced. Ownership unchanged.

### GET `/twins/:id/custody-ledger` — owner; partner sees need-to-know slice only.

---

## 13. Reveal / content (V6)

### POST `/reveal/sessions`
### GET `/reveal/host-hud/:sessionId` — **strict filter:** no home address, no binder location, no collection totals, no private thresholds, no unrelated high-value inventory.

### POST `/content-rights`
### POST `/content-rights/:id/revoke`

---

## 14. Arena (V7)

### GET `/play/entitlements`
### POST `/arena/sessions` — requires PlayEntitlement AND IpPermissionGrant for adapter scope; else 403 `ip_permission_required` or `entitlement_missing` distinctly.

---

## 15. Asset services (V9)

### POST `/asset-packages/insurance|collateral|grading-handoff`
Produces packages for partners; no lending execution inside Teloa.

---

## CategoryAdapter interface (internal contract) `[DERIVED]`

```ts
interface CategoryAdapter {
  adapter_id: string;
  category_id: string;
  identify(media: MediaInput): Promise<IdentifyResult>; // candidates[], confidence, needs_review_reasons
  resolveIdentity(correction: IdentityCorrection): Promise<CanonicalRef>;
  price(canonical_ref: CanonicalRef, condition?: string): Promise<PriceEvidenceDraft>;
  conditionSchema(): JsonSchema;
  // optional later:
  fingerprint?(media: MediaInput): Promise<FingerprintDraft>;
}
```

MTG adapter ports existing `mtg-card-vision` + `mtg-card-pricing` behavior behind this interface.

---

## External adapter envelopes

All external providers wrapped:

```json
{
  "provider": "stripe_connect|shippo|mux|psa|...",
  "external_ref": "string",
  "status": "string",
  "payload": {}
}
```

Domain entities store `provider` + `external_ref` columns — never use external_ref as Twin id.

---

## Telemetry events (useful outcomes)

Emit: `digitization_completed`, `correction_made`, `needs_review_resolved`, `offer_received`, `offer_accepted`, `transaction_settled`, `custody_verified`, `location_updated` (owner-only analytics).

Do not optimize for: session time, notification opens, feed scroll depth.
