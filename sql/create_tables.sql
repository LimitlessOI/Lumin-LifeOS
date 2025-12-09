```sql
CREATE TABLE identity_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  did VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consent_records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  consent_type VARCHAR(255),
  consent_status BOOLEAN,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```