# Founder Packet — SENTRY Regression Harness (Deliberation v2.7)

**Mission:** `FACTORY-DELIBERATION-SENTRY-REGRESSION-0001`  
**Status:** FP complete — **BPB may start** (BLUEPRINT.json not yet written)  
**Parent:** `FACTORY-DELIBERATION-V27-0001` (SNT_LIVE_PASS)  
**Adam touches during build:** **0**

---

## Synopsis

This is the **first BuilderOS spin test**: turn known SENTRY defects into a **machine regression pack**, not a feature. BPB reads this FP + `REGRESSION_PROBE_CATALOG.json` and emits a **BLUEPRINT only**. SENTRY audits the BP. A low-tier coder implements. Then we run local + Railway.

---

## Why this test (not a feature)

| Feature test | Regression harness |
|--------------|-------------------|
| Can look green while validators drift | Each probe maps to a **named live failure** |
| Builder makes product calls | Builder **translates catalog → files + commands** |
| Hard to replay | Same commands, same exit codes, receipt JSON |

**Pass claim:** BuilderOS can take precise defect reports → deterministic acceptance → coder handoff **without founder decisions**.

---

## Locked sequence

```text
1. BPB  → BLUEPRINT.json (harness only)     ← YOU ARE HERE
2. SNT  → audit BP (use SENTRY review prompts)
3. CDR  → implement frozen steps only
4. SNT  → npm run lifeos:deliberation:regression (local + live)
5. THEN → separate repair mission if negative control fails
```

**Do not** edit `config/deliberation-governance.js` or `services/deliberation-governance-service.js` in this mission.

---

## Probes (authoritative IDs)

Catalog machine file: `REGRESSION_PROBE_CATALOG.json`

| ID | What must never pass silently again |
|----|-------------------------------------|
| **B_NO_ROSTER_GATE** | Gate pass without roster → `ROSTER_MISSING` |
| **B_LB_METADATA** | `load_bearing` persists in gate `metadata_json` |
| **N5** | Failed load-bearing gate cannot downgrade to easy pass |
| **N1** | Negative CFO `tokens` / `cost_usd` rejected |
| **N2** | Invalid `future_back_horizons` (e.g. `100y`) rejected |
| **N3** | Negative `vote_counts` rejected |
| **N6b** | Roster expand cannot wipe prior expand when field omitted |
| **N11** | Negative scorecard metrics rejected |
| **CLEANUP_DB_FINGERPRINT** | Cleanup script proves local `DATABASE_URL` = Railway store |

**Existing partial coverage:** `scripts/deliberation-governance-behavior.mjs`, `scripts/deliberation-snt-live-verify.mjs`, `scripts/deliberation-sentry-probe-cleanup.mjs` — harness **consolidates**, does not replace until parity receipt.

---

## BPB deliverable contract (BLUEPRINT must specify)

### Files (exact paths)

| File | Owner step |
|------|------------|
| `scripts/deliberation-sentry-regression-harness.mjs` | H01 |
| `builderos-reboot/MISSIONS/.../REGRESSION_RUN_RECEIPT.schema.json` | H02 |
| `builderos-reboot/MISSIONS/.../ACCEPTANCE_TESTS.json` | H03 |
| `package.json` → `"lifeos:deliberation:regression"` | H03 |
| Mission `README.md` runbook update | H05 |

### Commands (exact — BP must copy verbatim)

```bash
npm run lifeos:deliberation:regression
npm run lifeos:deliberation:regression -- --layer=local
npm run lifeos:deliberation:regression -- --layer=live
node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --verify-railway
node builderos-reboot/scripts/run-mission-acceptance.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001
```

### Expected outcomes

- **Local layer:** exit **0** on current `main` (validators already fixed in v2.7 mission).
- **Live layer:** exit **0** when `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY` set (same as SNT live).
- **Missing live env:** exit **1** with receipt reason `LIVE_LAYER_SKIPPED_FAIL_CLOSED` — not silent 0.
- **Receipt:** `REGRESSION_RUN_RESULT.json` with one row per probe id + pass/fail + detail.

### Determinism

Two local runs in a row → identical pass/fail set (session_id prefixes may differ).

---

## Pass criteria for BuilderOS (this mission)

- [ ] BP lists every probe ID from catalog  
- [ ] BP lists exact files, commands, exit codes  
- [ ] No founder decision points in BP steps  
- [ ] SENTRY BP audit PASS before CDR executes  
- [ ] Coder implements without interpreting product  
- [ ] Harness fails before fix / passes after (negative control step optional H07 in BP)  

---

## Non-goals

- New deliberation features  
- Validator/service edits  
- Neon DELETE without `--confirm`  
- Claiming full BuilderOS alpha from harness alone  

---

## Observe in real time

See **`OBSERVE.md`** in this mission folder.

---

## References

- `FOUNDER_PACKET.json` — machine intake for BPB  
- `PRODUCT_DEVELOPMENT_RESULT.json` — PD gate PASS  
- `REGRESSION_PROBE_CATALOG.json` — probe definitions  
- `../FACTORY-DELIBERATION-V27-0001/SNT_LIVE_VERIFY.json` — live baseline  
