# AMENDMENT_32: Music Talent Studio

**Status:** Candidate — Specification Phase
**Last Updated:** 2026-04-04
**Priority:** High (passion-project with real market)
**Category:** Education / Creator Economy / Talent Discovery

---

## Vision

Two intertwined problems. One platform.

**Problem 1:** Music instruction is broken. Students quit because lessons are disconnected from what they actually love. Teachers are solo practitioners with no business infrastructure. Progress is unmeasured. Motivation fades.

**Problem 2:** Real musical talent is everywhere and goes undiscovered. The current path to development — be in the right city, know the right people, get lucky — is arbitrary and wasteful. Most artists who could matter never get the chance.

Music Talent Studio is an AI-powered platform that teaches music (instruments + voice) in a way that keeps students engaged and progressing, while surfacing genuine talent and connecting it to real development pathways.

---

## Two Integrated Products

### Product A: Instrument & Voice Instruction OS

An AI-powered music instruction layer that makes teaching more effective and lessons more engaging.

#### For Students:
- **Personalized progression** — based on what the student loves (genres, artists, songs they want to play)
- **AI listening coach** — records practice session, identifies pitch accuracy, rhythm, dynamics, technique issues — without judgment
- **Song-first learning** — student picks a song they want to learn; AI maps the theory and technique they need and teaches it through the song
- **Confidence tracking** — logs every breakthrough; shows the student their own growth arc
- **"One thing" focus** — each session the AI identifies the single most impactful thing to work on

#### For Teachers:
- **Practice session summaries** — AI analyzes student's recorded practice and sends teacher a brief before the lesson
- **Lesson plan generator** — builds out lesson structure based on student's current level, goals, and what happened last week
- **Progress portfolio** — shareable record of student's journey for parents, competitions, college auditions
- **Studio management** — scheduling, invoicing, parent communications, waitlist
- **Repertoire database** — searchable by difficulty, genre, technique focus

#### For Parents:
- **Weekly brief** — what their child worked on, what they achieved, what's next
- **Practice accountability** — gentle nudge system (not punitive) tied to student's own goals
- **Milestone celebrations** — parents notified when student reaches a breakthrough moment

### Product B: Talent Discovery & Development Pipeline

This is the talent layer — the part that changes careers.

#### Talent Detection:
- **Submission portal** — any student (through a teacher on the platform, or direct) can submit recordings
- **AI evaluation dimensions:**
  - Tonal quality and natural resonance
  - Pitch accuracy + intonation under pressure
  - Rhythmic feel (vs. metronomic accuracy — different things)
  - Emotional expression and phrasing
  - Improvisational instinct
  - Audience connection (in video submissions)
  - Rate of improvement (compared to baseline recordings)
- **Genre + context calibration** — a country vocalist and a jazz vocalist are evaluated on different axes
- **Honest scoring** — not "you're amazing!" but "here's where you stand on these dimensions compared to developing professionals"

#### Development Pathway:
For students who surface as having real potential:
- **Development plan** — AI-generated multi-year roadmap: skills to build, repertoire to master, experiences to seek
- **Mentor matching** — connection to professional musicians, vocal coaches, or producers who specialize in their genre and development stage
- **Industry literacy** — how the music business works, what a realistic path looks like, how to build a following, how to handle the business side
- **Opportunity pipeline** — curated list of auditions, competitions, showcases, workshops relevant to their genre and level
- **Artist development sessions** — structured coaching sessions (via video) on: stage presence, interview/press skills, brand, social presence, mental toughness

#### For Music Industry Professionals:
- **Talent scouting feed** — vetted emerging artists sortable by genre, geography, development stage
- **Early relationship tools** — reach out to promising students before they're signed
- **A&R workflow** — track artists you're watching, note timestamps in their development

---

## The Distinctive Claim

Every music app teaches scales. What Music Talent Studio does differently:

1. **Song-first, theory-second** — motivation stays because students play what they love
2. **Honest talent assessment** — not a confidence game, not a participation trophy system; real signal
3. **The talent → industry pipeline** — no other platform bridges instruction with real professional development opportunities
4. **Teacher empowerment, not teacher replacement** — teachers use this to run a better studio; they don't compete with it
5. **Rate of improvement as a signal** — the AI tracks not just current level but velocity of growth, which is more predictive than current ability

---

## Business Model

### Revenue Streams

| Stream | Model | Price |
|---|---|---|
| Student subscriptions | Monthly | $19–$39/month |
| Teacher platform | Monthly per studio | $49–$149/month |
| Talent evaluation | Per submission | $29–$79 |
| Industry scouting access | Annual subscription | $299–$999/year |
| Artist development sessions | Per session | $149–$299 |
| School/conservatory licenses | Per student/year | $15–$40 |

### GTM Wedge
- **Free AI practice analysis tool** — upload a 2-minute recording, get real feedback (no account required)
- Converts: students who want more → full subscription; teachers who see the analysis → studio account
- Viral vector: teachers share student progress portfolios → parents share → other families find it

---

## Competitive Landscape

| Competitor | What they do | Our edge |
|---|---|---|
| Simply Piano / Yousician | Gamified self-learning | We have teachers + talent layer |
| Lessonface / TakeLessons | Teacher marketplace | We have AI layer + talent detection |
| Soundtrap / BandLab | Collaboration/recording tools | We have instruction + discovery |
| Traditional conservatories | In-person instruction | We have scale + AI analysis |
| SoundCloud / YouTube | Distribution | We have development + industry pipeline |

No one owns the full stack: instruction → AI coaching → talent detection → industry pipeline.

---

## Technical Architecture

### Database Schema
```sql
-- Student music profiles
CREATE TABLE music_students (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER REFERENCES lifeos_users(id),
  instrument          TEXT[],
  genres              TEXT[],
  current_level       TEXT CHECK (current_level IN ('beginner','intermediate','advanced','professional')),
  goals               TEXT,
  artists_love        TEXT[],
  started_at          DATE,
  teacher_id          INTEGER REFERENCES music_teachers(id),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Teacher/studio accounts
CREATE TABLE music_teachers (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER REFERENCES lifeos_users(id),
  studio_name         TEXT,
  instruments         TEXT[],
  genres              TEXT[],
  bio                 TEXT,
  stripe_account_id   TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Practice session recordings + AI analysis
CREATE TABLE music_practice_sessions (
  id                  SERIAL PRIMARY KEY,
  student_id          INTEGER NOT NULL REFERENCES music_students(id),
  recording_url       TEXT,
  duration_seconds    INTEGER,
  song_worked_on      TEXT,
  ai_analysis         JSONB,  -- pitch_accuracy, rhythm, technique_notes, one_thing_focus
  teacher_reviewed    BOOLEAN DEFAULT false,
  session_date        DATE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Talent evaluations
CREATE TABLE music_talent_evaluations (
  id                  SERIAL PRIMARY KEY,
  student_id          INTEGER REFERENCES music_students(id),
  submission_url      TEXT NOT NULL,
  submission_type     TEXT CHECK (submission_type IN ('audio','video')),
  genre               TEXT,
  scores              JSONB,  -- tonal_quality, pitch_accuracy, rhythmic_feel, expression, etc.
  overall_percentile  NUMERIC(5,2),
  improvement_velocity NUMERIC(5,3),
  development_flag    BOOLEAN DEFAULT false,  -- true = AI flagged real potential
  evaluator_notes     TEXT,
  evaluated_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Artist development plans
CREATE TABLE music_development_plans (
  id                  SERIAL PRIMARY KEY,
  student_id          INTEGER NOT NULL REFERENCES music_students(id),
  timeframe_months    INTEGER,
  milestones          JSONB,
  current_phase       TEXT,
  next_action         TEXT,
  industry_mentor_id  INTEGER,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Opportunities (auditions, showcases, workshops)
CREATE TABLE music_opportunities (
  id                  SERIAL PRIMARY KEY,
  title               TEXT NOT NULL,
  type                TEXT CHECK (type IN ('audition','showcase','workshop','competition','festival','session')),
  genres              TEXT[],
  level_range         TEXT,
  location            TEXT,
  deadline            DATE,
  link                TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

### Key Services
- `services/music-practice-analyzer.js` — AI analysis of practice session audio
- `services/music-talent-evaluator.js` — multi-dimension talent scoring
- `services/music-lesson-planner.js` — song-first lesson plan generator
- `services/music-development-planner.js` — artist development roadmap
- `routes/music-talent-studio-routes.js` — all endpoints
- `db/migrations/YYYYMMDD_music_talent_studio_schema.sql`

### AI Usage
- Practice analysis: Whisper (transcription) + Claude Haiku (technique feedback)
- Talent evaluation: Claude Sonnet (multi-dimension scoring, structured JSON)
- Lesson plan generation: Claude Haiku (templated output)
- Development plan: Claude Opus or Sonnet (long-range planning, fewer calls)
- Audio analysis: potentially integrate with third-party music AI (Melodyne API, or custom model)

---

## Pre-Build Readiness

### Gate 1 — Specification
- [x] Core problem defined (both sides: instruction + discovery)
- [x] Product components specified
- [x] GTM strategy outlined
- [x] Competitive landscape mapped
- [x] DB schema drafted
- [ ] Detailed API specification
- [ ] Audio analysis approach confirmed (third-party API vs. custom)

### Gate 2 — Market Validation
- [ ] 5 music teachers interviewed
- [ ] 5 students or parents interviewed
- [ ] 2 music industry professionals (A&R, managers) consulted
- [ ] Pricing validated

### Gate 3 — Differentiator Confirmed
- Primary: **Song-first instruction + honest talent assessment** in one platform
- Secondary: **The talent → industry pipeline** (no competitor has this)
- Tertiary: **Rate of improvement as talent signal** (novel)

### Gate 4 — Risk Assessment
- Audio recording: user consent required; recordings handled with strict retention policy
- Talent assessment honesty: must not crush kids; frame as "development stage" not "gifted/not gifted"
- Teacher channel conflict: teachers are partners, not disruption targets — positioning critical
- Copyright: song-based learning must navigate copyright carefully (analysis only, not reproduction)

### Gate 5 — Build Estimate
- Phase 1 (Practice analyzer + teacher studio management): 4-5 weeks
- Phase 2 (Talent evaluation portal): 3-4 weeks
- Phase 3 (Industry scouting + development plans): 4-6 weeks
- Phase 4 (Opportunity pipeline + mentor matching): 3-4 weeks

---

## Change Receipts

| Date | Change |
|---|---|
| 2026-04-04 | Amendment created from user-described concept (not found in conversation dumps — original idea) |
