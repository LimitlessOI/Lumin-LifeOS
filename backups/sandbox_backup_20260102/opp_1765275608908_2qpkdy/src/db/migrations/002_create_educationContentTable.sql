CREATE TABLE IF NOT EXISTS educational_content (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  lesson_name VARCHAR(100),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW())
);