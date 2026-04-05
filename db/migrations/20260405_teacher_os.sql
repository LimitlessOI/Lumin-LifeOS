-- @ssot docs/projects/AMENDMENT_31_TEACHER_OS.md

CREATE TABLE IF NOT EXISTS teacher_os_teachers (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,  -- will reference lifeos_users when table exists
  display_name    TEXT NOT NULL,
  school_name     TEXT,
  district        TEXT,
  state           TEXT,
  grade_levels    TEXT[] DEFAULT '{}',
  subjects        TEXT[] DEFAULT '{}',
  class_size_avg  INTEGER DEFAULT 25,
  is_homeschool   BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','individual','school','district')),
  hardship_protected BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_os_students (
  id                  SERIAL PRIMARY KEY,
  teacher_id          INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  display_name        TEXT NOT NULL,  -- teacher-assigned alias, NEVER real name in AI calls
  grade_level         TEXT,
  age                 INTEGER,
  learning_style      JSONB DEFAULT '{}',
  engagement_profile  JSONB DEFAULT '{}',
  interests           TEXT[] DEFAULT '{}',
  inspiration_trigger TEXT,           -- the one thing this child lights up for
  confidence_level    NUMERIC(3,1) DEFAULT 5.0,
  growth_edge         TEXT,
  misidentification_flags JSONB DEFAULT '{}',
  days_since_win      INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_os_documents (
  id              SERIAL PRIMARY KEY,
  teacher_id      INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  student_id      INTEGER REFERENCES teacher_os_students(id),  -- null = class-level doc
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
    'lesson_plan','progress_report','parent_email',
    'rubric','iep_draft','compliance_form','sub_brief',
    'conference_prep','decompression_brief'
  )),
  subject         TEXT,
  grade_level     TEXT,
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  approved        BOOLEAN DEFAULT false,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_os_win_log (
  id              SERIAL PRIMARY KEY,
  teacher_id      INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  student_id      INTEGER NOT NULL REFERENCES teacher_os_students(id),
  win_description TEXT NOT NULL,
  domain          TEXT,
  logged_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_os_wellbeing (
  id                  SERIAL PRIMARY KEY,
  teacher_id          INTEGER NOT NULL REFERENCES teacher_os_teachers(id),
  workload_score      NUMERIC(3,1),   -- 1-10, 10=unsustainable
  emotional_load_score NUMERIC(3,1),  -- 1-10
  impact_moments      INTEGER DEFAULT 0,  -- student wins attributed to teacher this week
  decompression_done  BOOLEAN DEFAULT false,
  notes               TEXT,
  logged_at           TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_os_students_teacher ON teacher_os_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_os_docs_teacher ON teacher_os_documents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_os_docs_type ON teacher_os_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_teacher_os_wins_student ON teacher_os_win_log(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_os_wellbeing_teacher ON teacher_os_wellbeing(teacher_id);
