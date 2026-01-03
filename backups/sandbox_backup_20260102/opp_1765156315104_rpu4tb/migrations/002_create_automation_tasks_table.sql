CREATE TABLE IF NOT EXISTS automation_tasks (
  task_id SERIAL PRIMARY KEY,
  description TEXT,
  targeted_industry_sector VARCHAR(255),
  expected_outcome ROI DOUBLE PRECISION CHECK (expected_outcome > 0) DEFAULT NULL,
  status ENUM('draft', 'active', 'completed') NOT NULL DEFAULT 'draft'
);