<!-- SYNOPSIS: SocialMediaOS competitor UX research → market-ready design bar -->

# SocialMediaOS — Competitor Design Research (2026-07)

**Purpose:** Inform market-ready UI for `/marketing` and the session loop.  
**SSOT product home:** `docs/products/marketingos/socialmediaos/PRODUCT_HOME.md`  
**Blueprint Phase 1:** `docs/products/marketingos/PRODUCT_HOME.md` § Phase 1 (coach → extract → generate → approve → download).

## What SMOS is (vs competitors)

SMOS is **not** a scheduler-first product. Core loop = **coached talk → content pack → human approve → download**.  
Competitors below win at scheduling/analytics/visual planning. We steal their **clarity and hierarchy**, not their feature soup.

| Tool | Wins at | Steal for SMOS | Do not copy |
|------|---------|----------------|-------------|
| **Buffer** | Ruthless simplicity; one job per screen; clear primary CTA | Home = one primary action; secondary links quiet | Feature-dense nav equal to CTA |
| **Later** | Visual-first planning; big previews | Recent packs as large visual cards; thumb-forward talk cards | Grid planner as Phase 1 home |
| **Predis.ai** | AI generation front-and-center | “Generate pack” as hero outcome language | Prompt→post without coaching/approval |
| **Metricool** | Status + next action clarity | Pack status chips (draft / approve / paid / export) | Analytics dashboard before P1 exit |
| **Hootsuite** | Team approval workflows | Keep human approve before export (already P1) | Cluttered multi-column chrome |
| **Taplio / Typefully** | Niche-native writing UX | Platform-native copy later (IG/LI/X already in pack) | Single-network lock-in |

## Market-ready design bar (founding rules)

1. **First viewport = one composition:** Brand (SocialMediaOS) + one headline + one short line + **one primary CTA** (+ quiet sign-in).
2. **Auth-aware CTAs:** Signed-out → Create account / Sign in. Signed-in → **Start session** / Continue pack.
3. **Progressive disclosure:** YouTube intelligence, film modes, channel ops = below the fold or “Advanced” — never compete with Start session.
4. **Visual proof:** Recent packs and talk cards show thumbs/status; not text-only lists.
5. **Every Phase 1 control works:** consent → session → coach → extract → generate → approve → $49 unlock → download. No dead buttons.
6. **Avoid AI-slop looks:** no purple-indigo default, no cream+terracotta serif stack, no glow chrome, no pill forests of equal weight.

## Blueprint feature checklist (Phase 1 — must work)

| Feature | UI / API surface | Market-ready bar |
|---------|------------------|------------------|
| Create session | `/marketing/session/new` + `POST /sessions` | One clear start path |
| Consent before session | consent checkbox + `POST /consent` | Block start until consented |
| Text coach | session page coach | Warm replies; tip works |
| Audio → Whisper | session upload | Fail with clear message if R2/Whisper missing |
| Extraction | post-session extract | Structured stories |
| Content generation | generate pack | 5–10 pieces |
| Per-piece approve | `/content` | Approve/reject works |
| Download export | `/export` | File download; paid gate honest |
| Signup / login / reset | `/signup` `/login` `/forgot-password` | Real customers without invite |
| $49 pack checkout | `/api/v1/marketing/pack/*` | Pricing + Stripe path live |

**Phase 2+ (calendar, atoms, publish):** keep linked but **demoted** — do not pretend they are the product until P1 money loop is green.

## Competitor-informed home IA (target)

```
[SocialMediaOS]
Talk once → publish-ready pack
[ Primary: Start session | or Create account ]
[ quiet: Sign in · Tour · Calendar · Atoms ]

Your packs (visual cards)
───────────── advanced ─────────────
Film mode · YouTube intel · Talk cards
```

## Next build slices

1. Restructure `/marketing` CTA hierarchy + light-theme fix (this ship).
2. Tip prove Phase 1 loop + paid export gate.
3. Session/content/export visual polish to match home.
4. Site Builder market pass after SMOS P1 bar is green.
