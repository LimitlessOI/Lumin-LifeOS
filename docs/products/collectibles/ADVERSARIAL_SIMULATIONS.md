<!-- SYNOPSIS: Collectibles adversarial simulations — 30 required scenarios -->

# Collectibles — Adversarial Simulations

Each scenario specifies: prevention, detection, degradation, recovery, Reality proof.  
Builders must implement controls for scenarios in-scope for the version they ship (V1 column noted).

---

### 1. Wrong high-value printing
**Versions:** V1+  
**Prevention:** Dual-signal identity (name + set code + collector number); confidence thresholds; auto-accept only above threshold.  
**Detection:** Price outlier vs comps; user correction; Needs Review on unresolved set.  
**Degradation:** Flag needs_review; widen price range; hide from ACTIVE_SALE match.  
**Recovery:** Correction flow; reprice; audit.  
**Reality proof:** Fixture where set name≠code mis-resolve is rejected or needs_review; correction persists.

### 2. Confidently wrong condition
**Versions:** V1 foundation, V3 enforce  
**Prevention:** Condition confidence separate; never invent; self-declare encouraged.  
**Detection:** Buyer dispute; photo mismatch; partner scan delta.  
**Degradation:** Lower seller_condition_accuracy; require passport photos on risk_tier.  
**Recovery:** Dispute evidence state; refund/return path.  
**Reality proof:** High-confidence false condition cannot auto-clear inspection without evidence.

### 3. Seller hides damage
**Versions:** V3+  
**Prevention:** Pre-ship passport; defect disclosure UI; trust reward for self-disclosure.  
**Detection:** Inspection window; return fingerprint.  
**Degradation:** Dispute_open; trust penalty heavier than self-disclose path.  
**Recovery:** Return_verified / refund.  
**Reality proof:** Undisclosed damage path vs disclosed path produces different trust deltas.

### 4. Buyer return substitution
**Versions:** V3/V6 fingerprint  
**Prevention:** Pre-ship media hash/fingerprint pack for risk_tier high.  
**Detection:** Return consistency check fail.  
**Degradation:** Freeze release of funds; DISPUTED.  
**Recovery:** Adjudication with evidence; fraud flag.  
**Reality proof:** Different card hash on return blocks auto-refund completion.

### 5. Forged / scammed photos
**Versions:** V1+  
**Prevention:** Capture provenance; sha256; optional replay/device signals later.  
**Detection:** Duplicate hash across accounts; reverse-image heuristics (horizon); impossible metadata.  
**Degradation:** needs_review; block actively_selling until verified.  
**Recovery:** Manual verify / delete.  
**Reality proof:** Known stock-image hash fixture flagged.

### 6. Manipulated thin-market comps
**Versions:** V1/V4  
**Prevention:** Multi-source PriceEvidence; confidence↓ on thin samples; range not point.  
**Detection:** Source disagreement; freshness; outlier filter.  
**Degradation:** needs_review; suppress Sell Agent max-net aggression.  
**Recovery:** Manual price lock / exclude bad source.  
**Reality proof:** Single outlier comp does not collapse range to fake precision.

### 7. Wash transactions to inflate trust
**Versions:** V3+  
**Prevention:** Trust graph velocity; counterparty diversity; payment settlement required.  
**Detection:** Circular trade detector; repeated pairs.  
**Degradation:** trust_anomaly freeze; no friction reduction.  
**Recovery:** Manual review; score rollback.  
**Reality proof:** Synthetic wash loop does not increase unlockable trust.

### 8. Offer spam
**Versions:** V2+  
**Prevention:** Rate limits; quality score; quiet mode digests; block lists.  
**Detection:** Burst offers; copy-paste messages; low quality.  
**Degradation:** Throttle buyer; chronological fallback if scorer down.  
**Recovery:** Seller bulk decline; spam strike.  
**Reality proof:** >N offers/minute rejected with stable error.

### 9. Leaked private reservation price
**Versions:** V1 schema / V2 match  
**Prevention:** Threshold only in owner projection; server-side compare; no buyer echo; ranking cannot sort by distance-to-threshold.  
**Detection:** API contract tests; log redaction checks.  
**Degradation:** If leak detected, rotate and alert owner.  
**Recovery:** Patch + audit incident.  
**Reality proof:** Buyer API responses never contain private_threshold_cents; proximity sort test fails closed.

### 10. Leaked physical location
**Versions:** V1+  
**Prevention:** Location FORBIDDEN_PUBLIC; projection filters; partner bin ≠ home.  
**Detection:** Response schema scanners in tests.  
**Degradation:** Strip field; incident.  
**Recovery:** Force relabel; notify owner.  
**Reality proof:** Offer/Reveal/public endpoints omit location fields.

### 11. Compromised partner account
**Versions:** V5+  
**Prevention:** 2FA/KYC for partners; least-privilege capabilities; session anomaly.  
**Detection:** Unusual sync, checkout spikes, inventory wipe.  
**Degradation:** Suspend partner; freeze custody checkouts.  
**Recovery:** Credential rotate; inventory resync; custody audit.  
**Reality proof:** Suspended partner cannot check out Twins.

### 12. False inventory availability
**Versions:** V5+  
**Prevention:** sync_state; TTL freshness; reservation holds.  
**Detection:** Purchase fail vs listed qty; mystery checks.  
**Degradation:** Mark stale/error; remove from best route.  
**Recovery:** Resync; partner_inventory_accuracy penalty.  
**Reality proof:** stale inventory not sold as fresh without warning.

### 13. Partner loses item in custody
**Versions:** V6+  
**Prevention:** Check-in verification; bin labels; dual control for high-value.  
**Detection:** Failed check-out verify; LOST state.  
**Degradation:** Freeze related offers; insurance package path.  
**Recovery:** LOST protocol; compensation via partner policy; ownership remains until settled claim.  
**Reality proof:** Missing scan at checkout → cannot silently complete EVENT_USE return as VAULTED.

### 14. Item damaged during checkout/event
**Versions:** V6/V8  
**Prevention:** Condition passport at check-out and return.  
**Detection:** Delta in condition evidence.  
**Degradation:** DAMAGED/DISPUTED; partner reputation hit.  
**Recovery:** Document; settle per custody contract.  
**Reality proof:** Condition delta forces REVERIFICATION.

### 15. Carrier damage/loss
**Versions:** V3+  
**Prevention:** Risk router insurance; tracking; packaging guidance.  
**Detection:** Carrier exception codes; buyer report.  
**Degradation:** DISPUTE_OPEN / claim path; funds held.  
**Recovery:** Insurance adapter; refund/replace policy.  
**Reality proof:** Delivered=false + exception does not auto-COMPLETE.

### 16. Payment / settlement outage
**Versions:** V3+  
**Prevention:** Idempotent adapter calls; clear non-terminal states.  
**Detection:** Webhook timeout; provider status.  
**Degradation:** PROVIDER_OUTAGE_BLOCKED; honest UI.  
**Recovery:** Resume on webhook; reconcile job.  
**Reality proof:** Outage fixture never yields COMPLETED.

### 17. Dispute with ambiguous evidence
**Versions:** V3+  
**Prevention:** Passport requirements by risk_tier.  
**Detection:** Dispute_open with incomplete packs.  
**Degradation:** Extend hold; human adjudication queue.  
**Recovery:** Evidence-based resolution states only.  
**Reality proof:** Ambiguous case cannot auto-favor either party.

### 18. User deletes account during active transaction
**Versions:** V3+  
**Prevention:** Delete blocked while non-terminal tx; anonymize only after terminal.  
**Detection:** Delete attempt API.  
**Degradation:** 409 `active_transaction`.  
**Recovery:** Complete/cancel then delete.  
**Reality proof:** Delete endpoint rejects with active SHIPPED tx.

### 19. Household ownership conflict
**Versions:** V1+  
**Prevention:** Roles owner/member/viewer; transfer requires owner.  
**Detection:** Concurrent transfer attempts.  
**Degradation:** Lock twin; DISPUTED if both claim sole.  
**Recovery:** Owner arbitration; audit.  
**Reality proof:** Viewer cannot sell; member cannot remove owner.

### 20. Custody possession confused with ownership
**Versions:** V1 schema / V6 ops  
**Prevention:** Separate tables; API forbids ownership write on check-in.  
**Detection:** Invariant tests.  
**Degradation:** Reject illegal transition.  
**Recovery:** N/A — prevent.  
**Reality proof:** check-in does not change ownership_records.

### 21. Arena entitlement treated as IP permission
**Versions:** V7  
**Prevention:** Separate entities; session requires both when needed.  
**Detection:** Adapter without grant rejected.  
**Degradation:** 403 `ip_permission_required`.  
**Recovery:** Obtain grant or use lawful test game.  
**Reality proof:** owner_eligible + ip none → session denied for protected adapter.

### 22. Game publisher withdraws permission
**Versions:** V7  
**Prevention:** Grant status checks each session start.  
**Detection:** Grant → withdrawn webhook/admin.  
**Degradation:** Disable adapter; active sessions gracefully end.  
**Recovery:** Twins intact; entitlement history retained.  
**Reality proof:** Withdrawal stops new sessions within one check cycle.

### 23. Prize tournament crosses jurisdictional restriction
**Versions:** V8  
**Prevention:** Jurisdiction gate on prize framework.  
**Detection:** Geo/partner jurisdiction mismatch.  
**Degradation:** Event create rejected or prize disabled.  
**Recovery:** Convert to non-prize or move jurisdiction.  
**Reality proof:** Restricted region cannot enable prize pool.

### 24. Licensed lending partner unavailable in state
**Versions:** V9  
**Prevention:** Jurisdiction filter on lending_pawn_partner.  
**Detection:** Route request in unsupported state.  
**Degradation:** Honest unavailable; no fake lender.  
**Recovery:** Show other asset services if any.  
**Reality proof:** Unsupported state returns empty lending routes without 500.

### 25. Category adapter identifies wrong collectible class
**Versions:** V1/V10  
**Prevention:** Adapter category_id hard bound; cross-class confidence penalties.  
**Detection:** User correction; schema validation fail.  
**Degradation:** needs_review; block commerce.  
**Recovery:** Re-identify with correct adapter.  
**Reality proof:** MTG adapter rejects clear non-card fixture as needs_review/fail.

### 26. 100k / 1m / 10m object scaling
**Versions:** V1 design / V10 ops  
**Prevention:** Indexed queries; cursor pagination; media externalization; batch jobs.  
**Detection:** Slow query telemetry; timeout budgets.  
**Degradation:** Defer reprice; queue vision.  
**Recovery:** Shard media; read replicas if needed later.  
**Reality proof:** Vault list p95 budget documented; load test harness for 100k/owner before V10.

### 27. External marketplace API disappears
**Versions:** V4+  
**Prevention:** Multi-venue adapters; internal inventory first.  
**Detection:** Provider errors.  
**Degradation:** Remove venue from recommendations; keep others.  
**Recovery:** Replace adapter.  
**Reality proof:** Dead venue does not empty all recommendations.

### 28. Local store partner leaves network
**Versions:** V5/V6  
**Prevention:** Leave protocol; capability revoke.  
**Detection:** Partner status=left.  
**Degradation:** Hide inventory; custody RETURN_PENDING.  
**Recovery:** Owner retrieve; attribution freeze.  
**Reality proof:** Left partner inventory excluded from discover/local.

### 29. Content consent revoked after clips distributed
**Versions:** V6/V8  
**Prevention:** ContentRights on publish; store distribution log.  
**Detection:** Revoke request.  
**Degradation:** takedown_pending; stop new distributes; best-effort pull.  
**Recovery:** takedown_complete receipt; partner SLA.  
**Reality proof:** Revoke blocks new publishes; logged distributions queued.

### 30. High-value owner targeted due to privacy leak
**Versions:** V1+  
**Prevention:** Projection laws; no public high-value lists; Quiet Mode; HUD filter.  
**Detection:** Security review; anomaly access logs.  
**Degradation:** Emergency privacy lockdown flag on account.  
**Recovery:** Incident response; rotate URLs; counsel.  
**Reality proof:** No API returns “top valuable items” publicly; host HUD redaction test.

---

## Version coverage map

| Version | Must-pass sims before production claim |
|---|---|
| V1 | 1, 5, 6, 9, 10, 19, 20, 25, 30 (+ scaling awareness) |
| V2 | +8, 9 |
| V3 | +2–4, 7, 15–18 |
| V5 | +11, 12, 28 |
| V6 | +13, 14, 29 |
| V7 | +21, 22 |
| V8 | +23 |
| V9 | +24 |
| V10 | +26, 27, category pack certification |
