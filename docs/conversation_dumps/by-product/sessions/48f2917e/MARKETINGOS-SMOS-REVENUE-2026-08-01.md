<!-- SYNOPSIS: Session slice — SocialMediaOS / SMOS revenue loop from Mission 2 -->

# MarketingOS / SMOS — revenue loop (2026-08-01)

**Session:** `48f2917e` · **Master:** `docs/conversation_dumps/2026-08-01-builderos-convergence-devin-mission-arc.md`

## Mission 2 revenue closure (P4)

1. Configure and verify real email provider (Resend / SMTP)  
2. Complete one real SMOS $49 charge  
3. Confirm entitlement enforcement and content-pack delivery  
4. Run SENTRY Layer A + B for revenue loop  

## Founder-blocked actions

| Action | Unblock |
|---|---|
| Email provider | Adam sets EMAIL_PROVIDER, RESEND_API_KEY or SMTP_*, EMAIL_FROM, verify sending domain in Railway |
| Real charge | Adam completes one successful $49 cs_live_* via /api/v1/marketing/pack/checkout |

## CC consensus

Defer revenue/SMOS until blueprint authority spine proven — confirm as sequencing unless Adam overrides.

## Post-Mission-2A audit gaps (KNOW from product home)

- smos-export-owner-scope-fix: export checks paid status not session ownership (IDOR-shaped, UUID limits exploit)  
- smos-buy-button-session-scope-fix: Buy button targets most-recent session not page session  

## Creative Engine doctrine (related prior brainstorm)

SocialMediaOS = Creative Engine externally; decision engine many renderers internally. See `docs/conversation_dumps/2026-07-20-creative-engine-five-laws-brainstorm.md`.
