CREATE TABLE automation_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_deployments (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  deployed_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);