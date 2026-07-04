-- SYNOPSIS: Database migration — 20260704_create_teacher_os_documents.sql.
-- Create table for teacher OS documents
CREATE TABLE IF NOT EXISTS teacher_os_documents (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,
  subject TEXT,
  grade_level TEXT,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_os_documents_teacher_id
  ON teacher_os_documents (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_os_documents_doc_type
  ON teacher_os_documents (doc_type);

CREATE INDEX IF NOT EXISTS idx_teacher_os_documents_approved
  ON teacher_os_documents (approved);