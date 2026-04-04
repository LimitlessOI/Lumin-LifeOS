# AMENDMENT_31: Teacher OS

**Status:** Candidate — Specification Phase
**Last Updated:** 2026-04-04
**Priority:** High (mission-aligned, recurring SaaS)
**Category:** Education / Vertical SaaS

---

## Vision

Teachers spend 40–50% of their time on work that never touches a student: lesson planning, progress reports, parent emails, IEPs, grading rubrics, compliance paperwork, and curriculum mapping. Teacher OS eliminates that burden entirely — letting teachers be teachers again.

Beyond paperwork elimination, Teacher OS generates a living, individualized plan for each student: tailored learning objectives, engagement strategies, and confidence-building milestones — while keeping the whole class moving through curriculum together. The teacher sees one coherent class. Each student experiences something built for them.

---

## Core Problem

- Teachers lose ~20 hours/week to administrative work
- Individualized instruction is theoretically mandated but practically impossible at 30:1 ratios
- Students who fall behind or feel unseen disengage early and permanently
- Existing EdTech "helps" teachers use more software — Teacher OS removes work entirely

---

## Product Components

### 1. Paperwork Eliminator
- **Lesson Plans** — AI generates standards-aligned plans from teacher's intent ("we're doing fractions this week, need 3 activities, mixed ability levels")
- **Progress Reports** — Auto-drafted from gradebook + class notes; teacher reviews + signs off
- **Parent Communications** — Drafts emails, conference summaries, concern notices
- **IEP Support** — Pulls student data, drafts goal language, tracks accommodations
- **Compliance Forms** — District/state reporting forms pre-filled from existing data
- **Grading Rubrics** — Generated from learning objective; calibrated to grade level

### 2. Individualized Student Plan Engine
Each student gets a dynamic profile:
- **Learning style signals** — drawn from assignment patterns, participation, error types
- **Confidence level** — tracked via micro-assessments and teacher observations
- **Engagement profile** — what makes this child lean in (competition, creativity, collaboration, narrative)
- **Inspiration trigger** — what this child cares about (dinosaurs, basketball, cooking, etc.) used to contextualize curriculum
- **Current growth edge** — the one concept they're right on the boundary of understanding

The AI generates individualized "entry points" into shared curriculum content — so the whole class reads the same story, but each student's comprehension questions are calibrated to their level and framed around their interests.

### 3. Class Coherence Engine
The tension Teacher OS resolves: **individualization vs. class unity**.

- All students move through the same curriculum map at the same pace
- Differentiation happens at the activity/assessment/framing layer
- Teacher sees one lesson plan with "differentiation notes" — not 30 separate plans
- Whole-class activities designed so every student can participate at their level

### 4. Teacher Command Center
- Daily briefing: what happened yesterday, who needs attention today, what's coming this week
- Student flags: who's falling behind, who's disengaged, who had a breakthrough
- Weekly plan review: approve AI-drafted week in one 10-minute session
- Parent communication queue: drafted messages ready to send with one click
- Admin compliance dashboard: required forms, deadlines, completion status

### 5. Progress + Inspiration Tracking
- Each student has a **win log** — every demonstrated mastery moment recorded
- Confidence trend visible to teacher (and optionally to student + parent)
- "Moment of belonging" tracker — every student needs to feel seen; system surfaces who hasn't had one recently
- Growth over time shown to student in their own language ("You couldn't do this 3 weeks ago. Now you can.")

---

## Go-To-Market

### Primary Customer: Individual Teachers (B2C → B2B2C)
- Start with individual teacher subscriptions ($29–$49/month)
- Teachers who love it advocate to department heads → school buys seats
- School adoption leads to district conversations

### Secondary: Schools & Districts (B2B)
- School licenses: $8–$15/student/year
- District enterprise: custom pricing, SSO, district data integration
- Title I schools: reduced pricing; grant-eligible (EdTech grant language built-in)

### Wedge: Free Paperwork Tool
- Launch with free "Lesson Plan Generator" (no account required)
- Email capture → drip campaign → full Teacher OS trial
- Viral: teachers share plans → organic growth

---

## Regulatory & Privacy Considerations

- **FERPA** — student data must be handled under FERPA; data processing agreements required with schools
- **COPPA** — students under 13; no direct student data collection without parental consent
- **IDEA** — IEP support must be positioned as assistance, not clinical tool; disclaimers required
- **Data residency** — some districts require US-only data storage (Neon PostgreSQL satisfies this)
- **Teacher is always the decision-maker** — AI drafts, teacher approves; no autonomous communications to parents

---

## Technical Architecture

### Database Schema
```sql
-- Teacher accounts
CREATE TABLE teacher_os_teachers (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES lifeos_users(id),
  school_id       INTEGER REFERENCES teacher_os_schools(id),
  grade_levels    TEXT[],
  subjects        TEXT[],
  class_size_avg  INTEGER,
  district        TEXT,
  state           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Schools/districts
CREATE TABLE teacher_os_schools (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  district        TEXT,
  state           TEXT,
  license_type    TEXT CHECK (license_type IN ('individual','school','district')),
  seat_count      INTEGER,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Students (anonymized by default)
CREATE TABLE teacher_os_students (
  id              SERIAL PRIMARY KEY,
  teacher_id      INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  display_name    TEXT NOT NULL,  -- teacher-assigned alias, never real name in AI calls
  grade_level     TEXT,
  learning_style  JSONB,          -- signals, not diagnosis
  engagement_profile JSONB,
  interests       TEXT[],
  confidence_baseline NUMERIC(3,1),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Student progress snapshots
CREATE TABLE teacher_os_student_progress (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES teacher_os_students(id),
  date            DATE NOT NULL,
  subject         TEXT,
  mastery_level   NUMERIC(3,1),
  growth_edge     TEXT,
  win_note        TEXT,
  teacher_note    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Generated documents
CREATE TABLE teacher_os_documents (
  id              SERIAL PRIMARY KEY,
  teacher_id      INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  doc_type        TEXT NOT NULL CHECK (doc_type IN ('lesson_plan','progress_report','parent_email','rubric','iep_draft','compliance_form')),
  subject         TEXT,
  grade_level     TEXT,
  content         TEXT NOT NULL,
  approved        BOOLEAN DEFAULT false,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Class curricula
CREATE TABLE teacher_os_curricula (
  id              SERIAL PRIMARY KEY,
  teacher_id      INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  subject         TEXT NOT NULL,
  grade_level     TEXT NOT NULL,
  unit_name       TEXT NOT NULL,
  standards       TEXT[],
  week_of         DATE,
  ai_plan         JSONB,
  teacher_notes   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Key Services
- `services/teacher-os-paperwork.js` — document generation (lesson plans, reports, emails)
- `services/teacher-os-student-profiler.js` — individualized profile builder + updater
- `services/teacher-os-class-planner.js` — coherent class plan with differentiation layer
- `services/teacher-os-briefing.js` — daily teacher briefing generator
- `routes/teacher-os-routes.js` — all endpoints
- `db/migrations/YYYYMMDD_teacher_os_schema.sql`

### AI Usage Pattern
- Lesson plan generation: Claude Sonnet (structured output, ~$0.003/plan)
- Progress reports: Claude Haiku (templated, fast, cheap)
- Individualized entry points: Claude Sonnet per student per unit (amortized cheaply)
- Parent email drafts: Claude Haiku
- Cost target: < $0.50/teacher/month in AI costs at $29 price point

---

## Pre-Build Readiness

### Gate 1 — Specification
- [x] Core problem defined
- [x] Product components specified
- [x] GTM strategy outlined
- [x] Regulatory risks identified
- [x] DB schema drafted
- [ ] Detailed API specification
- [ ] Wireframes / UX flow

### Gate 2 — Market Validation
- [ ] 5 teachers interviewed
- [ ] Competitive landscape mapped (Planboard, Teachermade, Nearpod, Google Classroom, Formative)
- [ ] Pricing validated with target users
- [ ] FERPA data processing agreement template sourced

### Gate 3 — Differentiator Confirmed
- Primary differentiator: **paperwork elimination + individualization in one product** (no competitor does both)
- Secondary: **inspiration-first student plans** (not just remediation)
- Tertiary: **class coherence engine** (teachers don't have to manage 30 plans)

### Gate 4 — Risk Assessment
- FERPA compliance: must have legal review before storing student data
- Positioning risk: "IEP support" could create liability — must be advisory only
- AI hallucination in student communications: teacher approval flow mandatory

### Gate 5 — Build Estimate
- Phase 1 (Paperwork Eliminator only): 3-4 weeks
- Phase 2 (Student profiler + class planner): 4-6 weeks
- Phase 3 (School/district licensing): 2-3 weeks

---

## Change Receipts

| Date | Change |
|---|---|
| 2026-04-04 | Amendment created from user-described concept (not found in conversation dumps) |
