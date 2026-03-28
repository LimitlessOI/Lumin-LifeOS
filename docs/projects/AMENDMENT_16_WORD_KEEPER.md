# AMENDMENT 16 — Word Keeper & Integrity Engine
**Status:** IN_BUILD
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-21
**Parent Amendment:** Amendment 09 (Life Coaching / Personal OS)
**Overlay Layer:** Amendment 12 (Command Center & Overlay)

> "The most important word you will ever give is the one you give yourself."
> This feature exists because integrity is not a trait — it is a practice.
> The system holds you to what you said, helps you back out with honour when needed,
> and shows you exactly where your word is strong and where it needs work.

---

## WHAT THIS IS

A continuous ambient intelligence layer that:
1. **Listens** — 1-hour rolling audio buffer captures everything you say (with consent)
2. **Detects** — AI identifies commitment language in real-time transcripts
3. **Confirms** — Asks: "Was this a commitment you intended to make?"
4. **Tracks** — Confirmed commitments enter a living accountability system
5. **Reminds** — Text + voice reminders before deadlines
6. **Scores** — Every kept/broken commitment updates your Integrity Score
7. **Coaches** — When you can't keep a commitment, shows you how to back out with honour
8. **Mediates** — When conflict arises, offers to help both sides understand each other

---

## LEGAL FOUNDATION

**Nevada NRS 200.620 — One-Party Consent (In-Person)**
Adam is physically present in all recorded conversations → recording is legal.
No disclosure required for in-person ambient recording in Nevada.

**Phone Calls — Two-Party Required**
When system detects a telephone call context (Twilio, phone mic pattern):
- Auto-pause the buffer
- Display: "Phone call detected — recording paused (NV law requires two-party consent)"
- Offer: "Tap to resume if other party has consented"
- Never auto-record phone calls without explicit two-party consent

**Defaults:**
- Recording: OFF until user explicitly enables
- Phone call detection: ON (always auto-pauses)
- Consent banner: shown every session start
- Data: stored encrypted, never used for training without explicit opt-in

---

## CORE FEATURES

### 1. Ambient Word Capture
- 1-hour rolling audio buffer in browser (Web Audio API + MediaRecorder)
- Chunked every 60 seconds → sent to Whisper (OpenAI) for transcription
- Transcripts stored temporarily (24h) then purged unless commitment detected
- Full transcripts never stored long-term — only commitment clips retained
- Phone call auto-pause (NV law compliance)

### 2. Commitment Detection
AI scans each 60-second transcript for commitment language patterns:

**High-confidence triggers (always flag):**
- "I will / I'll / I'm going to [action] by [time]"
- "I promise / I give you my word / you have my word"
- "I'll make sure / I'll take care of / I'll handle"
- "Count on me / you can count on me"
- "I'll be there / I'll have it done"
- "I swear / I guarantee"

**Medium-confidence triggers (flag + lower confidence score):**
- "I should / I need to / I have to [by time]"
- "Let me / let me get that / let me take care of"
- "I'll try to [specific action with deadline]"
- "I was thinking I'd [action]"

**Never flag:**
- General statements ("I think prices will go up")
- Wishes ("I wish I could")
- Past statements ("I did X last week")
- Hypotheticals ("If I were to...")

**AI Council assignment:**
- Claude → primary commitment classifier (nuance, context, intent)
- Grok → reality check ("can he actually keep this?")

### 3. Commitment Confirmation Flow
When detected, within 60 seconds:

```
[Overlay notification]
"I heard: 'I'll have the proposal ready by Friday'"
Was this a commitment you intended to make?

[YES — Track it]  [NO — Ignore]  [HELP ME BACK OUT]
```

If YES:
- AI extracts: what, to whom, by when
- Adds to commitments table
- Optionally adds to Google Calendar (DEFAULT: ask user)
- Optionally adds to todo list
- Schedules reminders (24h before, 1h before)

If NO:
- Asks: "Do you want help communicating this to [person]?"
- If yes: AI drafts an honourable retraction message
- Logs as "declined" (not scored against integrity)

If HELP ME BACK OUT:
- Launches "Honourable Exit" flow (see below)

### 4. Integrity Score
A living number from 0–1000 reflecting your word-keeping track record.

**Score Events:**

| Event | Points |
|---|---|
| Commitment confirmed + kept on time | +25 |
| Commitment kept within 24h of deadline | +15 |
| Commitment kept late but communicated in advance | +10 |
| Proactively renegotiated before deadline | +8 |
| Honourable exit (communicated + offered alternative) | +2 |
| Commitment broken, no communication | -30 |
| No-show (total failure, no notice) | -50 |
| Pattern: 3 broken commitments to same person | -25 (relationship penalty) |
| Streak bonus: 7 kept in a row | +15 |
| Streak bonus: 30 kept in a row | +50 |

**Score Bands (Gamification):**

| Score | Level | Title |
|---|---|---|
| 0–199 | 1 | Beginner — "Learning Your Word" |
| 200–399 | 2 | Developing — "Building Trust" |
| 400–599 | 3 | Solid — "Reliable" |
| 600–749 | 4 | Strong — "Your Word Is Bond" |
| 750–899 | 5 | Elite — "Integrity Leader" |
| 900–999 | 6 | Master — "Unbreakable" |
| 1000 | 7 | Legend — "The Word Keeper" |

**What the score shows you:**
- Overall score + level
- Trend (up/down over 30 days)
- Breakdown by category (work, family, personal, financial)
- Breakdown by person (who you keep your word to most/least)
- Time-of-day patterns ("You break commitments made after 8pm")
- Domain patterns ("You over-commit on Mondays")

### 5. Honourable Exit Flow
When someone cannot keep a commitment:
- System drafts a message that: acknowledges the commitment, takes responsibility, explains (if appropriate), offers an alternative or timeline
- User reviews and edits before sending
- Logged as "honourable exit" — minimal score penalty

**Script template:**
> "I committed to [X] by [date]. I'm not going to be able to keep that. I take responsibility for that. [Brief honest reason if appropriate.] Here's what I can offer instead: [alternative]. I'm sorry for any inconvenience this causes."

### 6. Reminders
- **24 hours before deadline:** SMS via Twilio: "You gave your word on: [commitment]. Due tomorrow."
- **1 hour before:** SMS: "1 hour until: [commitment]. Ready?"
- **At deadline (if not marked done):** Overlay notification: "Your commitment to [X] is due now. How did it go?"
- **Audible reminder (optional):** ElevenLabs TTS voice says the reminder through device speaker

**Default reminder style:** SMS only. Audible opt-in per commitment.

### 7. Mediator
Triggered when:
- User says keyword: "pause" + "help" in quick succession
- User manually taps Mediator button in overlay
- (Future v2: stress/conflict voice pattern detection)

**Mediator Flow:**
1. System pauses recording
2. Asks: "Looks like things are tense. Would you like help de-escalating?"
3. If yes: both parties can optionally speak their side (separate turns)
4. AI (Gemini — empathy model) generates:
   - Neutral summary of each person's position
   - What each person likely needs/fears
   - 3 de-escalation suggestions
   - A bridge statement each person could say
5. User(s) review privately — never read aloud without permission
6. If both parties consent: mediator can run as shared session on one device
7. Session private — never stored unless both parties opt in

**Non-negotiable:** Mediator is coaching, not therapy. If escalation phrases detected ("I want to hurt", "I'll kill", threats) → immediately recommend professional resources.

### 8. Integrity Coaching
Weekly summary (every Monday morning, SMS):
- Your score this week
- Best kept commitment
- One commitment you broke and what it cost you
- One pattern identified
- One specific thing to work on this week

---

## TECHNICAL ARCHITECTURE

### Files
| File | Purpose |
|---|---|
| `services/word-keeper.js` | Audio buffer manager, transcription pipeline, commitment detection |
| `services/commitment-detector.js` | AI commitment language classifier |
| `services/integrity-engine.js` | Score calculation, gamification, events |
| `services/mediator-service.js` | Conflict de-escalation AI |
| `routes/word-keeper-routes.js` | All API endpoints |
| `db/migrations/20260321_word_keeper.sql` | All DB tables |
| `products/word-keeper/index.html` | Standalone web app (phone-accessible) |
| `public/overlay/word-keeper-panel.js` | Overlay widget (integrity score + quick actions) |

### DB Tables
- `commitments` — Every tracked commitment with status, deadline, person, context clip
- `integrity_events` — Every score event (kept, broken, exit, streak)
- `integrity_scores` — Rolling score per user, updated on each event
- `commitment_reminders` — Scheduled reminders with sent/pending status
- `mediator_sessions` — Conflict sessions (private by default)
- `word_keeper_transcripts` — 24h TTL rolling transcripts (auto-purge)

### API Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/word-keeper/transcript` | Submit audio chunk for transcription + scan |
| GET | `/api/v1/word-keeper/commitments` | List all commitments |
| POST | `/api/v1/word-keeper/commitments` | Manually add commitment |
| PATCH | `/api/v1/word-keeper/commitments/:id` | Update status (kept/broken/exited) |
| GET | `/api/v1/word-keeper/score` | Get current integrity score + breakdown |
| GET | `/api/v1/word-keeper/dashboard` | Full dashboard data |
| POST | `/api/v1/word-keeper/mediator/start` | Start mediator session |
| POST | `/api/v1/word-keeper/mediator/:id/speak` | Submit a side's statement |
| GET | `/api/v1/word-keeper/mediator/:id/analysis` | Get AI analysis |
| POST | `/api/v1/word-keeper/exit/:id` | Generate honourable exit message |
| GET | `/api/v1/word-keeper/patterns` | Get pattern analysis |

### AI Council Roles
| Model | Role in this feature |
|---|---|
| Claude | Commitment detection, nuance + intent classification |
| Gemini | Mediator empathy engine, perspective-taking |
| DeepSeek | Pattern analysis, score trend calculation |
| Grok | Reality check on commitments ("is this actually achievable?") |
| Groq/Llama | Fast classification for high-volume transcript scanning (free tier) |

---

## CONFIRMED DEFAULTS

| Question | Confirmed Answer |
|---|---|
| Calendar integration | Google Calendar (build first, add others later) |
| Wife's role in mediator | She knows and consents. AI proactively offers help. Both parties must consent for AI to engage AND for any storage. |
| Audible reminders device | Phone speaker via web app |
| Score visibility | Private (Adam only) |
| Phone call detection | Auto-pause on call + banner (NV law — two-party required for phone calls) |
| Mediator storage | Never stored without BOTH parties opting in. Default: private session only. |

---

## NON-NEGOTIABLES
- Recording is OFF by default — user must explicitly enable each session
- Phone calls auto-pause — never recorded without two-party consent disclosure
- Transcripts auto-purge after 24h unless commitment detected
- Commitment clips (the audio moment) stored encrypted
- Mediator sessions private by default — never stored without both parties opting in
- Integrity score is coaching data, not a judgment — framed as growth, not failure
- Honourable exit always available — system never shames for changing course
- **NOT a therapy tool** — if crisis language detected → route to professional resources immediately
- Crisis phrases trigger immediate safe messaging: 988 (Suicide & Crisis Lifeline), NAMI, professional referral

---

## BUILD HISTORY
- **2026-03-21:** Amendment created. Nevada one-party consent confirmed for in-person. Phone two-party confirmed. Core architecture designed. Build started.
- **2026-03-21 (Session 2):** All 7 files built and wired:
  - `services/commitment-detector.js` — regex pre-filter + Claude classifier + Grok reality check
  - `services/integrity-engine.js` — full score engine, streak logic, relationship penalty, DeepSeek pattern analysis, weekly coaching
  - `services/mediator-service.js` — Gemini empathy engine, both-party consent enforcement, crisis phrase detection + 988/NAMI routing
  - `routes/word-keeper-routes.js` — all API endpoints with reminder scheduling
  - `products/word-keeper/index.html` — phone PWA with audio recording, commitment alert overlay, score card
  - `public/overlay/word-keeper-panel.js` — overlay chip + dropdown with quick actions
  - `server.js` — routes mounted at `/api/v1/word-keeper`, council adapter wired
  - Confirmed defaults: Google Calendar, wife mutual consent model, both-party storage consent

---

## Pre-Build Readiness

**Status:** BUILD_READY
**Adaptability Score:** 88/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] All 7 files built and wired — routes, services, DB migration, web app, overlay panel
- [x] DB schema fully specified — 6 tables with purpose documented
- [x] API surface complete — 11 endpoints with methods, paths, and purposes
- [x] AI council role assignments documented per model (Claude, Gemini, DeepSeek, Grok, Groq)
- [x] Legal foundation documented (Nevada NRS 200.620 one-party consent, phone two-party auto-pause)
- [x] Integrity score events, point values, and score bands fully specified
- [x] Commitment detection trigger language documented (high/medium/never-flag categories)
- [ ] Google Calendar integration not yet built — documented as default, no OAuth flow specified
- [ ] 24h transcript auto-purge cron not yet confirmed as implemented

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Beeminder | Commitment tracking with real financial stakes, proven behavior change | Manual entry only — you type your commitments; no ambient capture; no integrity coaching | We detect commitments from natural speech without requiring any data entry |
| Strides | Clean habit/goal tracking, iOS native | No commitment language detection, no integrity score, no mediator | We track commitments made in real conversation, not goals the user typed into an app |
| Way of Life (habit tracker) | Simple, streak-based, mobile-first | Same as above — user-entered only; no speech; no coaching narrative | Our weekly integrity coaching summary identifies patterns the user cannot see themselves |
| Replika (AI companion) | Remembers what you say, emotionally intelligent | No commitment tracking, no scoring, no honourable exit coaching, raises therapy-line concerns | We are explicitly accountability-focused, not companionship — a cleaner ethical boundary and stronger business use case |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Whisper API transcription cost becomes prohibitive at 60-second chunks × 16 hours/day | Medium | High — continuous ambient recording is expensive at scale | Mitigate: transcribe only when voice activity detected (VAD); pause transcription during non-speech silence |
| Phone call auto-pause fails — system records phone call without two-party consent | Low | HIGH — TCPA/wiretapping violation | Mitigate: auto-pause is the default and must be tested on Twilio call detection before any production use |
| User disables recording consent but audio buffer continues in background | Low | HIGH — privacy violation | Mitigate: MediaRecorder must be explicitly stopped (not just paused) when consent is withdrawn; test this path |
| Apple/Google ships native commitment detection in OS (Siri Shortcuts, Android routines) | Low (3–5 years) | Medium — reduces differentiation | Monitor: our scoring system and honourable exit coaching are the moat, not just the detection |

### Gate 4 — Adaptability Strategy
AI model assignments are in config — if Gemini is outperformed in empathy by a new model, the mediator service config changes, not the mediator logic. The integrity scoring formula is implemented in `services/integrity-engine.js` as a set of named score events — adding a new event type (e.g., "same-day renegotiation" = +5) is one line in the event table. The commitment detection regex list is a data structure that a headless AI can extend without touching routing logic. Score: 88/100 — the architecture is highly adaptable; the two missing pieces (Google Calendar OAuth flow and VAD for cost control) are the primary gaps.

### Gate 5 — How We Beat Them
Every commitment app requires you to type what you promised; Word Keeper listens to your actual conversations, detects the moment you give your word, confirms it was intentional, tracks it against your deadline, and when you can't keep it, writes the honourable message to send — turning commitment accountability from a discipline into a system.
