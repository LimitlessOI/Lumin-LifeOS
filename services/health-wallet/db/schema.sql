```sql
CREATE TABLE patient_wallets (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_data_records (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consent_grants (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL,
  consent_hash VARCHAR(255) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_sharing_rewards (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL,
  reward_amount DECIMAL NOT NULL,
  rewarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_quality_scores (
  id SERIAL PRIMARY KEY,
  data_id INT NOT NULL REFERENCES health_data_records(id),
  quality_score DECIMAL NOT NULL,
  scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```