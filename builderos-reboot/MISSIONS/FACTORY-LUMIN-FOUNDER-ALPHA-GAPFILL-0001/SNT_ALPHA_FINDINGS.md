<!-- SYNOPSIS: Alpha test findings for SNT review -->

# SNT Alpha Findings — Lumin Founder Chat

**Date:** 2026-06-28  
**Probe surface:** `public/overlay/lifeos-app.html` + `POST …/founder-interface/message`  
**Alpha auditor:** `alpha-auditor` (`founder_admin`) provisioned at `lumea.lifeos@gmail.com`

## KNOW (verified)

| Finding | Severity | Fix status |
|---------|----------|------------|
| User bubble showed `undefined` prefix when `focus_prompt` missing | P1 | Fixed — `safePromptText()` in lifeos-app.html |
| Word `Lumin` in greeting triggered `PRODUCT_MARKERS` → strategic brief on identity asks | P1 | Fixed — removed from markers + identity guard |
| `GMAIL_SIGNUP_EMAIL` literal `null` on Railway blocked test account | P1 | Fixed — managed-env + boot seeder null overwrite |
| Alpha battery 9/9 API PASS on counsel, SMOS, search, builds | — | Receipt exists |
| Strategic brief appended even on personal turns | P2 | Fixed — skip when `personal_turn` |

## THINK (likely remaining drift)

| Finding | Severity | Notes |
|---------|----------|-------|
| Cold login wall for unauthenticated users | P1 | Not in this gap-fill scope |
| Browser E2E uses command-key JWT mint — not Adam cold path | P2 | FOUNDER_CHAT_ALPHA_BATTERY is API-first |
| Counsel may still question-back on priority asks | P2 | Needs founder usability pass |
| Alpha cycle chip may route counsel-only | P2 | Prior session finding — verify in UI |

## SNT Questions

1. Is `Q_identity_twin` summaryMustInclude too loose (allows generic GPT)?
2. Should PRODUCT_MARKERS drop `ui|button|drawer` for personal phrasing?
3. Does `needsSystemKnowledge` ever fire on "who am I" variants?

## Acceptance gate

`npm run lifeos:founder-chat:alpha:battery` must show `Q_identity_twin` in `passed[]`.
