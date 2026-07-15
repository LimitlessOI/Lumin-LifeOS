<!-- SYNOPSIS: SocialMediaOS Module Home -->

# SocialMediaOS Module Home

**Parent product:** [MarketingOS](../PRODUCT_HOME.md)  
**Formerly called:** Amendment 41 — first customer-facing module  
**Product id:** `socialmediaos` (module under MarketingOS)  
**Constitutional law:** `docs/constitution/NORTH_STAR_SSOT.md`  
**Machine manifest:** `docs/products/marketingos/socialmediaos/FILE_MANIFEST.json`  
**Last Updated:** 2026-07-15 — Real-customer: forgot/reset password UI + $49 pack path.

---

## Platform creative doctrine

| Platform | Status | Rule |
|----------|--------|------|
| **YouTube** | Implemented (intelligence path) | Niche playbook → search shelf → velocity/gap → researched title → face+title thumb → lead CTA. Outcome = reach-outs, not vanity views. Offer refresh/A-B/sequel on old uploads. |
| **Instagram** | Next surface | Format-native best practices required — no YouTube paste. Carousel / mute-first / save-worthy. |
| **TikTok** | Next surface | Format-native — hook in 1s, native audio, pattern interrupt. No YouTube paste. |
| **LinkedIn** | Partial (session generate + carousel repurpose) | Format-native — professional insight density, carousel machine; no YouTube paste. |

---

## Scope

SocialMediaOS is the **first shipped module** inside MarketingOS.

Core loop: founder coaching session → transcript → story extraction → content pack → approval → export.

**Market-ready gate (2026-07-15):** Priority A loop tip-proved — consent → coach → extract → generate (Gemini failover) → approve → download export. Live surface: `/marketing`.

Platform phases (YouTubeOS, PodcastOS, CampaignOS) live in the parent [MarketingOS product home](../PRODUCT_HOME.md).

## Owned runtime (this module)

See `FILE_MANIFEST.json` in this folder.

High-signal surfaces:
- **Live founder surface:** `/marketing` (dashboard + recent packs + YouTube talk cards)
- **Session loop:** `/marketing/session/new` → `/marketing/session/:id` → `/content` → `/export`
- **API:** `/api/v1/marketing/consent|sessions|…` (legacy `/api/v1/socialmediaos/*` is not the tip mount)
- `public/overlay/marketing-*.html` — presentation overlays
- `lifeos-app.html?stack=socialmediaos` — stack launcher (optional)

## Verification

```bash
node scripts/verify-socialmediaos.mjs
node scripts/run-founder-socialmediaos-chat-a2z.mjs
```

## Phase 1 MVP spec

Full Phase 1 technical specification: parent PRODUCT_HOME §5 Phase 1 and §6.

---

## Product Vision — Brainstorm (2026-06-29)

> Session capture: Adam + Claude brainstorm. Not a build spec — raw product intelligence to inform BP writing.

### Terminology
- **Client** = person using the product to record, get coached, and produce content
- **Founder** = Adam doing alpha testing or giving product direction only

### Core Loop
Client records with AI coaching live during session → AI voice on separate track (stripped before export) → transcript → story extraction → content pack → approval → export. B-roll captured and cataloged with consent. Same engine powers instant AI video generator.

### Recording Architecture
- Audio uploaded immediately (needed for transcript)
- Video chunks queued on WiFi in background
- All raw b-roll stored (Cloudflare R2, ~$0.015/GB — trivial cost vs. catalog value)
- Client signs two consent clauses at session start: (1) own deliverables, (2) optional: b-roll reuse in other videos
- B-roll auto-tagged: subject matter, mood, lighting, motion, face/no-face, indoor/outdoor, content type
- B-roll library compounds — after 10 sessions, client has 50+ tagged clips for AI video generation with no new recording

### The "Earned Attention" Script Framework
Scripts are not linear documents. They are chains of micro-contracts:
```
0-15s   → Hook. Earn the next 15 seconds.
15-30s  → Prove the hook is real. Earn the next 30 seconds.
30-60s  → First real value drop. Earn the next minute.
1-2min  → Deepen. Earn the next 2 minutes.
2-5min  → Substance. Earn the rest.
5min+   → Payoff + next open loop.
```
Each script block scored: did it deliver on the last promise? Does it plant a reason to stay? Mapped to actual retention curve after publish.

### Platform Intelligence Features (Priority Ideas)

**Competitive & Script Intelligence**
1. Pre-script battlefield scan — search YouTube for exact title, analyze top 10 competitors before writing
2. Comment section mining on competitors — what questions did their audience ask that they didn't answer?
3. Accuracy gate — every factual claim verified before recording
4. 50-title universe — generate and score 50 title variations, pick top 5
5. Cross-industry hook transplant — apply viral structures from unrelated niches
6. Competitor spike alerts — when a competitor gains 50k subscribers fast, reverse-engineer why
7. Viral topic monitoring — real-time alert when something trends in the client's niche, 30-minute response window
8. Weekly niche trend injection — top 20 growing channels analyzed weekly, patterns injected into generation prompts
9. Predict comment section before publishing — update script to pre-answer top objections

**Production**
10. Voice mirror — client hears script in their own cloned voice before recording (30-second sample at signup)
11. Hot moment flag — AI pins timestamps during coaching when client says something powerful: "say that again, slower"
12. B-roll shot list — specific shot list generated before recording day, timed to script beats
13. Personality dial — Authoritative ↔ Punchy ↔ Unexpectedly Funny slider rewrites hook and editing suggestions
14. Silent hook — mute-optimized version of first 3 seconds (85% of social video watched on mute)

**Publishing & Optimization**
15. Thumbnail battlefield test — thumbnail placed in simulated grid against top 10 competitors, scored on contrast/expression/uniqueness, 5 variants generated
16. Retention curve predictor — predict drop-off points before publishing; map to actual curve after
17. Evergreen vs. trending classifier — route to full production or fast-turn template accordingly
18. B-roll library compounding — after N sessions, AI generates new content from existing library, zero new recording
19. Publish or kill gate — hook in 15s? Reason to stay at 30s? Thumbnail matches title? Info accurate? Something competitors don't have?

**Sentiment & Engagement**
20. Comment management on own videos — AI drafts responses, client chooses auto or approve-first by category
21. Competitor comment engagement — value-only replies to unanswered questions on competitor pages (always approve before posting)
22. Engagement question strategy — close every reply with a genuine question that invites thread continuation
23. Trust-escalation auto mode — system learns approval patterns, unlocks auto-mode category by category as confidence builds
24. Niche question leaderboard — top unanswered questions across competitor comment sections, updated weekly
25. Collab pipeline — after 5+ genuine engagements with a channel, flag as collab candidate with a pitch brief

**Additional Platform Features**
26. The reply guy strategy (X/Twitter) — systematic replies to high-visibility posts, AI drafts self-contained insights
27. LinkedIn carousel machine — every session topic converted to 10-slide carousel (3.7x organic reach)
28. Pinterest as 3-year lead machine — identify high-volume Pinterest search topics, build pins that compound for years
29. Threads as R&D laboratory — test takes and ideas on Threads, validate before committing to long-form
30. DM funnel — comment trigger word → auto DM → resource delivery → conversation start
31. Notification hijacking — alert when top-channel posts; first 10-minute comment gets visibility from all who engage
32. The enemy framing engine — identify what the client can credibly push back against; content with a clear villain outperforms neutral
33. Reddit intelligence mining — monitor subreddits for raw frustrations and content briefs; never post, only extract
34. Micro-moment library — 100 x 15-second videos answering one specific question each; a year of search-optimized content
35. Collab bait format — content designed so adjacent creators want to share it without being asked
36. Authority map — track all past content, flag contradictions before publishing, maintain consistent position
37. Dark social detection — identify traffic spikes with no referral source, correlate to content, find what's being privately shared
38. Superfan identification — find who comments on everything, shares consistently, been around longest; give them VIP treatment
39. Second audience discovery — analyze who's actually engaging vs. assumed audience; surface unexpected segments for targeted content
40. The series architect — identify multi-part topics, structure arc upfront, write inter-episode hooks into every script
41. Invisible editorial calendar — strategic brain that balances evergreen/trending, discovery/depth, awareness/conversion automatically
42. Podcast multiplier — one episode → YouTube video + 10 LinkedIn posts + 5 email segments + 20 short clips + 3 newsletters
43. Anti-viral deep catalog — parallel content branch: highly specific, low-volume topics that convert at 5x the rate of viral
44. Social proof harvesting — monitor mentions and DMs for testimonials, auto-convert to content assets in real time
45. Sponsorship intelligence — track which brands sponsor creators at what threshold; auto-generate deck when client hits criteria
46. Anti-algorithm backup — every piece routes to email/SMS/podcast RSS; platform-independent layer always maintained

### Referral Partner Channel Engine
Adjacent professionals (title, escrow, lenders, inspectors, interior designers) serve the same clients but are NOT competitors:
1. System finds them making content in those categories
2. Monitor their content — comment with genuine value, ask questions that help their engagement
3. Praise specific things they did well (not generic)
4. Over time: natural relationship forms → collab opportunity → "we have a tool that does this for you automatically"
5. They become clients AND referral sources simultaneously

**EXP Recruiting integration:** Competing real estate agents are targets for EXP recruiting, not exclusions. Tool access is the carrot. Once at EXP (in Adam's line) they become clients. Go Vegas Real Estate Facebook group is community + recruiting funnel + client base simultaneously.

### Change Receipts

| Date | Change | Why | State |
|------|--------|-----|-------|
| 2026-07-15 | **Client login + export paid/cancel UX** — `/marketing/login`; Unlock download CTA | Returning clients after Stripe | ⚠️ tip prove |
| 2026-07-15 | **Public client signup** — `/marketing/signup` + `registerPublicSmos`; paid export gate; ownership-scoped sessions | Strangers must be able to sign up and buy packs | ⚠️ tip prove |
| 2026-06-29 | **Product vision brainstorm** — 45 platform feature ideas, earned attention framework, recording architecture, referral partner engine, EXP recruiting strategy, client terminology established | Session capture for BP writing | ✅ doc-only |
| 2026-06-30 | **Session MVP machine path PASS** — coaching session start/answer/generate/export loop now reaches `TECHNICAL_PASS`; route mounted in runtime and acceptance artifacts synced | Proves the lower-cost BuilderOS lane can build this slice end-to-end | ✅ runtime |
| 2026-06-30 | **Low-cost hardening** — provider fallback in route layer, deterministic content-pack fallback in generator layer, acceptance finalizer updated to current artifact contract | Prevents mission failure when live AI provider or spend gate is unavailable | ✅ runtime |
