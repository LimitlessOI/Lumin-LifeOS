-- FILE: migrations/001_create_make_com_table.sql ===END FILE===
CREATE TABLE IF NOT EXISTS make_com (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(client_id), -- assuming a 'clients' table exists
  project_details JSONB NOT NULL,
  scenario_plan TEXT DEFAULT '' CHECK ($scenario_plan != '') , -- scenarios stored as text for simplicity in this example. Consider using an object or array structure instead for scalability and maintainability.
  status VARCHAR(50) DEFAULT 'pending'
);