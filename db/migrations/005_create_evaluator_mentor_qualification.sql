-- SYNOPSIS: Create evaluator_mentor_qualification linking table with idempotent parent tables.

CREATE TABLE IF NOT EXISTS evaluators (
    id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS mentors (
    id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS evaluator_mentor_qualification (
    id SERIAL PRIMARY KEY,
    evaluator_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    qualification TEXT NOT NULL,
    awarded_date DATE NOT NULL,
    FOREIGN KEY (evaluator_id) REFERENCES evaluators(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE
);