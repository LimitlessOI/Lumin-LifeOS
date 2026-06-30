<!-- SYNOPSIS: Founder Packet — SocialMediaOS Working Client Session MVP -->

# Founder Packet: SocialMediaOS Session MVP

**Mission ID:** PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001
**Product:** SocialMediaOS (module under MarketingOS)
**SSOT:** docs/products/marketingos/socialmediaos/PRODUCT_HOME.md

## Problem

SocialMediaOS has partial schema and route groundwork, but no founder-usable client session flow. A client cannot actually go through a coached session, extract their story, generate a usable content pack, or export it. That means the product exists as scattered pieces instead of a working end-to-end outcome.

Pain now:

- no usable client session experience
- no guided 5-question coaching loop
- no reliable content-pack generation path for a real user
- no founder-usable proof that SocialMediaOS can take a client from blank page to usable content

## Desired Outcome

Build the first working client-facing SocialMediaOS session. After this blueprint:

- Client opens `/overlay/socialmediaos-session.html`
- Types their niche and goal
- AI asks 5 coached questions, one at a time (story extraction)
- After all 5 answers: AI generates a full content pack — 5 LinkedIn posts, 3 YouTube hooks, 3 Instagram captions, 3 email subjects
- Client copies any piece or downloads everything as a text file
- Routes wired; schema columns added; acceptance test passes end-to-end

## PASS

Machine runs `node scripts/run-socialmediaos-session-acceptance.mjs` — all 18 tests pass.
`OBJECTIVE_VERDICT.json` is written with `"verdict": "TECHNICAL_PASS"`.

## Scope Boundary

This packet is only for the first working text-only SocialMediaOS session MVP. It does not include recording, voice, payment gating, b-roll systems, or competitor intelligence.

## Constraints

- Builder executes exact BP only — no strategy invention.
- Build through BuilderOS system path only.
- Acceptance must run against a healthy runtime and write receipts honestly.
- Session must remain text-first and exportable.

## SEQUENCE

1. Coaching service (`services/socialmediaos-coaching-service.js`) — Q&A state machine, 5 questions
2. Content generator (`services/socialmediaos-content-generator.js`) — AI call → structured content pack
3. Coaching routes (`routes/socialmediaos-coaching-routes.js`) — start, answer, generate, get, export, state
4. DB migration (`db/migrations/20260629_socialmediaos_coaching.sql`) — adds session_type, metadata, content columns
5. Session UI (`public/overlay/socialmediaos-session.html`) — full client-facing page, question-by-question flow, content pack display
6. Acceptance test (`scripts/run-socialmediaos-session-acceptance.mjs`) — 18 assertions end-to-end
7. Route wiring (`startup/register-runtime-routes.js`) — mounts coaching routes at `/api/v1/socialmediaos/coaching`

## NOTES

- Terminology: "client" = person using the product. "Founder" = Adam only.
- Owner ID comes from `req.lifeosUser?.sub` (JWT) or `req.body.owner_id` for testing.
- Content generation is one AI call returning structured JSON — no streaming.
- The 5 coaching questions are designed to extract: niche/voice, authority/contrast, story/social proof, education hook, objection reversal.
- `socialmediaos_sessions.metadata` stores question state as JSONB.
- `socialmediaos_content_packs.content` stores the generated pack as JSONB.

## FOUNDER SUCCESS TEST

Open `/overlay/socialmediaos-session.html` → complete all 5 questions → content pack displays → download works. Run acceptance test: PASS.
