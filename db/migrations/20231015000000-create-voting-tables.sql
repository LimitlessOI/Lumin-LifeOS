```sql
CREATE TABLE voting_sessions (
  id SERIAL PRIMARY KEY,
  session_name VARCHAR(255),
  start_time TIMESTAMP,
  end_time TIMESTAMP
);

CREATE TABLE voter_registrations (
  id SERIAL PRIMARY KEY,
  user_id INT,
  registration_time TIMESTAMP
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  voter_id INT,
  session_id INT,
  vote_data JSONB
);

CREATE TABLE sovereign_validators (
  id SERIAL PRIMARY KEY,
  node_id VARCHAR(255),
  status VARCHAR(50)
);
```