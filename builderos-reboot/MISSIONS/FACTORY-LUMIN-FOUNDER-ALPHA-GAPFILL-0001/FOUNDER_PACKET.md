<!-- SYNOPSIS: Founder Packet — Lumin Founder Alpha Gap-Fill -->

# Founder Packet — Lumin Founder Alpha Gap-Fill

**Mission ID:** `FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001`
**Authority:** Alpha test findings from founder chat + UI probes (2026-06-28)
**Receipt:** `products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json`

---

## Problem

When Adam talks to Lumin in `lifeos-app.html`, it must feel like **Lumin knowing Adam** — not strategic theater, not Point B dumps, not pattern-matched counsel. Build commands must execute. General and system questions must answer from real context.

Alpha testing found:

1. **P1** — UI prefixed user bubbles with literal `undefined` when focus prompts were missing.
2. **P1** — Identity questions ("who am I", "my priorities") routed strategic/Point B content because the word **Lumin** triggered product-build markers.
3. **P1** — `GMAIL_SIGNUP_EMAIL` on Railway was literal `null`, blocking alpha-auditor test account provision.
4. **P2** — Strategic brief sections still appended on personal turns in some paths.

---

## Desired Outcome

Lumin in the founder drawer:

- Answers **who Adam is** using personal twin + memory — warm, specific, not meta-docs.
- Executes **`do:`** and natural-language UI builds with founder authority.
- Answers system questions (SMOS, BuilderOS path) from real knowledge — no clarify theater.
- Alpha battery includes an **identity twin probe** that fails on strategic dump language.

---

## FOUNDER SUCCESS TEST

**Adam opens Lumin, asks "who am I to you — what are my priorities?", gets a personal answer grounded in his twin (family, freedom, impact), with zero Point B / AGENT CONTINUITY / scoreboard language. A `do:` build completes with PASS receipt.**

---

## Scope boundary

- In scope: routing, chair-native-facts, UI prompt guards, alpha battery, alpha-auditor env/provision, boot seeder null-email repair.
- Out of scope: cold-login wall UX, LifeRE page routing, voice rail salvage.

---

## Failure mode (unacceptable)

- Identity question returns Point B gaps, internal SSOT dumps, or generic GPT patterns.
- Build commands silently no-op or route to counsel-only.
- Test account cannot provision because email env is literal `null`.

---

## Acceptance Command

`npm run lifeos:founder-chat:alpha:battery`

Must include probe `Q_identity_twin` PASS.
