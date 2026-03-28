-- ============================================================
-- Mark build_ready=TRUE for projects that passed the 5-gate checklist.
-- Amendment: docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
--
-- Only these projects have:
--   - Implementation detail specific enough for headless AI
--   - Competitor landscape documented
--   - Future risks identified
--   - Adaptability strategy defined
--   - "How we beat them" documented
--
-- Run after: 20260327_build_ready_gate.sql, 20260327_builder_council.sql
-- ============================================================

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'Passed 5-gate readiness checklist — see amendment Pre-Build Readiness section',
  council_persona = 'tesla'
WHERE slug = 'ai_council';

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'Builder supervisor + council review fully specced and live',
  adaptability_score = 88,
  council_persona = 'musk'
WHERE slug = 'auto_builder';

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'Site builder infrastructure complete, auto follow-up cron is the remaining safe segment',
  adaptability_score = 82,
  council_persona = 'jobs'
WHERE slug = 'site_builder';

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'CRM core + email automation ready — voice preservation is the edge',
  adaptability_score = 78,
  council_persona = 'jobs'
WHERE slug = 'boldtrail_realestate';

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'Command center fully extracted, builder panel and readiness queue now live',
  adaptability_score = 80,
  council_persona = 'jobs'
WHERE slug = 'command_center';

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'Word Keeper routes extracted, Google Calendar OAuth is remaining safe segment',
  adaptability_score = 88,
  council_persona = 'edison'
WHERE slug = 'word_keeper';

UPDATE projects SET
  build_ready = TRUE,
  readiness_checked_at = NOW(),
  readiness_checked_by = 'adam',
  readiness_notes = 'TC coordination core live — email triage, GLVAR, deadlines all gated behind useful-work-guard',
  adaptability_score = 82,
  council_persona = 'edison'
WHERE slug = 'tc_service';

-- Confirm what got marked
SELECT slug, build_ready, council_persona, adaptability_score
FROM projects
WHERE build_ready = TRUE
ORDER BY slug;
