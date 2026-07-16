-- SYNOPSIS: Database migration — 202605140.sql.
-- Check if the table exists and create if it doesn't
CREATE TABLE IF NOT EXISTS lessons_learned (
    id SERIAL PRIMARY KEY,
    lesson_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert seed data (replace with actual lesson data)
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

-- Add any additional constraints or indexes if necessary
