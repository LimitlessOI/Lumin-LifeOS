-- SYNOPSIS: Database migration — 202605140.sql.
-- Backfills seed rows into the existing lessons_learned table when it is empty.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'lessons_learned'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'lesson_text'
    ) AND NOT EXISTS (SELECT 1 FROM lessons_learned LIMIT 1) THEN
        INSERT INTO lessons_learned (lesson_text) VALUES
        ('Lesson 1 from AM36/CONTINUITY_LOG'),
        ('Lesson 2 from AM36/CONTINUITY_LOG'),
        ('Lesson 3 from AM36/CONTINUITY_LOG'),
        ('Lesson 4 from AM36/CONTINUITY_LOG'),
        ('Lesson 5 from AM36/CONTINUITY_LOG'),
        ('Lesson 6 from AM36/CONTINUITY_LOG'),
        ('Lesson 7 from AM36/CONTINUITY_LOG'),
        ('Lesson 8 from AM36/CONTINUITY_LOG'),
        ('Lesson 9 from AM36/CONTINUITY_LOG'),
        ('Lesson 10 from AM36/CONTINUITY_LOG');
    END IF;
END $$;
