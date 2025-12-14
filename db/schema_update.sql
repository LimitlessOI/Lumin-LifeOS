```sql
CREATE TABLE anomaly_models (
  id SERIAL PRIMARY KEY,
  model_data BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zk_proofs (
  id SERIAL PRIMARY KEY,
  proof JSON NOT NULL,
  public_signals JSON NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_participants (
  id SERIAL PRIMARY KEY,
  participant_id UUID NOT NULL,
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insurance_incentives (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  incentive_amount NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```