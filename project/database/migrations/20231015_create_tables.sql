```sql
CREATE TABLE digital_twins (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  model_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fit_predictions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  brand VARCHAR(255) NOT NULL,
  prediction_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_verifications (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL,
  verification_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fabric_simulations (
  id SERIAL PRIMARY KEY,
  simulation_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```