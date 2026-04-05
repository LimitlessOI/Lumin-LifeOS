# AMENDMENT_35: Lumin University

**Status:** Candidate — Long-Range Specification Phase
**Last Updated:** 2026-04-04
**Priority:** High (long-arc mission capstone, builds on Kids OS foundation)
**Category:** Education / Accredited Institution / Constitutional Mission
**Parent Documents:**
- `docs/SSOT_NORTH_STAR.md` — Constitutional authority
- `docs/NORTH_STAR_EDUCATION_HEALING.md` — Philosophy foundation (Section XII)
- `docs/projects/AMENDMENT_34_KIDS_OS.md` — Feeder system

---

## Vision

The most radical rethinking of higher education since the university was invented.

No classroom. No campus. No debt trap. No 16-week course where you sit for seat time and receive credit regardless of whether you can demonstrate the skill.

Lumin University is a **fully accredited institution** (eventual goal) where:
- **Life is the curriculum** — your actual job, relationships, creative projects, health, finances, and decisions ARE the coursework
- **Competency is the credential** — you earn credit by demonstrating actual capability, not by attending
- **Your phone is the campus** — learning happens in the context of living, not in a classroom suspended from real life
- **The platform already knows you** — students who come through Kids OS arrive equipped. The university continues a conversation that has been going for years.

This is not a disruption play. It is the next logical step in a system that has been building toward this from the moment a child first opens Kids OS at age 4.

---

## The Foundation Is Already Built

The most underappreciated fact about Lumin University is that the hardest problem — knowing the student deeply enough to serve them well — is already solved before they arrive.

Students who come through Kids OS enter Lumin University already carrying:
- A complete learning profile: how they learn best, what modes engage them, what has been hard
- A confidence architecture: documented evidence of every domain where they have grown
- A wins log: specific, timestamped proof of genuine capabilities
- An integrity score history: their own track record of ethical choices over years
- An interests map: what they genuinely care about, built from behavioral evidence not self-report
- A Future Self trajectory: where they were heading when they graduated Kids OS
- A relationship with their own learning: they know how to learn, how to recover from failure, how to compound effort

They do not spend the first two years of university figuring out who they are. They already know. The university starts from a position of deep mutual understanding and continues forward from there.

---

## Core Model: Life as the Curriculum

### The Fundamental Inversion

Traditional higher education: you pause your life for 4 years to acquire credentials, then re-enter life to use them.

Lumin University: your life IS the classroom. The things you are doing right now — your work, your relationships, your health decisions, your financial choices, your creative projects, your conflicts, your wins — are the coursework. The platform helps you extract the learning from what you're already living.

This is not a compromise. It is the most effective learning model possible. Adult learning is most durable when it is immediately applicable to real stakes. Lumin University makes the real stakes the point.

### Competency-Based, Not Time-Based

Credit at Lumin University is earned by demonstrating capability, not by sitting in a class for a specified duration.

- You don't get credit for attending. You get credit for knowing.
- You don't fail because you missed a session. You don't pass because you showed up.
- If you can demonstrate a competency today — through a portfolio, a project, an assessment, a professional reference, documented experience — you earn the credit today.

This eliminates the most expensive and least justified cost in traditional higher education: time.

### Domains of Study

Lumin University's curriculum maps to the full architecture of a human life, not to a traditional academic catalogue:

| Domain | What "Coursework" Looks Like |
|--------|------------------------------|
| **Economic Intelligence** | Your actual financial decisions, business ventures, investment history, revenue generation — analyzed, coached, credited |
| **Relationship Architecture** | How you build and maintain significant relationships — personal, professional, community |
| **Creative Contribution** | Your actual creative output — projects, performances, built things — evaluated for craft and originality |
| **Health Sovereignty** | Your relationship with your own body — physical, mental, nutritional decisions — and their outcomes |
| **Purpose Navigation** | Clarity about what you are building and why — your evolving mission, articulated and tested against reality |
| **Social Intelligence** | Conflict resolution, ethical persuasion, leadership in practice — not in case studies |
| **Systems Thinking** | Evidence of compound thinking applied to real domains in your life |
| **Technical Capability** | Specific skills relevant to your path — assessed against professional standards |
| **Character Resilience** | How you've handled genuine adversity — documented with evidence, not just self-report |

These domains map directly to the Kids OS curriculum, expanded for adult complexity.

---

## The Student Who Arrives from Kids OS

This student is unusual in the history of higher education. They arrive:

- Knowing how they learn
- Knowing what they care about
- Knowing their relationship with failure (it's information, not verdict)
- Knowing how to compound effort toward goals
- Having an established Integrity Score — not a grade, but an evidence record of their character
- Already oriented toward their path — the platform has been aligning them for years

The university does not onboard this student. It continues their journey.

For students who arrive without Kids OS history (the transitional years before Kids OS has reached scale), there is a structured onboarding: a deep self-assessment process, learning profile construction, and a 90-day orientation period before formal coursework begins.

---

## Peer Network

The peer network at Lumin University is not a random cohort. It is curated based on genuine compatibility:

- Similar domains of focus
- Complementary skill sets (not identical — complementary)
- Comparable development stage
- Geographic diversity (different contexts, different markets, different life circumstances)
- Value alignment (verified through Integrity Score history, not self-report)

**These are not classmates. These are collaborators.**

The platform actively facilitates connections where genuine mutual value exists: "Maya is building a wellness practice in Phoenix and struggling with client acquisition. You built your first consistent client base last year. Would you be willing to connect?"

This peer network persists after graduation. It is one of the most durable assets a Lumin University student carries forward.

---

## The Accreditation Roadmap

Accreditation is a long game. The spec is now. The process takes years.

### Why Accreditation Matters

Without accreditation, Lumin University can be an extraordinary educational experience but cannot issue credentials recognized by employers, graduate programs, or professional licensing bodies. Accreditation is the bridge from "excellent platform" to "real institution."

### The Path

**Phase 1 (Now — Year 2): Track record building**
- Kids OS accumulates student outcomes data
- Lumin University pilot programs begin (non-accredited, portfolio-based)
- Graduate outcomes tracked rigorously: employment, income growth, professional advancement, self-reported life quality

**Phase 2 (Year 2-4): Candidate status pursuit**
- Apply to regional accrediting body for candidate status
- Candidate status requires: mission clarity, financial stability, student outcome documentation, academic governance structure
- Build academic governance: faculty equivalents (practitioners and domain experts, not career academics), curriculum committees, appeals processes

**Phase 3 (Year 4-7): Full accreditation**
- Full accreditation requires: multiple graduating cohorts with tracked outcomes, institutional stability, peer review of curriculum and assessment methods
- This is the long game. The platform builds toward it from day one.

**The argument for Lumin's accreditation:**
The institution that can demonstrate better graduate outcomes than traditional universities — in employment, income, self-reported life quality, relationship quality, health — has a powerful case. That case requires data. Kids OS and the Lumin University pilot programs are the data collection mechanism. Every student who thrives is evidence.

---

## Technical Architecture

### Database Schema

```sql
-- Student records (bridges from Kids OS or direct enrollment)
CREATE TABLE lumin_university_students (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER REFERENCES lifeos_users(id),
  kids_os_child_id        INTEGER REFERENCES kids_os_children(id),  -- NULL if direct enrollment
  enrollment_date         DATE NOT NULL,
  enrollment_type         TEXT CHECK (enrollment_type IN ('kids_os_graduate','direct_adult','transfer')),
  learning_profile        JSONB,                -- Ported from Kids OS or built fresh
  path_designation        TEXT,                 -- Primary domain focus
  cohort_id               INTEGER REFERENCES lumin_university_cohorts(id),
  graduation_date         DATE,
  credential_type         TEXT,                 -- 'certificate', 'associate', 'bachelor', 'master' (eventual)
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Credit units (competency-based, not time-based)
CREATE TABLE lumin_university_credits (
  id                      SERIAL PRIMARY KEY,
  student_id              INTEGER NOT NULL REFERENCES lumin_university_students(id),
  domain                  TEXT NOT NULL,
  competency_name         TEXT NOT NULL,
  competency_description  TEXT,
  credit_value            NUMERIC(4,1) NOT NULL,
  evidence_type           TEXT CHECK (evidence_type IN (
    'portfolio',
    'project',
    'assessment',
    'professional_reference',
    'documented_experience',
    'peer_review',
    'mentor_certification'
  )),
  evidence_url            TEXT,
  evidence_summary        TEXT,
  evaluator_id            INTEGER,              -- Platform evaluator or mentor who certified
  earned_date             DATE NOT NULL,
  accepted_date           DATE,                 -- When formally accepted toward credential
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Cohort groups (curated peer networks)
CREATE TABLE lumin_university_cohorts (
  id                      SERIAL PRIMARY KEY,
  cohort_name             TEXT NOT NULL,
  cohort_type             TEXT CHECK (cohort_type IN ('domain','geographic','development_stage','cross_domain')),
  formation_date          DATE NOT NULL,
  facilitator_id          INTEGER,
  member_count            INTEGER DEFAULT 0,
  description             TEXT,
  active                  BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Credentials (issued certificates and degrees)
CREATE TABLE lumin_university_credentials (
  id                      SERIAL PRIMARY KEY,
  student_id              INTEGER NOT NULL REFERENCES lumin_university_students(id),
  credential_type         TEXT NOT NULL CHECK (credential_type IN (
    'kids_os_diploma',
    'certificate',
    'associate',
    'bachelor',
    'master'
  )),
  credential_title        TEXT NOT NULL,
  domains_covered         TEXT[],
  credit_hours_earned     NUMERIC(6,1),
  issued_date             DATE NOT NULL,
  accreditation_status    TEXT CHECK (accreditation_status IN ('pre_accreditation','candidate','accredited')),
  verification_hash       TEXT UNIQUE,          -- Tamper-evident credential verification
  public_verification_url TEXT,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Mentor and evaluator registry
CREATE TABLE lumin_university_mentors (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER REFERENCES lifeos_users(id),
  name                    TEXT NOT NULL,
  domains                 TEXT[],
  credentials             JSONB,                -- Their qualifications
  current_mentee_count    INTEGER DEFAULT 0,
  max_mentee_count        INTEGER DEFAULT 5,
  active                  BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now()
);
```

### Key Services
- `services/lumin-university-enrollment.js` — enrollment, profile bridge from Kids OS
- `services/lumin-university-credits.js` — competency evaluation, credit issuance
- `services/lumin-university-cohort-matcher.js` — peer network curation and matching
- `services/lumin-university-credentials.js` — diploma/certificate generation and verification
- `routes/lumin-university-routes.js` — all endpoints

### AI Usage Pattern
- Learning profile continuation (from Kids OS): Claude Sonnet (structured, infrequent)
- Competency evaluation narrative: Claude Opus (high-stakes, career-affecting)
- Peer cohort compatibility analysis: Claude Sonnet (matching logic, structured JSON)
- Evidence portfolio analysis: Claude Sonnet (structured evaluation against competency standards)
- Cost target: < $3.00/student/month in AI costs (higher than Kids OS due to higher-stakes evaluations)

---

## Business Model

### Pricing
- Monthly subscription: $49–$99/month (while in pre-accreditation phase)
- Annual: $399–$799/year
- Post-accreditation: tuition model to be determined (must be accessible, not debt-trap pricing)
- Hardship: same constitutional protocol as Kids OS — access is never suspended for financial reasons

### Revenue Trajectory
- Phase 1: pilot program with Kids OS graduates (low-cost, outcome-tracking priority)
- Phase 2: adult direct enrollment with portfolio-based entry
- Phase 3: institutional partnerships (employers who want to credential their workforce competency)

---

## Pre-Build Readiness

### Gate 1 — Specification
- [x] Core philosophy defined (life as curriculum, competency-based)
- [x] Student journey from Kids OS mapped
- [x] Domain catalogue outlined
- [x] Accreditation roadmap drafted
- [x] DB schema drafted (5 tables)
- [x] Business model outlined
- [ ] Detailed competency standards per domain
- [ ] Evaluator/mentor qualification criteria
- [ ] Credential verification technology scoped (blockchain? cryptographic hash?)
- [ ] Legal structure for an accreditation-seeking institution

### Gate 2 — Market Validation
- [ ] 10 prospective adult students interviewed
- [ ] 5 employers interviewed (what competency credentials do they recognize?)
- [ ] Accreditation body preliminary consultation
- [ ] Pricing validated with target users

### Gate 3 — Differentiator Confirmed
- Primary: **Life as the curriculum** — no competitor does this at the credential level
- Secondary: **Kids OS continuity** — the student arrives already known
- Tertiary: **Competency-based, no seat time** — the most honest credential model that exists

### Gate 4 — Risk Assessment
- Accreditation risk: using the word "university" without accreditation has legal implications in some states; legal review required
- Credential recognition: pre-accreditation credentials have limited portability; must be transparent about this
- Competency evaluation integrity: the platform is both educator and evaluator; conflict of interest must be structurally managed
- Mission drift risk: financial pressure to grow enrollment can compromise standards; governance structure must resist this

### Gate 5 — Build Estimate
- Phase 1 (Enrollment + Kids OS bridge + credit tracking): 4-5 weeks
- Phase 2 (Competency evaluation workflow + mentor registry): 4-5 weeks
- Phase 3 (Cohort matching + peer network tools): 3-4 weeks
- Phase 4 (Credential generation + verification system): 3-4 weeks
- Phase 5 (Accreditation preparation infrastructure): ongoing, years 2-7

---

## Change Receipts

| Date | Change |
|---|---|
| 2026-04-04 | Amendment created — Lumin University defined. Vision, life-as-curriculum model, competency-based credits, Kids OS continuity, peer network model, accreditation roadmap, DB schema (5 tables), business model, pre-build readiness gates |
