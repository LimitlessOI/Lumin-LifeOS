<!-- SYNOPSIS: Transport / hospital global vs midwife prenatal collection -->

# 09 — Transports, hospital globals, and prenatal money owed

**Founder rule (2026-07-15):** Billing notes + charting are the **determinant**. Sometimes there is a **transport**. Hospitals often file a **global** delivery claim even when they did **none** of the prenatal care. That prenatal money is still collectible for the midwife — do not write it off because the hospital billed global.

## Decision order (KNOW doctrine / THINK coding)

1. **Read notes** (Billing Notes previews + chart) before choosing a claim shape.
2. If **current/active prenatal** (still pregnant, no birth/transport) → **do not bill** a global.
3. If **transport** or **hospital took delivery/global** and midwife did prenatal → scenario `transport_prenatal_claim` → file **antepartum package** (`59425` 4–6 visits / `59426` 7+ — VERIFY visit count from chart).
4. If notes/chart show a completed home/birth-center episode midwife delivered → `unpaid_birth_file` → global **59400 / $4,900** (practice default).
5. Never invent charges; ClientCare ChargeSlip/SuperBill must reflect documented work.

## Why this is not double-billing the delivery

Hospital global usually covers **their** delivery professional/facility path. Midwife antepartum packages bill **prenatal visits she performed**. Different work. Coordination / denial risk → forever-chase + ask insurer (phone after filing volume is up).

## Phone contact with insurers

**Phase 2 — after filing is rolling.** Constant payer contact (status, COB, prenatal-after-hospital-global) needs outbound phone. Do not block FILE NOW on phone setup. Wire `ask_insurer` / forever-chase to voice once Sent Bills volume is healthy.

## Honesty labels

| Claim | Label |
|-------|-------|
| Notes drive scenario | KNOW (founder) |
| 59425 vs 59426 by visit count | THINK / VERIFY chart |
| Dollar amount on antepartum | VERIFY fee schedule in ClientCare — do not invent |
| Phone chase after file | KNOW (ordered); implementation after file blast |
