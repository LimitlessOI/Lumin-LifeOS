<!-- SYNOPSIS: AMENDMENT LIFERE — Real Estate Business Operating System (founding law) -->

# AMENDMENT LIFERE — Real Estate Business Operating System

| Field | Value |
|---|---|
| **Product spec** | `docs/products/LIFERE.md` |
| **Status** | **FOUNDING** — doctrine + twin blueprint shipped 2026-06-13 |
| **Authority** | Subordinate to SSOT North Star Constitution |
| **Lifecycle** | `active` (program) / Alpha slice `technical_pass` |
| **Last Updated** | 2026-06-23 |
| **Verification (Alpha)** | `npm run lifeos:lifere-os:v1-acceptance` |
| **Verification (Alpha readiness)** | `npm run lifeos:lifere-alpha-readiness` |
| **Audit agent prompt** | `docs/LIFERE_ALPHA_AUDIT_AGENT_PROMPT.md` |
| **Manifest** | `docs/projects/AMENDMENT_LIFERE.manifest.json` |

> **Y-STATEMENT:** In the context of real estate agents drowning in disconnected CRM, marketing, transaction, and coaching tools,
> facing lost leads, generic AI, and no clear daily priority math,
> we decided to build **LifeRE** as the intelligence and operating layer above broker systems of record,
> to achieve more GCI with less chaos and protected life quality,
> accepting that BoldTrail, TC stacks, and MarketingOS remain integrated dependencies—not the whole product.

---

## WHAT THIS IS

LifeRE is the **real estate business operating system**: command center, digital twins, performance math, coaching, marketing module, transaction visibility, recruiting, and approval-gated execution—for solo agents and teams.

**Mission:** Help agents know what to do today, convert pipeline faster, communicate in their own voice, and see the numbers that create deals—without replacing broker CRM of record.

---

## RELATIONSHIP TO SIBLING AMENDMENTS

| Amendment | Relationship to LifeRE |
|-----------|------------------------|
| **21 LifeOS Core** | Parent personal OS + Lumin Chair; LifeRE extends for RE business lane |
| **11 BoldTrail RE** | **CRM SoR adapter** — contacts, pipeline sync; LifeRE owns intelligence layer above |
| **17 TC Service** | **Transaction execution spine** — portals, deadlines, comms; LifeRE surfaces status to agents |
| **08 Outreach CRM** | **Outbound sequences** — consent-gated email/SMS/call; LifeRE attributes leads |
| **15 Business Tools** | **RE training + recruiting** legacy blocks → migrate under LifeRE Recruiting OS |
| **29 AI Receptionist** | **Inbound call capture** → LifeRE Lead Twin + BoldTrail |
| **41 MarketingOS** | **Platform sibling** — LifeRE.MarketingModule shares adapters, not duplicate law |
| **44 Token Accounting** | Model cost routing for Lumin/Chair RE tasks |
| **04 Auto Builder** | Machine path for LifeRE missions |

**Consolidation rule:** New LifeRE product law lives **here + LIFERE.md**. Sibling amendments keep **integration contracts** only; duplicate LifeRE product prose should migrate to this amendment via receipt.

---

## PRODUCT LAW

### Layer model
```
LifeOS (personal) ──extends──▶ LifeRE (RE business OS)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              BoldTrail SoR    TC Am 17      MarketingModule
              (Am 11)          portals       (↔ Am 41)
```

### Execution doctrine
- **Internal automation:** allowed when bounded + receipted
- **External comms (email/SMS/post/call):** approval required unless Permission Twin grants tier
- **CRM write-back:** approval-gated (KNOW: follow-up approve route exists)

### Digital twin doctrine
Full twin set defined in `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md`. No twin claim without labeled memory inputs + update receipts.

### Lumin Chair
LifeRE user-facing orchestration runs through **Lumin** in `/lifeos` — not Voice Rail (scrapped).

---

## NON-NEGOTIABLES

1. Agent voice preservation on all generated comms and content
2. No cross-agent lead access without authorization
3. No auto-send outbound without approval tier
4. Real estate commission / fair housing compliance — human gate on sensitive content
5. BoldTrail (or broker CRM) remains SoR where broker requires
6. No fake PASS / usability theater (`founder_usability_pass` required for Alpha honesty)
7. Performance claims labeled KNOW/THINK/GUESS/DON'T KNOW
8. LifeOS personal data wall for employer/broker views

---

## OWNED FILES

### Primary (LifeRE program)
```
docs/products/LIFERE.md
docs/LIFERE_MASTER_BLUEPRINT.md
docs/LIFERE_BUILDER_DIGITAL_TWIN.md
docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md
docs/LIFERE_A_TO_Z_FEATURE_MAP.md
docs/LIFERE_GAP_AUDIT.md
config/lifere-*.json
services/lifere-*.js
routes/lifere-os-routes.js
public/overlay/lifeos-lifere.html
db/migrations/20260613_lifere_twin_framework.sql
scripts/run-lifere-*-acceptance.mjs
tests/lifere-performance-twin.test.js
products/receipts/LIFERE_AZ_ACCEPTANCE.json
builderos-reboot/MISSIONS/PRODUCT-LIFERE-MASTER-BLUEPRINT-0001/
builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/   ← Alpha corridor (historical)
```

### Removed from planned (now shipped 2026-06-23)
```
services/lifere-performance-twin.js … lifere-council-router.js (26 services)
```

### Integration (read-only ownership — sibling amendments)
See Am 11, 17, 08, 29, 41 file lists in `LIFERE_GAP_AUDIT.md`.

---

## HISTORY (condensed)

| When | Event |
|------|-------|
| Pre-2026 | RE capabilities scattered: Am 11 BoldTrail, Am 17 TC, Am 08 outreach, Am 15 training/recruiting, Am 29 receptionist |
| 2026-06-21 | Point B locked to LifeRE Alpha mission `PRODUCT-LIFERE-OS-V1-0001` |
| 2026-06-22 | Alpha shipped: `lifere-os-v1`, routes, overlay, BoldTrail bridge; technical acceptance PASS |
| 2026-06-22 | `founder_usability_pass: false` — honest blocker documented |
| 2026-06-13 | **Founder Handoff packet** — full end-state doctrine, twins, feature map, gap audit; LifeRE founding amendment created |

---

## Change Receipts

| Date | Change | Why | State | Next |
|------|--------|-----|-------|------|
| 2026-06-13 | **Alpha audit prompt + readiness gate** — `LIFERE_ALPHA_AUDIT_AGENT_PROMPT.md`, `run-lifere-alpha-readiness.mjs`, cred-less THINK fallbacks for YouTube/ClickFunnels | Adam: agent audit then alpha test | ✅ readiness script | Adam alpha test |
| 2026-06-13 | **Product Z push** — outreach approve/execute, Vapi→LifeRE fan-out, TC deal detail, buyer workflow, self-audit script | Adam: no stopping until Z; debug + audit | ✅ self-audit + RT-12 | deploy; founder usability |
| 2026-06-13 | **Learning pipeline + Vapi ingest + Chair relationship** — `lifere-learning-pipeline.js`, `/learning/*`, `/receptionist/vapi-end`, marriage edge seed, UI panels | Adam: keep building past structural PASS | ✅ RT-10 PASS | Founder usability; live PG |
| 2026-06-23 | **A–Z runtime W1–W6** — 26 services, full routes, migration, UI tabs, acceptance PASS | Adam: coder build A-to-Z from blueprint | ✅ `npm run lifeos:lifere-az-acceptance` PASS | Founder usability; live PG; external API creds |
| 2026-06-13 | **Founder Handoff packet** — `docs/products/LIFERE.md`, `AMENDMENT_LIFERE.md`, twin blueprint, A-to-Z map, gap audit | Adam: LifeRE scattered across 5 amendments; need full chair drawing for ARC, not v1-only | ✅ docs | INDEX row; Adam founder usability |
| 2026-06-22 | LifeRE ↔ BoldTrail bridge (recorded in Am 11; law migrates here) | CRM SoR + LifeRE command layer | ✅ runtime | Webhooks phase 2 |
| 2026-06-22 | Alpha acceptance PASS, usability false | Machine vs founder truth split | ✅ technical | Adam opens LifeRE path |

---

## Agent Handoff Notes

| Field | Value |
|-------|--------|
| **Read first** | `docs/LIFERE_BUILDER_DIGITAL_TWIN.md` → `LIFERE_GAP_AUDIT.md` |
| **A–Z receipt** | `products/receipts/LIFERE_AZ_ACCEPTANCE.json` — structural PASS |
| **Alpha mission** | `PRODUCT-LIFERE-OS-V1-0001` — historical corridor |
| **@ssot** | New lifere services → `AMENDMENT_LIFERE.md`; `lifere-os-v1.js` still Am 21 until repoint |
| **Voice Rail** | Hist only — do not route LifeRE users to `/voice-rail` |
