```sql
CREATE TABLE legal_research_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  status VARCHAR(50)
);

CREATE TABLE legal_citations (
  id SERIAL PRIMARY KEY,
  research_session_id INT REFERENCES legal_research_sessions(id),
  citation_text TEXT,
  verified BOOLEAN DEFAULT FALSE,
  blockchain_tx_id VARCHAR(255)
);

CREATE TABLE judge_patterns (
  id SERIAL PRIMARY KEY,
  judge_name VARCHAR(255),
  pattern_data JSONB
);

CREATE TABLE research_credits (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  credits INT DEFAULT 0
);

CREATE TABLE agent_specializations (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(255),
  specialization VARCHAR(255)
);
```