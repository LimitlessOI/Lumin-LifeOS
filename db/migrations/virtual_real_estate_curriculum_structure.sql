-- SYNOPSIS: Database migration — intentionally a no-op. Curriculum module and student tables already exist in earlier migrations.
-- @ssot docs/products/wellness-studio/PRODUCT_HOME.md

-- This migration originally created `curriculum_modules`, `students`, and `student_enrollments`.
-- Those tables are now defined by canonical earlier migrations, so this file is a no-op
-- to avoid CREATE TABLE COLLISION_RISK during migration preflight.
