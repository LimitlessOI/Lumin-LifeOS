<!-- SYNOPSIS: Canonical product home — MarketingOS -->

# MarketingOS Product Home

**Formerly called:** Amendment 41 (MarketingOS / SocialMediaOS)

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `marketingos` |
| **First module** | [SocialMediaOS](socialmediaos/PRODUCT_HOME.md) |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/marketingos/FILE_MANIFEST.json` |
| **Primary runtime surface** | `/api/v1/marketing/*` + `/marketing/*` UI (legacy `/api/v1/socialmediaos/*` not mounted on founder runtime — named blocker `LEGACY_SOCIALMEDIAOS_404`) |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-15 — Client signup: public `/marketing/signup` + JWT ownership + paid export gate. |

---

## Founder conversations (2026-06-29)

Multi-product ecosystem session routed per [`CANONICAL_PRODUCT_HOME_RULES.md`](../CANONICAL_PRODUCT_HOME_RULES.md):

| Topic | File |
|-------|------|
| Producer/director scaling model | [`socialmediaos/conversations/2026-06-29-producer-director-model.md`](socialmediaos/conversations/2026-06-29-producer-director-model.md) |
| Sticker mockup + print pricing | [`conversations/2026-06-29-directed-production-sticker-pricing.md`](conversations/2026-06-29-directed-production-sticker-pricing.md) |
| LimitlessOS business model (umbrella) | [`../limitlessos/PRODUCT_HOME.md`](../limitlessos/PRODUCT_HOME.md) |

Master verbatim: `docs/conversation_dumps/2026-06-29-limitlessos-ecosystem-founder-vision.md`

---

> **Y-STATEMENT:** In the context of founders and business owners who need consistent, authentic marketing content but hate feeling fake on camera and can't afford an agency, facing fragmented AI tools that produce generic output disconnected from their real voice and story, we decided to build MarketingOS as an AI-powered marketing intelligence and execution system to achieve authentic, founder-led content at scale, accepting that video generation and full publishing automation must wait until text/audio output has proven demand and revenue.

| Field | Value |
|---|---|
| **Lifecycle** | `planning` |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Last Updated** | 2026-07-12 |
| **Owner** | adam |
| **Parent System** | [LimitlessOS](../limitlessos/PRODUCT_HOME.md) |
| **First Module** | SocialMediaOS |
| **Verification Command** | `node scripts/verify-project.mjs --project marketingos` |
| **Manifest** | `docs/products/marketingos/FILE_MANIFEST.json` |
| **Build Ready** | `PHASE_1_CODE_AUTHORIZED` (2026-07-07) — Founder directed the autonomous loop to build SocialMediaOS Phase 1 now. The §12 open questions (pricing lead, first vertical, Creator Media OS relationship) are marketing/copy business decisions that do NOT block the Phase 1 session-pipeline CODE (schema, coach/extract/generate routes, review/export UI); the queue avoids baking in any unresolved copy. Audio/R2 remains gated on env-var verification. |

---

## 1. Canonical Purpose

**MarketingOS** is the marketing intelligence and execution system inside LimitlessOS. It turns a founder's real voice, real stories, and real expertise into a complete content, publishing, and campaign engine — without requiring them to be a marketer, videographer, or copywriter.

**SocialMediaOS** is the first customer-facing module. It begins with one interaction: the founder speaks naturally while an AI coach interviews them, pulls authentic hooks and stories, and turns that conversation into a full content pack. Everything else builds from this core loop.

**The central bet:** founders already have everything they need — they just can't get it out. The AI coach extracts it. The content engine formats it. The platform publishes it. The performance engine learns what works. The founder keeps their real voice throughout.

---

## 2. Product Boundary

### MarketingOS Owns
- AI coaching interview sessions (audio/text intake)
- Transcript generation and story extraction
- Social media content generation (posts, captions, hooks, scripts)
- YouTube content generation (outlines, titles, thumbnails, descriptions)
- Podcast production support (PodcastOS)
- Content calendar and approval workflow
- Publishing integrations (Phase 5+)
- Performance analytics and message learning
- Funnel generation and campaign intelligence (Phase 8)
- Ad copy and landing page copy
- TV/radio/print script generation
- Brand voice profile and channel memory
- MarketingOS → LimitlessOS insight feed

### MarketingOS Does NOT Own
- **LifeOS personal data** — hard wall; no access without explicit per-record consent
- **Creator Media OS (Creator Media OS)** — avatar-based video, likeness capture, cinematic production, channel-scale automated generation from likeness profiles. Creator Media OS is a sibling module, not a duplicate. MarketingOS uses real footage; Creator Media OS generates synthetic likeness video.
- **Video Pipeline (Video Pipeline)** — the shared Replicate/FFmpeg render stack is a dependency, not owned by MarketingOS. Do not rebuild it.
- **Outreach CRM (Outreach CRM)** — lead contact management, follow-up sequences, CRM records. MarketingOS generates content; Outreach CRM manages the people it reaches.
- **Productized Sprint (Productized Sprint)** — the manual delivery service offer layer. Productized Sprint is the Phase 0 revenue vehicle. MarketingOS is the platform that eventually automates what Productized Sprint currently delivers manually.
- **LifeOS Communication OS (LifeOS)** — personal relationship and communication intelligence. Different buyer, different purpose. No crossover.
- **BuilderOS** — the internal autonomous programming machine. MarketingOS is a product built by BuilderOS.

### Relationship Map

```
LimitlessOS (business intelligence layer)
└── MarketingOS (SocialMediaOS) ← you are here
    ├── SocialMediaOS (Phase 1-5)
    ├── YouTubeOS (Phase 6)
    ├── PodcastOS (Phase 9)
    └── CampaignOS (Phase 8-10)

Shared Infrastructure (read-only dependencies)
├── Video Pipeline — Video Pipeline (Replicate, FFmpeg, Kling, Wan)
├── Outreach CRM — Outreach CRM (lead management)
├── Creator Media OS — Creator Media OS (avatar/likeness video — separate product)
├── Productized Sprint — Productized Sprint (Phase 0 manual revenue)
├── General Browser Agent — TC-service (`services/general-browser-agent.js` + `-live.js` + `-runtime.js`, @ssot `docs/products/tc-service/PRODUCT_HOME.md`) — the goal-driven observe→decide→act→verify loop MarketingOS Phase 5 publishing reuses for social-account posting. Do not rebuild it; MarketingOS only adds platform goal configs + thin wiring on top.
└── LifeOS — LifeOS Core (personal data wall — constitutional boundary)

LifeOS (personal lane) ← hard wall — no MarketingOS access without explicit consent
```

---

## 3. Non-Negotiable Principles

These rules cannot be relaxed, papered over, or deferred. BuilderOS must enforce them at the code level.

**1. Authenticity over generic AI content.**
Every content piece must derive from something the founder actually said, believed, or experienced. The AI formats and polishes — it does not invent personality. A piece that sounds like it came from ChatGPT's "helpful assistant" default fails this principle.

**2. Real human voice, personality, and story first.**
The coaching session is the raw material. Without a session, there is no content. Content cannot be generated from a blank brief alone in Phase 1-4. The founder's words are the source of truth.

**3. Consent-first recording and likeness use.**
No recording session begins without a timestamped consent record in the database. Voice from one session cannot be reused in another without a separate consent event. Likeness (video, photo) requires a separate consent level. No exceptions.

**4. Employee LifeOS data and employer LimitlessOS/MarketingOS data are separated by a hard wall.**
MarketingOS serves business owners. LifeOS serves individuals. An employee's LifeOS data (health, relationships, emotional patterns, finances) is constitutionally protected from any employer-accessible system. No MarketingOS service may query LifeOS personal tables. Insight sharing in Phase 10 is opt-in, founder-initiated, business-data only.

**5. No hidden employer access to personal employee data.**
If a business owner uses MarketingOS to manage a team of content creators, the creators' personal LifeOS data is inaccessible. Creator session data (their recorded sessions, their content) belongs to them, not the business owner, unless explicit assignment consent is recorded.

**6. No auto-publishing without explicit per-piece approval.**
Every content piece goes through an approval step before publishing. A platform integration does not bypass this. Batch approval is acceptable; silent auto-publish is not.

**7. Revenue-first build order.**
Phase 0 (manual revenue) starts before Phase 1 code is written. Phase 1 (text/audio MVP) must produce paying customers before Phase 3 (video clip workflow) begins. Do not build expensive features before cheaper ones prove demand.

**8. No AI video generation before text/audio MVP proves demand.**
AI video generation (Replicate API, Kling, Wan) requires confirmed FFmpeg on Railway, a BullMQ async queue, and storage infrastructure. Do not enable these until Phase 3 readiness gate passes AND Phase 1 has active paying customers.

---

## 4. Complete Feature Inventory

Listed in logical build order. Phase assignments are in Section 5.

### Coaching & Capture
- AI interview coach (conversational, warm, encouraging)
- Camera confidence coach (psychological safety mode before recording)
- Real-time encouragement during session ("that's powerful")
- "That was the hook" detection — flags high-energy moments automatically
- "Say it to one person" redirect — intercepts generalities, asks for a specific person
- Objection mining prompt — "what's the #1 reason someone doesn't hire you?"
- Phone/mobile browser recording (audio and video)
- Sound quality check before session begins
- Lighting check (Phase 4)
- Framing check (Phase 4)
- Background check / background replacement (Phase 4)
- Green screen support (Phase 4)
- Multi-person recording (Phase 9)
- Multi-camera sync (Phase 9)
- Automatic camera angle selection (Phase 9)
- Live AI producer (Phase 9)
- Call-in screening for podcast mode (Phase 9)

### Transcription & Extraction
- Transcript generation (Whisper-1 via existing `services/word-keeper-transcriber.js`)
- Story extraction
- Hook extraction (best opening lines)
- Objection extraction
- Offer extraction
- CTA extraction
- Emotional truth extraction
- Clip extraction (timestamp-based — Phase 3)
- Content atom library (reusable fragments — Phase 2)

### Content Generation
- Social posts (Instagram, LinkedIn, X, Facebook)
- Captions with hashtags
- Short video scripts (30-60 second)
- YouTube video outlines (Phase 6)
- YouTube long-form support (Phase 6)
- YouTube Shorts support (Phase 6)
- YouTube titles with A/B variants (Phase 6)
- Thumbnail generation (Phase 6)
- Thumbnail A/B testing (Phase 6)
- Retention analysis (Phase 6)
- B-roll request lists (what b-roll would make this better)
- Client-provided b-roll library (Phase 3)
- Stock b-roll support (Phase 3)
- Subtitles and captions overlay (Phase 3)
- Graphics and lower thirds (Phase 9)
- Audio cleanup and studio-quality phone audio enhancement (Phase 4)
- Video cleanup (Phase 3)
- Ad copy (Phase 8)
- Landing page copy (Phase 8)
- Email campaigns and nurture sequences (Phase 8)
- TV/radio/print scripts (Phase 8)
- Podcast episode outlines (Phase 9)
- Delayed podcast broadcast protection (Phase 9)

### Brand & Memory
- Brand voice profile (built from first 3 approved sessions)
- Brand voice fingerprinting (auto-checks new content against profile)
- Founder footage bank (consent-tagged reusable clips — Phase 3)
- Channel memory / performance memory
- Consent levels for asset reuse (session-only / session + 90d / perpetual)

### Workflow
- Approval workflow (per-piece approval, batch approval)
- Content calendar
- Scheduling (connected to publishing — Phase 5)
- Manual export / download pack (Phase 1)

### Publishing & Analytics
- Platform publishing (Instagram, LinkedIn, X, Facebook — Phase 5)
- YouTube upload and metadata push (Phase 6)
- Analytics ingestion (Phase 7)
- Performance memory (which hooks work, which platforms convert — Phase 7)
- Campaign learning (Phase 7)
- Lead tracking (Phase 7)
- Pain point discovery (what objections reveal about market gaps — Phase 7)
- New solution discovery (Phase 7)
- MarketingOS insights feeding LimitlessOS (Phase 10)

### Campaign Engine
- Funnel generation (Phase 8)
- Click funnel copy and structure (Phase 8)
- Lead magnet generation (Phase 8)
- Campaign orchestration (Phase 8)
- Budget allocation recommendations (Phase 10)
- Cross-channel strategy (Phase 10)
- Autonomous marketing recommendations (Phase 10)

---

## 5. A-to-Z Phased Build Plan

---

### Phase 0 — Manual Revenue Sprint
**No code required. Start today.**

**Goal:** Generate first revenue before any platform code is written.

**User-facing outcome:** Founders pay for a deliverable (content pack) manually assembled by Adam using AI tools.

**Features included:**
- AI coaching session over Zoom (Adam hosts)
- Manual transcript (Whisper-1 locally or Otter.ai)
- Manual content extraction using AI council prompts
- 30-post content pack delivered by email

**Features excluded:** Everything else.

**Database tables:** None.

**Backend services:** None.

**Routes/endpoints:** None.

**UI screens:** None.

**External APIs:** Zoom (for session), Whisper or Otter.ai (for transcript), AI council (local).

**Cost control:** Zero infrastructure cost. AI council call ~$0.50–$2.00 per brief.

**Revenue:** $997 via Productized Sprint "Build My Thing" offer. Stripe payment link only.

**Test requirements:** Adam runs 3 sessions, delivers 3 content packs, collects real feedback.

**Readiness gate:** Stripe payment link exists. Intake form exists. Adam has run ≥1 test session.

**Exit criteria:** At least 1 paying customer. Session format is documented. Top 5 coaching questions are validated. Pricing is validated.

---

### Phase 1 — Founder Story Session MVP
**First platform code. Text/audio only.**

**Goal:** Replace the manual Zoom workflow with a self-serve session platform.

**User-facing outcome:** Founder opens the app, has a coached conversation (text or audio), receives a downloadable content pack of 5–10 approved posts.

**Features included:**
- Create session
- Audio upload → Whisper transcript OR text-based conversation mode
- AI coach conversation (Haiku, warm system prompt)
- Post-session extraction (Gemini Flash → structured JSON)
- Content generation (Claude Sonnet, brand voice aware)
- Per-piece approval
- Download export (formatted text file)
- Consent record created before session starts
- Brand voice profile (basic — manual input for niche/tone)

**Features excluded:** Video, calendar, scheduling, publishing, analytics, phone recording quality checks, likeness features, multi-person, funnel/ad copy, team/multi-user accounts (Phase 2), email delivery of exports (Phase 2), multi-language transcription/coaching/generation (Phase 2+). **Phase 1 is English-only. Export is download-only.**

**Database tables:** `marketing_sessions`, `marketing_content_extractions`, `marketing_content_pieces`, `marketing_channel_profiles`, `marketing_consent_records` (see Section 6 for exact schema).

**Backend services:** `services/marketing-coach.js`, `services/marketing-content-engine.js`, `services/marketing-transcriber.js`, `routes/marketing-routes.js`.

**Routes/endpoints:** See Section 6 for exact route list.

**UI screens:**
- `/marketing` — landing/dashboard
- `/marketing/session/new` — consent + session setup
- `/marketing/session/:id` — coaching conversation + audio upload
- `/marketing/session/:id/content` — review and approve generated pieces
- `/marketing/session/:id/export` — download pack

**External APIs:**
- OpenAI Whisper-1 — VERIFIED (`services/word-keeper-transcriber.js` in production)
- Anthropic (Haiku + Sonnet) — VERIFIED (AI council operational)
- Google Gemini Flash — VERIFIED (AI council operational)
- Cloudflare R2 (audio upload/storage) — UNVERIFIED pending Railway env vars; **DECIDED: R2 is the Phase 1 storage provider**. AWS S3 is a future optional alternative, not a Phase 1 decision. Required env vars: `STORAGE_PROVIDER=r2`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`.

**Cost control:** ~$0.46/session total (see Section 6). Route through cheapest capable model at each stage.

**Test requirements:**
- 5 full sessions end-to-end with real content
- Transcript accuracy ≥ 90% for clear audio
- Content pieces pass authenticity check (does not sound like default AI)
- Consent record created before every session
- Export delivers complete pack

**Readiness gate:** Cloudflare R2 bucket created and env vars set (`STORAGE_PROVIDER`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`). Whisper key confirmed. At least 1 beta user. `node scripts/verify-marketing-phase1.mjs` passes all 9 tests.

**Exit criteria:** 5 paying users at $49/session OR 2 users at $199/month. Content quality validated by real founders (not Adam).

---

### Phase 2 — Social Content Calendar
**Brand memory, content atoms, calendar view.**

**Goal:** Users can see their content across time, reuse their best atoms, and track what's been approved vs. used.

**User-facing outcome:** A calendar view showing 30 days of content. Founder can pull from their library of past hooks and stories to repurpose.

**Features included:**
- Content calendar (30-day view)
- Content atom library (extracted hooks and stories across all sessions)
- Brand voice profile (built from ≥3 approved sessions, not manual)
- Brand voice fingerprinting (score new content against voice profile)
- Reuse consent level per asset (session-only / 90d / perpetual)
- Manual scheduling support (mark date for each piece)

**Features excluded:** Publishing integrations (no posting yet), video, analytics.

**New database tables:** `marketing_content_atoms`, `marketing_calendar_slots`.

**New services:** `services/marketing-brand-voice.js` (fingerprint builder + content scorer).

**New routes:** `GET /api/v1/marketing/calendar`, `POST /api/v1/marketing/atoms`, `GET /api/v1/marketing/atoms`.

**UI screens:** Content calendar view, atom library browser.

**External APIs:** No new ones.

**Cost control:** Brand voice fingerprinting runs locally using stored session data — no new AI calls per check.

**Readiness gate:** Phase 1 exit criteria met. ≥3 sessions with approved content exist for at least 1 user.

**Exit criteria:** Calendar view live. ≥1 user has populated brand voice profile from real sessions. Atom library shows ≥20 extractable items.

---

### Phase 3 — Video Clip Workflow
**Upload existing footage, extract clips, add captions. No AI video generation yet.**

**Goal:** Founder uploads a video they already recorded (Zoom recording, phone video, etc.), and the platform recommends clips, adds captions, and creates a shareable export.

**User-facing outcome:** Upload a 20-minute Zoom recording → get 5 recommended short clips with captions → download as MP4s.

**Features included:**
- Video file upload (browser → storage)
- Transcript with timestamps (Whisper-1 with word-level timestamps)
- Clip recommendation (AI identifies best 30-60 second segments from transcript)
- Caption overlay generation
- B-roll request list (what footage would improve each clip)
- Client b-roll library (upload and tag b-roll clips)
- Stock b-roll suggestions (text description, not auto-sourced)
- Basic video editing export (captions burned in via FFmpeg — conditional on Railway confirmation)
- Founder footage bank (consent-tagged reusable clips)

**Features excluded:** AI-generated video (Kling, Wan), avatar/likeness video, multi-camera, live production.

**BLOCKED dependency:** FFmpeg on Railway must be VERIFIED before video processing is built. If not confirmed, clip recommendations and transcript timestamps are built; FFmpeg processing is deferred to Phase 3b.

**New database tables:** `marketing_video_uploads`, `marketing_video_clips`, `marketing_broll_library`.

**New services:** `services/marketing-video-processor.js` (upload, timestamp extraction, clip recommendation), `services/marketing-caption-engine.js`.

**New routes:** `POST /api/v1/marketing/videos`, `GET /api/v1/marketing/videos/:id/clips`, `POST /api/v1/marketing/videos/:id/export`.

**External APIs:**
- FFmpeg on Railway — UNVERIFIED (must confirm before building video export)
- OpenAI Whisper with word timestamps — UNVERIFIED (word-level timestamp feature — test before building)
- Storage (video files, potentially large) — must be confirmed with size limits

**Readiness gate:** Phase 2 exit criteria met. FFmpeg on Railway VERIFIED. Storage confirmed for video upload sizes. Whisper word timestamps tested.

**Exit criteria:** ≥1 user successfully uploads a video, receives clip recommendations, downloads a captioned export.

---

### Phase 4 — Phone Recording Studio
**Mobile-first recording with quality guidance.**

**Goal:** Founder opens the app on their phone, gets coached on framing, lighting, and sound before starting, then records the session directly in the browser.

**User-facing outcome:** Tap "Start Session" on phone → app checks camera/mic → AI guides setup → record directly → session auto-uploaded.

**Features included:**
- Browser-based audio and video recording (MediaRecorder API)
- Sound quality check (amplitude analysis before recording starts)
- Lighting check (brightness/contrast analysis via canvas frame capture)
- Framing check (face detection — centered, close enough)
- Background check (blur/replace background post-recording)
- Guided interview mode (on-screen prompts from AI coach during recording)
- Studio-quality phone audio enhancement (noise suppression, normalization)
- Green screen support (background replacement)
- Mobile PWA session experience

**Features excluded:** Multi-camera, live AI producer, caller screening.

**New database tables:** `marketing_recording_sessions` (separate from text sessions — stores device info, quality check results).

**New services:** `services/marketing-recording-quality.js` (sound/lighting/framing analysis), `services/marketing-audio-enhancer.js`.

**New routes:** `POST /api/v1/marketing/recording/check`, `POST /api/v1/marketing/recording/start`, `POST /api/v1/marketing/recording/upload`.

**External APIs:**
- Web Audio API (browser native — VERIFIED in Word Keeper)
- MediaRecorder API (browser native — VERIFIED in Word Keeper)
- Audio enhancement: UNVERIFIED — options: Dolby.io, Krisp.ai, or local FFmpeg noise filter

**Readiness gate:** Phase 3 exit criteria met. Audio enhancement vendor chosen and confirmed.

**Exit criteria:** ≥3 users record a session on mobile. Audio quality is noticeably better than raw. Lighting check reduces "bad setup" content.

---

### Phase 5 — Social Publishing Integrations
**Direct platform publishing through approved APIs or third-party scheduler.**

**Goal:** Approved content pieces can be published directly to social platforms without copy-pasting.

**User-facing outcome:** Click "Schedule" on an approved post → choose platform and date → post goes live automatically.

**Features included:**
- Publishing to Instagram, LinkedIn, X (Twitter), Facebook
- Scheduling (date + time per platform)
- Platform-specific format enforcement (character limits, aspect ratios, etc.)
- Publish confirmation and receipt
- Publishing audit log (what was sent, when, to which account)

**Features excluded:** Analytics ingestion (Phase 7), campaign automation (Phase 8).

**Architecture decision — REVISED 2026-07-10 (supersedes the original Buffer/Publer-first note below the strikethrough):** Publish via replay-first browser-agent template automation, not a native OAuth publishing API and not a Buffer/Publer subscription. This repo already has a proven, Chair-approved (`LIFERE_COUNCIL_1783455558829`) goal-driven browser agent — `services/general-browser-agent.js` (observe→decide→act→verify loop) + `services/general-browser-agent-live.js` (live Puppeteer wiring) — in production use for TC-service (eXp/GLVAR/SkySlope) and founder-authorized account signups. It explores a site once (expensive, AI-driven), captures a reusable `{site, goal, steps}` template on independently-evidenced success, and replays that template directly on every later run (cheap, near-instant) — only falling back to a fresh explore pass, which automatically recaptures an updated template, if replay's evidence check fails (i.e. the platform's UI changed). MarketingOS adds nothing to that core; it only adds per-platform goal configs (`services/marketing-social-goals.js`) and thin orchestration (`services/marketing-publisher.js`) on top. Chosen over Buffer/Publer/native OAuth because it needs no per-platform developer app review, no per-seat scheduler subscription, and self-heals when a platform changes its UI instead of needing a code fix. **External dependency — Grok:** Adam has a separate effort (Grok) building the per-platform sign-in window (the human login moment, one-time, stays connected). The ONLY seam between that effort and this one is `services/marketing-social-connections.js` — whichever process completes a platform login must persist the resulting authenticated browser session there. **Honesty flag for Adam (business-risk decision, not an engineering blocker):** automating posting outside a platform's official API can conflict with that platform's Terms of Service on non-API automation — the real risk is account friction or suspension on the founder's or a client's own account, not a technical risk. A global kill switch (`LIVE_SOCIAL_PUBLISH_ENABLED` Railway env var, default unset/off) gates any real platform action until this is knowingly turned on. Queued as 6 composing steps in `docs/products/marketingos/BUILD_QUEUE.json` (`mos-social-schema` → `mos-social-connections-service` + `mos-social-goal-library` → `mos-social-publisher` → `mos-social-publish-route` → `mos-social-sentry-layer-a`) — see that file's `phase5_social_publish_notes` for full detail. Per SO-001 no browser-driving or publishing logic was hand-authored here; only this spec + the queue's task/spec fields (blueprint-level) were.

~~Original 2026-05-30 note (superseded): "Use Buffer API or Publer API as the first publishing layer rather than building native platform integrations... Revisit direct integrations only if Buffer/Publer pricing becomes a problem at scale."~~

**New database tables:** `marketing_publish_records`, `marketing_social_connections` (session-based — encrypted cookies/storage-state, not OAuth tokens), `marketing_social_posting_templates` (the reusable browser-agent templates).

**New services:** `services/marketing-social-connections.js` (encrypted connection store — the seam with Grok's sign-in flow), `services/marketing-social-goals.js` (per-platform goal config, no browser logic), `services/marketing-publisher.js` (replay-first orchestration on top of the proven browser-agent core).

**New routes:** `GET /api/v1/marketing/social-connections`, `POST /api/v1/marketing/publish`.

**External APIs / dependencies:**
- `services/general-browser-agent.js` + `-live.js` + `-runtime.js` — VERIFIED (SENTRY PASS + behavioral proofs, live in TC-service; shared dependency, not owned by MarketingOS)
- `core/tco-encryption.js` (AES-256-GCM) — VERIFIED, reused for `session_state_encrypted` — do not reimplement crypto
- Grok's per-platform sign-in window — EXTERNAL, in progress; contract is `marketing-social-connections.js` `saveConnection(...)`
- Buffer API / Publer API / native Meta or LinkedIn OAuth — NOT USED (superseded by the browser-agent decision above)

**Readiness gate:** Phase 4 exit criteria met. At least one platform connection exists via the Grok sign-in flow (or the browser agent driving a login directly). `LIVE_SOCIAL_PUBLISH_ENABLED` set only when Adam has accepted the ToS/account-risk flag above.

**Exit criteria:** ≥1 post successfully published to ≥1 platform via template replay or explore-fallback, with a real independently-evidenced success (never self-reported). Publish audit log (`marketing_publish_records`) populated. A second post to the same platform takes the cheap replay path (proves the templatize-once/replay-cheap economics).

---

### Phase 6 — YouTubeOS
**YouTube-specific content engine: titles, thumbnails, descriptions, A/B testing, Shorts.**

**Goal:** A founder with a YouTube channel can run their entire content workflow through MarketingOS — from coaching session to published video with optimized metadata.

**User-facing outcome:** Upload a video → get 3 title variants → 3 thumbnail concepts → SEO description → tags → publish to YouTube → track performance.

**Features included:**
- YouTube title generation with A/B variants (3 per video)
- Thumbnail generation (image generation via Flux Schnell or DALL-E — UNVERIFIED: evaluate cost)
- Thumbnail A/B testing (YouTube experiment API — UNVERIFIED)
- SEO description generation
- Tag generation
- Chapters and timestamps from transcript
- YouTube Shorts extraction (identify ≤60s segments optimized for Shorts format)
- YouTube long-form support (full video with transcript, chapters, description)
- Retention analysis (where viewers drop off — requires YouTube Analytics API)

**Features excluded:** YouTube Studio automation (use YouTube Data API only), ad campaign management (Phase 8).

**Architecture decision:** YouTube upload via YouTube Data API v3 (OAuth 2.0 per user). No service account approach — each founder connects their own channel. **CONFIRMED 2026-07-10 (Adam asked directly: one API key for YouTube, or one per client?):** ONE shared Google Cloud OAuth app (Client ID + Secret) covers every client — this repo already has that OAuth2Client pattern live for Google Calendar (`services/google-calendar-service.js`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), and the SAME Google Cloud project/app can serve YouTube scopes too (enable the YouTube Data API, add its scopes, register a new redirect URI on the existing OAuth client — no second app needed). Each client still does a one-time consent, but it happens entirely on Google's real login page — no password ever passes through MarketingOS or any AI agent. Two app-wide (not per-client) caps to plan around: the OAuth app is capped at 100 total authorized users while in Google's "Testing" publishing status (lifting it requires Google verification), and `videos.insert` has its own ~100-uploads/day bucket shared across all clients combined (separate from the general 10,000-unit/day quota) — cross either and file Google's audit/quota-extension form. Queued as `mos-youtube-oauth-service` + `mos-youtube-connect-routes` + `mos-youtube-sentry-layer-a` in `BUILD_QUEUE.json`, reusing the existing `user_integrations` table (provider `youtube_channel`) for the token itself rather than the `marketing_youtube_channels` table below, which remains for later channel-metadata caching.

**New database tables:** `marketing_youtube_channels`, `marketing_youtube_videos`, `marketing_youtube_performance`.

**New services:** `services/marketing-youtube.js` (YouTube Data API adapter), `services/marketing-thumbnail-engine.js`.

**New routes:** `POST /api/v1/marketing/youtube/connect`, `POST /api/v1/marketing/youtube/upload`, `GET /api/v1/marketing/youtube/:id/performance`.

**External APIs:**
- YouTube Data API v3 — UNVERIFIED (OAuth app registration required)
- YouTube Analytics API — UNVERIFIED (same OAuth app)
- Flux Schnell (Replicate) for thumbnails — PARTIALLY VERIFIED (in `services/video-pipeline.js` but untested for thumbnail use)

**Readiness gate:** Phase 5 exit criteria met. YouTube OAuth app registered. At least 5 users actively using Phase 5.

**Exit criteria:** ≥1 user publishes a YouTube video through MarketingOS. Thumbnail generation produces usable output. Title A/B test variant deployed.

---

### Phase 7 — Performance Learning Engine
**Analytics ingestion, message learning, what works and what doesn't.**

**Goal:** The system learns which hooks, stories, CTAs, and platforms work for each founder — and uses that to improve future content generation.

**User-facing outcome:** "Your 'specific number' hooks get 3× more engagement than 'vague benefit' hooks. Your LinkedIn audience responds to personal stories; your Instagram audience responds to quick tips."

**Features included:**
- Analytics ingestion from connected platforms (engagement, reach, clicks)
- Message learning (which extraction types perform best per platform)
- Audience learning (which segments engage with which content types)
- Pain point discovery (what objections and questions appear in comments)
- New solution discovery (what gaps the audience is articulating)
- Performance memory integrated into content generation (generation prompt includes performance context)
- Lead tracking (which content pieces drive DMs, link clicks, form fills)
- MarketingOS → LimitlessOS insight feed (business intelligence events, consent-gated)

**New database tables:** `marketing_performance_events`, `marketing_audience_signals`, `marketing_message_patterns`.

**New services:** `services/marketing-performance-engine.js` (analytics ingestion, pattern detection), `services/marketing-insight-router.js` (routes signals to LimitlessOS — consent-gated).

**Readiness gate:** Phase 6 exit criteria met. ≥10 users with ≥30 days of published content. Platform analytics APIs connected.

**Exit criteria:** Performance memory influences content generation with measurable quality improvement. ≥3 pain points or solution signals identified from real comment data.

---

### Phase 8 — Funnel + Campaign Engine
**Landing pages, email sequences, ads, lead magnets, campaign orchestration.**

**Goal:** A full session generates not just social content but an end-to-end campaign: landing page, lead magnet, email sequence, and ad copy.

**User-facing outcome:** One coaching session → complete campaign package: landing page copy, 5-email nurture sequence, Facebook ad copy, and a PDF lead magnet outline.

**Features included:**
- Funnel generation (copy and structure — not a visual builder)
- Click funnel copywriting
- Lead magnet generation (PDF outline + key sections)
- Email campaign sequences (welcome + nurture)
- Facebook/Instagram ad copy variants
- Landing page copy (Webflow/Squarespace paste-ready)
- Campaign orchestration (link session → extractions → campaign outputs)
- TV/radio/print script variants from session

**Excluded:** Building websites (Site Builder Site Builder owns that). Paid ad management, budget management (Phase 10).

**New database tables:** `marketing_campaigns`, `marketing_campaign_assets`.

**New services:** `services/marketing-funnel-engine.js`, `services/marketing-campaign-builder.js`.

**Readiness gate:** Phase 7 exit criteria met. Performance engine has ≥60 days of data. ≥20 active users.

**Exit criteria:** ≥1 complete campaign package delivered through the platform. Lead magnet generates ≥1 real lead.

---

### Phase 9 — AI Producer / PodcastOS
**Full podcast production support and live AI producer capability.**

**Goal:** Founders running a podcast can use MarketingOS as their production studio: recording, editing, show notes, episode distribution, and live AI producer support.

**User-facing outcome:** Record a podcast episode (solo or with a guest) → AI produces show notes, timestamps, episode title, social clips → publish to RSS feed and platforms.

**Features included:**
- Podcast episode recording (multi-person via browser WebRTC)
- Delayed broadcast protection (buffer between live recording and release)
- Live AI producer (real-time coaching and cue cards during recording)
- Caller/guest screening
- Show notes generation
- Chapter markers and timestamps
- Podcast episode title and description generation
- Social clips from podcast (short extracts for social)
- RSS feed generation or podcast platform integration
- Graphics and lower thirds (episode card, social share image)
- Sound effects and music bed suggestions
- Multi-camera sync (if video podcast)
- Automatic camera angle selection (based on who is speaking)

**New database tables:** `marketing_podcast_episodes`, `marketing_podcast_feeds`, `marketing_podcast_guests`.

**New services:** `services/marketing-podcast-producer.js`, `services/marketing-live-producer.js`.

**External APIs:**
- WebRTC for multi-person recording — UNVERIFIED
- Podcast RSS generation — UNVERIFIED (evaluate: Transistor.fm API or self-hosted)
- Real-time AI inference for live producer — UNVERIFIED (requires low-latency model endpoint)

**Readiness gate:** Phase 8 exit criteria met. ≥5 users with regular publishing cadence. Live producer latency tested below 500ms.

**Exit criteria:** ≥1 podcast episode produced end-to-end through MarketingOS. RSS feed valid and accepted by Apple Podcasts.

---

### Phase 10 — Full MarketingOS Intelligence Layer
**AI marketing department, cross-channel strategy, budget allocation, autonomous recommendations.**

**Goal:** MarketingOS acts as a full-time AI marketing director — tracking performance across all channels, making strategic recommendations, allocating budget, and feeding business intelligence back to LimitlessOS.

**User-facing outcome:** "This week: your LinkedIn is up 40%. Your email list is converting at 2.3%. Your top-performing pain point is 'I don't know what to post.' Recommendation: run a 3-part series on your process. Estimated cost: 2 hours + $120 in ads. Expected leads: 15–30."

**Features included:**
- Cross-channel performance synthesis
- Budget allocation recommendations (where to spend ad dollars based on performance data)
- Autonomous content recommendations (when to post, what to post, based on calendar and performance)
- Competitive signal awareness (what messaging categories are crowded vs. open)
- MarketingOS → LimitlessOS insight feed (confirmed business signals, consent-gated, business data only — no personal LifeOS data flows in reverse)
- Quarterly content strategy generation

**Readiness gate:** Phase 9 exit criteria met. ≥6 months of performance data. ≥50 active users. LimitlessOS insight feed API contract defined with explicit consent model.

---

## 6. MVP Technical Specification (Phase 1 — Exact)

### Database Schema

```sql
-- marketing_consent_records
-- Created BEFORE any session record. Required.
CREATE TABLE marketing_consent_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL,
  consent_type  TEXT NOT NULL CHECK (consent_type IN ('session_recording','voice_reuse','likeness_reuse','data_sharing')),
  consent_text  TEXT NOT NULL,  -- exact text shown to user at time of consent
  consented_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    TEXT,
  session_id    UUID,           -- populated after session created (circular ref OK)
  revoked_at    TIMESTAMPTZ,
  CONSTRAINT no_revocation_update CHECK (revoked_at IS NULL OR revoked_at > consented_at)
);
CREATE INDEX idx_consent_owner ON marketing_consent_records(owner_id);
CREATE INDEX idx_consent_session ON marketing_consent_records(session_id);

-- marketing_sessions
CREATE TABLE marketing_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL,
  business_id         UUID,         -- future: for team accounts
  consent_record_id   UUID NOT NULL REFERENCES marketing_consent_records(id),
  session_type        TEXT NOT NULL DEFAULT 'coaching' CHECK (session_type IN ('coaching','interview','freestyle')),
  input_mode          TEXT NOT NULL DEFAULT 'text' CHECK (input_mode IN ('text','audio','both')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','extracting','generating','completed','abandoned')),
  raw_audio_url       TEXT,         -- storage URL; nullable if text-only
  transcript_text     TEXT,
  coach_messages_json JSONB NOT NULL DEFAULT '[]',
  extraction_run_at   TIMESTAMPTZ,
  generation_run_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);
CREATE INDEX idx_sessions_owner ON marketing_sessions(owner_id);
CREATE INDEX idx_sessions_status ON marketing_sessions(status);

-- marketing_content_extractions
CREATE TABLE marketing_content_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('hook','story','teaching','objection','offer','cta','emotional_truth')),
  raw_text        TEXT NOT NULL,
  confidence_score NUMERIC(3,2),   -- 0.00–1.00
  source_quote    TEXT,            -- the exact transcript line that generated this
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_extractions_session ON marketing_content_extractions(session_id);
CREATE INDEX idx_extractions_type ON marketing_content_extractions(extraction_type);

-- marketing_content_pieces
CREATE TABLE marketing_content_pieces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
  extraction_id     UUID REFERENCES marketing_content_extractions(id),
  platform          TEXT NOT NULL CHECK (platform IN ('instagram','linkedin','x','facebook','email','general')),
  format            TEXT NOT NULL CHECK (format IN ('post','caption','hook','subject_line','thread','short_script')),
  content_text      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','published','rejected')),
  generated_by_model TEXT,
  regeneration_count INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pieces_session ON marketing_content_pieces(session_id);
CREATE INDEX idx_pieces_status ON marketing_content_pieces(status);
CREATE INDEX idx_pieces_platform ON marketing_content_pieces(platform);

-- marketing_channel_profiles
CREATE TABLE marketing_channel_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID NOT NULL UNIQUE,
  business_id           UUID,
  channel_name          TEXT,
  niche                 TEXT,
  brand_voice_json      JSONB NOT NULL DEFAULT '{}',
  audience_json         JSONB NOT NULL DEFAULT '{}',
  posting_cadence_json  JSONB NOT NULL DEFAULT '{}',
  performance_memory_json JSONB NOT NULL DEFAULT '{}',
  sessions_count        INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_channel_profile_owner ON marketing_channel_profiles(owner_id);
```

### Route List

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/marketing/consent` | requireKey | Create consent record before session |
| POST | `/api/v1/marketing/sessions` | requireKey | Create session (requires consent_record_id) |
| POST | `/api/v1/marketing/sessions/:id/audio` | requireKey | Upload audio chunk → trigger transcription |
| POST | `/api/v1/marketing/sessions/:id/coach` | requireKey | Send message → AI coach response |
| POST | `/api/v1/marketing/sessions/:id/extract` | requireKey | Run extraction pass on completed transcript |
| POST | `/api/v1/marketing/sessions/:id/generate` | requireKey | Generate content pieces from extractions |
| GET  | `/api/v1/marketing/sessions/:id` | requireKey | Get session state |
| GET  | `/api/v1/marketing/sessions/:id/content` | requireKey | Get all generated pieces with status |
| PATCH | `/api/v1/marketing/content/:id` | requireKey | Approve / reject / regenerate a piece |
| GET  | `/api/v1/marketing/sessions/:id/export` | requireKey | Download content pack as formatted text |
| GET  | `/api/v1/marketing/channel-profile` | requireKey | Get or create channel profile |
| PUT  | `/api/v1/marketing/channel-profile` | requireKey | Update channel profile |

### Service List

**`services/marketing-coach.js`**
Manages AI coaching conversation. Maintains message history in the session's `coach_messages_json`. Detects hook moments (energy, specificity, numbers) and flags them in the response. Sends warm, encouraging system prompt.

```js
// exports:
// sendCoachMessage(sessionId, userMessage, pool) → { response, hookDetected, hookText }
// buildCoachSystemPrompt(channelProfile) → string
// detectHookMoment(text) → { isHook, reason }
```

**`services/marketing-content-engine.js`**
Two-stage: extraction (Gemini Flash) then generation (Claude Sonnet).

```js
// exports:
// extractFromTranscript(transcript, sessionId, pool) → extraction[] (saved to DB)
// generatePieces(sessionId, extractions, channelProfile, pool) → piece[] (saved to DB)
// regeneratePiece(pieceId, hint, pool) → piece (updated in DB)
```

**`services/marketing-transcriber.js`**
Thin wrapper around `services/word-keeper-transcriber.js` for URL-based audio.

```js
// exports:
// transcribeFromUrl(audioUrl) → transcript string
// transcribeFromBuffer(buffer, mimeType) → transcript string
```

### Prompt Pipeline

**Stage 1 — Coach system prompt:**
```
You are an encouraging content coach helping a founder share their story.
Your job: ask one question at a time. Listen for specific stories, concrete numbers,
emotional moments, and surprising insights. When you hear something powerful, say
exactly: "HOOK DETECTED: [quote their words back]" then ask "tell me more about that."
When they speak in generalities ("we help businesses..."), redirect: "Who is one
specific person this helped? Tell me about them."
Never summarize. Never list. Just ask, encourage, and extract.
```

**Stage 2 — Extraction prompt (Gemini Flash, JSON output):**
```
You are a content strategist. Analyze this transcript and extract the most useful
marketing material. Return a JSON array with this exact structure:
[{
  "extraction_type": "hook|story|teaching|objection|offer|cta|emotional_truth",
  "raw_text": "the extracted content, verbatim or lightly cleaned",
  "confidence_score": 0.0-1.0,
  "source_quote": "the exact transcript line that generated this",
  "why_it_works": "one sentence"
}]
Focus on: surprising facts, specific numbers, emotional moments, objection reveals,
offer clarity. Extract at least 2 of each type if present.
```

**Stage 3 — Generation prompt (Claude Sonnet, per piece):**
```
You are writing social media content for a founder. Use their exact voice.
Do not sound like an AI assistant. Do not use generic phrases like "In today's world"
or "As a business owner."

Brand voice: {{brand_voice_json}}
Platform: {{platform}}
Format: {{format}}
Source material: {{extraction.raw_text}}
Why it works: {{extraction.why_it_works}}

Write one {{format}} for {{platform}}. Match their vocabulary and energy exactly.
If they use casual language, be casual. If they're formal, be formal.
Start with the hook. End with a clear CTA or question. Under {{char_limit}} characters.
```

### Model Routing

| Stage | Model | Reason | Estimated cost/session |
|---|---|---|---|
| Coaching conversation (per message) | `claude-haiku-4-5-20251001` | Fast, warm, low latency | ~$0.03 per exchange |
| 20-exchange session total | Haiku | — | ~$0.08 |
| Extraction pass | `gemini-flash` | Structured JSON, cheap, good at classification | ~$0.02 |
| Audio transcription (10 min) | `whisper-1` | Only option; $0.006/min | ~$0.06 |
| Generation (7 pieces × 2 platforms) | `claude-sonnet-4-6` | Voice quality critical | ~$0.30 |
| **Total per session** | — | — | **~$0.46** |

### Consent Record Pattern

```js
// Every session creation must follow this sequence:
// 1. POST /api/v1/marketing/consent → get consent_record_id
// 2. POST /api/v1/marketing/sessions with consent_record_id in body
// 3. If consent_record_id is missing or revoked → 400 error, session not created

// Consent text shown to user (must match what is stored in consent_text field):
const CONSENT_TEXT = `I consent to this conversation being recorded and transcribed
to generate marketing content on my behalf. This recording will not be shared
with third parties or used beyond generating my content without separate consent.`;
```

### Export Format

**Phase 1: Download-only.** The export endpoint returns a file download (Content-Disposition: attachment). No email delivery in Phase 1. Email delivery of content packs moves to Phase 2, using existing email infrastructure only after it is confirmed VERIFIED and safe for this use case.

Plain text file, UTF-8, structured as:
```
CONTENT PACK — [Session Date]
Brand: [channel_name]
Session Type: [session_type]
Generated: [timestamp]

────────────────────────────────────────
INSTAGRAM POST 1
────────────────────────────────────────
[content_text]

[... repeat per approved piece ...]

────────────────────────────────────────
SOURCE: This content was extracted from your founder coaching session on [date].
All pieces approved by you on [approval_date].
```

### Error Handling

- Missing consent record → 400 `{ error: "consent_required", message: "Create a consent record before starting a session." }`
- Whisper transcription fails → 503, mark session `status: 'abandoned'`, return user-readable message
- Extraction returns empty JSON → retry once with temperature 0; if still empty → return 422 with raw transcript for manual review
- Generation model error → retry with fallback model (Haiku); flag `generated_by_model: 'fallback'` in piece record
- Audio upload too large → 413 with size limit message (50MB max for Phase 1)
- Browser close / connection drop mid-coaching → session is NOT lost. Every coach exchange is persisted to `coach_messages_json` immediately after the AI responds. On reload, the session resumes from last saved exchange. No data is held only in memory.

### Acceptance Tests

```bash
# scripts/verify-marketing-phase1.mjs
# 1. Create consent record → assert consent_record_id returned
# 2. Create session without consent → assert 400
# 3. Send coach message → assert response contains text AND exchange saved to DB immediately
# 4. Simulate disconnect (send message, check DB before response confirmed) → assert message persisted
# 5. Upload 30-second audio → assert transcript_text populated
# 6. Run extraction → assert ≥3 extractions created
# 7. Run generation → assert ≥5 pieces created in draft status
# 8. Approve piece → assert status changes to 'approved'
# 9. Export → assert Content-Disposition: attachment header (file download, not email)
# 10. Attempt to revoke consent → assert revoked_at set, session flagged
# 11. Attempt session with non-English text → assert extraction handles gracefully (English-only warning)
```

---

## 7. Data Model A-to-Z

### MVP Tables (Phase 1 — deploy now)
See Section 6 for exact DDL.
- `marketing_consent_records` — every consent event, append-only
- `marketing_sessions` — one per coaching session
- `marketing_content_extractions` — extracted hooks, stories, CTAs
- `marketing_content_pieces` — generated posts, captions, scripts
- `marketing_channel_profiles` — brand voice and audience memory

### Phase 2 Tables
```sql
-- marketing_content_atoms
-- Reusable content fragments extracted across multiple sessions
-- id, owner_id, atom_type, text, source_session_id, reuse_count, consent_reuse_level, created_at
-- Retention: keep until owner deletes or account closes

-- marketing_calendar_slots
-- id, owner_id, piece_id, scheduled_date, platform, status, created_at
```

### Phase 3 Tables (Video Clip Workflow)
```sql
-- marketing_video_uploads
-- id, owner_id, session_id, storage_url, duration_seconds, size_bytes,
-- transcript_text, transcript_timestamps_json, status, created_at

-- marketing_video_clips
-- id, video_upload_id, start_seconds, end_seconds, clip_type,
-- transcript_excerpt, caption_text, storage_url, recommended_platform, created_at

-- marketing_broll_library
-- id, owner_id, asset_type (client|stock|generated), storage_url,
-- description, tags_json, consent_level, created_at
```

### Phase 5 Tables (Publishing) — REVISED 2026-07-10, see §5 Phase 5 architecture decision
```sql
-- marketing_social_connections  (supersedes the original marketing_platform_connections —
-- session-based, not OAuth-token-based, because publishing drives the platform's real UI
-- as the founder's own logged-in browser session, not each platform's developer API)
-- id, owner_id, platform (instagram|linkedin|x|facebook), auth_mode (browser_session|oauth),
-- session_state_encrypted, status (pending|connected|expired|revoked|needs_human),
-- connected_at, last_verified_at, last_error, created_at, updated_at
-- UNIQUE(owner_id, platform). Encrypted via core/tco-encryption.js (AES-256-GCM, existing helper).
-- Written by services/marketing-social-connections.js — the seam Grok's sign-in flow calls into.

-- marketing_social_posting_templates
-- id, platform, goal_key, steps_json (the {site,goal,steps} shape services/general-browser-agent.js
-- already emits on a verified-successful run), captured_at, last_used_at, last_verified_ok_at,
-- site_version_hint, created_at
-- UNIQUE(platform, goal_key) — a fresh successful explore REPLACES the row, never duplicates it.

-- marketing_publish_records
-- id, piece_id, platform, platform_post_id, published_at, status (pending|published|failed|needs_human),
-- publisher_service (default 'browser_agent'), error_detail, created_at
```

### Phase 6 Tables (YouTubeOS)
```sql
-- marketing_youtube_channels
-- id, owner_id, youtube_channel_id, channel_name, subscriber_count,
-- oauth_token_encrypted, connected_at

-- marketing_youtube_videos
-- id, owner_id, session_id, youtube_video_id, title_chosen,
-- title_variants_json, thumbnail_url, description, published_at,
-- views, watch_time_minutes, retention_rate, updated_at

-- marketing_youtube_performance
-- id, video_id, metric_type, metric_value, measured_at
```

### Phase 7 Tables (Performance Learning)
```sql
-- marketing_performance_events
-- id, piece_id, platform, event_type (view|like|share|click|comment|dm),
-- event_value, observed_at

-- marketing_audience_signals
-- id, owner_id, signal_type (pain_point|question|solution_request|competitor_mention),
-- signal_text, source_platform, observed_at

-- marketing_message_patterns
-- id, owner_id, extraction_type, platform, avg_engagement_score,
-- sample_size, updated_at
-- Purpose: drives improved extraction weighting
```

### Phase 9 Tables (PodcastOS)
```sql
-- marketing_podcast_episodes
-- id, owner_id, feed_id, title, description, audio_url, duration_seconds,
-- transcript_text, show_notes, chapter_markers_json,
-- status (draft|scheduled|published), published_at

-- marketing_podcast_guests
-- id, episode_id, guest_name, consent_record_id, email, joined_at

-- marketing_podcast_feeds
-- id, owner_id, feed_title, feed_url, platform_submissions_json, created_at
```

### Consent and Ownership Fields (universal)
Every table that stores user content includes:
- `owner_id UUID NOT NULL` — the founder who owns the content
- `business_id UUID` — optional team/business context
- Tables with recordings also include `consent_record_id UUID NOT NULL`

---

## 8. Consent and Privacy Contract

These are not guidelines. They are code-level requirements.

**Rule 1 — No session without consent record.**
The `marketing_sessions` table has a `NOT NULL` foreign key to `marketing_consent_records`. The API returns 400 if `consent_record_id` is missing or the referenced record is revoked. No exceptions.

**Rule 2 — Consent text is stored verbatim.**
The `consent_text` field in `marketing_consent_records` stores the exact text the user agreed to — not a reference to a policy version. If the consent text changes, new sessions use new text. Old sessions retain the text they consented to.

**Rule 3 — Voice from one session cannot be used in another without a new consent.**
Each session has its own `consent_record_id`. Using audio or voice profile data from Session A to generate content in Session B requires a new consent record explicitly authorizing cross-session reuse. The `consent_type: 'voice_reuse'` field handles this.

**Rule 4 — Likeness (video/photo) requires a separate consent level.**
Audio-only sessions: `consent_type: 'session_recording'`. Sessions with video: requires `consent_type: 'session_recording'` AND `consent_type: 'likeness_reuse'` if the video will be used in content. A coaching session recording stored only for transcript generation does not require likeness consent.

**Rule 5 — No auto-publishing without explicit per-piece approval.**
No `marketing_publish_records` entry can be created for a piece with `status != 'approved'`. The publisher service checks this constraint. The database constraint also enforces it via a trigger or check constraint on the publishing service.

**Rule 6 — Employer/Employee data wall is absolute.**
No MarketingOS service may JOIN, query, or import from any LifeOS personal tables (`life_entries`, `health_records`, `emotional_logs`, `relationship_records`, or any table prefixed with `lifeos_`). This is enforced by:
(a) MarketingOS services never importing from LifeOS service files
(b) A verification script that checks for cross-lane imports
(c) Documentation in every MarketingOS service file header

**Rule 7 — Revocation triggers content flagging within 30 days.**
When a consent record is revoked (`revoked_at` set):
- All sessions referencing that consent record are flagged `status: 'abandoned'`
- All content pieces from those sessions are marked `status: 'rejected'`
- Raw audio files are flagged for deletion and removed within 30 days
- Generated text content is removed within 30 days
- Publish records that already went out are logged but cannot be recalled from platforms
- A `pending_adam` item is created for manual review if any published content cannot be automatically recalled

**Rule 8 — Consent records are append-only.**
No `DELETE` on `marketing_consent_records`. No `UPDATE` on `consent_text`, `consented_at`, or `owner_id`. Only `revoked_at` may be set (once). The table schema enforces this with a check constraint.

**Rule 9 — Employee recording in a team context.**
If a business owner creates team accounts in Phase 2+, each team member's sessions belong to that team member, not the business owner. The business owner can see content pieces that team members explicitly publish to the shared brand account. They cannot see session transcripts or coaching conversations. The `owner_id` on `marketing_sessions` is always the individual who spoke, not the business.

**Rule 10 — All consent and audit events are logged.**
Every consent creation, revocation, and cross-session reuse authorization is logged with timestamp and IP address. This log is never deleted. Retention: permanent for consent events.

---

## 9. BuilderOS Execution Contract

**Read this before writing any file in `routes/marketing-*.js`, `services/marketing-*.js`, `db/migrations/*marketing*`, or `public/overlay/marketing*`.**

**Rule 1 — No MarketingOS code before this amendment exists and its manifest is valid.**
Run `node scripts/verify-project.mjs --project marketingos` before starting any Phase 1 code. If it fails, fix the manifest first.

**Rule 2 — No duplicate ownership with Creator Media OS.**
Creator Media OS (Creator Media OS) owns: avatar-based video generation, likeness capture profiles, `creator_likeness_profiles`, `creator_channels`, `creator_scripts`. MarketingOS does not build these. If a task would duplicate Creator Media OS scope, HALT and surface the conflict to Adam.

**Rule 3 — No video generation before Phase 3 readiness gate.**
Phase 3 readiness gate requires: FFmpeg on Railway VERIFIED, BullMQ async queue VERIFIED, storage VERIFIED. Do not create any endpoint that calls `services/video-pipeline.js` or Replicate API until all three are VERIFIED and documented in the phase receipt.

**Rule 4 — No publishing endpoints before approval workflow is VERIFIED.**
Do not create `POST /api/v1/marketing/publish` until the approval workflow (`PATCH /api/v1/marketing/content/:id`) is live and tested. Publishing a non-approved piece is a constitutional violation (Principle 6).

**Rule 5 — No LifeOS data access from MarketingOS services.**
Any MarketingOS service file that `import`s or `require`s from a LifeOS service is a violation. Verification script `scripts/verify-marketing-data-wall.mjs` must pass on every commit.

**Rule 6 — Every route must have a verification script entry.**
Add every new MarketingOS route to `scripts/verify-marketing-phase1.mjs` (or the appropriate phase verification script) before marking the route done.

**Rule 7 — Every DB migration must be safe.**
Phase 1 tables are additive-only (new tables, no changes to existing tables). For later phases, any migration that modifies an existing column must have a tested rollback path documented in the migration file header.

**Rule 8 — Every external dependency must be labeled.**
In every service file that calls an external API, the first comment block must include:
```
// External dependencies:
// - OpenAI Whisper-1: VERIFIED (production use in word-keeper-transcriber.js)
// - Claude Haiku: VERIFIED (AI council operational)
// - Cloudflare R2 (storage): UNVERIFIED pending Railway env vars — DECIDED provider.
//   Required: STORAGE_PROVIDER=r2, STORAGE_ENDPOINT, STORAGE_BUCKET,
//             STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_PUBLIC_URL
//   SDK: @aws-sdk/client-s3 with endpoint override (R2 is S3-compatible)
//   AWS S3: future optional alternative — not a Phase 1 decision
```

**Rule 9 — Every phase requires proof receipts before the next phase begins.**
The Change Receipts table in this amendment must have an entry for every Phase 1 file before Phase 2 code begins. BuilderOS must not start Phase 2 if Phase 1 receipts are missing.

**Rule 10 — Reuse, don't rebuild.**
`services/word-keeper-transcriber.js` is the transcription backbone. `services/council-service.js` is the AI routing backbone. Create thin wrappers (`services/marketing-transcriber.js`, `services/marketing-coach.js`) that call these — do not re-implement transcription or model routing from scratch.

**Rule 11 — `@ssot` tag required on every file.**
Every new `routes/marketing-*.js` and `services/marketing-*.js` file must include `@ssot docs/products/marketingos/PRODUCT_HOME.md` in its JSDoc header. Commits without this tag are blocked by pre-commit hook.

**Rule 12 — Every coaching exchange must be persisted immediately (autosave).**
The `POST /api/v1/marketing/sessions/:id/coach` handler must write the user message and AI response to `coach_messages_json` (or its future normalized messages table) synchronously before returning the HTTP response. No exchange may be held only in server memory. Sessions must support resume-on-refresh: a GET on the session returns all prior exchanges. BuilderOS must not implement a "save on session completion only" pattern — that pattern is explicitly forbidden.

**Rule 13 — Phase 1 user identity uses API-key flow with DB fields for future auth migration.**
Phase 1 does not require full user auth (no registration, no sessions, no JWT). Use the existing `requireKey` middleware. The `owner_id` and `business_id` fields in every Phase 1 table must be populated at session creation using a `business_profile_id` resolved from the request context (API key + explicit parameter). These UUID fields must not be hard-coded or omitted — they are the migration path to full auth in Phase 2+. BuilderOS must not use a string key or email address as the primary owner identifier in any table.

**Rule 14 — Phase 1 is English-only. No silent multi-language behavior.**
All coaching prompts, extraction prompts, and generation prompts are written and tested for English. If a non-English transcript is detected (Whisper returns a detected language other than `en`), the system must return a clear user-facing notice: `{ warning: "english_only", message: "Phase 1 supports English content only. Multi-language support is planned for Phase 2." }` — it must not silently attempt generation in another language or silently fail. Multi-language transcription, coaching, and generation are Phase 2 scope.

---

## 10. Revenue Plan By Phase

| Phase | What to Sell | Price | Delivery | Buyer | Proof Needed | Case Study Data |
|---|---|---|---|---|---|---|
| 0 | "Build My Thing" — 30 social posts, calendar, hooks | $997 | Email delivery in 3–5 days | Founders in Adam's network | 1 paying customer | Session format, time per delivery, content quality rating |
| 0 | "Speed Fix" — one broken marketing asset fixed | $250 | Email delivery in 24h | Any small business owner | 1 paying customer | Time to deliver, satisfaction |
| 1 | Single session content pack | $49 | Platform download | Founders who want self-serve | Platform live, 1 beta user | Session completion rate, approval rate, quality rating |
| 1 | Starter subscription | $199/mo | Unlimited platform sessions | Founders with regular content needs | 3 active subscribers | Sessions/month, retention at 60 days |
| 2 | Growth subscription | $497/mo | + Calendar, brand voice, atoms | Established content creators | 5 Growth subscribers | Calendar usage rate, brand voice accuracy |
| 3 | Growth subscription | $497/mo | + Video clip workflow | Founders with existing video content | Phase 3 live with ≥1 user video | Video clip quality rating, time saved |
| 4 | Growth subscription | $497/mo | + Phone recording studio | Founders who hate their camera setup | Phase 4 live | Recording quality before/after comparison |
| 5 | Pro subscription | $797/mo | + Publishing | Founders who want hands-off publishing | Phase 5 live, Buffer/Publer confirmed | Time saved vs manual posting |
| 6 | Pro + YouTube | $797/mo | + YouTubeOS | YouTubers and video podcasters | Phase 6 live, 1 YouTube user | CTR improvement on A/B titles |
| 7+ | Enterprise / Agency | Custom $2,000+/mo | Full platform + performance reporting | Marketing agencies, team accounts | Phase 7 live | Client revenue attributed to MarketingOS content |

**Path to first $10K MRR:**
- Phase 0: 10 × $997 = $9,970 (manual, zero code, 30 days)
- Phase 1: 5 × $199 = $995/mo recurring (platform live, 60 days)
- Phase 1 + 2: 20 × $199 + 5 × $497 = $6,465/mo recurring (90 days)

---

## 11. Build Order Checklist

Complete in this exact order. Do not start a task until all its dependencies are done.

| # | File | Purpose | Dependency | Verification | Done Criteria |
|---|---|---|---|---|---|
| 1 | `docs/products/marketingos/PRODUCT_HOME.md` | This document — SSOT foundation | None | `test -f docs/products/marketingos/PRODUCT_HOME.md` | File exists, all 13 sections complete |
| 2 | `docs/products/marketingos/FILE_MANIFEST.json` | Machine-readable manifest | Task 1 | `node scripts/verify-project.mjs --project marketingos` | Manifest valid, verification passes |
| 3 | Stripe payment links | Phase 0 revenue — $250 Speed Fix, $997 Build My Thing | Task 1 | Manual test: complete a checkout | Customer can pay and receive confirmation |
| 4 | Google Form intake | Phase 0 revenue — brief intake per offer | Task 3 | Manual test: submit a form | Form submits and notifies Adam |
| 5 | `db/migrations/[date]_marketing_schema.sql` | Phase 1 database tables | Task 1 | `psql $DATABASE_URL -c "\d marketing_sessions"` | All 5 tables created with correct columns and indexes |
| 6 | `services/marketing-transcriber.js` | Whisper wrapper for URL-based audio | Task 5, `services/word-keeper-transcriber.js` VERIFIED | `node -e "import('./services/marketing-transcriber.js').then(m => console.log('OK'))"` | Module loads without error; mock call returns string |
| 7 | `services/marketing-coach.js` | AI coaching conversation | Task 5, AI council VERIFIED | `node scripts/verify-marketing-phase1.mjs --test coach` | Returns response with `hookDetected` field |
| 8 | `services/marketing-content-engine.js` | Extraction + generation pipeline | Task 5, Tasks 6–7 | `node scripts/verify-marketing-phase1.mjs --test extract` | Returns ≥3 extractions from test transcript |
| 9 | `routes/marketing-routes.js` | All Phase 1 endpoints | Tasks 6–8 | `node --check routes/marketing-routes.js` | Syntax clean; all 12 routes mounted |
| 10 | `scripts/verify-marketing-phase1.mjs` | Acceptance test suite | Task 9 | `node scripts/verify-marketing-phase1.mjs` | All 9 acceptance tests pass |
| 11 | `scripts/verify-marketing-data-wall.mjs` | LifeOS/MarketingOS data wall check | Task 9 | `node scripts/verify-marketing-data-wall.mjs` | No LifeOS imports found in marketing services |
| 12 | `public/overlay/marketing-session.html` | Session UI — coaching + audio | Task 9 | Manual: create session, have conversation | Consent flow → coaching → transcript visible |
| 13 | `public/overlay/marketing-content.html` | Content review and approval UI | Task 12 | Manual: approve ≥3 pieces | Status changes to approved; export available |
| 14 | `public/overlay/marketing-export.html` | Download content pack | Task 13 | Manual: download and verify format | File downloads with all approved pieces |
| 15 | Railway env vars set | Cloudflare R2 storage config + model keys | Tasks 6–14 | `npm run builder:preflight` → all STORAGE_* vars shown | `STORAGE_PROVIDER=r2`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL` set in Railway. AWS S3 is NOT required for Phase 1. |
| 16 | Phase 0: Run first manual session | Validate product before beta | Task 4 | Session transcript + content pack delivered | 1 paying customer receives deliverable |
| 17 | Phase 1 beta: 3 users | Validate platform | Tasks 10–15 | 3 users complete a session end-to-end | 3 complete sessions in production DB |
| 18 | Upgrade `docs/products/marketingos/PRODUCT_HOME.md` | Remove DEFERRED status | Task 1 | `grep -c DEFERRED docs/products/marketingos/PRODUCT_HOME.md` returns 0 | File reflects ACTIVE status with SocialMediaOS reference |

---

## 12. Open Questions / Adam Decisions

These are genuine founder decisions. BuilderOS cannot answer them from the blueprint.

### RESOLVED — Closed by Adam 2026-05-30

**✅ Storage provider → Cloudflare R2.**
Phase 1 uses R2. AWS S3 is a future optional alternative. Required env vars: `STORAGE_PROVIDER=r2`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`.

**✅ Mid-session autosave → required, every exchange.**
Every coaching exchange persisted immediately. Session must support resume-on-refresh. No save-on-completion-only patterns. Rule 12 added to §9.

**✅ Phase 1 user identity → API-key flow, DB fields future-ready.**
Phase 1 uses `requireKey` middleware. `owner_id` and `business_id` populated from `business_profile_id` in request context. UUID fields retained for future auth migration. No hard-coded keys as primary identifiers. Rule 13 added to §9.

**✅ Language scope → English-only in Phase 1.**
Multi-language transcription, coaching, and generation are Phase 2+. Non-English detection returns a clear user-facing warning. Rule 14 added to §9.

**✅ Export delivery → download-first in Phase 1.**
`GET /api/v1/marketing/sessions/:id/export` returns `Content-Disposition: attachment`. No email delivery in Phase 1. Email delivery moves to Phase 2, using only confirmed VERIFIED email infrastructure.

**✅ Team accounts → Phase 1 owner-only.**
Phase 2 introduces team accounts and multi-collaborator support. `business_id` field is in Phase 1 schema for future readiness but team membership logic is deferred.

---

### OPEN — Still requires Adam decision before code starts

**1. Creator Media OS relationship: sibling or child?**
The audit found Creator Media OS is 0% built and its owned files don't exist. Do you want to:
- (A) Keep Creator Media OS as a separate sibling under LimitlessOS for avatar/likeness content — **recommended**
- (B) Absorb Creator Media OS into SocialMediaOS as a later phase (Phase X — Likeness Studio)
- (C) Deprecate Creator Media OS and rebuild its scope inside SocialMediaOS

Recommendation: Keep as sibling (A). Different buyer, different consent model, different technical stack.

**2. Pricing lead: $49/session or $199/month?**
$49/session is easier to buy. $199/month creates recurring commitment. Which do we lead with on the first landing page? This determines the Phase 1 funnel copy and Stripe product setup.

**3. First vertical to target: real estate agents, wellness coaches, or SaaS founders?**
Each needs different coaching prompts, different content format emphasis (video-heavy vs. LinkedIn-heavy vs. Twitter-heavy), and different case study positioning. Picking one vertical first enables sharper coaching prompts and a better first case study.

**4. ~~Phase 5 publishing: Buffer API or Publer API?~~ RESOLVED 2026-07-10 — neither.**
Decided instead: replay-first browser-agent template automation, reusing the already-proven `services/general-browser-agent.js` core (see §5 Phase 5). No subscription, no per-platform app review. Adam's open item now is the ToS/account-risk acceptance flagged in §5, and confirming with Grok that the sign-in window's captured session lands in `marketing_social_connections` via `services/marketing-social-connections.js`.

**5. Phase 0 intake: Google Form or Typeform?**
Either works. Google Form is free. Typeform is prettier. Must pick before Phase 0 launches. Recommended: Google Form — free, instant, no extra account needed.

---

## 13. Final Summary

### What Exists Now (VERIFIED)
- `docs/products/creator-media-os/PRODUCT_HOME.md` — concept-stage, 0% built, no owned files exist
- `docs/products/video-pipeline/PRODUCT_HOME.md` + `services/video-pipeline.js` — built, FFmpeg on Railway UNCONFIRMED
- `docs/products/productized-sprint/PRODUCT_HOME.md` — Phase 0 revenue vehicle, fully specced, ready to execute
- `services/word-keeper-transcriber.js` — Whisper-1 transcription, VERIFIED working in production
- `services/council-service.js` — AI council routing, VERIFIED operational
- Railway + Neon infrastructure — VERIFIED stable
- AI council (Haiku, Sonnet, Gemini Flash) — VERIFIED operational

### What Is Blocked
- Cloudflare R2 env vars — DECIDED (R2) but UNVERIFIED pending Railway setup: `STORAGE_PROVIDER=r2`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL` not yet set
- FFmpeg on Railway — UNVERIFIED: blocks Phase 3 video export (does not block Phase 1)
- Buffer/Publer API — UNVERIFIED: blocks Phase 5 publishing (does not block Phase 1)
- YouTube OAuth app — UNVERIFIED: blocks Phase 6 (does not block Phase 1)
- Phase 1 code — BLOCKED until Adam resolves 3 remaining open questions in §12: pricing lead, first vertical, Creator Media OS relationship
- Phase 0 revenue — BLOCKED only by Stripe payment links and intake form (30-minute setup, no code)

### Decision Gaps Closed (2026-05-30)
- ✅ Storage: Cloudflare R2 decided
- ✅ Autosave: every exchange persisted immediately, resume-on-refresh required
- ✅ User identity: API-key flow, UUID fields future-ready for auth migration
- ✅ Language: English-only Phase 1, non-English returns warning
- ✅ Export delivery: download-first Phase 1, email delivery Phase 2
- ✅ Team accounts: Phase 1 owner-only, Phase 2 for teams

### What Is Ready
- Phase 0: start today — Stripe links + Google Form intake + 1 Zoom session = first revenue
- Phase 1 code: starts after decisions 1 (Creator Media OS relationship), 2 (pricing), 3 (vertical) from §12 OPEN section
- Transcription backbone: ready to use as-is (`services/word-keeper-transcriber.js`)
- AI council routing: ready to use as-is (`services/council-service.js`)
- Product home + manifest: both exist and committed

### First Exact Task
Set up Cloudflare R2 bucket (free tier covers Phase 1 volume). Add 6 R2 env vars to Railway. This unblocks audio upload and makes the Phase 1 readiness gate passable.

### First Exact Revenue Action
Create Stripe payment link for $997 "Build My Thing — 30-Day Content System" (Productized Sprint). Send to 3 people in Adam's network today. Zero code, zero infrastructure. First revenue in days.

---

## Pre-Build Readiness

**Status:** NOT_READY (Phase 0 starts today; Phase 1 code starts after decisions)
**Last Updated:** 2026-06-29

### Gate 1 — Implementation Detail
- [x] Complete A-to-Z feature inventory
- [x] Phase 0–10 build plan with exit criteria
- [x] Phase 1 exact schema, routes, services, prompts, model routing
- [x] Data model through Phase 9
- [x] Consent contract explicit and code-level
- [x] BuilderOS execution contract explicit
- [x] Revenue plan per phase with realistic numbers
- [x] Build order checklist with verification commands
- [x] Manifest created (Task 2 complete)
- [x] 6 of 11 decision gaps closed (storage provider, autosave, user identity, language, export delivery, team accounts)
- [ ] 5 remaining Adam decisions in §12 OPEN section (pricing lead, first vertical, Creator Media OS relationship, Phase 5 publisher, Phase 0 intake form)
- [ ] Cloudflare R2 bucket and Railway env vars not yet set — blocks audio upload

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Repurpose.io | Good repurposing, multi-platform | No coaching, no authenticity layer, generic output | AI coach extracts from founder's real voice |
| Descript | Strong audio/video editing | No content strategy, no coaching | End-to-end from session to pack |
| Riverside.fm | Great recording quality | Records only — no content generation | Full session → content pipeline |
| ContentOS / Typefully | Good scheduling and analytics | No intake, no coaching, template-driven | Founder story first, template never |
| Opus Clip | Good auto-clipping from video | Video-only, no text content, no coaching | Text/audio first; video later when proven |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Content quality feels AI-generated despite coaching | High | Critical | Coaching session + brand voice fingerprinting + regeneration loop |
| Founders abandon session before completion | Medium | High | Warm confidence coach, short sessions (15 min), autosave progress |
| Platform API policy changes block publishing | Medium | Medium | Buffer/Publer as abstraction layer; never build direct dependencies |
| AI video generation commoditizes before Phase 3 | High | Low | Our moat is the coaching + voice layer, not video generation |

### Gate 4 — Adaptability
The coaching session is the core primitive. Every feature plugs into session data. New output formats (podcast, ad, print) add a generation stage without changing the intake or extraction architecture. New platforms add a publishing adapter without changing the content engine. Score: 87/100.

### Gate 5 — How We Beat Them
Every competitor starts with content format. We start with the founder's real voice. By the time a competitor could copy this, we have 6 months of per-customer performance data and brand voice profiles that they can't replicate.

---

## Anti-Drift Assertions

```bash
test -f docs/products/marketingos/PRODUCT_HOME.md
test -f docs/products/marketingos/FILE_MANIFEST.json
node scripts/verify-marketing-data-wall.mjs  # no LifeOS imports in marketing services
node scripts/verify-socialmediaos.mjs
```

---

## Owned Files

```
docs/products/marketingos/PRODUCT_HOME.md
docs/products/marketingos/FILE_MANIFEST.json
routes/marketing-routes.js
services/marketing-coach.js
services/marketing-content-engine.js
services/marketing-transcriber.js
services/marketing-brand-voice.js           (Phase 2)
services/marketing-video-processor.js       (Phase 3)
services/marketing-caption-engine.js        (Phase 3)
services/marketing-recording-quality.js     (Phase 4)
services/marketing-audio-enhancer.js        (Phase 4)
services/marketing-publisher.js             (Phase 5 — replay-first, on top of shared general-browser-agent core)
services/marketing-social-connections.js    (Phase 5 — encrypted connection store, seam with Grok sign-in flow)
services/marketing-social-goals.js          (Phase 5 — per-platform goal config, no browser logic)
routes/marketing-publish-routes.js          (Phase 5)
db/migrations/20260710_marketing_social_publishing.sql (Phase 5)
scripts/run-marketingos-social-publish-verify.mjs (Phase 5 Layer A)
services/marketing-youtube.js               (Phase 6)
services/marketing-thumbnail-engine.js      (Phase 6)
services/marketing-performance-engine.js    (Phase 7)
services/marketing-insight-router.js        (Phase 7)
services/marketing-funnel-engine.js         (Phase 8)
services/marketing-campaign-builder.js      (Phase 8)
services/marketing-podcast-producer.js      (Phase 9)
services/marketing-live-producer.js         (Phase 9)
public/overlay/marketing-session.html
public/overlay/marketing-content.html
public/overlay/marketing-export.html
public/overlay/marketing-calendar.html      (Phase 2)
scripts/verify-marketing-phase1.mjs
scripts/verify-marketing-data-wall.mjs
db/migrations/[date]_marketing_schema.sql
```

## Protected Files (read-only for this project)
```
server.js                           — composition root only
services/word-keeper-transcriber.js — transcription backbone (Word Keeper Transcriber)
services/video-pipeline.js          — shared render stack (Video Pipeline)
services/council-service.js         — shared model routing
config/council-members.js           — shared AI config
```

---

## Agent Handoff Notes

- State: YouTube intelligence + **v2 creative**: distinct thumb layouts/punch lines (click psychology), `claude_sonnet` rewrite after research (openai_gpt failover), `retention_beats` (every 10s earns next 10s), deeper relevance+viewCount shelf merge.
- Tip: Refresh ideas on `/marketing` — cards should NOT look identical; copy model pill should show `claude_sonnet`; earned-attention blocks visible.
- Next: founder eye-test; still not AI image-gen thumbs; IG/TikTok/LinkedIn doctrine only.

---

## Change Receipts

| Date | What Changed | Why | Amendment Updated | Manifest Updated | Verified |
|---|---|---|---|---|---|
| 2026-07-15 | **Client self-serve signup path** — `POST /api/v1/marketing/public/signup` (no invite; `registerPublicSmos` tier=`smos`); `/marketing/signup` UI; dashboard soft-gates Start Session / packs / YouTube for guests; JWT-scoped `owner_id`; export returns **402 payment_required** unless paid or founder bypass; checkout requires auth + ownership. | Adam: keep building until clients can sign up. | ✅ | — | tip prove signup→session→pay→export |
| 2026-07-15 | **SMOS market desk + promo video path** — `GET /sessions` + `approve-all` + dashboard recent packs; Creative Engine `script_compose` maps pipeline `videoPath` so SMOS can produce a real MP4 promo. | Adam: finish Social Media OS beginning→end, money-ready, make promo video, test UI. | ✅ | — | tip prove |
| 2026-07-15 | **Generate SO-003 failover** — content pack generation cascades `gemini_flash` → `gpt_4o_mini` → `claude_sonnet`, then template fallback; outer catch also template-fills so extract→generate never hard-dies on Anthropic credit exhaustion. | Tip click-test: coach/extract OK; generate 500 Anthropic credit balance too low. | ✅ | — | tip prove |
| 2026-07-14 | **Gap close — suggestions + aliases + studio link** — `/youtube/suggestions` honors `mode=fast`/`fast=1` (SVG thumbs, no Sharp JPEG bloat); full path budgets 18s then fast; catch→degraded fast (never gateway-empty). Dashboard loads fast, Refresh = deep. Intel accepts niche/script/content_text aliases; community accepts snake_case thread fields. `/marketing` → Creative Studio. Atom create defaults `reuse_consent_level=session_only` (explicit null violated NOT NULL). | Tip gap probe: suggestions 502 / ignored mode=fast; 571KB JPEG payloads; intel/community 400 on snake_case; no studio nav; atoms POST 500 null reuse. | ✅ | — | tip `56fb3fbba` fast suggestions 1.6s/75KB; intel+community aliases PASS; atoms POST 201 |
| 2026-07-14 | **Extract status + approve aliases** — stop writing illegal `status=extracted` (DB check); accept `status:approved` / `approved:true` on content PATCH. | Tip verify: extract 500 on status check; approve 400 Invalid action. | ✅ | — | tip `70c44a25` extract→generate→approve→export PASS |
| 2026-07-14 | **Audit fix pack** — stem-based talk title dedupe (no more “(Dive into…)” clones); extract parses council objects + heuristic fallback; generate template fallback so packs aren’t empty; session `getOwnerId` prefers handle/`owner_id` over numeric JWT `sub`. | Tip audit: duplicate titles, extract JSON fail → 0 generate pieces, owner UUID drift risk. | ✅ | — | tip after deploy |
| 2026-07-14 | **Audit P0 fixes** — consent API defaults `consent_text`; `/youtube/suggestions` races a 22s budget then returns `fast` playbook packs (skip AI+Ideogram) instead of gateway 502; Ideogram thumb race 8s. | Tip audit: suggestions 502, consent 500 without text, browser spam cards while API connected. | ✅ | — | tip after deploy |
| 2026-07-14 | **Film Studio (Phase 4 MVP)** — `/marketing/session/:id` arms camera/mic, live sound+light checks, director tips + B-roll list by `film_mode`, MediaRecorder clean take (camera stream only so teleprompter never appears in file), speech-synced teleprompter advance + “sounds like reading” cue, download + Creative Engine upload. Shared `public/shared/smos-film-studio.js`. Works on desktop + mobile browser / existing Capacitor LifeOS shell. | Adam: mobile+desktop film app; direct sound/background/B-roll; teleprompter moves as we talk; reading UI must not show in video (Descript-style). | ✅ | — | tip after deploy |
| 2026-07-14 | **Founder browser owner_id bug** — `marketingOwnerId()` preferred JWT `sub` (numeric `1`) over `handle` (`adam`), so tip UI missed YouTube OAuth + fell into founder spam playbook. Prefer handle. | Founder walk as Adam: API connected for `owner_id=adam`, browser said not connected + generic “Missing Clients?” cards. | ✅ | — | tip after deploy |
| 2026-07-14 | **Prime-time SMOS polish** — dedupe duplicate talk titles; parallel Ideogram+Sharp thumbs; default `click_psychology`; `/marketing` brand no longer clips on narrow viewports. | Founder: ready to market? Live tip showed duplicate titles, 1/5 Ideogram, clipped SocialMediaOS brand. | ✅ | — | tip after deploy |
| 2026-07-14 | **Ideogram thumbs via Replicate** — `tryIdeogramThumbnail` prefers Ideogram over Sharp compose when `REPLICATE_API` present; `thumbnailSource` on cards. | Adam: finish Replicate wiring into SMOS. | ✅ | — | tip after deploy |
| 2026-07-14 | **SMOS creative v2** — Distinct thumbnail layouts + click-trigger punch lines; strong-model (`claude_sonnet`) talk rewrite after YouTube research; sales/click psychology + earned-attention `retention_beats` (0–10s earns next…); deeper shelf (relevance + viewCount). | Adam: thumbs terrible/same; copy mid — use higher model, more research, sales principles, every 10s earns next 10s. | ✅ | — | tip after deploy |
| 2026-07-14 | **YouTube SMOS Intelligence** — Niche playbook resolver (realtor = relocation → buyer intel; insurance + founder variants). Real YouTube search + views/subs velocity + gap into suggestions. Titles researched with `research_basis`. Thumbs = face hero + 3–5 word TITLE overlay (no random channel frames). Real competitor shelf thumbs. `channel_ops` refresh/A-B/sequel for leads. UI truth on `/marketing`. | Adam: thumbs were shit; research titles/velocity/gap; beat competition; niche-aware (relocation first for realtor); leads not views; offer improve old videos. | ✅ | — | tip after deploy |
| 2026-07-13 | **Prime-time SMOS surface** — Real vertical media cards; sharp-composited competitive thumbnails (face + channel frame + bold overlay); CTR grade + YouTube shelf test; hover tips everywhere; interactive product tour; public channel URL fallback when YouTube Data API is disabled; `POST /youtube/channel-url`. | Adam: looks second-rate; needs real cards, competing thumbnails from his photo/videos, shelf test, tips, tour — make it amazing / prime time. | ✅ | — | tip after deploy; enable YouTube Data API v3 for full face/frame pull |
| 2026-07-13 | **Sellable SMOS UI + modes + 3 hooks** — Light/dark themes (Syne/DM Sans; amber dark / teal light). Film-mode chips (teleprompter, bullets, bookends, read&riff, story, hot-seat, analytics, shorts). Talk cards offer 3 hook options + competitor strong/fail. Canvas brief for competitor map. | Adam: cutting-edge design, light+dark, modes for how people film, best hooks to pick from, know competitor strengths/gaps. | ✅ | — | tip after deploy |
| 2026-07-13 | **Teleprompter + must-say coaching** — Suggestions include `sample_script` + `must_say`; sticky teleprompter holds highlight on pause/off-topic; coach adapts (sounds like reading → freestyle, missed competitor must-say, redo after full read). | Adam: detail-heavy topics need a readable script; teleprompter should stay on the line; coach should catch reading-sound and must-cover gaps. | ✅ | — | tip after deploy |
| 2026-07-13 | **Talk-card coaching UX** — Suggestions return full pack (hook, intro, talking_points, close, competitors, competitor_gap) + `seed_pack` on start URL. `/marketing` cards render the pack beside thumbnail. Coaching session shows script panel + chips; coach prompt is producer-style (“give me more” / “I liked when you said…”); `POST …/coach` accepts `talk_pack` + `bullet_index`. | Adam: stop vague “what should I say?” AI coach — need researched talk cards with hook, intro, bullets, exit, competitor context, and live coaching while speaking through bullets. | ✅ | — | `node --check`; tip verify after deploy |
| 2026-07-13 | **YouTube connect owner fix** — `resolveOwnerId` prefers `owner_id` query/body; ignores synthetic `emergency-key`/`command-key` so OAuth `state` stores `adam` and tokens land on the right owner. | Safari/API connect via command key stamped `state=emergency-key`, so Connect never showed connected for Adam. | ✅ | — | tip after deploy + Adam Safari consent |
| 2026-07-13 | **Shared design studio integration.** `routes/marketing-session-routes.js` now imports `getDesignSystemForBrand` and `buildDesignSystemPrompt` from `config/design-studio.js` and includes the selected system's color, typography, tone, and visual motifs in the content-generation prompt for every content pack. This makes MarketingOS output visually on-brand with the Site Builder design studio. | Founder: "Marketing OS is also supposed to have access to the same studio" (the BuilderOS/Site Builder design studio). | ✅ | ✅ | `node --check` on touched files; `npm run builder:preflight` PASS; `npm run verify:ci` PASS; `npm run lifeos:bp-priority:verify` PASS. SENTRY gate and live preview verification pending after deploy. | — |
| 2026-07-13 | **SMOS content pack quality + title column.** `routes/marketing-session-routes.js`: generate route now uses `claude_sonnet` with a structured batch prompt to produce 2–3 distinct pieces per extraction (different platform, format, and angle), adds a `title` for each, and inserts `generated_by_model=claude_sonnet`. `parseCouncilResponse` improved to handle markdown JSON blocks, direct JSON, and embedded JSON. `services/marketing-content-engine.js` SSOT corrected to `docs/products/marketingos/PRODUCT_HOME.md`. `db/migrations/20260713_marketing_piece_title.sql` adds `title` column to `marketing_content_pieces`. Export now includes `Title:`. | Audited SocialMediaOS end-to-end: session consent, coach, extract, generate, approve, export, calendar, and atoms all work, but generated pieces were identical Instagram posts. This fix turns the output into a sellable multi-platform content pack. | ✅ | ✅ | `node --check` on touched files; `npm run builder:preflight` passed; `npm run lifeos:bp-priority:verify` passed; manual UI re-test pending. | — |
| 2026-07-13 | **step-05 CONFIRMED LIVE — 4 bugs fixed, 4 live-verified, not assumed.** After the 4th fix (missing `@aws-sdk/client-s3` dependency) redeployed, `GET /api/v1/lifeos/builder/module-health` shows `status:"mounted"`, `error:null`. Real functional test, not just a health flag: `GET /marketing/session/<uuid>/export/status` returns `200` with real DB-backed JSON (`null` for a nonexistent session — correct, not a crash) when authenticated with `x-command-key`, and `401` without one — proving the route is mounted, wired to a real database, and actually auth-gated, not just present. One race surfaced mid-verification: the autonomous loop independently re-checked module-health against a stale intermediate deploy (before the dependency fix had landed) and briefly re-marked this step `blocked` with the exact error already being fixed — resolved once the dependency-fix commit deployed. BUILD_QUEUE.json step-05 marked `done` with the live-verification evidence recorded in `gap_fill_note`, not just a receipt claim. | Same standard applied to every fix tonight: redeploy, then check the real endpoint yourself — don't stop at "the commit looks right" or even "module-health says mounted." | ✅ | — | Live: `module-health` status mounted/error null; `GET .../export/status` 200 authenticated / 401 unauthenticated against production `https://lumin-web-production-e3a9.up.railway.app`. |
| 2026-07-13 | **Audited the autonomous loop's own commit history at Adam's direct request ("are the thirty commits trash or good — follow the blueprints, no option") and found step-05 (session export/audio upload routes) was real code that never actually worked.** 3 prior loop attempts (`attempts:3`, all within 5 minutes) diagnosed the identical "route not auto-registered" error without ever taking the 1-line config fix, then gave up and marked it `blocked`. Registering it as-is would have shipped a route that still 500'd on every call: `routes/marketing-session-export-routes.js` had its own local `buildSessionExport`/`uploadAudioToR2` reimplementations that never called the real `services/marketing-session-export.js` / `services/marketing-r2-upload.js` built minutes earlier in the same session — the fake R2 upload path asked an AI council member to invent a URL instead of doing a real S3/R2 `PutObject`. Separately, every route's auth check read `req.session.userId`, which can never succeed because this codebase has no `express-session` middleware anywhere (confirmed by grep, zero hits) — that exact broken auth pattern was even written into the BUILD_QUEUE.json step's own spec text, so the builder followed a bad spec faithfully rather than hallucinating. Fixed all three: route now imports and calls the real services with their real signatures, auth swapped to `deps.requireKey` (the pattern every other auto-registered route in this codebase already uses), and registered in `config/auto-registered-product-modules.json`. Also added a real, mechanical (not just message-shape) honesty check to `githooks/commit-msg` — `scripts/verify-gap-fill-honesty.mjs` — that blocks any future commit claiming "no mission pack / blueprint exists" as its justification for hand-authoring server code when a `docs/products/<product>/BUILD_QUEUE.json` already tracks the exact staged file, closing the exact loophole a separate site-builder commit (`ac50782319`) used the same night with a verifiably false claim. | Adam: "is it good? push it to git if its trash trash it and fix the system to make it follow the governance ideas to keep it from putting out trash." Verdict on the 30-commit sample audited: **not trash overall** — the Site Builder chain (cache-contamination fix, YouTube fallback, timeout hardening) is real and independently verified working; this one MarketingOS step was real code that was disconnected/non-functional, now fixed; and one real governance violation (fabricated bypass justification) was found and closed at the enforcement level, not just patched once. | ✅ | — | `node --check` all 3 touched JS files; `verify-gap-fill-honesty.mjs` tested both to correctly block (staged a real BUILD_QUEUE-tracked file + false-claim message → exit 1) and correctly pass (no claim → exit 0). Live re-test of the 3 marketing/session/:id/* endpoints pending next deploy — do not cite as fixed until re-tested live. |
| 2026-07-12 | **Phase 2 calendar/atom UI/UX fix** — `routes/marketing-session-ui-routes.js`: extracted shared `sharedMarketingClientAuth` (auth bootstrap + `marketingFetch`) and removed duplicate `setTimeout` suggestion load. `routes/marketing-calendar-ui-routes.js`: imported shared auth, switched `fetch` → `marketingFetch` for calendar/atoms, fixed save piece id fallback, updated atom placeholders to match DB enum (`hook/story/insight/cta`, `session_only/90d/perpetual`). `routes/marketing-calendar-routes.js`: imported `getOwnerId` from `marketing-session-routes.js`, fixed calendar SQL to only select existing columns and nest `content_piece`, aligned `ALLOWED_ATOM_TYPES`/`ALLOWED_REUSE_CONSENT_LEVELS` with migration, normalized `reuse_consent_level`/`tags`, added `POST /api/v1/marketing/calendar` with ownership check, fixed `GET` responses to `slots`/`atoms` keys, fixed `brand-voice/rebuild` call. `services/marketing-brand-voice.js`: fixed query to join `marketing_sessions` on `marketing_content_pieces` and removed non-existent `marketing_content` table. | Audit found calendar/atom UI failed to load and `Save date` 404ed; needed fixes before Phase 2 is customer-facing. | ✅ | ✅ | `node --check` on all touched files; `npm run builder:preflight` pending; UI re-test pending. |
| 2026-07-12 | **Fixed `marketing-publisher.js` import paths.** `services/marketing-publisher.js` imported four sibling modules with `services/` prefix (`services/services/marketing-social-connections.js`, etc.), causing `ERR_MODULE_NOT_FOUND` and breaking the `spine-import-resolution` preflight check. Corrected to `./` relative paths. | Uncovered while fixing `builder:preflight` failures before Site Builder product work. | ✅ | ✅ | `node -c services/marketing-publisher.js` |
| 2026-07-12 | **Money ASAP — mount publish + fix community drafts** — Enabled `marketing-publish-routes` auto-register; fixed `listConnections(pool,{ownerId})`; rewrote community draft route to use `createCommunityValueDrafter` (deterministic fallback). PRODUCT_BUILD_PRIORITY: site-builder → marketingos. Flores $45 Stripe checkout live. | Adam: get this making money ASAP don't stop. | ⚠️ tip deploy + outreach | first paid convert |
| 2026-07-12 | **Value-first marketing + Site Builder URL** — Adam: not spam; add value, engage, then soft offer. Decoupled `mos-community-value-drafter` from sentry so it can ship now (help-first drafts → soft CTA to Site Builder / limitlesssites.com). Started founder-authority domain purchase for **limitlesssites.com** (Porkbun + Namecheap); card vault ready (****0736). Tip Site Builder URL live: `/site-builder`. | Adam: value not spam; cheap URL + debit card for Site Builder fit. | ⚠️ domain purchase in flight / captcha | community-value build + DNS after domain owned |
| 2026-07-12 | **LIVE_SOCIAL_PUBLISH_ENABLED allowlisted + set true** — Adam: system can add its own Railway vars — why wasn't the kill switch flipped? Added `LIVE_SOCIAL_PUBLISH_ENABLED` to `DEFAULT_ALLOWED_KEYS` in `railway-managed-env-service.js`, then `POST /api/v1/railway/managed-env/bulk` `{LIVE_SOCIAL_PUBLISH_ENABLED:true}` + redeploy. Approval gate + connected accounts still required for a real post. | Adam: set LIVE_SOCIAL_PUBLISH_ENABLED=true yourself. | ✅ allowlist + bulk | tip verify |
| 2026-07-12 | **Money ASAP — ungated Phase 5 social publish + community value drafts** — Adam: promote everywhere (Reddit/FB/IG/LinkedIn), MarketingOS must work for paying customers. Set founder_gated:false on mos-social-publisher + mos-social-publish-route (kill switch LIVE_SOCIAL_PUBLISH_ENABLED still defaults OFF). Seeded mos-community-value-* draft API. PRODUCT_BUILD_PRIORITY: marketingos #1. | Adam: make money ASAP; MarketingOS promoting. | ✅ | ⬜ | tip never-stop builds publisher |
| 2026-07-11 | **YouTube suggestions AI call fix + UI reload** — `callCouncilMember` now uses positional `(gemini_flash, prompt)` like Phase 1 routes so tip can return `ai_research_defaults`; home UI retries suggestion load. Still blocked: tip `oauthConfigured:false` — no GOOGLE_CLIENT_ID/SECRET in Railway or local `.env`; Google Cloud Console requires Adam’s login (agent hit sign-in wall). | Adam: suggestions + thumbnails + connect channel/analytics + set Google keys / login as me. | ✅ | ⬜ | suggestions LIVE; OAuth HALT on Adam credentials |
| 2026-07-11 | **YouTube connect + top video ideas** — fixed broken `marketing-youtube` contract (pool/authUrl/tokens), added channel + analytics pull, `/youtube/suggestions` with researched cards + SVG thumbnails + Start making → coaching seed. UI on `/marketing`. Honest blocker: tip still missing `GOOGLE_CLIENT_ID`/`SECRET` — Adam must create/paste OAuth client and click Google login himself (cannot “login as Adam”). | Adam: top video suggestions, thumbnails ready, connect channel + analytics, set up Google API keys / login as me. | ✅ | ⬜ | code shipped; OAuth connect blocked until keys |
| 2026-07-11 | **Standalone SMOS app proved** — tip `/marketing` as its own top-level app (not LifeOS iframe): consent→coach→extract→generate→approve→export PASS session `498db989-…`, receipt `products/receipts/SMOS_STANDALONE_UI_LOOP.json`. Hardened standalone UX: real `a.btn` nav (no nested button-in-link), “Standalone app” chrome, cleaner titles. | Adam: test it as a separate app too, not just in LifeOS. | ✅ | ⬜ | ✅ standalone UI loop PASS |
| 2026-07-11 | **LifeOS-ready SMOS** — `#nav-smos` loads `/marketing?shell=1` inside `lifeos-app` content-frame (no full-page leave). UI auth bootstraps commandKey + parent shell tokens; `marketingFetch` merges auth headers + 401→login; in-shell links preserve `shell=1`. Disabled missing `marketing-publish-routes` auto-register noise. Tip API loop re-proved consent→coach→extract→generate→approve→export (session `547032e1-…`). LifeOS UI loop PASS session `f9afe8e5-…` receipt `products/receipts/SMOS_LIFEOS_UI_LOOP.json`. | Adam: get SMOS ready, test through LifeOS UI, program what's needed. | ✅ | ⬜ | ✅ tip API + LifeOS iframe UI loop PASS on `2c811a0285` |
| 2026-07-10 | **Phase 6 YouTube: one shared OAuth app confirmed + queued** — answered Adam's direct question (one API key for YouTube, or one per client?) with ONE shared Google Cloud OAuth app for every client, reusing the existing live `services/google-calendar-service.js` OAuth2Client pattern and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (same Google Cloud project can serve YouTube scopes too — no second app). Each client's one-time consent happens entirely on Google's real login page; no password passes through MarketingOS or any AI agent. Documented the two real app-wide caps (100 authorized users while unverified; ~100 uploads/day shared bucket). Queued `mos-youtube-oauth-service` (reuses `user_integrations` table, provider `youtube_channel` — no new token table), `mos-youtube-connect-routes`, `mos-youtube-sentry-layer-a` in `BUILD_QUEUE.json`; registered the route in `config/auto-registered-product-modules.json`. | Adam asked to "set everything up" after clarifying he doesn't have a shared interactive browser in this chat to hand credentials through (unlike Grok's product surface) — for YouTube that's moot anyway since OAuth redirects to Google's own page. Only remaining manual step is Adam's one-time Google Cloud Console setup (enable API, add scope, add redirect URI) — an AI should not click through a human's identity-bound OAuth consent screen. | ✅ | ⬜ | pending (queue authored, not yet built/deployed) |
| 2026-07-10 | **Phase 5 publishing architecture decided + queued** — superseded the Buffer/Publer-first note with replay-first browser-agent template automation, reusing the already-proven `services/general-browser-agent.js`/`-live.js`/`-runtime.js` core (Chair receipt `LIFERE_COUNCIL_1783455558829`, live in TC-service) instead of a native OAuth publishing API or a scheduler subscription. Updated §2 Relationship Map (new shared-infra dependency), §5 Phase 5 (full rewrite), §7 Phase 5 Tables (`marketing_platform_connections` → `marketing_social_connections` + `marketing_social_posting_templates`, session-based not OAuth-token-based), §12 Q4 (resolved), Owned Files. Queued 6 composing steps in `BUILD_QUEUE.json` (schema → connections service + goal library → publisher → route → Layer A verifier) — no browser-driving or publishing code hand-authored, per SO-001; only this spec + the queue's task/spec fields. | Adam: while Grok builds the per-platform sign-in window, build everything downstream — storing the connection and actually posting an approved piece. The seam between the two efforts is `services/marketing-social-connections.js`. Flagged as an open item for Adam: automating outside a platform's official API can conflict with that platform's ToS on non-API automation (account-risk, not engineering-risk) — gated behind `LIVE_SOCIAL_PUBLISH_ENABLED`, default off. | ✅ | ⬜ | pending (queue authored, not yet built/deployed) |
| 2026-07-10 | **Creative Engine consumer link** — Marketing dashboard links `/creative/studio` for footage/photo render via shared Creative Engine (video edit via Creative Engine, not MarketingOS-owned FFmpeg). | Adam: SMOS + Creative Engine together. | ✅ | ⬜ | ✅ tip proof `CREATIVE_ENGINE_V1_FOOTAGE_EDIT.json` |
| 2026-07-10 | **Founder-usable SMOS GAP-FILL** — fixed `/marketing` UI: Extract/Generate buttons; content list reads `{pieces}`; approve sends `action`; export uses auth+blob download; branded SocialMediaOS dashboard + calendar/atoms links. LifeOS nav → `/marketing`; `?stack=socialmediaos` redirects to `/marketing`; LifeRE Marketing tab links full app; legacy `socialmediaos-session.html` redirects (dead `/api/v1/socialmediaos/*`). | Adam: use SMOS ASAP as standalone app + inside LifeOS/RE; UI walk found Phase 1 API live but UI incomplete/broken. | ✅ | ⬜ | tip UI walk pending deploy |
| 2026-07-10 | **GAP-FILL UI catch logger** — browser scripts used `logger.error` (undefined) so Proceed/coach errors were silent. Switched to `console.error` + visible message. |
| 2026-07-10 | **GAP-FILL session UI auth + owner UUID** — SSR sends JWT/command-key; `getOwnerId` reads `lifeosUser.sub` and maps non-UUID ids to deterministic UUIDs (schema is UUID). | Founder UI: Proceed failed — owner_id "1" invalid for UUID column. | ✅ | ⬜ | tip UI |
| 2026-07-10 | **SENTRY Layer B PASS** — Playwright human-sim + in-browser consent→export; receipt `products/receipts/SENTRY_MARKETINGOS_LAYER_B.json`; queue step done on `fd720e9c5b`. | Adam: keep building; never-stop selected this step after spin-break. | ✅ | ⬜ | ✅ Layer B 5/5 PASS live |
| 2026-07-10 | **SENTRY Layer B queued** — `scripts/run-marketingos-layer-b.mjs` + BUILD_QUEUE `mos-sentry-layer-b` + registry B-browser so never-stop has real work after Phase 1/2/intel done. | Adam: keep building vision; do not stop. | ✅ | ⬜ | superseded by Layer B PASS |
| 2026-07-10 | **SENTRY Layer A + path-to-10** — `scripts/run-marketingos-layer-a.mjs` + registry product `marketingos` PASS; primary surface scrubbed to `/api/v1/marketing/*`; blockers receipt updated (R2 + Layer B remain). | Adam: grade system → get every area to 10. | ✅ | ⬜ | ✅ `node scripts/sentry-prealpha-gate.mjs marketingos` PASS |
| 2026-07-10 | **Never-stop: fix or name blockers** — restored LIVE verifier after system regression; shim retired stale `verify-marketing-phase1.mjs`; receipts `MARKETING_PHASE1_VERIFY.json` (runnable PASS) + `SOCIALMEDIAOS_BLOCKERS.json` (R2/legacy/SENTRY/stale named with next actions). | Adam: do not let system stop or not fix itself; if it can't fix, say why. | ✅ | ⬜ | ✅ `node scripts/verify-marketing-phase1-live.mjs` exit 0 + named blockers |
| 2026-07-10 | **Overseen finish pass — LIVE Phase 1 loop PASS** — founder-chat directed single-file system builds repaired consent enum (§6), UI `session_recording`, fake council roles→`gemini_flash`, extract/generate/approve/export SQL to match schema (no `owner_id` on pieces/extractions). Tip `fe56c03dd85e`. Receipt `products/receipts/SOCIALMEDIAOS_OVERSEE_LIVE_PROOF.json`. | Adam: finish SocialMediaOS; oversee via UI chat; observe files. Queue was 12/12 done but LIVE proof was false-green. | ✅ | ⬜ | ✅ LIVE consent→export + intel titles |
| 2026-07-09 | **Content Intelligence batch queued** — appended five composing single-file steps to `BUILD_QUEUE.json`: `smos-title-universe` (`services/marketing-title-universe.js`), `smos-script-scorer` (`services/marketing-script-scorer.js`), `smos-publish-gate` (`services/marketing-publish-gate.js`), `smos-repurpose` (`services/marketing-repurpose.js`), and `smos-intel-routes` (`routes/marketing-intel-routes.js`, pre-registered, exposes `/api/v1/marketing/intel/*`). All AI runs via the injected `callCouncilMember` — NO external infra. Steps drawn from the documented `socialmediaos/PRODUCT_HOME.md` Priority Ideas (#4 50-title universe, Earned-Attention framework, #19 publish-or-kill, #42/#27 repurpose). | Phase 1 + 2 (SocialMediaOS) are done and live; §5 Phases 3-5 are infra-gated (FFmpeg/Whisper + social API keys UNVERIFIED). Per Adam "finish MarketingOS", the loop builds these no-infra intelligence features next so it never stops on unverified dependencies. Functional-proof gate proves the `/intel/*` endpoints LIVE before `done`. | ✅ | ⬜ | loop build + module-health LIVE proof (pending next cycle) |
| 2026-07-09 | **Phase 2 (Social Content Calendar) queued** — appended four composing single-file steps to `BUILD_QUEUE.json` (`mos-phase2-schema` → `db/migrations/20260709_marketing_phase2_calendar.sql`; `mos-brand-voice` → `services/marketing-brand-voice.js`; `mos-phase2-routes` → `routes/marketing-calendar-routes.js`; `mos-phase2-ui` → `routes/marketing-calendar-ui-routes.js`) drawn verbatim from §5 Phase 2 (content-atom library, brand-voice fingerprint, 30-day calendar). Pre-registered the route + UI modules in `config/auto-registered-product-modules.json`. Phase 3 (Video Clip Workflow) intentionally NOT queued — §5 marks its FFmpeg/Whisper deps UNVERIFIED. | Phase 1 is proven live (schema + routes + UI mounted, `/api/v1/marketing/*` LIVE); per Adam "finish the rest of MarketingOS", the loop now builds the next DOCUMENTED phase autonomously. Steps compose with the Phase 1 §6 tables via `owner_id`/FKs; the functional-proof gate proves each module LIVE before `done`. | ✅ | ⬜ | loop build + module-health LIVE proof (pending next cycle) |
| 2026-07-08 | **Phase 1 re-queue after false-done.** Shipped correct §6 schema `db/migrations/20260708_marketing_phase1_schema_v2.sql` (DROP empty mis-built tables + CREATE §6 exactly). Reset `mos-session-routes` (`routes/marketing-session-routes.js`) + `mos-session-ui` (`routes/marketing-session-ui-routes.js`) to `pending` as self-contained modules; pre-registered both in `config/auto-registered-product-modules.json`. | The loop's 3/3 Phase 1 was false-done: wrong schema, unwired modules importing non-existent `./ai-council.js` + undefined service exports. First proof of the self-refinement spine (auto-registration + functional-proof gate + integration context) repairing a false-done into a proven-live feature. | ✅ | ⬜ | loop rebuild + module-health LIVE proof (pending next cycle) |
| 2026-06-29 | **Founder session ingest** — routed ChatGPT ecosystem brainstorm to `conversations/`, `limitlessos/PRODUCT_HOME.md`, SMOS producer/director extract, sticker mockup asset. | Adam: preserve multi-product vision in correct folders per CANONICAL_PRODUCT_HOME_RULES. | ✅ | — | doc-only |
| 2026-06-29 | **Product home migration** — consolidated former Amendment 41 into `docs/products/marketingos/`; deleted duplicate amendment files. | One canonical product folder per product; constitutional rails via North Star. | ✅ | ✅ | pending |
| 2026-06-29 | **Intake idempotent re-run** — same as BuilderOS/LifeOS intake pattern; chat A2Z PASS when SMOS already built. | Founder chat re-run should not fail on completed BP. | ✅ | `node scripts/run-founder-socialmediaos-chat-a2z.mjs` |
| 2026-06-29 | **intake_blueprint routing hardening** — `resolveChairContext` checks intake before forced `explicitAction: build`; `isBuildRequest` excludes SMOS intake phrases; orchestrator skips build hijack when `isIntakeBlueprintIntent`. **founder-chat-health 502 fix** — cred helpers hoisted to route scope. | Chat A→Z SMOS hit `build_terminal` + FP v2 INTENT_AMBIGUITY because `do:` forced build channel; health endpoint ReferenceError'd on undefined helpers. | ✅ | ⬜ | deploy + `node scripts/run-founder-socialmediaos-chat-a2z.mjs` |
| 2026-06-01 | Overnight runner priority fix — PRIORITY_RULES reorder: socialmediaos→rank 1 (was rank 2), c2_command_control→rank 2 (was rank 1). Commit `5fde694263`. Gen 2 queue confirmed: first 3 tasks = MarketingOS DB migration + marketing-transcriber.js + marketing-coach.js. Railway redeploy triggered to fix HTTP_502 blocking. 0 commits from runner yet (Railway stale deploy). | C2 was starving MarketingOS — every gen filled with C2 tasks first due to rank 1. | ✅ | ⬜ | pending |
| 2026-06-28 | **SocialMediaOS founder-chat A→Z path:** `services/lifeos-mission-pipeline-executor.js` — `isIntakeBlueprintIntent` + golden session `3e6105c4-…`; `services/chair-context-classifier.js` + `services/lumin-chair-orchestrator.js` — `intake_blueprint` channel runs `executeIntakeBlueprint`; `scripts/run-founder-socialmediaos-chat-a2z.mjs` — JWT/command-key chat driver + receipt. | Adam: build SMOS BP A–Z from founder login via Lumin chat, not CLI backdoor. | ⚠️ IN PROGRESS: pending deploy + JWT login sync | `node scripts/run-founder-socialmediaos-chat-a2z.mjs` |
| 2026-05-30 | Created full A-to-Z blueprint (formerly Amendment 41) — Phase 0-10, MVP technical spec, consent contract, BuilderOS execution contract, revenue plan, build order checklist | SSOT foundation for MarketingOS / SocialMediaOS before any code is written | ✅ | ✅ | pending |
| 2026-05-30 | Closed 6 BuilderOS decision gaps: storage→R2, autosave rule (Rule 12), user identity rule (Rule 13), English-only rule (Rule 14), export→download-first, team accounts→Phase 2. Updated §5 Phase 1, §6 export/error handling/acceptance tests, §9 execution contract (+3 rules), §11 build order task 15, §12 resolved/open split, §13 final summary | Decision gaps audit required before coding begins | ✅ | ✅ | pending |