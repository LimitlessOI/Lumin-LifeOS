<!-- SYNOPSIS: Founder Packet — Communication System V5: Cross-Domain Personal Intelligence -->

# Founder Packet — Communication System V5: Cross-Domain Personal Intelligence

**Mission ID:** `PRODUCT-COMMUNICATION-V5-CROSS-DOMAIN-0001`
**Locked:** 2026-08-08 (Adam — "install all five" versions of the Communication System Blueprint)
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.
**Source doctrine:** `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` §22, row "V5 — Cross-Domain Personal Intelligence"

---

## Priority

Fifth and last of five. Long-term moat; requires V4's evidence and action loop across at least two domains to mean anything real, per the blueprint's own stated dependency order.

---

## Problem

The same person's calendar, tasks, finances, health, and contacts today live in separate silos with no shared way to answer a cross-domain question ("am I free at 3pm and can I afford this?") without either building a one-off integration per question, or dumping everything into one undifferentiated blob that ignores which pieces are actually sensitive.

---

## Desired outcome

1. A real, callable Cross-Domain Personal Intelligence service maintains per-domain data silos (calendar, tasks, finance, health, contacts, extensible), each with its own sensitivity policy and default-share fields.
2. Sensitive domains (finance, health) never share data cross-domain without **explicit** consent granted for specific fields — no implicit trust between domains just because they belong to the same user.
3. Cross-domain questions ("am I free at 3pm", "can I afford this", "prep me for this meeting", "how's my energy") get answered by combining only the domains and fields actually consented/available, with the answer's sources and any blocked domains reported explicitly — never a silent guess presented as certain.
4. Every domain access and every consent grant is logged (audit receipts), not silently applied.

---

## FOUNDER SUCCESS TEST

Given the same domain setup and questions the proven prototype was tested against (`scripts/prototype-cross-domain-v5.mjs`, 12/12 tests), the ported service produces the identical answers, the identical consent-blocking behavior for sensitive domains, and the identical audit trail — reused, not reinvented. A finance question is blocked until explicit consent is granted, then answered correctly after.

## Acceptance command

```bash
npm run lifeos:communication-v5-cross-domain:acceptance
```

(System authors this command and the proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS — objective, automatable

- Acceptance command exits **0**
- Receipt: `products/receipts/COMMUNICATION_V5_CROSS_DOMAIN_ACCEPTANCE.json` with `"verdict": "PASS"`
- `Domain`/`PersonalIntelligence` classes match the proven prototype's exact consent/inference behavior.
- **Failure mode, explicit:** a sensitive domain's data appearing in a cross-domain answer without explicit prior consent is a FAIL, not a partial pass — this is the same trust boundary V3's consent-gating already established for perception, applied here to stored personal data.

### 2. Founder usability PASS

- Adam confirms: no domain silently leaks into another without him explicitly having said yes.

**I'll know this worked when:** the system can answer a real cross-domain question about my own life correctly, and I never once wonder whether it looked at something I hadn't agreed to share.

---

## Out of scope

- Real integration with actual calendar/finance/health data sources (this ports the *fusion/consent/inference* logic only, operating on in-memory domain records matching the prototype)
- Wiring this into any live product surface's decision path
- Any AI/model call inside the inference logic — deterministic, matching the proven prototype exactly (the question-matching is keyword-based, same as the prototype)
- Redesigning the domain policy shape or the sensitivity/consent model

## Document layers (do not mix)

| Layer | Role | Active file |
|-------|------|-------------|
| Founder packet | WHAT + PASS | **This file** |
| Blueprint | HOW to build | `BLUEPRINT.json` (system-authored) |
| Receipts | PROOF | `products/receipts/`, mission proof JSON |
