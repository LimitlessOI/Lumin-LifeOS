<!-- SYNOPSIS: Living ledger of third-party service Terms of Service / Acceptable Use Policy restrictions relevant to what LifeOS products actually do with each integration — not internal governance (see TSOS_COMPLIANCE_OFFICER.md for that). -->

# External Service Compliance Ledger

**Why this exists:** on 2026-07-21, a BUILD_QUEUE step for Site Builder's cold-outreach deliverability check was built against Postmark's domain-verification API before anyone checked whether Postmark's own Acceptable Use Policy permits cold outreach at all. It does not — and the agent's first-pass replacement recommendation (Amazon SES or Mailgun) turned out to be wrong too, on independent verification. All three are transactional ESPs, and "transactional ESP" specifically means their AUP prohibits unsolicited/cold outreach — that's not a gap in any one provider, it's the category. Founder directive, same session: **"we must never not be in compliance"** — this ledger exists so that check happens before infrastructure gets built around a provider, not after.

**Rule going forward:** before wiring any new external service, or extending an existing integration to a new usage pattern (bulk sending, scraping, resale, automated calling/texting, AI-generated content at scale), check this ledger first. If the service/pattern isn't listed, verify it (WebSearch/WebFetch the provider's current AUP/ToS) and add a row before building — not after.

**Honesty labeling:** every row is labeled **KNOW** (verified against a live, current source this session — cite it), **THINK** (general knowledge / secondary sources, not independently re-verified against the provider's own current policy text), or **STALE** (was KNOW once, needs re-verification — ToS pages change without notice). Do not silently upgrade a THINK to a KNOW without actually checking the source.

---

## Cold outreach / bulk sending

| Service | Cold email/outreach allowed? | Grade | Source | Verified |
|---|---|---|---|---|
| **Postmark** | **No.** AUP explicitly bans unsolicited email and purchased/rented lists; enforces by suspending cold-email accounts within days of detection. | KNOW | [postmarkapp.com/terms-of-service](https://postmarkapp.com/terms-of-service); confirmed via WebSearch 2026-07-21 | 2026-07-21 |
| **Mailgun** | **No.** AUP "bans unsolicited mail and requires verifiable opt-in for all recipients"; auto-suspends on complaint rate >~0.1% or bounce rate >~5%. Slightly more lenient in practice than Postmark but cold prospecting still gets accounts killed. | KNOW | [mailgun.com/legal/aup](https://www.mailgun.com/legal/aup/); confirmed via WebFetch 2026-07-21 | 2026-07-21 |
| **Amazon SES** | **No.** AWS AUP prohibits unsolicited email; messages must be specifically requested by the recipient; purchased/scraped/co-registration lists are non-compliant. Technically can send cold email, but doing so risks account review/suspension and isn't what the infrastructure is built for. | KNOW | [aws.amazon.com/aup](https://aws.amazon.com/aup/); confirmed via WebSearch 2026-07-21 | 2026-07-21 |
| **Instantly.ai / Smartlead** | Purpose-built cold-outreach sequencer platforms (multi-inbox rotation, sending-limit management) — the category transactional ESPs explicitly are not. Have not independently read their literal ToS text line-by-line. | THINK | General knowledge + comparison articles, not the platforms' own ToS directly | not independently verified — **do this before signing up** |
| **Pre-warmed personal-domain inboxes** (Google Workspace / Microsoft 365, warmed 14-21 days) | Common industry pattern for cold outreach at moderate volume; subject to each platform's own general ToS (not email-specific AUP), and still subject to CAN-SPAM/GDPR content requirements regardless of provider. | THINK | Industry-standard pattern, not independently sourced | not independently verified |

**Open decision for Adam:** pick Instantly/Smartlead vs. warmed Workspace/365 inboxes (or something else) as the actual Postmark replacement — this ledger doesn't decide it, it just makes sure whichever one gets picked is real permission, not another assumption.

## Voice (AI Receptionist / Vapi)

| Service | Relevant restriction | Grade | Source | Verified |
|---|---|---|---|---|
| **Vapi** | Not yet checked against current AUP for outbound/cold-calling use specifically. LifeRE's receptionist product is inbound-focused today (call handling, transfer, SMS brief) — lower immediate risk than a cold-outbound-calling feature would be, but not yet verified either way. | — | Not yet checked | **needs a pass** |
| **TCPA** (US federal, not a vendor policy) | Outbound automated/AI voice calls and SMS to consumers are subject to TCPA consent requirements regardless of which vendor carries the call — this applies even if Vapi's own AUP is silent on it. | THINK | General regulatory knowledge, not independently re-verified against current TCPA text/FCC rulings | not independently verified |

## Payments (Stripe)

| Service | Relevant restriction | Grade | Source | Verified |
|---|---|---|---|---|
| **Stripe** | Restricted business categories exist (adult content, gambling without licensing, MLM, etc.) — relevant if any product surface (SocialMediaOS, Site Builder client sites) processes payments for a client whose business falls in a restricted category. Not yet cross-checked against what's actually being sold through Stripe today. | THINK | General knowledge, not independently re-verified | not independently verified |

## AI content generation (OpenAI / Anthropic / Gemini / Replicate / ElevenLabs / HeyGen)

| Service | Relevant restriction | Grade | Source | Verified |
|---|---|---|---|---|
| **ElevenLabs** (voice cloning) | Voice-cloning features generally require the cloned voice's owner to consent — relevant if Creative Engine or any product surface offers voice cloning of a real, named person. | THINK | General knowledge, not independently re-verified | not independently verified |
| **HeyGen** (avatar/video) | Similar likeness-consent pattern for AI avatars of real people. | THINK | General knowledge, not independently re-verified | not independently verified |
| **OpenAI / Anthropic / Gemini** (content generation) | Usage policies generally require disclosure of AI-generated content in some contexts and prohibit impersonation/deceptive use — relevant to SocialMediaOS content generation and any AI Receptionist disclosure requirements. | THINK | General knowledge, not independently re-verified | not independently verified |

## Social platforms (not yet integrated as of this ledger's creation — placeholder)

| Service | Relevant restriction | Grade | Source | Verified |
|---|---|---|---|---|
| **Meta/Facebook/Instagram** | Automated posting/DM outreach has its own platform-specific bulk/automation restrictions distinct from email AUPs. | — | Not yet checked | needs a pass before SocialMediaOS auto-DM/auto-post features expand |
| **YouTube Data API** | `YOUTUBE_DATA_API_KEY` already integrated (confirmed via env-var grep 2026-07-21) — quota and usage-policy restrictions apply; specific current terms not yet re-checked. | THINK | Env var confirmed live; policy text not re-checked | not independently verified |

---

## Process going forward

1. **Before wiring a new external service:** WebSearch/WebFetch its current AUP/ToS for the specific usage pattern intended, add a KNOW-graded row with the source cited.
2. **Before extending an existing integration to a new pattern** (e.g., moving from transactional to bulk, or from read-only API use to write/automation): re-check, don't assume the original approval still covers the new use.
3. **Staleness:** ToS/AUP pages change without notice. Rows older than ~90 days should be treated as needing a re-check before being relied on for a new build decision, not treated as permanently KNOW.
4. **This ledger does not replace legal review** for anything with real regulatory exposure (TCPA, CAN-SPAM, GDPR, CCPA) — it's a fast, honest first-pass check to prevent the exact failure mode from 2026-07-21 (building real infrastructure around a provider before checking if the intended use is even allowed), not a substitute for counsel on anything high-stakes.
