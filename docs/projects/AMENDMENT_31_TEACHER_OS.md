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

## Teacher Self-Care

### This Is Not an Add-On

50% of teachers leave the profession within 5 years. Burnout is not a wellness problem — it is a structural problem that the platform is uniquely positioned to address. Teacher self-care is a **core feature of Teacher OS**, not a separate wellness module. It is the mechanism by which the platform protects its own core mission: teachers who are depleted cannot protect the love of learning in their students.

### What the System Tracks

**Workload signals:**
- Documentation load above sustainable thresholds → system flags and offers to shift work onto the queue rather than the teacher's shoulders
- Week-over-week administrative task volume tracked; when it exceeds baseline by more than 20%, the system proactively reduces what it's asking of the teacher

**Emotional load signals:**
- Certain classroom compositions carry heavier weight — students in crisis, high-needs IEP load, class behavioral complexity
- When a teacher is carrying a disproportionate emotional load, the system recognizes it and prompts a reset: a 3-minute decompression between the most demanding periods of the day
- Signals are never clinical diagnoses — they are workload and pattern observations offered as reflections, not labels

**Celebration of impact:**
- The system surfaces direct evidence that the teacher changed something: "Emma hadn't had a success moment in 8 days. After your intervention Tuesday, she's had four in a row."
- Teachers almost never receive concrete feedback that their effort mattered. This system delivers that feedback in real time, drawn from the same data it already tracks.

**The decompression brief:**
- End of day: what went well, what was hard, what to set down
- A 2-minute structured reflection that helps teachers leave work at school — not because they don't care, but because caring too much without a reset burns them out

### The New Teacher Survival Layer

50% of teachers quit within 5 years. The leading cause is not low pay — it is isolation. A first-year teacher is handed 30 students, a classroom, and a curriculum and largely left to figure it out. Veterans hold enormous accumulated wisdom that is siloed, unshared, and lost when they retire.

Teacher OS is a veteran teacher's wisdom available to every first-year teacher from day one:
- "What do I do when a student completely shuts down?" — the system surfaces what has worked for this age group, this subject, this behavioral pattern
- Lesson design intuition that normally takes 5 years to develop → available in year one
- First-year teachers who use the platform survive. That is the outcome target.

### Peer Community

Not commiserating — genuine professional peer support. Other Teacher OS users dealing with similar challenges:
- "Three of my students are processing family disruption this month — has anyone else navigated this in math class?"
- Matched to teachers in similar contexts (grade level, school type, class composition) — not random connections
- Community interactions are structured to produce actionable insights, not vent sessions (though venting has its place)

---

## Homeschool Version

### A Dedicated Product Line Within Teacher OS

Homeschooling is not a niche. It is one of the fastest-growing educational models in the country, and it has a fundamentally different set of challenges than classroom teaching. The platform serves both — with the same core engine and a distinct product experience for each.

### What Changes in Homeschool Mode

**Deeper individualization:**
- A classroom teacher manages 30 students. A homeschool parent manages 1 to 6.
- The AI can go much deeper on each child's profile — not because it has better data but because it has fewer children to distribute attention across.
- Every learning plan is genuinely 1:1, not differentiated from a group.

**The misidentification screening (core to this product line):**
Adam's daughter was misdiagnosed with ADD. She was put on Adderall. She cried all day. The actual problem was Irlen Syndrome — a visual processing disorder where the brain cannot correctly interpret text on a page. A colored overlay costing $2 fixed everything. The $400 clinical test and the medication were never needed.

This experience is the direct product requirement for the misidentification screening feature. The platform includes:
- A free visual stress screening built into onboarding
- A guided colored overlay trial (digital, in-app) before any recommendation to spend money
- A structured alternative-explanation review before any child is tracked toward a clinical evaluation
- Referral to clinical tools only after free interventions have been tried and documented

This feature exists because of this story. It will help thousands of families who will never know Adam's daughter's name.

**Daily schedule generator:**
- Homeschool parents consistently cite structure as their biggest challenge — not content, but pacing and sequence
- The system generates a daily schedule that honors each child's learning rhythms (not a generic school day template)
- Respects co-curricular time (music, sports, community activities) and integrates them as part of the learning design

**Curriculum flexibility:**
- Not locked to grade-level standards
- Moves at the child's pace — faster in areas of strength, slower where genuine consolidation is needed
- Can operate in standards-aligned mode (for families who want it) or open-exploration mode (for families doing project-based learning)

**The co-op layer:**
- Multiple homeschool families can connect their children's profiles
- The system generates group activities designed for children across different learning levels — so a 9-year-old advanced reader and a 7-year-old beginning reader can participate in the same literature unit at their respective levels
- Socialization infrastructure: community connections for field trips, co-op classes, group projects

**Documentation layer:**
- Generates progress portfolios for state requirements (requirements vary significantly by state — the system knows each state's specific requirements)
- Generates "evidence portfolios" for skeptical family members — grandparents, extended family who question homeschooling
- Annual transcript generation for students who will eventually enter traditional educational settings

---

## Laws of Success / Integrity Score / Ethical Persuasion

### The "Why" Child and What It Points To

Children who ask "why" repeatedly are doing what every great thinker, scientist, inventor, and builder does. The system does not teach children to stop asking why. It teaches them **what asking "why" is for**.

This distinction becomes the foundation of the ethical persuasion and integrity curriculum, which runs through both Teacher OS (as a classroom life-skills layer) and Kids OS (as a core development track).

### The Framework

**Genuine curiosity:**
"I want to understand" → ask why → absorb the answer → ask another why → build real comprehension. This is celebrated unconditionally. The child who pursues tangents, who stays engaged past task completion, who brings outside information in — this is the love of learning in action.

**Ethical persuasion:**
"I want to change someone's mind or behavior" → understand their position first → find the ground where both people benefit → make your case → respect their right to say no. Persuasion that respects the other person's sovereignty. Asking for what you want without overriding their judgment.

**Manipulation:**
"I want to change someone's behavior against their interests or without their full information" → this is identified by name, shown for what it is, and refused. The child learns to recognize it — in others and, most importantly, in themselves. Catching yourself doing it and choosing differently is the highest integrity act.

**The PSI / Laws of Success philosophy:**
- "Results are often harsh but always fair." — Thomas Willhite
- Laws of success are proven by results. Sacred cows either produce results or they don't. If a belief isn't generating the outcomes claimed for it, the belief deserves examination.
- "No" means "not yet with these arguments in this context" — rejection as information, not as verdict on the person.

### The Integrity Score

Not a punishment mechanism. A mirror.

The Integrity Score is gamified for students (age-appropriate implementation) and visible to the student and optionally to parents:

- **+** Integrity points for: asking clearly and directly for what you want; accepting "no" with grace; keeping commitments to yourself and others; telling the truth when lying would be easier; choosing curiosity over defensiveness when challenged
- **++** Double points for: catching yourself in a manipulation and choosing differently. This earns the highest recognition because it requires the most self-awareness and courage.

The score is not about judging past behavior. It is about training the student to notice their own patterns in real time. Over months, the student develops what amounts to an internal integrity sensor — not because the platform told them to, but because they watched the evidence accumulate in their own record.

---

## Change Receipts

| Date | Change |
|---|---|
| 2026-04-04 | Amendment created from user-described concept (not found in conversation dumps) |
| 2026-04-04 | Added: Teacher Self-Care (core feature, not add-on), New Teacher Survival Layer, Peer Community, Homeschool Version (full product line, misidentification screening, co-op layer, documentation), Laws of Success / Integrity Score / Ethical Persuasion |
