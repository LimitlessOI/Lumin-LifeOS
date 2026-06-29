<!-- SYNOPSIS: Founder Packet — Chair FP V2 Live Enforcement (audit) -->

# Founder Packet — Chair FP V2 Live Enforcement

**Mission ID:** `CHAIR-FP-V2-LIVE-0001`  
**Locked:** 2026-06-22  
**Authority:** `docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md`  
**Operator lock:** Adam — Lumin Chair must follow Founder Packet V2 by force, not prompt. Voice Rail scrapped; salvage only.

---

## Priority

**P0 factory** — first implementation target from Founder Packet V2: *Chair + IDC + ARC Intake Loop v1* applied to the **live founder front door**.

---

## Problem

Founder Packet V2 already defined Chair as oracle, strategic simulator, and scoreboard holder — but live Lumin Chair was mostly prompt theater. Duplicate JSON doctrine did not enforce. Voice Rail remained ranked #1 while scrapped in practice. Execute paths could run without intent clarity, forecast receipts, or Chair offers.

---

## Desired outcome

When Adam talks to Lumin Chair, the system **cannot** listen-only, **cannot** execute without understood intent, **must** write forecast receipts and file scorable predictions, and **must** block false PASS. Voice Rail is clearly **scrapped** with salvage pieces named — not active queue work.

---

## FOUNDER SUCCESS TEST

**Adam sends a vague build ask → Chair clarifies with ideas/gaps + future look-back and does NOT run code. Adam confirms → Chair executes and shows honest receipt (SHA or honest FAIL). Adam never sees instant PASS theater on Point B / LifeRE Alpha without founder usability confirmed.**

---

## Constraints

- Supreme law: `docs/constitution/NORTH_STAR_SSOT.md` wins on conflict until amended
- Founder Packet V2 is Chair strategic law — no parallel duplicate doctrine as authority
- Voice Rail program **scrapped** — STT/TTS/wake-word salvage into Chair only; no standalone product revival
- Results are the scoreboard — process PASS never substitutes for founder intent reached
- Predicted Adam never overrides Actual Adam

---

## Acceptance command

```bash
npm run builder:preflight
node --test tests/chair-founder-packet-v2-enforcement.test.js tests/lumin-chair-orchestrator.test.js tests/chair-truth-gate.test.js
node scripts/verify-chair-fp-v2-enforcement.mjs
npm run lifeos:bp-priority:verify
```

---

## PASS criteria

### Technical PASS

- All commands above exit **0**
- `CHAIR_FP_V2_LIVE` gate present in `builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json`
- Live turn writes `data/chair-live/CHAIR_FORECAST_SIMULATION_RECEIPT.json` + `INTENT_COVERAGE_MAP.json`
- Execute channels blocked with `BLOCKED_CHAIR_FP_V2` when intent unclear
- Voice Rail in `BP_PRIORITY.scrapped_items` only — not in active `items[]`
- `SALVAGE_MANIFEST.json` exists for Voice Rail

### Founder usability PASS

- Adam validates live on production Chair URL after deploy: clarify → confirm → build → honest outcome
- LifeRE Point B remains **not** PASS until Adam confirms usability (`founder_usability_pass: true`)

**Both required:** yes (technical before deploy proof; founder after Adam uses it)

---

## Out of scope

- Full IDC → Pre-ARC → ARC mission pipeline on every chat turn (factory path stays separate)
- Reviving Voice Rail overlay as product surface
- Automated Hist scoring loop closing every prediction without resolve date (ADF filed; scoring is post-hoc)
- Constitutional amendments to NSSOT

---

## Founder touches

- **Approve before execute** when intent ambiguous (Chair asks first)
- **Alert on UNSOLVED** if deploy SHA missing after build claim
- **Adam confirms** LifeRE Alpha / Point B usability — machine cannot self-certify

---

## Audit checklist (for reviewers)

Attack these — do not praise:

| # | Claim | How to falsify |
|---|--------|----------------|
| 1 | FP V2 enforced on live Chair | Send vague build to founder-interface → must get `intent_clarify` + strategic offers, no job/SHA |
| 2 | Execute hard-blocked | Force `build_async` without confirm → `BLOCKED_CHAIR_FP_V2` or clarify |
| 3 | Forecast receipt canonical | Inspect `data/chair-live/CHAIR_FORECAST_SIMULATION_RECEIPT.json` — schema `chair_forecast_simulation_v1` |
| 4 | Predictions scorable | Inspect `data/adf-predictions/` for new rows after Chair turn |
| 5 | Truth gate honest | Mission pipeline / receipt scan cannot claim founder Point B PASS |
| 6 | Voice Rail scrapped | `BP_PRIORITY` rank 1 is NOT Voice Rail; scrapped_items has salvage manifest |
| 7 | No duplicate law | `CHAIR_STRATEGIC_INTELLIGENCE.json` marked superseded by FP V2 |
| 8 | Competitive intel honest | Without search keys / LANE_INTEL — must label skipped, not fake landscape |

**Evidence bundle:**

| Artifact | Path |
|----------|------|
| FP V2 constitution | `docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md` |
| Runtime governance | `builderos-reboot/governance/FOUNDER_PACKET_V2_CHAIR_RUNTIME.json` |
| Enforcement code | `services/chair-founder-packet-v2-enforcement.js` |
| Orchestrator wire | `services/lumin-chair-orchestrator.js` |
| Truth gate | `services/chair-truth-gate.js` |
| Voice salvage | `builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/SALVAGE_MANIFEST.json` |
| Verify script | `scripts/verify-chair-fp-v2-enforcement.mjs` |

---

## Document layers

| Layer | Role |
|-------|------|
| This packet | WHAT + PASS + audit attack list |
| Founder Packet V2 | Strategic constitution |
| Runtime governance JSON | Machine enforcement spec |
| Code + live artifacts | PROOF |

**This packet intentionally contains no routes, schemas, migrations, or build plans — those belong in governance JSON and code.**
