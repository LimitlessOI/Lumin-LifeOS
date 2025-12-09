```sql
CREATE TABLE climate_indicators (
  id SERIAL PRIMARY KEY,
  indicator_name VARCHAR(255) NOT NULL,
  value NUMERIC NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_simulations (
  id SERIAL PRIMARY KEY,
  simulation_name VARCHAR(255) NOT NULL,
  parameters JSONB NOT NULL,
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_decisions (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(255) NOT NULL,
  decision JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sector_agents (
  id SERIAL PRIMARY KEY,
  agent_type VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```