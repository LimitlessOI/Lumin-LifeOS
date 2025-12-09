```sql
CREATE TABLE training_scenarios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  data JSONB
);

CREATE TABLE user_training_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT,
  scenario_id INT,
  completion_status BOOLEAN,
  FOREIGN KEY (scenario_id) REFERENCES training_scenarios(id)
);

CREATE TABLE skill_gap_predictions (
  id SERIAL PRIMARY KEY,
  user_id INT,
  scenario_id INT,
  prediction JSONB,
  FOREIGN KEY (scenario_id) REFERENCES training_scenarios(id)
);

CREATE TABLE hardware_partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  details JSONB
);