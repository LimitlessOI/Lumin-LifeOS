<!-- SYNOPSIS: Salvage review checklist — PRODUCT-CONVERSATION-COMMITMENTS-C2-0001 -->

# Salvage review checklist — PRODUCT-CONVERSATION-COMMITMENTS-C2-0001

**Required before BPB writes BLUEPRINT.json.**

BPB must produce `SALVAGE_REVIEW.json` in this folder. No silent reuse of legacy code.

---

## Classification buckets

| Bucket | Meaning |
|--------|---------|
| **KEEP** | Reuse as-is with receipt |
| **ADAPT** | Real value; rewire under new authority / evidence model |
| **REFERENCE** | Read for behavior; do not mount unchanged |
| **ARCHIVE** | Historian only; do not extend |
| **REJECT** | Do not carry forward |

Every row: `path`, `bucket`, `reason`, `risk_if_wrong`, `evidence_required`.

---

## Mandatory inspection list

### C2 / Command Center
- [ ] `routes/lifeos-command-center-routes.js`
- [ ] `routes/command-center-routes.js` (legacy spine)
- [ ] `services/command-center-communication-service.js`
- [ ] `services/builderos-command-control-service.js`
- [ ] `public/overlay/lifeos-command-center.html`
- [ ] `docs/C2_CANONICAL_DEFINITION.md`

### Commitments
- [ ] `services/commitment-detector.js`
- [ ] `services/commitment-tracker.js`
- [ ] `services/lifeos-commitment-tracker.js`
- [ ] `routes/lifeos-commitment-routes.js`
- [ ] `db/migrations/*commitment*`
- [ ] `public/commitments/dashboard.html`

### Conversation → events
- [ ] `services/lifeos-event-stream.js`
- [ ] Twin / ingest paths referenced in AMENDMENT_21

### Calendar
- [ ] `services/lifeos-calendar.js`
- [ ] `services/google-calendar-service.js`
- [ ] `services/lifeos-calendar-events-resolver.js`
- [ ] `db/migrations/20260417_lifeos_calendar.sql`

### Tasks / MITs
- [ ] `daily_mits` / scorecard / today overlay surfaces
- [ ] AMENDMENT_21 commitment desk backlog items

### Memory (product only)
- [ ] Capsule / conversation history routes
- [ ] Confirm **not** treated as BuilderOS maturity proof

### Council / TSOS
- [ ] `services/council-service.js`
- [ ] `config/task-model-routing.js`
- [ ] TSOS metrics hooks for mission-attributed calls

### Household / Sherry
- [ ] `shared_commitments`, `services/data-sovereignty.js`
- [ ] Consent / private / shared boundary patterns

---

## Gate

```text
SALVAGE_REVIEW.json complete
  → Product Development re-check
  → BPB intake (strict_upstream_gates when enabled)
  → Blueprint steps
```

**Empty salvage review = BLOCKED_RETURN_TO_BPB.**
