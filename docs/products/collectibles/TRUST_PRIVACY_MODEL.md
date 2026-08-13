<!-- SYNOPSIS: Collectibles trust and privacy model -->

# Collectibles — Trust & Privacy Model

## 1. Privacy law `[FOUNDER]`

Default: **minimum necessary exposure**.

### 1.1 Never expose by default

| Data | Forbidden recipients without explicit necessity + permission |
|---|---|
| Home address | Buyers, hosts, public, ranking |
| Physical storage location (Binder GPS) | Buyers, hosts, public, ranking, unrelated partners |
| Collection total value / size | Hosts, public, ranking |
| Private reservation threshold | Buyers, hosts, public, partners, ranking (incl. indirect inversion) |
| High-value ownership signals | Host HUD, public content, discovery feeds |

### 1.2 Projection matrix

| Projection | Allowed |
|---|---|
| VaultProjection (owner) | Full owner fields including location + threshold |
| OfferProjection (buyer) | Twin identity summary, condition declaration, media allowed by seller, posture class without threshold |
| RevealHostProjection | Session objects only; no binder labels, no totals, no thresholds, no home address |
| CustodyPartnerProjection | Twin id, identity needed for handling, custody state, partner bin location — not owner home |
| PublicContentProjection | Only ContentRights-granted assets |
| ArenaProjection | Entitlement + neutral game object state — not home location |

### 1.3 Anonymous / existence proofs `[HORIZON]` with V1 hook

V7+ may introduce existence proofs (“eligible to play X”) without revealing full collection. V1 reserves no public collection endpoints.

### 1.4 Quiet Mode

Default `quiet_mode=true`. Notifications prefer digest. No engagement optimization on portfolio movement.

### 1.5 Export / delete

Users can export their data and delete Collectibles data. Active non-terminal transactions block hard delete until resolved (user may cancel where policy allows).

---

## 2. Trust architecture `[FOUNDER]` / `[DERIVED]`

### 2.1 Not a global star rating

Primary trust is **capability-specific** via `trust_capability_scores`.

### 2.2 Tracked capabilities (minimum)

| Capability | Subject |
|---|---|
| seller_condition_accuracy | user |
| buyer_payment_completion | user |
| shipping_reliability | user |
| packaging_reliability | user |
| dispute_rate_adjudicated | user |
| return_behavior | user |
| high_value_transaction_history | user |
| self_disclosed_defects | user |
| partner_custody_accuracy | partner |
| partner_inventory_accuracy | partner |
| scan_accuracy | partner |
| reveal_execution | partner |
| event_execution | partner |

### 2.3 Evidence rules

- Trust unlocks reduced friction only when Reality evidence supports it (count + recency thresholds).
- **Self-disclosed defects** before handoff improve `self_disclosed_defects` and soften penalties vs defects discovered only after handoff.
- Adjudicated dispute causes update scores; open disputes do not silently inflate trust.

### 2.4 Fraudulent trust manipulation `[DERIVED]`

Modeled attacks: wash trades, fake shipments, sockpuppet reviews, coordinated accept/decline loops.

**Controls:**
- Graph signals: repeated counterparties, circular trades, velocity caps.
- Require payment adapter settlement for trust-positive completion events.
- Weight high-value and first-time stranger trades differently.
- Partner inventory accuracy checked against mystery-shop / sync diffs.
- Explicit `trust_anomaly` audit events; freeze trust unlocks on anomaly.

---

## 3. Security baseline `[DERIVED]`

- Authn via LifeOS; Authz per twin ownership/household/party/partner role.
- Media URLs signed or auth-gated; not world-readable by default.
- Rate-limit offers (spam), capture, and guest claim.
- Partner accounts: least privilege per capability; compromise playbook in ADVERSARIAL #11.
- Secrets never in Twin payloads.

---

## 4. Honesty in valuation

PriceEvidence must show range + confidence + freshness. UI copy must not imply appraisal license. Emotional/sentimental tags never feed monetary fields.
