<!-- SYNOPSIS: Priority 4 dependency-mapping audit — does a Communication Translation Layer need to be built? -->

# Communication Translation dependency mapping — 2026-08-04

**Question this answers (founder's Priority 4 instruction):** *"Do not build a separately named Communication Translation Layer unless a requirements map proves that the existing context-view, communication-profile, and response-formation architecture cannot own those behaviors."*

## What already exists, and what it actually is

The word "translation" is heavily overloaded in this codebase — three real, live, unrelated systems already carry that name:

1. **`services/prompt-translator.js`** — LifeOS Compression Language (LCL): compresses outgoing *AI prompts* to save tokens. Reachable (used by `council-service.js`). Nothing to do with audience-facing communication.
2. **`translation_profiles` table** (`migrations/create_translation_profiles_table.sql`) — `language_preferences JSONB`: human spoken-language preference (e.g. English/Spanish), not audience adaptation.
3. **`services/lumin-translation-router.js`** — cost-tier model routing (free/smart/capable) for turning `SYSTEM_FACTS` into prose. Real, wired (imported by `chair-personality-translate.js`), documented in `docs/architecture/LUMIN_TRANSLATION_AND_ACCOUNT_MODEL.md` (Adam directive, 2026-06-25). This is about **how cheaply** a reply gets generated and its **personality voice** — not about **which audience** it's for.

None of these three is the founder's Priority 4 concept: explaining the same underlying fact differently to different audiences (Founder / Builder / therapist / client) while preserving the material facts and preventing audience-inappropriate disclosure.

## Mapping the founder's 6 example behaviors to real, current architecture

| Behavior | Owner today | Status |
|---|---|---|
| Convert technical status into Founder language | `chair-personality-translate.js` (SYSTEM_FACTS → prose), Communication Law (`LUMIN_COMMUNICATION_LAW.json`, verified live: `npm run lifeos:lumin:communication:verify` 7/7 PASS) | **Owned, real, wired.** |
| Preserve material facts while changing tone | Same — Communication Law's entire design principle ("the translator never invents actions, never claims execution unless `command_ran: true`") | **Owned, real, wired.** |
| Adjust detail to the person's preference | `services/communication-profile.js` (style-variation weighted by longitudinal data) + the calibration-correction capture wired into `lumin-context-loader.js` earlier this session (explicit "too long"/"just tell me" detection) | **Owned, partially learned, real.** |
| Convert therapeutic concepts into client-safe language | No dedicated owner. | **Not yet needed** — see below. |
| Explain the same decision differently to Founder, Builder, therapist, and client | No dedicated owner — confirmed `chair-personality-translate.js` has no role/audience parameter at all (grepped for `user_role`/`audience`, zero matches beyond a docstring mention of "translation" as a concept). | **Not yet needed** — see below. |
| Prevent audience-inappropriate disclosure | No dedicated owner in the response-formation path today. `user_role`/`auth_mode` fields already flow through every Chair response (`req.lifeosUser?.role`, confirmed live in this session's own test output), so the scaffolding to gate on role exists structurally — just not yet exercised for a second real audience. | **Not yet needed, but the wiring point already exists when it is.** |

## Why the last three are "not yet needed," not silently dropped

Confirmed directly: no non-founder role (`client`, `member`, `household`) is defined anywhere in the `lifeos_users` schema or any migration. Production today is genuinely single-audience — one real user (`adam`, `founder_admin`). There is no second real audience live in the system for a translation/adaptation behavior to be tested against, let alone to guard disclosure between.

Building a Founder-vs-client-vs-therapist explanation-switcher today would mean writing logic with no real second audience to verify it against — exactly the kind of speculative, ahead-of-need infrastructure this whole session's discipline has explicitly avoided (Priority 1's dead unreachable code, Priority 3's orphaned risk-scoring system). The correct trigger to build this is the same one already named in this document's own table: when a real second account role goes live.

## Conclusion

**Do not build a separate Communication Translation Layer.** Confirmed, not just recommended: 3 of 6 example behaviors already have a real, live, verified owner (`chair-personality-translate.js` + `communication-profile.js` + Communication Law); the other 3 have no owner **because there is no real second audience yet for them to serve** — the gap is genuine but not currently load-bearing, and the `user_role`/`auth_mode` fields already threaded through every response are the correct future wiring point once a real client/member account exists. Revisit this document, not a rewrite, when that happens.

@ssot docs/products/lifeos/PRODUCT_HOME.md
